import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

export interface FileRecord {
  id: string;
  original_filename: string;
  stored_filename: string;
  size: number;
  uploaded_at: string; // ISO string
}

export interface DB {
  files: FileRecord;
}

const sqliteDB = new Database('hengdang.sqlite');
export const db = new Kysely<DB>({
  dialect: new SqliteDialect({
    database: sqliteDB
  })
});

// Create the files table if it does not exist
export function createTables(): void {
  sqliteDB.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      size INTEGER,
      uploaded_at TEXT NOT NULL
    );
  `);
  console.log('Database tables ensured.');
}
