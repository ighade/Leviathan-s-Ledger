import express from 'express';
import { query } from '../db';

const router = express.Router();

// GET /api/whale-sightings - Get all whale sightings with filters
router.get('/', async (req, res) => {
  try {
    const { 
      species, 
      caught, 
      startDate, 
      endDate,
      minLat,
      maxLat,
      minLon,
      maxLon
    } = req.query;
    
    let sql = `
      SELECT ws.*, le.date, le.voyage_id, v.ship_id, s.name as ship_name
      FROM whale_sightings ws
      JOIN log_entries le ON ws.log_entry_id = le.id
      JOIN voyages v ON le.voyage_id = v.id
      JOIN ships s ON v.ship_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (species) {
      sql += ' AND ws.species LIKE ?';
      params.push(`%${species}%`);
    }
    
    if (caught !== undefined) {
      sql += ' AND ws.caught = ?';
      params.push(caught === 'true' ? 1 : 0);
    }
    
    if (startDate) {
      sql += ' AND le.date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND le.date <= ?';
      params.push(endDate);
    }
    
    if (minLat && maxLat && minLon && maxLon) {
      sql += ' AND ws.latitude BETWEEN ? AND ? AND ws.longitude BETWEEN ? AND ?';
      params.push(minLat, maxLat, minLon, maxLon);
    }
    
    sql += ' ORDER BY le.date DESC';
    
    const sightings = await query(sql, params);
    res.json(sightings);
  } catch (error) {
    console.error('Error fetching whale sightings:', error);
    res.status(500).json({ error: 'Failed to fetch whale sightings' });
  }
});

// GET /api/whale-sightings/species - Get whale species summary
router.get('/species', async (req, res) => {
  try {
    const species = await query(`
      SELECT 
        COALESCE(species, 'Unknown') as species,
        COUNT(*) as count,
        SUM(ws.count) as total_individuals,
        SUM(CASE WHEN caught = 1 THEN 1 ELSE 0 END) as caught_count
      FROM whale_sightings ws
      GROUP BY species
      ORDER BY count DESC
    `);
    
    res.json(species);
  } catch (error) {
    console.error('Error fetching species summary:', error);
    res.status(500).json({ error: 'Failed to fetch species summary' });
  }
});

export default router;

