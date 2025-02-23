import React, { createContext, useState, FC } from 'react';

interface ConfigContextProps {
  serverUrl: string;
  setServerUrl: (url: string) => void;
  masterKey: string;
  setMasterKey: (key: string) => void;
}

export const ConfigContext = createContext<ConfigContextProps>({
  serverUrl: 'http://localhost:4000',
  setServerUrl: () => {},
  masterKey: '',
  setMasterKey: () => {}
});

export const ConfigProvider: FC = ({ children }) => {
  const [serverUrl, setServerUrl] = useState('http://localhost:4000');
  const [masterKey, setMasterKey] = useState('');

  return (
    <ConfigContext.Provider value={{ serverUrl, setServerUrl, masterKey, setMasterKey }}>
      {children}
    </ConfigContext.Provider>
  );
};
