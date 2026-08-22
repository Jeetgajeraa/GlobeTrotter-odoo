import express, { Request, Response, NextFunction } from 'express';
import { createResponse } from './utils/api-response.js';
import authRoutes from './routes/auth.routes.js';
import cityRoutes from './routes/city.routes.js';
import activityRoutes from './routes/activity.routes.js';
import destinationRoutes from './routes/destination.routes.js';
import tripRoutes from './routes/trip.routes.js';
import itineraryRoutes from './routes/itinerary.routes.js';
import expenseRoutes from './routes/expense.routes.js';

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Good' });
});

app.use('/api/auth', authRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api', itineraryRoutes);
app.use('/api', expenseRoutes);






app.use((_req: Request, res: Response) => {
  res.status(404).json(createResponse(false, 'Route not found', null));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json(createResponse(false, 'Internal server error', null));
});

export { app };
