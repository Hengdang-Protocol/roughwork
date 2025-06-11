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
  Archive,
} from 'lucide-react';

interface FileGridProps {
  files: DirectoryEntry[];
  onNavigate: (path: string) => void;
  onDownload: (path: string) => void;
  onDelete: (path: string) => void;
}

const getFileIcon = (entry: DirectoryEntry) => {
  if (entry.type === 'directory') {
    return <Folder size={24} className="text-blue-500 dark:text-blue-400" />;
  }

  const ext = entry.path.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return <Image size={24} className="text-green-500 dark:text-green-400" />;
  }
  
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext || '')) {
    return <Music size={24} className="text-purple-500 dark:text-purple-400" />;
  }
  
  if (['mp4', 'avi', 'mkv', 'mov'].includes(ext || '')) {
    return <Video size={24} className="text-red-500 dark:text-red-400" />;
  }
  
  if (['txt', 'md', 'json', 'js', 'ts', 'html', 'css'].includes(ext || '')) {
    return <FileText size={24} className="text-blue-500 dark:text-blue-400" />;
  }
  
  if (['zip', 'rar', 'tar', 'gz'].includes(ext || '')) {
    return <Archive size={24} className="text-orange-500 dark:text-orange-400" />;
  }
  
  return <File size={24} className="text-gray-500 dark:text-gray-400" />;
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
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
          <Folder size={32} className="text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          This folder is empty
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Upload some files to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {files.map((file) => (
        <div 
          key={file.path} 
          className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-lg"
        >
          {/* File Content */}
          <button
            onClick={() => onNavigate(file.path)}
            className="w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-xl"
          >
            {/* Icon and Name */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 mt-1">
                {getFileIcon(file)}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {file.path.split('/').pop()}
                </h3>
                
                {/* File Info */}
                <div className="mt-1 space-y-1">
                  {file.type === 'file' && file.size && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(file.lastModified)}
                  </p>
                </div>
              </div>
            </div>
          </button>

          {/* Action Buttons */}
          <div className="px-4 pb-4">
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {file.type === 'file' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(file.path);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors text-sm font-medium"
                  title="Download"
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete ${file.path.split('/').pop()}?`)) {
                    onDelete(file.path);
                  }
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors text-sm font-medium"
                title="Delete"
              >
                <Trash2 size={14} />
                {file.type === 'file' && <span>Delete</span>}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
