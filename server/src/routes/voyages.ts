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

export default router;

