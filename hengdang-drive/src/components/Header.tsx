import React from 'react';
import { Moon, Sun, Home, LogOut, User, HardDrive, ChevronRight, Folder } from 'lucide-react';
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
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <HardDrive size={18} className="text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Hengdang Drive
              </h1>
            </div>
            
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-1 text-sm max-w-2xl overflow-hidden">
              {/* Home Button */}
              <button 
                onClick={() => onNavigate('/')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 font-medium ${
                  currentPath === '/' 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
                title="Home"
              >
                <Home size={16} />
                <span>Home</span>
              </button>
              
              {/* Path Segments */}
              {pathParts.map((part, index) => {
                const path = '/' + pathParts.slice(0, index + 1).join('/');
                const isLast = index === pathParts.length - 1;
                const decodedPart = decodeURIComponent(part);
                
                return (
                  <React.Fragment key={path}>
                    {/* Separator */}
                    <ChevronRight size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    
                    {/* Path Segment */}
                    <button 
                      onClick={() => onNavigate(path)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 font-medium min-w-0 ${
                        isLast 
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                      title={decodedPart}
                    >
                      <Folder size={14} className="flex-shrink-0" />
                      <span className="truncate max-w-[120px]">
                        {decodedPart}
                      </span>
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
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <User size={16} className="text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {sessionInfo.appName || 'Hengdang Drive'}
                </span>
              </div>
            )}

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme} 
              className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-600"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Logout Button */}
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-all duration-200 font-medium border border-red-200 dark:border-red-800 shadow-sm hover:shadow-md"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Path Summary for Mobile */}
      {pathParts.length > 0 && (
        <div className="px-6 pb-3 md:hidden">
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            / {pathParts.map(part => decodeURIComponent(part)).join(' / ')}
          </div>
        </div>
      )}
    </header>
  );
};
