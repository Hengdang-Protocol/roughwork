import React, { useState } from 'react';
import { useVault } from '../contexts/VaultContext';
import { useHengdang } from '../hooks/useHengdang';
import { FolderOpen, Plus, Settings, LogOut } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const VaultSelector: React.FC = () => {
  const { vaultPath, setVaultPath, isVaultSelected } = useVault();
  const { logout, sessionInfo } = useHengdang();
  const { theme, toggleTheme } = useTheme();
  const [showVaultInput, setShowVaultInput] = useState(!isVaultSelected);
  const [newVaultPath, setNewVaultPath] = useState('');

  const handleSetVault = () => {
    if (newVaultPath.trim()) {
      const path = newVaultPath.startsWith('/') ? newVaultPath : `/${newVaultPath}`;
      setVaultPath(path);
      setShowVaultInput(false);
      setNewVaultPath('');
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  if (isVaultSelected && !showVaultInput) {
    return (
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen size={20} className="text-purple-600 dark:text-purple-400" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              Vault: {vaultPath}
            </span>
            <button
              onClick={() => setShowVaultInput(true)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Change vault"
            >
              <Settings size={16} />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {sessionInfo && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {sessionInfo.appName || 'Hengdang Notes'}
              </span>
            )}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center">
            <FolderOpen size={32} className="text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Select Your Vault
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a directory to store your notes and knowledge base
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Vault Path
            </label>
            <input
              type="text"
              value={newVaultPath}
              onChange={(e) => setNewVaultPath(e.target.value)}
              placeholder="/notes"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              onKeyPress={(e) => e.key === 'Enter' && handleSetVault()}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This directory will be created if it doesn't exist
            </p>
          </div>

          <button
            onClick={handleSetVault}
            disabled={!newVaultPath.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Set as Vault
          </button>
        </div>
      </div>
    </div>
  );
};
