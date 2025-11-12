import express from 'express';
import { query } from '../db';

const router = express.Router();

// GET /api/statistics - Get overall statistics
router.get('/', async (req, res) => {
  try {
    // Total ships
    const shipsResult = await query<{ totalShips: number }>(
      'SELECT COUNT(*) as totalShips FROM ships'
    );
    const totalShips = shipsResult[0]?.totalShips || 0;
    
    // Total voyages
    const voyagesResult = await query<{ totalVoyages: number }>(
      'SELECT COUNT(*) as totalVoyages FROM voyages'
    );
    const totalVoyages = voyagesResult[0]?.totalVoyages || 0;
    
    // Total log entries
    const logEntriesResult = await query<{ totalLogEntries: number }>(
      'SELECT COUNT(*) as totalLogEntries FROM log_entries'
    );
    const totalLogEntries = logEntriesResult[0]?.totalLogEntries || 0;
    
    // Total whale sightings
    const sightingsResult = await query<{ totalSightings: number; totalWhales: number }>(
      'SELECT COUNT(*) as totalSightings, COALESCE(SUM(count), 0) as totalWhales FROM whale_sightings'
    );
    const totalSightings = sightingsResult[0]?.totalSightings || 0;
    const totalWhales = sightingsResult[0]?.totalWhales || 0;
    
    // Total catches
    const catchesResult = await query<{ totalCatches: number; totalOilBarrels: number }>(
      'SELECT COUNT(*) as totalCatches, COALESCE(SUM(oil_barrels), 0) as totalOilBarrels FROM catches WHERE oil_barrels IS NOT NULL'
    );
    const totalCatches = catchesResult[0]?.totalCatches || 0;
    const totalOilBarrels = catchesResult[0]?.totalOilBarrels || 0;
    
    // Whale species breakdown
    const speciesBreakdown = await query(`
      SELECT 
        COALESCE(species, 'Unknown') as species,
        COUNT(*) as sightings,
        COALESCE(SUM(count), 0) as totalCount,
        COALESCE(SUM(CASE WHEN caught = 1 THEN count ELSE 0 END), 0) as caughtCount
      FROM whale_sightings
      GROUP BY species
      ORDER BY totalCount DESC
      LIMIT 10
    `).catch(() => []);
    
    // Catches over time (by month)
    const catchesByMonth = await query(`
      SELECT 
        strftime('%Y-%m', le.date) as month,
        COUNT(c.id) as catchCount,
        COALESCE(SUM(c.oil_barrels), 0) as oilBarrels
      FROM catches c
      JOIN log_entries le ON c.log_entry_id = le.id
      WHERE c.oil_barrels IS NOT NULL
      GROUP BY month
      ORDER BY month
    `).catch(() => []);
    
    // Popular hunting areas (grid-based)
    const huntingAreas = await query(`
      SELECT 
        ROUND(ws.latitude, 0) as lat,
        ROUND(ws.longitude, 0) as lon,
        COUNT(*) as sightings,
        COALESCE(SUM(CASE WHEN ws.caught = 1 THEN 1 ELSE 0 END), 0) as catches
      FROM whale_sightings ws
      WHERE ws.latitude IS NOT NULL AND ws.longitude IS NOT NULL
      GROUP BY lat, lon
      HAVING sightings > 0
      ORDER BY sightings DESC
      LIMIT 50
    `).catch(() => []);
    
    res.json({
      overview: {
        totalShips,
        totalVoyages,
        totalLogEntries,
        totalSightings,
        totalWhales,
        totalCatches,
        totalOilBarrels,
      },
      speciesBreakdown: speciesBreakdown || [],
      catchesByMonth: catchesByMonth || [],
      huntingAreas: huntingAreas || [],
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/statistics/voyages - Voyage statistics
router.get('/voyages', async (req, res) => {
  try {
    const voyageStats = await query(`
      SELECT 
        v.id,
        s.name as shipName,
        v.start_date,
        v.end_date,
        COUNT(DISTINCT le.id) as logEntryCount,
        COUNT(DISTINCT ws.id) as whaleSightings,
        SUM(CASE WHEN ws.caught = 1 THEN ws.count ELSE 0 END) as whalesCaught,
        SUM(c.oil_barrels) as totalOilBarrels
      FROM voyages v
      JOIN ships s ON v.ship_id = s.id
      LEFT JOIN log_entries le ON le.voyage_id = v.id
      LEFT JOIN whale_sightings ws ON ws.log_entry_id = le.id
      LEFT JOIN catches c ON c.log_entry_id = le.id
      GROUP BY v.id
      ORDER BY v.start_date DESC
    `);
    
    res.json(voyageStats);
  } catch (error) {
    console.error('Error fetching voyage statistics:', error);
    res.status(500).json({ error: 'Failed to fetch voyage statistics' });
  }
});

export default router;

