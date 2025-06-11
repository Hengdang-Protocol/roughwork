import React from 'react';
import { Moon, Sun, Home, LogOut, User, HardDrive } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { type SessionInfo } from '@hengdang/client';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  sessionInfo: SessionInfo | null;
  onLogout: () => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentPath, 
  onNavigate, 
  sessionInfo,
  onLogout 
}) => {
  const { theme, toggleTheme } = useTheme();

  const pathParts = currentPath.split('/').filter(Boolean);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await onLogout();
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <HardDrive size={18} className="text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Uzu Drive
              </h1>
            </div>
            
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-sm">
              <button 
                onClick={() => onNavigate('/')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <Home size={16} />
                <span className="font-medium">Home</span>
              </button>
              
              {pathParts.map((part, index) => {
                const path = '/' + pathParts.slice(0, index + 1).join('/');
                const isLast = index === pathParts.length - 1;
                
                return (
                  <React.Fragment key={path}>
                    <span className="text-gray-400 dark:text-gray-500">/</span>
                    <button 
                      onClick={() => onNavigate(path)}
                      className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                        isLast 
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      {decodeURIComponent(part)}
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Session Info */}
            {sessionInfo && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <User size={16} className="text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {sessionInfo.appName || 'Uzu Drive'}
                </span>
              </div>
            )}

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Logout Button */}
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors font-medium"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
