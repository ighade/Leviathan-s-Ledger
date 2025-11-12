import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import shipsRouter from './routes/ships';
import voyagesRouter from './routes/voyages';
import logEntriesRouter from './routes/log-entries';
import whaleSightingsRouter from './routes/whale-sightings';
import statisticsRouter from './routes/statistics';
import timelineRouter from './routes/timeline';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Leviathan\'s Ledger API is running' });
});

// Routes
app.use('/api/ships', shipsRouter);
app.use('/api/voyages', voyagesRouter);
app.use('/api/log-entries', logEntriesRouter);
app.use('/api/whale-sightings', whaleSightingsRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/timeline', timelineRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚢 Leviathan's Ledger API server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});

