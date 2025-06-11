import React from 'react';
import { type DirectoryEntry } from '@hengdang/client';
import { FileText, Folder, Loader } from 'lucide-react';

interface FileTreeProps {
  notes: DirectoryEntry[];
  selectedNote: string | null;
  onSelectNote: (path: string) => void;
  loading: boolean;
}

export const FileTree: React.FC<FileTreeProps> = ({
  notes,
  selectedNote,
  onSelectNote,
  loading
}) => {
  const getFileName = (path: string) => {
    return path.split('/').pop() || path;
  };

  const getFileIcon = (entry: DirectoryEntry) => {
    if (entry.type === 'directory') {
      return <Folder size={16} className="text-blue-500" />;
    }
    return <FileText size={16} className="text-gray-600 dark:text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader size={16} className="animate-spin" />
          <span className="text-sm">Loading notes...</span>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <FileText size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No notes found</p>
        <p className="text-xs mt-1">Create your first note to get started</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-2">
          Notes
        </h3>
        <div className="space-y-1">
          {notes.map((note) => (
            <button
              key={note.path}
              onClick={() => note.type === 'file' && onSelectNote(note.path)}
              className={`w-full flex items-center gap-2 px-2 py-2 text-left rounded-lg transition-colors ${
                selectedNote === note.path
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              } ${note.type === 'directory' ? 'cursor-default' : 'cursor-pointer'}`}
              disabled={note.type === 'directory'}
            >
              {getFileIcon(note)}
              <span className="text-sm truncate flex-1">
                {getFileName(note.path)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
