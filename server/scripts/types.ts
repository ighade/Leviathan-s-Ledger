// Type definitions for ship log data models

export interface Ship {
  id?: number;
  name: string;
  type?: string;
  homePort?: string;
}

export interface Voyage {
  id?: number;
  shipId: number;
  startDate: Date;
  endDate?: Date;
  route?: string;
}

export interface LogEntry {
  id?: number;
  voyageId: number;
  date: Date;
  time?: string;
  latitude?: number;
  longitude?: number;
  weather?: string;
  course?: string;
  windDirection?: string;
  temperature?: number;
  notes?: string;
  rawText: string;
}

export interface WhaleSighting {
  id?: number;
  logEntryId: number;
  species?: string;
  count: number;
  latitude?: number;
  longitude?: number;
  caught: boolean;
  seen: boolean;
  notes?: string;
}

export interface CrewEvent {
  id?: number;
  logEntryId: number;
  crewMemberName?: string;
  role?: string;
  eventType: string; // illness, injury, death, promotion, etc.
  description?: string;
}

export interface Catch {
  id?: number;
  logEntryId: number;
  whaleCount?: number;
  oilBarrels?: number;
  blubberWeight?: number;
  boneWeight?: number;
  notes?: string;
}

export interface ParsedLogData {
  ships: Ship[];
  voyages: Voyage[];
  logEntries: LogEntry[];
  whaleSightings: WhaleSighting[];
  crewEvents: CrewEvent[];
  catches: Catch[];
}

