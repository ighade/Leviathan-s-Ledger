import { z } from "zod";

export const coordinateRegex =
  /(?<latSign>[NS])?\s*(?<latDegrees>\d{1,2})[°\s]+(?<latMinutes>\d{1,2}(?:\.\d+)?)['\s]*(?<latDirection>[NS])?\s*(?<lonSign>[EW])?\s*(?<lonDegrees>\d{1,3})[°\s]+(?<lonMinutes>\d{1,2}(?:\.\d+)?)['\s]*(?<lonDirection>[EW])?/i;

export const dateRegex =
  /(?<raw>(?<day>\d{1,2})[-\/\s](?<month>\d{1,2}|[A-Za-z]{3,})(?:[-\/\s](?<year>\d{2,4}))?)/;

export const whaleSpecies = [
  "blauwe vinvis",
  "potvis",
  "bultrug",
  "noordkaper",
  "vinvis",
  "grijze vinvis",
  "walrus",
  "narwal",
] as const;

export const shipSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  type: z.string().optional(),
  homePort: z.string().optional(),
});

export type Ship = z.infer<typeof shipSchema>;

export const voyageSchema = z.object({
  id: z.string().uuid().optional(),
  shipName: z.string(),
  departureDate: z.string().optional(),
  returnDate: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  notes: z.string().optional(),
});

export type Voyage = z.infer<typeof voyageSchema>;

export const logEntrySchema = z.object({
  id: z.string().uuid().optional(),
  voyageId: z.string().optional(),
  shipName: z.string().optional(),
  entryDate: z.string(),
  entryTime: z.string().optional(),
  rawText: z.string(),
  weather: z.string().optional(),
  location: z
    .object({
      latitude: z.number().nullable(),
      longitude: z.number().nullable(),
      raw: z.string().optional(),
    })
    .optional(),
  heading: z.string().optional(),
  seaState: z.string().optional(),
});

export type LogEntry = z.infer<typeof logEntrySchema>;

export const whaleSightingSchema = z.object({
  id: z.string().uuid().optional(),
  logEntryId: z.string().optional(),
  species: z.string(),
  count: z.number().int().nonnegative().default(0),
  captured: z.boolean().optional(),
  notes: z.string().optional(),
});

export type WhaleSighting = z.infer<typeof whaleSightingSchema>;

export const crewEventSchema = z.object({
  id: z.string().uuid().optional(),
  logEntryId: z.string().optional(),
  crewName: z.string(),
  role: z.string().optional(),
  eventType: z.string(),
  description: z.string().optional(),
});

export type CrewEvent = z.infer<typeof crewEventSchema>;

export const catchRecordSchema = z.object({
  id: z.string().uuid().optional(),
  logEntryId: z.string().optional(),
  barrelsOil: z.number().int().nonnegative().optional(),
  blubberWeightKg: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export type CatchRecord = z.infer<typeof catchRecordSchema>;

export const parsedLogEntrySchema = z.object({
  logEntry: logEntrySchema,
  whaleSightings: z.array(whaleSightingSchema).default([]),
  crewEvents: z.array(crewEventSchema).default([]),
  catches: z.array(catchRecordSchema).default([]),
});

export type ParsedLogEntry = z.infer<typeof parsedLogEntrySchema>;

export interface ExtractedPage {
  fileName: string;
  pageNumber: number;
  text: string;
}

export interface ExtractedDocument {
  fileName: string;
  pages: ExtractedPage[];
  extractedAt: string;
}

