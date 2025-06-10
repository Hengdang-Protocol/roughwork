import React from 'react';
import { type DirectoryEntry } from '@hengdang/client';
import { 
  File, 
  Folder, 
  Download, 
  Trash2, 
  Image, 
  FileText, 
  Music, 
  Video,
  Archive
} from 'lucide-react';

interface FileGridProps {
  files: DirectoryEntry[];
  onNavigate: (path: string) => void;
  onDownload: (path: string) => void;
  onDelete: (path: string) => void;
}

const getFileIcon = (entry: DirectoryEntry) => {
  if (entry.type === 'directory') {
    return <Folder size={24} className="text-blue-500" />;
  }

  const ext = entry.path.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return <Image size={24} className="text-green-500" />;
  }
  
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext || '')) {
    return <Music size={24} className="text-purple-500" />;
  }
  
  if (['mp4', 'avi', 'mkv', 'mov'].includes(ext || '')) {
    return <Video size={24} className="text-red-500" />;
  }
  
  if (['txt', 'md', 'json', 'js', 'ts', 'html', 'css'].includes(ext || '')) {
    return <FileText size={24} className="text-blue-500" />;
  }
  
  if (['zip', 'rar', 'tar', 'gz'].includes(ext || '')) {
    return <Archive size={24} className="text-orange-500" />;
  }
  
  return <File size={24} className="text-gray-500" />;
};

const formatFileSize = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const FileGrid: React.FC<FileGridProps> = ({ 
  files, 
  onNavigate, 
  onDownload, 
  onDelete 
}) => {
  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <Folder size={48} className="mx-auto mb-4 opacity-50" />
        <p>This folder is empty</p>
        <p className="text-sm">Upload some files to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {files.map((file) => (
        <div key={file.path} className="card group">
          <div className="flex items-start gap-3">
            {getFileIcon(file)}
            
            <div className="flex-1 min-w-0">
              <button
                onClick={() => onNavigate(file.path)}
                className="text-left w-full"
              >
                <div className="font-medium truncate hover:text-accent transition-colors">
                  {file.path.split('/').pop()}
                </div>
                
                <div className="text-xs text-muted mt-1">
                  {file.type === 'file' && file.size && (
                    <div>{formatFileSize(file.size)}</div>
                  )}
                  <div>{formatDate(file.lastModified)}</div>
                </div>
              </button>
            </div>
          </div>

          <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            {file.type === 'file' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(file.path);
                }}
                className="btn btn-sm"
                title="Download"
              >
                <Download size={14} />
              </button>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete ${file.path.split('/').pop()}?`)) {
                  onDelete(file.path);
                }
              }}
              className="btn btn-sm text-error"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
