import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { VaultProvider } from './contexts/VaultContext';
import { LoginScreen } from './components/LoginScreen';
import { VaultSelector } from './components/VaultSelector';
import { NotesApp } from './components/NotesApp';
import { useHengdang } from './hooks/useHengdang';
import { Loader } from 'lucide-react';

const App: React.FC = () => {
  const {
    isAuthenticated,
    authLoading,
    authenticate,
  } = useHengdang();

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await authenticate();
    } catch (error: any) {
      setLoginError(error.message || 'Failed to authenticate');
    }
  };

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-3xl flex items-center justify-center shadow-lg">
              <Loader size={40} className="animate-spin text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Loading Hengdang Notes
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
        <LoginScreen onLogin={handleLogin} error={loginError} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <VaultProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <VaultSelector />
          <NotesApp />
        </div>
      </VaultProvider>
    </ThemeProvider>
  );
};

export default App;
