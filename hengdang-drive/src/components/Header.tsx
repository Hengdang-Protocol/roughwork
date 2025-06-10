import React from 'react';
import { Moon, Sun, Home } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate }) => {
  const { theme, toggleTheme } = useTheme();

  const pathParts = currentPath.split('/').filter(Boolean);

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

        <button onClick={toggleTheme} className="btn btn-sm">
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>
    </header>
  );
};
