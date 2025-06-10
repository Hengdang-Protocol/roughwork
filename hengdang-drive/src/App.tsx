import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { FileGrid } from './components/FileGrid';
import { useHengdang } from './hooks/useHengdang';
import { AlertCircle, Loader } from 'lucide-react';

const App: React.FC = () => {
  const {
    currentPath,
    files,
    loading,
    error,
    loadDirectory,
    uploadFile,
    deleteFile,
    downloadFile
  } = useHengdang();

  const handleNavigate = (path: string) => {
    loadDirectory(path);
  };

  const handleCreateFolder = async (path: string) => {
    try {
      // Create an empty file to represent the folder
      await uploadFile(`${path}.gitkeep`, new File([''], '.gitkeep'));
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder');
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <Header currentPath={currentPath} onNavigate={handleNavigate} />
        
        <main className="p-6">
          <FileUpload 
            currentPath={currentPath}
            onUpload={uploadFile}
            onCreateFolder={handleCreateFolder}
          />

          {error && (
            <div className="flex items-center gap-2 p-4 mb-6 rounded-lg bg-red-50 text-red-700 border border-red-200">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={32} className="animate-spin text-accent" />
            </div>
          ) : (
            <FileGrid
              files={files}
              onNavigate={handleNavigate}
              onDownload={downloadFile}
              onDelete={deleteFile}
            />
          )}
        </main>
      </div>
    </ThemeProvider>
  );
};

export default App;
