import express from 'express';
import fileRoutes from './routes/fileRoutes';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { createTables } from './db';
import cors from 'cors';

const PORT = process.env.PORT || 4000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir);
  console.log('Uploads directory created:', uploadsDir);
}

// Initialize database tables
createTables();

// Mount routes
app.use('/', fileRoutes);

app.listen(PORT, () => {
  console.log(`Hengdang server running on port ${PORT}`);
});
