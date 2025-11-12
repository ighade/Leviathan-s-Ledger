import express from 'express';
import { query } from '../db';

const router = express.Router();

// GET /api/voyages - Get all voyages with optional filters
router.get('/', async (req, res) => {
  try {
    const { shipId, startDate, endDate } = req.query;
    
    let sql = `
      SELECT v.*, s.name as ship_name, s.home_port
      FROM voyages v
      JOIN ships s ON v.ship_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (shipId) {
      sql += ' AND v.ship_id = ?';
      params.push(shipId);
    }
    
    if (startDate) {
      sql += ' AND v.start_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND (v.end_date IS NULL OR v.end_date <= ?)';
      params.push(endDate);
    }
    
    sql += ' ORDER BY v.start_date DESC';
    
    const voyages = await query(sql, params);
    res.json(voyages);
  } catch (error) {
    console.error('Error fetching voyages:', error);
    res.status(500).json({ error: 'Failed to fetch voyages' });
  }
});

// GET /api/voyages/:id - Get single voyage
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const voyages = await query(
      `SELECT v.*, s.name as ship_name, s.home_port
       FROM voyages v
       JOIN ships s ON v.ship_id = s.id
       WHERE v.id = ?`,
      [id]
    );
    
    if (voyages.length === 0) {
      return res.status(404).json({ error: 'Voyage not found' });
    }
    
    res.json(voyages[0]);
  } catch (error) {
    console.error('Error fetching voyage:', error);
    res.status(500).json({ error: 'Failed to fetch voyage' });
  }
});

// GET /api/voyages/:id/log-entries - Get all log entries for a voyage
router.get('/:id/log-entries', async (req, res) => {
  try {
    const { id } = req.params;
    const logEntries = await query(
      'SELECT * FROM log_entries WHERE voyage_id = ? ORDER BY date, time',
      [id]
    );
    
    res.json(logEntries);
  } catch (error) {
    console.error('Error fetching voyage log entries:', error);
    res.status(500).json({ error: 'Failed to fetch voyage log entries' });
  }
});

// GET /api/voyages/:id/route - Get route data (log entries with coordinates) for a voyage
router.get('/:id/route', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get log entries with coordinates
    const logEntries = await query(
      `SELECT le.*, s.name as ship_name
       FROM log_entries le
       JOIN voyages v ON le.voyage_id = v.id
       JOIN ships s ON v.ship_id = s.id
       WHERE le.voyage_id = ? 
         AND le.latitude IS NOT NULL 
         AND le.longitude IS NOT NULL
       ORDER BY le.date ASC, le.time ASC`,
      [id]
    );
    
    // Get counts for each log entry
    const entriesWithCounts = await Promise.all(
      logEntries.map(async (entry: any) => {
        const [whaleCount] = await query<{ count: number }>(
          'SELECT COUNT(*) as count FROM whale_sightings WHERE log_entry_id = ?',
          [entry.id]
        );
        const [catchCount] = await query<{ count: number }>(
          'SELECT COUNT(*) as count FROM catches WHERE log_entry_id = ?',
          [entry.id]
        );
        return {
          ...entry,
          whale_sightings_count: whaleCount.count,
          catches_count: catchCount.count,
        };
      })
    );
    
    // Also get whale sightings for this voyage
    const whaleSightings = await query(
      `SELECT ws.*, 
              le.date, 
              COALESCE(ws.latitude, le.latitude) as latitude,
              COALESCE(ws.longitude, le.longitude) as longitude,
              s.name as ship_name
       FROM whale_sightings ws
       JOIN log_entries le ON ws.log_entry_id = le.id
       JOIN voyages v ON le.voyage_id = v.id
       JOIN ships s ON v.ship_id = s.id
       WHERE le.voyage_id = ? 
         AND (COALESCE(ws.latitude, le.latitude) IS NOT NULL)
         AND (COALESCE(ws.longitude, le.longitude) IS NOT NULL)`,
      [id]
    );
    
    res.json({
      route: entriesWithCounts,
      whaleSightings: whaleSightings
    });
  } catch (error) {
    console.error('Error fetching voyage route:', error);
    res.status(500).json({ error: 'Failed to fetch voyage route' });
  }
});

export default router;

