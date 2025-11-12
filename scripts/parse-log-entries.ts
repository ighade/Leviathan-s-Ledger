import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { formatISO, parse, parseISO } from "date-fns";
import {
  ParsedLogEntry,
  coordinateRegex,
  dateRegex,
  parsedLogEntrySchema,
  whaleSpecies,
} from "./types";

const rootDir = path.resolve(__dirname, "..");
const rawDir = path.resolve(rootDir, "data/raw");
const outputDir = path.resolve(rootDir, "data/parsed");

interface ParsedDocSummary {
  file: string;
  entries: number;
  sightings: number;
  crewEvents: number;
  catches: number;
}

const DATE_FORMATS = [
  "d MMM yyyy",
  "d MMMM yyyy",
  "d-M-yyyy",
  "d/M/yyyy",
  "dd-MM-yyyy",
  "dd/MM/yyyy",
  "yyyy-MM-dd",
  "d MMM yy",
  "d MMMM yy",
];

const ensureDir = async (dir: string): Promise<void> => {
  await fs.mkdir(dir, { recursive: true });
};

const readRawFiles = async (): Promise<string[]> => {
  const entries = await fs.readdir(rawDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => path.join(rawDir, entry.name));
};

const normalizeWhitespace = (text: string): string =>
  text.replace(/\s+/g, " ").replace(/\s,\s/g, ", ").trim();

const toDecimal = (degrees: number, minutes: number, sign: string | undefined): number => {
  const decimal = degrees + minutes / 60;
  if (!sign) {
    return decimal;
  }

  if (["S", "W"].includes(sign.toUpperCase())) {
    return -decimal;
  }

  return decimal;
};

const parseCoordinates = (text: string) => {
  const match = coordinateRegex.exec(text);
  if (!match?.groups) {
    return null;
  }

  const latDirection = (match.groups.latDirection ?? match.groups.latSign ?? "").toUpperCase();
  const lonDirection = (match.groups.lonDirection ?? match.groups.lonSign ?? "").toUpperCase();

  const latitude = toDecimal(
    Number.parseFloat(match.groups.latDegrees ?? "0"),
    Number.parseFloat(match.groups.latMinutes ?? "0"),
    latDirection,
  );
  const longitude = toDecimal(
    Number.parseFloat(match.groups.lonDegrees ?? "0"),
    Number.parseFloat(match.groups.lonMinutes ?? "0"),
    lonDirection,
  );

  return {
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    raw: match.groups.raw ?? match[0],
  };
};

const normalizeDate = (rawDate: string): string | null => {
  const cleaned = rawDate.replace(/(st|nd|rd|th)/gi, "").replace(/\s+/g, " ").trim();

  for (const format of DATE_FORMATS) {
    try {
      const parsedDate = parse(cleaned, format, new Date());
      if (!Number.isNaN(parsedDate.getTime())) {
        return formatISO(parsedDate, { representation: "date" });
      }
    } catch {
      // continue
    }
  }

  try {
    const isoParsed = parseISO(cleaned);
    if (!Number.isNaN(isoParsed.getTime())) {
      return formatISO(isoParsed, { representation: "date" });
    }
  } catch {
    // ignore
  }

  return null;
};

const extractTime = (text: string): string | undefined => {
  const timeMatch =
    text.match(/(?:(?:om|at|uur)\s*)?(\d{1,2})[:.](\d{2})(?:\s*uur)?/i) ??
    text.match(/(?:om|at)\s*(\d{1,2})(?:\s*uur)?/i);

  if (!timeMatch) {
    return undefined;
  }

  const hour = Number.parseInt(timeMatch[1], 10);
  const minute = timeMatch[2] ? Number.parseInt(timeMatch[2], 10) : 0;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
};

const extractWeather = (text: string): string | undefined => {
  const weatherMatch = text.match(/(?:Weer|Weather|Wind)[:\s]+([^.\n]+)/i);
  if (!weatherMatch) {
    return undefined;
  }

  return normalizeWhitespace(weatherMatch[1]);
};

const extractHeading = (text: string): string | undefined => {
  const headingMatch = text.match(/(?:Koers|Heading|Course)[:\s]+([^.\n]+)/i);
  return headingMatch ? normalizeWhitespace(headingMatch[1]) : undefined;
};

const extractSeaState = (text: string): string | undefined => {
  const seaMatch = text.match(/(?:Zee|Sea state|Swell)[:\s]+([^.\n]+)/i);
  return seaMatch ? normalizeWhitespace(seaMatch[1]) : undefined;
};

const extractWhaleSightings = (text: string) => {
  const sightings: ParsedLogEntry["whaleSightings"] = [];

  for (const species of whaleSpecies) {
    const regex = new RegExp(`(\\d+)?\\s*(?:${species})`, "i");
    const match = text.match(regex);

    if (match) {
      const count = match[1] ? Number.parseInt(match[1], 10) : 0;
      const captured = /(?:gevangen|captive|captured)/i.test(text);
      sightings.push({
        species,
        count: Number.isNaN(count) ? 0 : count,
        captured,
        notes: normalizeWhitespace(match[0]),
      });
    }
  }

  return sightings;
};

