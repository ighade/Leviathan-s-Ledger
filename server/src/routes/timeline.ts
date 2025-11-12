import express from 'express';
import { query } from '../db';

const router = express.Router();

// GET /api/timeline - Get timeline events
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    const events = [];
    
    // Voyage start/end events
    if (!type || type === 'voyage') {
      let voyageSql = `
        SELECT 
          'voyage_start' as eventType,
          v.id as entityId,
          v.start_date as date,
          s.name as shipName,
          'Voyage started' as description
        FROM voyages v
        JOIN ships s ON v.ship_id = s.id
        WHERE 1=1
      `;
      const voyageParams: any[] = [];
      
      if (startDate) {
        voyageSql += ' AND v.start_date >= ?';
        voyageParams.push(startDate);
      }
      if (endDate) {
        voyageSql += ' AND v.start_date <= ?';
        voyageParams.push(endDate);
      }
      
      const voyageEvents = await query(voyageSql, voyageParams);
      events.push(...voyageEvents);
    }
    
    // Whale sighting events
    if (!type || type === 'whale') {
      let whaleSql = `
        SELECT 
          'whale_sighting' as eventType,
          ws.id as entityId,
          le.date,
          s.name as shipName,
          ws.species,
          ws.count,
          ws.caught,
          ws.latitude,
          ws.longitude
        FROM whale_sightings ws
        JOIN log_entries le ON ws.log_entry_id = le.id
        JOIN voyages v ON le.voyage_id = v.id
        JOIN ships s ON v.ship_id = s.id
        WHERE 1=1
      `;
      const whaleParams: any[] = [];
      
      if (startDate) {
        whaleSql += ' AND le.date >= ?';
        whaleParams.push(startDate);
      }
      if (endDate) {
        whaleSql += ' AND le.date <= ?';
        whaleParams.push(endDate);
      }
      
      const whaleEvents = await query(whaleSql, whaleParams);
      events.push(...whaleEvents);
    }
    
    // Crew events
    if (!type || type === 'crew') {
      let crewSql = `
        SELECT 
          'crew_event' as eventType,
          ce.id as entityId,
          le.date,
          s.name as shipName,
          ce.event_type as eventSubType,
          ce.crew_member_name,
          ce.description
        FROM crew_events ce
        JOIN log_entries le ON ce.log_entry_id = le.id
        JOIN voyages v ON le.voyage_id = v.id
        JOIN ships s ON v.ship_id = s.id
        WHERE 1=1
      `;
      const crewParams: any[] = [];
      
      if (startDate) {
        crewSql += ' AND le.date >= ?';
        crewParams.push(startDate);
      }
      if (endDate) {
        crewSql += ' AND le.date <= ?';
        crewParams.push(endDate);
      }
      
      const crewEvents = await query(crewSql, crewParams);
      events.push(...crewEvents);
    }
    
    // Sort all events by date
    events.sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Most recent first
    });
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

export default router;

