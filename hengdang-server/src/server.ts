import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { storage } from './storage/lmdb';
import fileRoutes from './routes/files';
import eventRoutes from './routes/events';
import authRoutes from './routes/auth';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(morgan('combined'));

// Raw body parser for file uploads
app.use(express.raw({
  limit: config.maxFileSize,
  type: '*/*'
}));

// Routes
app.use('/events', eventRoutes);
app.use('/auth', authRoutes);
app.use('/', fileRoutes); // Files on root path

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    version: '1.0.0'
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await storage.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await storage.close();
  process.exit(0);
});

// Start server
app.listen(config.port, () => {
  console.log(`Hengdang server running on http://localhost:${config.port}`);
  console.log(`Data directory: ${config.dataDir}`);
});

export default app;