const extractCrewEvents = (text: string) => {
  const events: ParsedLogEntry["crewEvents"] = [];
  const crewRegex =
    /(matroos|schipper|officier|crew|sailor|captain)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*(?:-|:)?\s*([^\n.]+)/gi;

  let match: RegExpExecArray | null;
  while ((match = crewRegex.exec(text)) !== null) {
    events.push({
      crewName: normalizeWhitespace(match[2]),
      role: normalizeWhitespace(match[1]),
      eventType: "incident",
      description: normalizeWhitespace(match[3]),
    });
  }

  return events;
};

const extractCatches = (text: string) => {
  const catches: ParsedLogEntry["catches"] = [];

  const oilMatch = text.match(/(\d+)\s+(?:vaten|barrels?)\s+(?:olie|oil)/i);
  const blubberMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilogram)\s+(?:spek|blubber)/i);

  if (oilMatch || blubberMatch) {
    catches.push({
      barrelsOil: oilMatch ? Number.parseInt(oilMatch[1], 10) : undefined,
      blubberWeightKg: blubberMatch ? Number.parseFloat(blubberMatch[1]) : undefined,
      notes: normalizeWhitespace([oilMatch?.[0], blubberMatch?.[0]].filter(Boolean).join(", ")),
    });
  }

  return catches;
};

const splitIntoEntries = (text: string): string[] => {
  const entryRegex =
    /(?=\b(?:\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}))/g;
  return text
    .split(entryRegex)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const parseEntry = (text: string) => {
  const dateMatch = text.match(dateRegex);
  if (!dateMatch?.groups?.raw) {
    return null;
  }

  const normalizedDate = normalizeDate(dateMatch.groups.raw);
  if (!normalizedDate) {
    return null;
  }

  const location = parseCoordinates(text);

  const parsed: ParsedLogEntry = {
    logEntry: {
      entryDate: normalizedDate,
      entryTime: extractTime(text),
      rawText: text,
      weather: extractWeather(text),
      heading: extractHeading(text),
      seaState: extractSeaState(text),
      location: location ?? undefined,
      voyageId: undefined,
      shipName: undefined,
    },
    whaleSightings: extractWhaleSightings(text),
    crewEvents: extractCrewEvents(text),
    catches: extractCatches(text),
  };

  return parsedLogEntrySchema.parse(parsed);
};

interface ParsedDocResult extends ParsedDocSummary {
  entriesData: ParsedLogEntry[];
}

const parseDocument = (content: {
  pages: { text: string }[];
  fileName: string;
}): ParsedDocResult => {
  const combinedText = content.pages.map((page) => page.text).join("\n\n");
  const entryTexts = splitIntoEntries(combinedText);

  const parsedEntries: ParsedLogEntry[] = [];

  for (const entryText of entryTexts) {
    const parsedEntry = parseEntry(entryText);
    if (parsedEntry) {
      parsedEntries.push(parsedEntry);
    }
  }

  const summary: ParsedDocResult = {
    file: content.fileName,
    entries: parsedEntries.length,
    sightings: parsedEntries.reduce(
      (acc, entry) => acc + entry.whaleSightings.length,
      0,
    ),
    crewEvents: parsedEntries.reduce((acc, entry) => acc + entry.crewEvents.length, 0),
    catches: parsedEntries.reduce((acc, entry) => acc + entry.catches.length, 0),
    entriesData: parsedEntries,
  };

  return summary;
};

const saveParsed = async (
  fileName: string,
  data: ParsedLogEntry[],
  outputDirectory: string,
): Promise<void> => {
  const baseName = fileName.replace(/\.json$/i, "").replace(/\.pdf$/i, "");
  const outPath = path.join(outputDirectory, `${baseName}.parsed.json`);
  await fs.writeFile(outPath, JSON.stringify(data, null, 2), "utf-8");
};

const main = async (): Promise<void> => {
  await ensureDir(outputDir);
  const files = await readRawFiles();

  if (files.length === 0) {
    console.warn(`Geen raw JSON bestanden gevonden in ${rawDir}`);
    return;
  }

  const summaries: ParsedDocSummary[] = [];

  for (const filePath of files) {
    const content = JSON.parse(await fs.readFile(filePath, "utf-8"));
    const result = parseDocument(content);
    await saveParsed(content.fileName, result.entriesData, outputDir);
    summaries.push({
      file: result.file,
      entries: result.entries,
      crewEvents: result.crewEvents,
      sightings: result.sightings,
      catches: result.catches,
    });
  }

  console.table(
    summaries.map((summary) => ({
      Bestand: summary.file,
      Logs: summary.entries,
      Waarnemingen: summary.sightings,
      Bemanning: summary.crewEvents,
      Vangsten: summary.catches,
    })),
  );
};

void main().catch((error) => {
  console.error("Parse script mislukt:", error);
  process.exitCode = 1;
});

