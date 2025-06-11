import React, { useState } from 'react';
import { useVault } from '../contexts/VaultContext';
import { useNotes } from '../hooks/useNotes';
import { FileTree } from './FileTree';
import { NoteEditor } from './NoteEditor';
import { SearchBar } from './SearchBar';
import { Menu, Search, Plus, FileText } from 'lucide-react';

export const NotesApp: React.FC = () => {
  const { vaultPath, isVaultSelected } = useVault();
  const { notes, loading, createNote, searchNotes } = useNotes(vaultPath);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleCreateNote = async () => {
    const name = prompt('Note name:');
    if (name) {
      try {
        const notePath = await createNote(name);
        setSelectedNote(notePath);
      } catch (error: any) {
        alert(`Failed to create note: ${error.message}`);
      }
    }
  };

  const handleSearch = async (query: string) => {
    if (query.trim()) {
      const results = await searchNotes(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  if (!isVaultSelected) {
    return null; // VaultSelector will be shown
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Menu size={18} />
          </button>
          
          <button
            onClick={handleCreateNote}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            New Note
          </button>
        </div>

        <div className="flex items-center gap-2">
          <SearchBar onSearch={handleSearch} />
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Search size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden">
            <FileTree
              notes={searchResults.length > 0 ? searchResults : notes}
              selectedNote={selectedNote}
              onSelectNote={setSelectedNote}
              loading={loading}
            />
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedNote ? (
            <NoteEditor
              notePath={selectedNote}
              onClose={() => setSelectedNote(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No note selected</p>
                <p className="text-sm">Select a note from the sidebar or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
