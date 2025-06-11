import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { FileGrid } from './components/FileGrid';
import { FilePreview } from './components/FilePreview';
import { useHengdang } from './hooks/useHengdang';
import { AlertCircle, Loader, X, RefreshCw, Lock, Wifi, WifiOff } from 'lucide-react';

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
    logout,
    uploadProgress,
    clearUploadProgress,
    fileStates,
    getFileForPreview
  } = useHengdang();

  const [authError, setAuthError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  // Listen for online/offline status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = async () => {
    setAuthError(null);
    setRetryCount(0);
    try {
      await authenticate();
    } catch (error: any) {
      setAuthError(error.message || 'Failed to authenticate');
    }
  };

  const handleNavigate = (path: string) => {
    setRetryCount(0);
    loadDirectory(path);
  };

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    await loadDirectory(currentPath);
  };

  const handlePreview = async (path: string) => {
    setPreviewFile(path);
  };

  const handleClosePreview = () => {
    setPreviewFile(null);
  };

  const dismissError = () => {
    // Clear the error but keep the current state
    // In a real app, you might want to implement more sophisticated error recovery
  };

  const getErrorIcon = (errorMessage: string) => {
    if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
      return <WifiOff size={20} className="text-red-600 dark:text-red-400" />;
    }
    if (errorMessage.toLowerCase().includes('lock') || errorMessage.toLowerCase().includes('editing')) {
      return <Lock size={20} className="text-red-600 dark:text-red-400" />;
    }
    return <AlertCircle size={20} className="text-red-600 dark:text-red-400" />;
  };

  const getErrorAction = (errorMessage: string) => {
    if (errorMessage.toLowerCase().includes('session') || errorMessage.toLowerCase().includes('auth')) {
      return (
        <button 
          onClick={handleLogin}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Login Again
        </button>
      );
    }
    
    if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('load')) {
      return (
        <button 
          onClick={handleRetry}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Retry {retryCount > 0 && `(${retryCount})`}
        </button>
      );
    }
    
    return null;
  };

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-3xl flex items-center justify-center shadow-lg">
              <Loader size={40} className="animate-spin text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Loading Hengdang Drive
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
        {/* Offline Indicator */}
        {!isOnline && (
          <div className="bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
            <WifiOff size={16} />
            You're currently offline. Some features may not work.
            <Wifi size={16} className="ml-2" />
          </div>
        )}

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
            uploadProgress={uploadProgress}
            onClearProgress={clearUploadProgress}
          />

          {/* Enhanced Error Display */}
          {error && (
            <div className="mb-6 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {getErrorIcon(error)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                    Something went wrong
                  </h4>
                  <p className="text-red-700 dark:text-red-300 text-sm leading-relaxed mb-4">
                    {error}
                  </p>
                  
                  {/* Error Actions */}
                  <div className="flex items-center gap-3">
                    {getErrorAction(error)}
                    <button
                      onClick={dismissError}
                      className="text-red-600 dark:text-red-400 text-sm font-medium hover:text-red-800 dark:hover:text-red-200 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                
                <button 
                  onClick={dismissError}
                  className="flex-shrink-0 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <X size={16} className="text-red-600 dark:text-red-400" />
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center shadow-lg">
                  <Loader size={32} className="animate-spin text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium text-lg">
                  Loading files...
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                  This shouldn't take long
                </p>
              </div>
            </div>
          ) : (
            <FileGrid
              files={files}
              onNavigate={handleNavigate}
              onDownload={downloadFile}
              onDelete={deleteFile}
              onPreview={handlePreview}
              fileStates={fileStates}
            />
          )}
        </main>

        {/* File Preview Modal */}
        {previewFile && (
          <FilePreview
            filePath={previewFile}
            fileName={previewFile.split('/').pop() || 'Unknown'}
            isOpen={!!previewFile}
            onClose={handleClosePreview}
            onDownload={downloadFile}
            getFileContent={getFileForPreview}
          />
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;
