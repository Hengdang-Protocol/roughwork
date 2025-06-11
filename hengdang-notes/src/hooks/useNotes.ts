import { useState, useEffect, useCallback } from 'react';
import { useHengdang } from './useHengdang';
import { type DirectoryEntry } from '@hengdang/client';

export interface Note {
  path: string;
  name: string;
  content: string;
  lastModified: number;
  isDirectory: boolean;
}

export const useNotes = (vaultPath: string | null) => {
  const { client } = useHengdang();
  const [notes, setNotes] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async (path: string = '/') => {
    if (!vaultPath) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fullPath = path === '/' ? vaultPath : `${vaultPath}${path}`;
      const listing = await client.listDirectory(fullPath, { 
        limit: 1000,
        shallow: false 
      });
      
      // Filter only markdown files and directories
      const filteredEntries = listing.entries.filter(entry => 
        entry.type === 'directory' || 
        entry.path.endsWith('.md') || 
        entry.path.endsWith('.txt')
      );
      
      setNotes(filteredEntries);
    } catch (err: any) {
      setError(err.message || 'Failed to load notes');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [client, vaultPath]);

  const loadNote = useCallback(async (notePath: string): Promise<string> => {
    try {
      const content = await client.downloadText(notePath);
      return content;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to load note');
    }
  }, [client]);

  const saveNote = useCallback(async (notePath: string, content: string): Promise<void> => {
    try {
      await client.uploadText(notePath, content);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save note');
    }
  }, [client]);

  const createNote = useCallback(async (name: string, content: string = ''): Promise<string> => {
    if (!vaultPath) throw new Error('No vault selected');
    
    const fileName = name.endsWith('.md') ? name : `${name}.md`;
    const notePath = `${vaultPath}/${fileName}`;
    
    try {
      await client.uploadText(notePath, content);
      await loadNotes();
      return notePath;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create note');
    }
  }, [client, vaultPath, loadNotes]);

  const deleteNote = useCallback(async (notePath: string): Promise<void> => {
    try {
      await client.deleteFile(notePath);
      await loadNotes();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete note');
    }
  }, [client, loadNotes]);

  const searchNotes = useCallback(async (query: string): Promise<DirectoryEntry[]> => {
    if (!query.trim()) return notes;
    
    const searchTerm = query.toLowerCase();
    return notes.filter(note => 
      note.path.toLowerCase().includes(searchTerm) ||
      note.path.split('/').pop()?.toLowerCase().includes(searchTerm)
    );
  }, [notes]);

  useEffect(() => {
    if (vaultPath) {
      loadNotes();
    }
  }, [vaultPath, loadNotes]);

  return {
    notes,
    loading,
    error,
    loadNotes,
    loadNote,
    saveNote,
    createNote,
    deleteNote,
    searchNotes,
  };
};
