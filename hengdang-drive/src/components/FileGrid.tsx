import React, { useState } from 'react';
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
  Eye,
  Lock,
  FileCode,
  FileSpreadsheet,
  Presentation,
  Palette,
  Calendar,
  CheckSquare,
  Coffee
} from 'lucide-react';

interface FileGridProps {
  files: DirectoryEntry[];
  onNavigate: (path: string) => void;
  onDownload: (path: string) => void;
  onDelete: (path: string) => void;
  onPreview: (path: string) => void;
  fileStates: Map<string, { isLocked: boolean; lockedBy?: string }>;
}

const getFileIcon = (entry: DirectoryEntry) => {
  if (entry.type === 'directory') {
    return <Folder size={24} className="text-blue-500 dark:text-blue-400" />;
  }

  const ext = entry.path.split('.').pop()?.toLowerCase();
  const iconClass = "text-gray-600 dark:text-gray-400";
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext || '')) {
    return <Image size={24} className="text-green-500 dark:text-green-400" />;
  }
  
  // Audio
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext || '')) {
    return <Music size={24} className="text-purple-500 dark:text-purple-400" />;
  }
  
  // Video
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext || '')) {
    return <Video size={24} className="text-red-500 dark:text-red-400" />;
  }
  
  // Documents
  if (['txt', 'md', 'rtf'].includes(ext || '')) {
    return <FileText size={24} className="text-blue-500 dark:text-blue-400" />;
  }
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'php'].includes(ext || '')) {
    return <FileCode size={24} className="text-emerald-500 dark:text-emerald-400" />;
  }
  
  // Spreadsheets
  if (['csv', 'xlsx', 'xls', 'ods'].includes(ext || '')) {
    return <FileSpreadsheet size={24} className="text-green-600 dark:text-green-400" />;
  }
  
  // Presentations
  if (['ppt', 'pptx', 'odp'].includes(ext || '')) {
    return <Presentation size={24} className="text-orange-500 dark:text-orange-400" />;
  }
  
  // Design files
  if (['psd', 'ai', 'sketch', 'figma', 'xd'].includes(ext || '')) {
    return <Palette size={24} className="text-pink-500 dark:text-pink-400" />;
  }
  
  // Archives
  if (['zip', 'rar', 'tar', 'gz', '7z', 'bz2'].includes(ext || '')) {
    return <Archive size={24} className="text-orange-500 dark:text-orange-400" />;
  }
  
  // App-specific files
  if (ext === 'json') {
    const filename = entry.path.split('/').pop()?.toLowerCase();
    if (filename?.includes('calendar') || filename?.includes('event')) {
      return <Calendar size={24} className="text-indigo-500 dark:text-indigo-400" />;
    }
    if (filename?.includes('task') || filename?.includes('todo')) {
      return <CheckSquare size={24} className="text-teal-500 dark:text-teal-400" />;
    }
    if (filename?.includes('sheet') || filename?.includes('spreadsheet')) {
      return <FileSpreadsheet size={24} className="text-green-600 dark:text-green-400" />;
    }
    if (filename?.includes('slide') || filename?.includes('presentation')) {
      return <Presentation size={24} className="text-orange-500 dark:text-orange-400" />;
    }
    if (filename?.includes('draw') || filename?.includes('diagram')) {
      return <Palette size={24} className="text-pink-500 dark:text-pink-400" />;
    }
    return <Coffee size={24} className="text-yellow-600 dark:text-yellow-400" />;
  }
  
  return <File size={24} className={iconClass} />;
};

const formatFileSize = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' })
    });
  }
};

const isPreviewable = (entry: DirectoryEntry): boolean => {
  if (entry.type === 'directory') return false;
  
  const ext = entry.path.split('.').pop()?.toLowerCase();
  const previewableTypes = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', // Images
    'mp4', 'webm', 'mov', // Videos
    'pdf', // PDFs
    'txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'py' // Text files
  ];
  
  return previewableTypes.includes(ext || '') || 
         entry.contentType?.startsWith('text/') ||
         entry.contentType?.startsWith('image/') ||
         entry.contentType?.startsWith('video/') ||
         entry.contentType === 'application/pdf';
};

export const FileGrid: React.FC<FileGridProps> = ({ 
  files, 
  onNavigate, 
  onDownload, 
  onDelete,
  onPreview,
  fileStates
}) => {
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);

  // Safety check for files array
  if (!files || !Array.isArray(files)) {
    return (
      <div className="text-center py-20">
        <div className="w-24 h-24 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center">
          <Folder size={40} className="text-red-400 dark:text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Error loading files
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          There was an issue loading the file list
        </p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-gray-700 rounded-3xl flex items-center justify-center">
          <Folder size={40} className="text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">
          This folder is empty
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          Upload some files to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {files.map((file) => {
        const fileState = fileStates.get(file.path);
        const isLocked = fileState?.isLocked || false;
        const canPreview = isPreviewable(file);
        const isHovered = hoveredFile === file.path;
        
        return (
          <div 
            key={file.path}
            className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
            onMouseEnter={() => setHoveredFile(file.path)}
            onMouseLeave={() => setHoveredFile(null)}
          >
            {/* Lock Indicator */}
            {isLocked && (
              <div className="absolute top-3 right-3 z-10">
                <div className="bg-red-500 text-white p-1.5 rounded-full shadow-lg" title={`Locked by ${fileState?.lockedBy || 'another user'}`}>
                  <Lock size={12} />
                </div>
              </div>
            )}

            {/* File Content */}
            <button
              onClick={() => onNavigate(file.path)}
              className="w-full p-5 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-2xl transition-all duration-200"
              disabled={isLocked}
            >
              {/* Icon and Name */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-xl group-hover:bg-gray-100 dark:group-hover:bg-gray-600 transition-colors">
                  {getFileIcon(file)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base leading-tight mb-2">
                    {file.path.split('/').pop()}
                  </h3>
                  
                  {/* File Info */}
                  <div className="space-y-1">
                    {file.type === 'file' && file.size !== undefined && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
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
            <div className="px-5 pb-5">
              <div className={`flex gap-2 transition-all duration-200 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                {/* Preview Button */}
                {canPreview && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview(file.path);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                    title="Preview"
                  >
                    <Eye size={14} />
                    <span>Preview</span>
                  </button>
                )}
                
                {/* Download Button */}
                {file.type === 'file' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(file.path);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                    title="Download"
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </button>
                )}
                
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${file.path.split('/').pop()}?`)) {
                      onDelete(file.path);
                    }
                  }}
                  disabled={isLocked}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  title={isLocked ? "Cannot delete locked file" : "Delete"}
                >
                  <Trash2 size={14} />
                  {file.type === 'file' && <span>Delete</span>}
                </button>
              </div>
            </div>

            {/* Locked Overlay */}
            {isLocked && (
              <div className="absolute inset-0 bg-gray-900/20 dark:bg-gray-900/40 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Lock size={16} className="text-red-500" />
                    <span>File is locked</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
