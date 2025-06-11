import { open, Database, RootDatabase } from 'lmdb';
import path from 'path';
import { config } from '../config';
import { FileMetadata, Event, Session } from '../types';
import { FileLock } from './locks';

export class LMDBStorage {
  private root: RootDatabase;
  public files: Database<FileMetadata, string>;
  public blobs: Database<Buffer, string>;
  public events: Database<Event, string>;
  public sessions: Database<Session, string>;
  public locks: Database<FileLock, string>;

  constructor() {
    const dbPath = path.join(config.dataDir, 'lmdb');
    
    this.root = open({
      path: dbPath,
      compression: true,
      mapSize: 10 * 1024 * 1024 * 1024, // 10GB
    });

    this.files = this.root.openDB('files', { encoding: 'json' });
    this.blobs = this.root.openDB('blobs', { encoding: 'binary' });
    this.events = this.root.openDB('events', { encoding: 'json' });
    this.sessions = this.root.openDB('sessions', { encoding: 'json' });
    this.locks = this.root.openDB('locks', { encoding: 'json' });
  }

  generateFileId(): string {
    return Date.now().toString();
  }

  generateChunkKey(fileId: string, chunkIndex: number): string {
    return `${fileId}:${chunkIndex}`;
  }

  async close(): Promise<void> {
    await this.root.close();
  }
}

export const storage = new LMDBStorage();
