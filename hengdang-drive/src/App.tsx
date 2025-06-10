import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginScreen } from './components/LoginScreen';
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
    downloadFile,
    isAuthenticated,
    sessionInfo,
    authLoading,
    authenticate,
    logout
  } = useHengdang();

  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await authenticate();
    } catch (error: any) {
      setAuthError(error.message || 'Failed to authenticate');
    }
  };

  const handleNavigate = (path: string) => {
    loadDirectory(path);
  };

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-primary flex items-center justify-center">
          <Loader size={32} className="animate-spin text-accent" />
        </div>
      </ThemeProvider>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <LoginScreen onLogin={handleLogin} error={authError} />
      </ThemeProvider>
    );
  }

  // Show main app if authenticated
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-primary">
        <Header 
          currentPath={currentPath} 
          onNavigate={handleNavigate}
          sessionInfo={sessionInfo}
          onLogout={logout}
        />
        
        <main className="p-6">
          <FileUpload 
            currentPath={currentPath}
            onUpload={uploadFile}
          />

          {error && (
            <div className="flex items-center gap-2 p-4 mb-6 rounded-lg bg-error/10 text-error border border-error/20">
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
