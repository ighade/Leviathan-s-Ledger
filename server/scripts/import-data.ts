import fs from 'fs';
import path from 'path';
import { run, query, closeDatabase } from '../src/db';
import { parseLogText, extractWhaleSightings, extractCatches, extractCrewEvents } from './parse-log-entries';
import { Ship, Voyage, LogEntry } from './types';

async function importData() {
  try {
    console.log('Starting data import...\n');
    
    const extractedDataDir = path.join(__dirname, '../../extracted-data');
    
    if (!fs.existsSync(extractedDataDir)) {
      console.error(`Extracted data directory not found: ${extractedDataDir}`);
      console.log('Please run "npm run extract-pdfs" first');
      return;
    }
    
    const files = fs.readdirSync(extractedDataDir).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} extracted files to process\n`);
    
    for (const file of files) {
      const filePath = path.join(extractedDataDir, file);
      console.log(`Processing: ${file}`);
      
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const { shipName, startYear, endYear } = extractShipName(data.filename, data.text);

  // Insert or get ship
  const ship = await insertShip({ name: shipName });
      console.log(`  ✓ Ship: ${ship.name} (ID: ${ship.id})`);
      
      // Insert voyage
      // Determine voyage dates. If we parsed years from the text, use them; otherwise keep the old default.
      const voyageStart = startYear ? new Date(`${startYear}-01-01`) : new Date('1900-01-01');
      const voyageEnd = endYear ? new Date(`${endYear}-12-31`) : undefined;

      const voyage = await insertVoyage({
        shipId: ship.id!,
        startDate: voyageStart,
        endDate: voyageEnd,
      });
      console.log(`  ✓ Voyage created (ID: ${voyage.id})`);
      
      // Parse log entries
      const logEntries = parseLogText(data.text, voyage.id!);
      console.log(`  ✓ Parsed ${logEntries.length} log entries`);
      
      let totalWhales = 0;
      let totalCatches = 0;
      let totalCrewEvents = 0;
      
      // Insert log entries and related data
      for (const entry of logEntries) {
        const logEntryId = await insertLogEntry(entry);
        
        // Extract and insert whale sightings
        const whales = extractWhaleSightings(entry, logEntryId);
        for (const whale of whales) {
          await insertWhaleSighting(whale);
          totalWhales++;
        }
        
        // Extract and insert catches
        const catches = extractCatches(entry, logEntryId);
        for (const catchData of catches) {
          await insertCatch(catchData);
          totalCatches++;
        }
        
        // Extract and insert crew events
        const crewEvents = extractCrewEvents(entry, logEntryId);
        for (const event of crewEvents) {
          await insertCrewEvent(event);
          totalCrewEvents++;
        }
      }
      
      console.log(`  ✓ Inserted ${totalWhales} whale sightings`);
      console.log(`  ✓ Inserted ${totalCatches} catch records`);
      console.log(`  ✓ Inserted ${totalCrewEvents} crew events\n`);
    }
    
    // Print summary
    const stats = await getImportStats();
    console.log('=== Import Summary ===');
    console.log(`Ships: ${stats.ships}`);
    console.log(`Voyages: ${stats.voyages}`);
    console.log(`Log Entries: ${stats.logEntries}`);
    console.log(`Whale Sightings: ${stats.whaleSightings}`);
    console.log(`Catches: ${stats.catches}`);
    console.log(`Crew Events: ${stats.crewEvents}`);
    console.log('\n✓ Data import complete!');
    
  } catch (error) {
    console.error('Error during import:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

function extractShipName(filename: string, text?: string): { shipName: string; startYear?: number | null; endYear?: number | null } {
  // Try to extract ship name and voyage years from the extracted text first.
  // Example text: "MS220 Log 2, Log of the ship Albion, 1854-1857"
  if (text) {
    // Common pattern: "Log of the ship <Name>, <YYYY>[-<YYYY>]"
    const regex = /Log\s+of\s+the\s+ship\s+([A-Za-z0-9 .\-'\"]+?)\s*,\s*(\d{4})(?:\s*[-–—]\s*(\d{4}))?/i;
    const match = text.match(regex);
    if (match) {
      const shipName = match[1].trim();
      const startYear = match[2] ? parseInt(match[2], 10) : null;
      const endYear = match[3] ? parseInt(match[3], 10) : null;
      return { shipName, startYear, endYear };
    }

    // Fallback pattern: "Log of the ship <Name>" possibly on its own line followed by a year range
    const altRegex = /Log\s+of\s+the\s+ship\s+([A-Za-z0-9 .\-'\"]+?)(?:[\n\r]|,|\s)\s*(?:[,\-\s]*?(\d{4})(?:\s*[-–—]\s*(\d{4}))?)?/i;
    const altMatch = text.match(altRegex);
    if (altMatch) {
      const shipName = altMatch[1].trim();
      const startYear = altMatch[2] ? parseInt(altMatch[2], 10) : null;
      const endYear = altMatch[3] ? parseInt(altMatch[3], 10) : null;
      return { shipName, startYear, endYear };
    }
  }

  // If we couldn't find the name in the text, fall back to the filename pattern
  const match = filename.match(/ms(\d+)/i);
  if (match) {
    return { shipName: `MS-${match[1]}`, startYear: null, endYear: null };
  }

  // Default fallback: strip extension and use filename
  return { shipName: filename.replace(/\.[^/.]+$/, ''), startYear: null, endYear: null };
}

async function insertShip(ship: Ship): Promise<Ship> {
  // Check if ship already exists
  const existing = await query<Ship>('SELECT * FROM ships WHERE name = ?', [ship.name]);
  if (existing.length > 0) {
    return existing[0];
  }
  
  const result = await run(
    'INSERT INTO ships (name, type, home_port) VALUES (?, ?, ?)',
    [ship.name, ship.type || null, ship.homePort || null]
  );
  
  return { ...ship, id: result.lastID };
}

async function insertVoyage(voyage: Voyage): Promise<Voyage> {
  const result = await run(
    'INSERT INTO voyages (ship_id, start_date, end_date, route) VALUES (?, ?, ?, ?)',
    [voyage.shipId, voyage.startDate.toISOString(), voyage.endDate?.toISOString() || null, voyage.route || null]
  );
  
  return { ...voyage, id: result.lastID };
}

async function insertLogEntry(entry: LogEntry): Promise<number> {
  const result = await run(
    `INSERT INTO log_entries 
    (voyage_id, date, time, latitude, longitude, weather, course, wind_direction, temperature, notes, raw_text) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.voyageId,
      entry.date.toISOString(),
      entry.time || null,
      entry.latitude || null,
      entry.longitude || null,
      entry.weather || null,
      entry.course || null,
      entry.windDirection || null,
      entry.temperature || null,
      entry.notes || null,
      entry.rawText
    ]
  );
  
  return result.lastID;
}

