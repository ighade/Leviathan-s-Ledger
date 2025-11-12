import express from 'express';
import { query } from '../db';

const router = express.Router();

// GET /api/ships - Get all ships
router.get('/', async (req, res) => {
  try {
    const ships = await query('SELECT * FROM ships ORDER BY name');
    res.json(ships);
  } catch (error) {
    console.error('Error fetching ships:', error);
    res.status(500).json({ error: 'Failed to fetch ships' });
  }
});

// GET /api/ships/:id - Get single ship
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ships = await query('SELECT * FROM ships WHERE id = ?', [id]);
    
    if (ships.length === 0) {
      return res.status(404).json({ error: 'Ship not found' });
    }
    
    res.json(ships[0]);
  } catch (error) {
    console.error('Error fetching ship:', error);
    res.status(500).json({ error: 'Failed to fetch ship' });
  }
});

// GET /api/ships/:id/voyages - Get all voyages for a ship
router.get('/:id/voyages', async (req, res) => {
  try {
    const { id } = req.params;
    const voyages = await query(
      'SELECT * FROM voyages WHERE ship_id = ? ORDER BY start_date DESC',
      [id]
    );
    
    res.json(voyages);
  } catch (error) {
    console.error('Error fetching ship voyages:', error);
    res.status(500).json({ error: 'Failed to fetch ship voyages' });
  }
});

export default router;

