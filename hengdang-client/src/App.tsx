import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import ServerConfig from './components/ServerConfig';
import UploadFile from './components/UploadFile';
import DownloadFile from './components/DownloadFile';
import ShareFile from './components/ShareFile';

const App = () => {
  return (
    <div className="p-4">
      <nav className="mb-4">
        <Link to="/" className="mr-4">Config</Link>
        <Link to="/upload" className="mr-4">Upload</Link>
        <Link to="/download" className="mr-4">Download</Link>
        <Link to="/share">Share</Link>
      </nav>
      <Routes>
        <Route path="/" element={<ServerConfig />} />
        <Route path="/upload" element={<UploadFile />} />
        <Route path="/download" element={<DownloadFile />} />
        <Route path="/share" element={<ShareFile />} />
      </Routes>
    </div>
  );
};

export default App;