async function insertWhaleSighting(sighting: any): Promise<void> {
  await run(
    `INSERT INTO whale_sightings 
    (log_entry_id, species, count, latitude, longitude, caught, seen, notes) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sighting.logEntryId,
      sighting.species || null,
      sighting.count,
      sighting.latitude || null,
      sighting.longitude || null,
      sighting.caught ? 1 : 0,
      sighting.seen ? 1 : 0,
      sighting.notes || null
    ]
  );
}

async function insertCatch(catchData: any): Promise<void> {
  await run(
    `INSERT INTO catches 
    (log_entry_id, whale_count, oil_barrels, blubber_weight, bone_weight, notes) 
    VALUES (?, ?, ?, ?, ?, ?)`,
    [
      catchData.logEntryId,
      catchData.whaleCount || null,
      catchData.oilBarrels || null,
      catchData.blubberWeight || null,
      catchData.boneWeight || null,
      catchData.notes || null
    ]
  );
}

async function insertCrewEvent(event: any): Promise<void> {
  await run(
    `INSERT INTO crew_events 
    (log_entry_id, crew_member_name, role, event_type, description) 
    VALUES (?, ?, ?, ?, ?)`,
    [
      event.logEntryId,
      event.crewMemberName || null,
      event.role || null,
      event.eventType,
      event.description || null
    ]
  );
}

async function getImportStats() {
  const [ships] = await query<{ count: number }>('SELECT COUNT(*) as count FROM ships');
  const [voyages] = await query<{ count: number }>('SELECT COUNT(*) as count FROM voyages');
  const [logEntries] = await query<{ count: number }>('SELECT COUNT(*) as count FROM log_entries');
  const [whaleSightings] = await query<{ count: number }>('SELECT COUNT(*) as count FROM whale_sightings');
  const [catches] = await query<{ count: number }>('SELECT COUNT(*) as count FROM catches');
  const [crewEvents] = await query<{ count: number }>('SELECT COUNT(*) as count FROM crew_events');
  
  return {
    ships: ships.count,
    voyages: voyages.count,
    logEntries: logEntries.count,
    whaleSightings: whaleSightings.count,
    catches: catches.count,
    crewEvents: crewEvents.count,
  };
}

// Run import
importData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

