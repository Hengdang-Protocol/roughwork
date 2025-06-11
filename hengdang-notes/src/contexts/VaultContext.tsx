import React, { createContext, useContext, useState, useEffect } from 'react';

interface VaultContextType {
  vaultPath: string | null;
  setVaultPath: (path: string | null) => void;
  isVaultSelected: boolean;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vaultPath, setVaultPathState] = useState<string | null>(() => {
    return localStorage.getItem('hengdang-notes-vault') || null;
  });

  const setVaultPath = (path: string | null) => {
    setVaultPathState(path);
    if (path) {
      localStorage.setItem('hengdang-notes-vault', path);
    } else {
      localStorage.removeItem('hengdang-notes-vault');
    }
  };

  const isVaultSelected = Boolean(vaultPath);

  return (
    <VaultContext.Provider value={{ vaultPath, setVaultPath, isVaultSelected }}>
      {children}
    </VaultContext.Provider>
  );
};
