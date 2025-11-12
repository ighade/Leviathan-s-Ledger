-- Leviathan's Ledger Database Schema

-- Ships table
CREATE TABLE IF NOT EXISTS ships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT,
  home_port TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Voyages table
CREATE TABLE IF NOT EXISTS voyages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ship_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  route TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE
);

-- Log entries table
CREATE TABLE IF NOT EXISTS log_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voyage_id INTEGER NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  latitude REAL,
  longitude REAL,
  weather TEXT,
  course TEXT,
  wind_direction TEXT,
  temperature REAL,
  notes TEXT,
  raw_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (voyage_id) REFERENCES voyages(id) ON DELETE CASCADE
);

-- Whale sightings table
CREATE TABLE IF NOT EXISTS whale_sightings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_entry_id INTEGER NOT NULL,
  species TEXT,
  count INTEGER NOT NULL DEFAULT 1,
  latitude REAL,
  longitude REAL,
  caught BOOLEAN DEFAULT 0,
  seen BOOLEAN DEFAULT 1,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (log_entry_id) REFERENCES log_entries(id) ON DELETE CASCADE
);

-- Crew events table
CREATE TABLE IF NOT EXISTS crew_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_entry_id INTEGER NOT NULL,
  crew_member_name TEXT,
  role TEXT,
  event_type TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (log_entry_id) REFERENCES log_entries(id) ON DELETE CASCADE
);

-- Catches table
CREATE TABLE IF NOT EXISTS catches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_entry_id INTEGER NOT NULL,
  whale_count INTEGER,
  oil_barrels INTEGER,
  blubber_weight REAL,
  bone_weight REAL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (log_entry_id) REFERENCES log_entries(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_voyages_ship_id ON voyages(ship_id);
CREATE INDEX IF NOT EXISTS idx_voyages_dates ON voyages(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_log_entries_voyage_id ON log_entries(voyage_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_date ON log_entries(date);
CREATE INDEX IF NOT EXISTS idx_log_entries_location ON log_entries(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_whale_sightings_log_entry_id ON whale_sightings(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_whale_sightings_location ON whale_sightings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_whale_sightings_species ON whale_sightings(species);
CREATE INDEX IF NOT EXISTS idx_crew_events_log_entry_id ON crew_events(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_crew_events_type ON crew_events(event_type);
CREATE INDEX IF NOT EXISTS idx_catches_log_entry_id ON catches(log_entry_id);

