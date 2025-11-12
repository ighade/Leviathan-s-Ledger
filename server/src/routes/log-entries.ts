import express from 'express';
import { query } from '../db';

const router = express.Router();

// GET /api/log-entries - Get all log entries with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '50', 
      voyageId, 
      startDate, 
      endDate,
      hasCoordinates 
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let sql = `
      SELECT le.*, v.ship_id, s.name as ship_name
      FROM log_entries le
      JOIN voyages v ON le.voyage_id = v.id
      JOIN ships s ON v.ship_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (voyageId) {
      sql += ' AND le.voyage_id = ?';
      params.push(voyageId);
    }
    
    if (startDate) {
      sql += ' AND le.date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND le.date <= ?';
      params.push(endDate);
    }
    
    if (hasCoordinates === 'true') {
      sql += ' AND le.latitude IS NOT NULL AND le.longitude IS NOT NULL';
    }
    
    // Get total count
    const countSql = sql.replace('SELECT le.*, v.ship_id, s.name as ship_name', 'SELECT COUNT(*) as total');
    const [{ total }] = await query<{ total: number }>(countSql, params);
    
    // Get paginated results
    sql += ' ORDER BY le.date DESC, le.time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), offset);
    
    const logEntries = await query(sql, params);
    
    res.json({
      data: logEntries,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Error fetching log entries:', error);
    res.status(500).json({ error: 'Failed to fetch log entries' });
  }
});

// GET /api/log-entries/:id - Get single log entry with related data
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get log entry
    const [logEntry] = await query(
      `SELECT le.*, v.ship_id, s.name as ship_name
       FROM log_entries le
       JOIN voyages v ON le.voyage_id = v.id
       JOIN ships s ON v.ship_id = s.id
       WHERE le.id = ?`,
      [id]
    );
    
    if (!logEntry) {
      return res.status(404).json({ error: 'Log entry not found' });
    }
    
    // Get related whale sightings
    const whaleSightings = await query(
      'SELECT * FROM whale_sightings WHERE log_entry_id = ?',
      [id]
    );
    
    // Get related catches
    const catches = await query(
      'SELECT * FROM catches WHERE log_entry_id = ?',
      [id]
    );
    
    // Get related crew events
    const crewEvents = await query(
      'SELECT * FROM crew_events WHERE log_entry_id = ?',
      [id]
    );
    
    res.json({
      ...logEntry,
      whaleSightings,
      catches,
      crewEvents,
    });
  } catch (error) {
    console.error('Error fetching log entry:', error);
    res.status(500).json({ error: 'Failed to fetch log entry' });
  }
});

export default router;

