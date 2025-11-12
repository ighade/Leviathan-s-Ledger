import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { run, query, closeDatabase } from '../src/db';

interface ShipData {
  shipName: string;
  shipType?: string;
  homePort?: string;
  voyageStartDate?: string;
  voyageEndDate?: string;
  logEntries: LogEntryData[];
}

interface LogEntryData {
  date: string;
  time?: string;
  latitude?: number;
  longitude?: number;
  weather?: string;
  course?: string;
  windDirection?: string;
  temperature?: number;
  notes: string;
  whaleSightings?: WhaleSightingData[];
  catches?: CatchData[];
  crewEvents?: CrewEventData[];
}

interface WhaleSightingData {
  species?: string;
  count: number;
  caught: boolean;
  notes?: string;
}

interface CatchData {
  whaleCount?: number;
  oilBarrels?: number;
  blubberWeight?: number;
  boneWeight?: number;
  notes?: string;
}

interface CrewEventData {
  crewMemberName?: string;
  role?: string;
  eventType: string;
  description?: string;
}

async function importData() {
  try {
    console.log('🚢 Starting AI-structured data import...\n');
    
    const extractedDataDir = path.join(__dirname, '../../extracted-data');
    
    if (!fs.existsSync(extractedDataDir)) {
      console.error(`❌ Extracted data directory not found: ${extractedDataDir}`);
      console.log('Please run "npm run extract-pdfs-ai" first');
      return;
    }
    
    const files = fs.readdirSync(extractedDataDir).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} extracted files to process\n`);
    
    let totalWhales = 0;
    let totalCatches = 0;
    let totalCrewEvents = 0;
    let totalLogEntries = 0;
    
    for (const file of files) {
      const filePath = path.join(extractedDataDir, file);
      console.log(`📄 Processing: ${file}`);
      
      const shipData: ShipData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Insert or get ship
      const ship = await insertShip({
        name: shipData.shipName,
        type: shipData.shipType,
        homePort: shipData.homePort
      });
      console.log(`  ✓ Ship: ${ship.name} (ID: ${ship.id})`);
      
      // Insert voyage
      const voyageStartDate = shipData.voyageStartDate 
        ? new Date(shipData.voyageStartDate) 
        : new Date('1850-01-01'); // Default historical date
      
      const voyageEndDate = shipData.voyageEndDate 
        ? new Date(shipData.voyageEndDate) 
        : undefined;
      
      const voyage = await insertVoyage({
        shipId: ship.id!,
        startDate: voyageStartDate,
        endDate: voyageEndDate,
      });
      console.log(`  ✓ Voyage created (ID: ${voyage.id})`);
      console.log(`    Start: ${voyageStartDate.toISOString().split('T')[0]}`);
      if (voyageEndDate) {
        console.log(`    End: ${voyageEndDate.toISOString().split('T')[0]}`);
      }
      
      // Insert log entries and related data
      console.log(`  📝 Processing ${shipData.logEntries.length} log entries...`);
      
      for (const entry of shipData.logEntries) {
        try {
          // Parse date - handle various formats
          let entryDate: Date;
          try {
            entryDate = new Date(entry.date);
            // Validate that it's a reasonable historical date
            if (entryDate.getFullYear() > 2000 || entryDate.getFullYear() < 1700) {
              console.warn(`    ⚠️ Suspicious date: ${entry.date}, using voyage start date`);
              entryDate = voyageStartDate;
            }
          } catch (e) {
            console.warn(`    ⚠️ Invalid date: ${entry.date}, using voyage start date`);
            entryDate = voyageStartDate;
          }
          
          const logEntryId = await insertLogEntry({
            voyageId: voyage.id!,
            date: entryDate,
            time: entry.time || null,
            latitude: entry.latitude || null,
            longitude: entry.longitude || null,
            weather: entry.weather || null,
            course: entry.course || null,
            windDirection: entry.windDirection || null,
            temperature: entry.temperature || null,
            notes: entry.notes || '',
            rawText: entry.notes || ''
          });
          
          totalLogEntries++;
          
          // Insert whale sightings
          if (entry.whaleSightings && entry.whaleSightings.length > 0) {
            for (const whale of entry.whaleSightings) {
              await insertWhaleSighting({
                logEntryId,
                species: whale.species,
                count: whale.count,
                latitude: entry.latitude,
                longitude: entry.longitude,
                caught: whale.caught,
                seen: true,
                notes: whale.notes
              });
              totalWhales++;
            }
          }
          
          // Insert catches
          if (entry.catches && entry.catches.length > 0) {
            for (const catchData of entry.catches) {
              await insertCatch({
                logEntryId,
                whaleCount: catchData.whaleCount,
                oilBarrels: catchData.oilBarrels,
                blubberWeight: catchData.blubberWeight,
                boneWeight: catchData.boneWeight,
                notes: catchData.notes
              });
              totalCatches++;
            }
          }
          
          // Insert crew events
          if (entry.crewEvents && entry.crewEvents.length > 0) {
            for (const event of entry.crewEvents) {
              await insertCrewEvent({
                logEntryId,
                crewMemberName: event.crewMemberName,
                role: event.role,
                eventType: event.eventType,
                description: event.description
              });
              totalCrewEvents++;
            }
          }
        } catch (error) {
          console.error(`    ✗ Error processing log entry:`, error);
        }
      }
      
      console.log(`  ✓ Processed ${shipData.logEntries.length} log entries`);
      console.log('');
    }
    
    // Print summary
    const stats = await getImportStats();
    console.log('========================================');
    console.log('📊 Import Summary');
    console.log('========================================');
    console.log(`🚢 Ships:           ${stats.ships}`);
    console.log(`🌊 Voyages:         ${stats.voyages}`);
    console.log(`📝 Log Entries:     ${stats.logEntries}`);
    console.log(`🐋 Whale Sightings: ${stats.whaleSightings}`);
    console.log(`🎣 Catches:         ${stats.catches}`);
    console.log(`👥 Crew Events:     ${stats.crewEvents}`);
    console.log('========================================');
    console.log('\n✅ Data import complete!');
    
  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

async function insertShip(ship: { name: string; type?: string; homePort?: string }): Promise<{ id: number; name: string }> {
  // Check if ship already exists
  const existing = await query<{ id: number; name: string }>(
    'SELECT * FROM ships WHERE name = ?', 
    [ship.name]
  );
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  const result = await run(
    'INSERT INTO ships (name, type, home_port) VALUES (?, ?, ?)',
    [ship.name, ship.type || null, ship.homePort || null]
  );
  
  return { id: result.lastID, name: ship.name };
}

async function insertVoyage(voyage: { 
  shipId: number; 
  startDate: Date; 
  endDate?: Date; 
  route?: string 
}): Promise<{ id: number; shipId: number; startDate: Date; endDate?: Date }> {
  const result = await run(
    'INSERT INTO voyages (ship_id, start_date, end_date, route) VALUES (?, ?, ?, ?)',
    [
      voyage.shipId, 
      voyage.startDate.toISOString(), 
      voyage.endDate?.toISOString() || null, 
      voyage.route || null
    ]
  );
  
  return { 
    id: result.lastID, 
    shipId: voyage.shipId, 
    startDate: voyage.startDate,
    endDate: voyage.endDate
  };
}

async function insertLogEntry(entry: {
  voyageId: number;
  date: Date;
  time: string | null;
  latitude: number | null;
  longitude: number | null;
  weather: string | null;
  course: string | null;
  windDirection: string | null;
  temperature: number | null;
  notes: string;
  rawText: string;
}): Promise<number> {
  const result = await run(
    `INSERT INTO log_entries 
    (voyage_id, date, time, latitude, longitude, weather, course, wind_direction, temperature, notes, raw_text) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.voyageId,
      entry.date.toISOString(),
      entry.time,
      entry.latitude,
      entry.longitude,
      entry.weather,
      entry.course,
      entry.windDirection,
      entry.temperature,
      entry.notes,
      entry.rawText
    ]
  );
  
  return result.lastID;
}

async function insertWhaleSighting(sighting: {
  logEntryId: number;
  species?: string | null;
  count: number;
  latitude?: number | null;
  longitude?: number | null;
  caught: boolean;
  seen: boolean;
  notes?: string | null;
}): Promise<void> {
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

async function insertCatch(catchData: {
  logEntryId: number;
  whaleCount?: number | null;
  oilBarrels?: number | null;
  blubberWeight?: number | null;
  boneWeight?: number | null;
  notes?: string | null;
}): Promise<void> {
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

async function insertCrewEvent(event: {
  logEntryId: number;
  crewMemberName?: string | null;
  role?: string | null;
  eventType: string;
  description?: string | null;
}): Promise<void> {
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
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

