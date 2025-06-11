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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
              <Loader size={32} className="animate-spin text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Loading Uzu Drive
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Checking authentication...
            </p>
          </div>
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 custom-scrollbar">
        <Header 
          currentPath={currentPath} 
          onNavigate={handleNavigate}
          sessionInfo={sessionInfo}
          onLogout={logout}
        />
        
        <main className="container mx-auto px-6 py-8 max-w-7xl">
          <FileUpload 
            currentPath={currentPath}
            onUpload={uploadFile}
          />

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-200">
                    Error
                  </h4>
                  <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Loader size={24} className="animate-spin text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Loading files...
                </p>
              </div>
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
