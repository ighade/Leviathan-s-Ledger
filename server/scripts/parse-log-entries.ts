import { LogEntry, WhaleSighting, Catch, CrewEvent, ParsedLogData } from './types';

// Regular expressions for parsing
const DATE_PATTERNS = [
  /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4}|\d{2})/g,  // DD/MM/YYYY or DD-MM-YY
  /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/g,       // YYYY/MM/DD
  /(\w+)\s+(\d{1,2}),?\s+(\d{4})/g,                   // Month DD, YYYY
];

const COORDINATE_PATTERNS = [
  /(\d+)[°\s]+(\d+)['\s]+([NS])\s+(\d+)[°\s]+(\d+)['\s]+([EW])/gi,  // 52° 10' N 4° 20' E
  /(\d+\.?\d*)[°\s]+([NS])\s+(\d+\.?\d*)[°\s]+([EW])/gi,            // 52.5° N 4.3° E
];

const WHALE_KEYWORDS = [
  'walvis', 'walvisch', 'whale', 'vinvis', 'bultrug', 'potvis', 'sperm whale',
  'right whale', 'bowhead', 'humpback', 'blue whale', 'fin whale'
];

const CATCH_KEYWORDS = [
  'gevangen', 'vaten', 'barrels', 'spek', 'blubber', 'baleinen', 'bone',
  'caught', 'killed', 'harpooned'
];

const CREW_EVENT_KEYWORDS = [
  'ziek', 'ill', 'sick', 'gestorven', 'died', 'death', 'overleden',
  'gewond', 'injured', 'injury', 'accident', 'ongeval'
];

export function parseCoordinates(text: string): { latitude?: number; longitude?: number } | null {
  for (const pattern of COORDINATE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      // Parse different coordinate formats
      if (match.length === 7) {
        // Format: 52° 10' N 4° 20' E
        const latDeg = parseInt(match[1]);
        const latMin = parseInt(match[2]);
        const latDir = match[3].toUpperCase();
        const lonDeg = parseInt(match[4]);
        const lonMin = parseInt(match[5]);
        let lonDir = match[6].toUpperCase();
        
        // Correctie: E moet W zijn (maak negatief)
        if (lonDir === 'E') {
          lonDir = 'W';
        }
        
        const latitude = (latDeg + latMin / 60) * (latDir === 'S' ? -1 : 1);
        const longitude = (lonDeg + lonMin / 60) * (lonDir === 'W' ? -1 : 1);
        
        return { latitude, longitude };
      } else if (match.length === 5) {
        // Format: 52.5° N 4.3° E
        const lat = parseFloat(match[1]);
        const latDir = match[2].toUpperCase();
        const lon = parseFloat(match[3]);
        let lonDir = match[4].toUpperCase();
        
        // Correctie: E moet W zijn (maak negatief)
        if (lonDir === 'E') {
          lonDir = 'W';
        }
        
        const latitude = lat * (latDir === 'S' ? -1 : 1);
        const longitude = lon * (lonDir === 'W' ? -1 : 1);
        
        return { latitude, longitude };
      }
    }
  }
  return null;
}

export function extractDate(text: string): Date | null {
  for (const pattern of DATE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      // Try to parse the date
      try {
        // This is a simple implementation - you may need to adjust based on actual date formats
        const dateStr = match[0];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        continue;
      }
    }
  }
  return null;
}

export function detectWhaleReferences(text: string): boolean {
  const lowerText = text.toLowerCase();
  return WHALE_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

export function detectCatchReferences(text: string): boolean {
  const lowerText = text.toLowerCase();
  return CATCH_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

export function detectCrewEvents(text: string): boolean {
  const lowerText = text.toLowerCase();
  return CREW_EVENT_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

export function extractNumbers(text: string): number[] {
  const numbers: number[] = [];
  const numberPattern = /\b(\d+)\b/g;
  let match;
  
  while ((match = numberPattern.exec(text)) !== null) {
    numbers.push(parseInt(match[1]));
  }
  
  return numbers;
}

export function splitIntoEntries(text: string): string[] {
  // Split text by common log entry delimiters
  // This is a simplified version - adjust based on actual log format
  const entries: string[] = [];
  
  // Try splitting by date patterns or paragraph breaks
  const lines = text.split(/\n\n+/);
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 20) { // Minimum length for a valid entry
      entries.push(trimmed);
    }
  }
  
  return entries;
}

export function parseLogText(text: string, voyageId: number = 1): LogEntry[] {
  const entries: LogEntry[] = [];
  const rawEntries = splitIntoEntries(text);
  
  for (const rawText of rawEntries) {
    const date = extractDate(rawText) || new Date();
    const coords = parseCoordinates(rawText);
    
    const entry: LogEntry = {
      voyageId,
      date,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      rawText,
    };
    
    entries.push(entry);
  }
  
  return entries;
}

export function extractWhaleSightings(logEntry: LogEntry, logEntryId: number): WhaleSighting[] {
  const sightings: WhaleSighting[] = [];
  
  if (detectWhaleReferences(logEntry.rawText)) {
    const numbers = extractNumbers(logEntry.rawText);
    const count = numbers.length > 0 ? numbers[0] : 1;
    const caught = detectCatchReferences(logEntry.rawText);
    
    sightings.push({
      logEntryId,
      count,
      latitude: logEntry.latitude,
      longitude: logEntry.longitude,
      caught,
      seen: true,
      notes: logEntry.rawText.substring(0, 200),
    });
  }
  
  return sightings;
}

export function extractCatches(logEntry: LogEntry, logEntryId: number): Catch[] {
  const catches: Catch[] = [];
  
  if (detectCatchReferences(logEntry.rawText)) {
    const numbers = extractNumbers(logEntry.rawText);
    
    catches.push({
      logEntryId,
      whaleCount: numbers.length > 0 ? numbers[0] : undefined,
      oilBarrels: numbers.length > 1 ? numbers[1] : undefined,
      notes: logEntry.rawText.substring(0, 200),
    });
  }
  
  return catches;
}

export function extractCrewEvents(logEntry: LogEntry, logEntryId: number): CrewEvent[] {
  const events: CrewEvent[] = [];
  
  if (detectCrewEvents(logEntry.rawText)) {
    const lowerText = logEntry.rawText.toLowerCase();
    
    let eventType = 'other';
    if (lowerText.includes('ziek') || lowerText.includes('ill') || lowerText.includes('sick')) {
      eventType = 'illness';
    } else if (lowerText.includes('gestorven') || lowerText.includes('died') || lowerText.includes('death')) {
      eventType = 'death';
    } else if (lowerText.includes('gewond') || lowerText.includes('injured') || lowerText.includes('injury')) {
      eventType = 'injury';
    }
    
    events.push({
      logEntryId,
      eventType,
      description: logEntry.rawText.substring(0, 200),
    });
  }
  
  return events;
}

