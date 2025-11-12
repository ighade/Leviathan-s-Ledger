import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Ship {
  id: number;
  name: string;
  type?: string;
  home_port?: string;
}

export interface Voyage {
  id: number;
  ship_id: number;
  ship_name?: string;
  start_date: string;
  end_date?: string;
  route?: string;
}

export interface LogEntry {
  id: number;
  voyage_id: number;
  ship_name?: string;
  date: string;
  time?: string;
  latitude?: number;
  longitude?: number;
  weather?: string;
  course?: string;
  wind_direction?: string;
  temperature?: number;
  notes?: string;
  raw_text: string;
}

export interface WhaleSighting {
  id: number;
  log_entry_id: number;
  species?: string;
  count: number;
  latitude?: number;
  longitude?: number;
  caught: boolean;
  seen: boolean;
  notes?: string;
  date?: string;
  ship_name?: string;
}

export interface Statistics {
  overview: {
    totalShips: number;
    totalVoyages: number;
    totalLogEntries: number;
    totalSightings: number;
    totalWhales: number;
    totalCatches: number;
    totalOilBarrels: number;
  };
  speciesBreakdown: Array<{
    species: string;
    sightings: number;
    totalCount: number;
    caughtCount: number;
  }>;
  catchesByMonth: Array<{
    month: string;
    catchCount: number;
    oilBarrels: number;
  }>;
  huntingAreas: Array<{
    lat: number;
    lon: number;
    sightings: number;
    catches: number;
  }>;
}

export interface TimelineEvent {
  eventType: string;
  date: string;
  shipName: string;
  [key: string]: any;
}

// API functions
export const getShips = () => api.get<Ship[]>('/ships').then(res => res.data);

export const getVoyages = (params?: { shipId?: number; startDate?: string; endDate?: string }) =>
  api.get<Voyage[]>('/voyages', { params }).then(res => res.data);

export const getLogEntries = (params?: { 
  page?: number; 
  limit?: number; 
  voyageId?: number;
  startDate?: string;
  endDate?: string;
  hasCoordinates?: boolean;
}) => api.get('/log-entries', { params }).then(res => res.data);

export const getLogEntry = (id: number) => 
  api.get<LogEntry>(`/log-entries/${id}`).then(res => res.data);

export const getWhaleSightings = (params?: {
  species?: string;
  caught?: boolean;
  startDate?: string;
  endDate?: string;
  minLat?: number;
  maxLat?: number;
  minLon?: number;
  maxLon?: number;
}) => api.get<WhaleSighting[]>('/whale-sightings', { params }).then(res => res.data);

export const getStatistics = () => 
  api.get<Statistics>('/statistics').then(res => res.data);

export const getTimeline = (params?: { startDate?: string; endDate?: string; type?: string }) =>
  api.get<TimelineEvent[]>('/timeline', { params }).then(res => res.data);

export default api;

