import express, { Request, Response, NextFunction } from 'express';
import { createResponse } from './utils/api-response.js';
import authRoutes from './routes/auth.routes.js';
import cityRoutes from './routes/city.routes.js';
import activityRoutes from './routes/activity.routes.js';
import destinationRoutes from './routes/destination.routes.js';
import tripRoutes from './routes/trip.routes.js';
import itineraryRoutes from './routes/itinerary.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import calendarRoutes from './routes/calendar.routes.js';
import sharedRoutes from './routes/shared.routes.js';
import communityRoutes from './routes/community.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
app.use('/api', calendarRoutes);
app.use('/api', sharedRoutes);
app.use('/api', communityRoutes);
app.use('/api', adminRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json(createResponse(false, 'Route not found', null));
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  const message = err.message || 'Internal server error';
  const statusCode = err.status || err.statusCode || (err.name === 'MulterError' ? 400 : 500);
  res.status(statusCode).json(createResponse(false, message, null));
});

export { app };
