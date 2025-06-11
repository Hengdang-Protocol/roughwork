import React, { useState, useEffect, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { useNotes } from '../hooks/useNotes';
import { useTheme } from '../contexts/ThemeContext';
import { Split } from './Split';
import { MarkdownPreview } from './MarkdownPreview';
import { Save, Eye, Edit, X, Loader } from 'lucide-react';

interface NoteEditorProps {
  notePath: string;
  onClose: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ notePath, onClose }) => {
  const { loadNote, saveNote } = useNotes(null);
  const { theme } = useTheme();
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [hasChanges, setHasChanges] = useState(false);

  const fileName = notePath.split('/').pop() || 'Untitled';

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      try {
        const noteContent = await loadNote(notePath);
        setContent(noteContent);
        setOriginalContent(noteContent);
        setHasChanges(false);
      } catch (error: any) {
        console.error('Failed to load note:', error);
        setContent('');
        setOriginalContent('');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [notePath, loadNote]);

  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveNote(notePath, content);
      setOriginalContent(content);
      setHasChanges(false);
    } catch (error: any) {
      alert(`Failed to save note: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (hasChanges) {
        handleSave();
      }
    }
  }, [hasChanges, handleSave]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader size={20} className="animate-spin" />
          <span>Loading note...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Note Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {fileName}
          </h2>
          {hasChanges && (
            <span className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'edit'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Edit size={14} />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Eye size={14} />
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {saving ? (
              <Loader size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'edit' && (
          <Editor
            value={content}
            onChange={(value) => setContent(value || '')}
            language="markdown"
            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
            options={{
              wordWrap: 'on',
              minimap: { enabled: false },
              fontSize: 14,
              lineHeight: 1.6,
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        )}

        {viewMode === 'preview' && (
          <MarkdownPreview content={content} />
        )}

        {viewMode === 'split' && (
          <Split>
            <Editor
              value={content}
              onChange={(value) => setContent(value || '')}
              language="markdown"
              theme={theme === 'dark' ? 'vs-dark' : 'vs'}
              options={{
                wordWrap: 'on',
                minimap: { enabled: false },
                fontSize: 14,
                lineHeight: 1.6,
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
            <MarkdownPreview content={content} />
          </Split>
        )}
      </div>
    </div>
  );
};
