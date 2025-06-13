import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { storage } from './storage/lmdb';
import { directoryStorage } from './storage/directories';
import fileRoutes from './routes/files';
import eventRoutes from './routes/events';
import eventsStreamRoutes from './routes/events-stream';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(morgan('combined'));
app.use(cookieParser()); // Add cookie parser

// JSON parser for auth and events
app.use(express.json());

// Raw body parser only for file routes (PUT/POST to file paths)
app.use('/*', (req, res, next) => {
  // Only use raw parser for file operations (PUT requests that aren't to /auth, /events, or /admin)
  if (req.method === 'PUT' && !req.path.startsWith('/auth') && !req.path.startsWith('/events') && !req.path.startsWith('/admin')) {
    express.raw({
      limit: config.maxFileSize,
      type: '*/*'
    })(req, res, next);
  } else {
    next();
  }
});

// Initialize root directory for system
async function initializeSystem() {
  try {
    // Check if root directory exists, create if not
    const rootExists = await directoryStorage.exists('/');
    if (!rootExists) {
      console.log('Creating root directory...');
      // Use a default system owner for root directory
      await directoryStorage.createDirectory('/', 'system', {
        description: 'Root directory'
      });
    }
  } catch (error) {
    console.error('Failed to initialize system:', error);
  }
}

// Routes
app.use('/events', eventRoutes);
app.use('/events', eventsStreamRoutes); // SSE routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes); // Admin routes
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

// Initialize system and start server
async function start() {
  await initializeSystem();
  
  app.listen(config.port, () => {
    console.log(`Hengdang server running on http://localhost:${config.port}`);
    console.log(`Data directory: ${config.dataDir}`);
    console.log(`Admin API: ${process.env.ADMIN_KEY ? 'Enabled' : 'Disabled (set ADMIN_KEY)'}`);
  });
}

start().catch(console.error);

export default app;
