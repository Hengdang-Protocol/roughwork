import React, { useContext, useState } from 'react';
import { ConfigContext } from '../contexts/ConfigContext';

const ServerConfig = () => {
  const { serverUrl, setServerUrl, masterKey, setMasterKey } = useContext(ConfigContext);
  const [localUrl, setLocalUrl] = useState(serverUrl);
  const [localKey, setLocalKey] = useState(masterKey);

  const handleSave = () => {
    setServerUrl(localUrl);
    setMasterKey(localKey);
    alert('Configuration saved!');
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Server Configuration</h1>
      <div className="mb-4">
        <label className="block">Server URL:</label>
        <input
          type="text"
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block">Master Private Key:</label>
        <input
          type="text"
          value={localKey}
          onChange={(e) => setLocalKey(e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2">
        Save
      </button>
    </div>
  );
};

export default ServerConfig;
