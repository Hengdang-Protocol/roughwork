import React from 'react';
import { Moon, Sun, Home, LogOut, User } from 'lucide-react';
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
    <header className="border-b p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Hengdang Drive</h1>
          
          <nav className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => onNavigate('/')}
              className="flex items-center gap-1 btn btn-sm"
            >
              <Home size={14} />
              Home
            </button>
            
            {pathParts.map((part, index) => {
              const path = '/' + pathParts.slice(0, index + 1).join('/');
              return (
                <React.Fragment key={path}>
                  <span className="text-muted">/</span>
                  <button 
                    onClick={() => onNavigate(path)}
                    className="btn btn-sm"
                  >
                    {part}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {sessionInfo && (
            <div className="flex items-center gap-2 text-sm text-secondary">
              <User size={14} />
              <span>{sessionInfo.appName || 'Hengdang Drive'}</span>
            </div>
          )}

          <button onClick={toggleTheme} className="btn btn-sm">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>

          <button onClick={handleLogout} className="btn btn-sm text-error">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
