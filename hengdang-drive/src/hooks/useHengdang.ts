import { useState, useEffect } from 'react';
import { createClient, type DirectoryEntry } from '@hengdang/client';

const client = createClient('http://localhost:3000');

export const useHengdang = () => {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const listing = await client.listDirectory(path);
      setFiles(listing.entries);
      setCurrentPath(path);
    } catch (err: any) {
      setError(err.message || 'Failed to load directory');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (path: string, file: File) => {
    const buffer = await file.arrayBuffer();
    await client.uploadFile(path, new Uint8Array(buffer));
    await loadDirectory(currentPath); // Refresh
  };

  const deleteFile = async (path: string) => {
    await client.deleteFile(path);
    await loadDirectory(currentPath); // Refresh
  };

  const downloadFile = async (path: string) => {
    const buffer = await client.downloadFile(path);
    const blob = new Blob([buffer]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop() || 'download';
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadDirectory('/');
  }, []);

  return {
    currentPath,
    files,
    loading,
    error,
    loadDirectory,
    uploadFile,
    deleteFile,
    downloadFile,
    client
  };
};
