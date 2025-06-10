import path from 'path';

export interface Config {
  port: number;
  dataDir: string;
  maxFileSize: string;
  chunkSize: number;
  defaultListLimit: number;
  maxListLimit: number;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000'),
  dataDir: process.env.DATA_DIR || path.join(process.cwd(), 'data'),
  maxFileSize: process.env.MAX_FILE_SIZE || '100mb',
  chunkSize: 512 * 1024, // 512KB
  defaultListLimit: 100,
  maxListLimit: 1000,
};

// Ensure data directory exists
import fs from 'fs';
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}
