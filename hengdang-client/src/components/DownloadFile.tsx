import React, { useContext, useState } from 'react';
import { ConfigContext } from '../contexts/ConfigContext';
import { BrowserFileEncryption } from 'hengdang-utils/src/utils/browser-encryption';

const DownloadFile = () => {
  const { serverUrl, masterKey } = useContext(ConfigContext);
  const [filename, setFilename] = useState('');
  const [downloadStatus, setDownloadStatus] = useState('');
  const handleDownload = async () => {
    if (!filename) return alert('Please enter a filename');
    if (!masterKey) return alert('Please set your master private key in configuration');

    try {
      // Fetch the encrypted JSON payload from the server
      const response = await fetch(`${serverUrl}/files/${filename}`);
      if (!response.ok) {
        return setDownloadStatus('File not found or download error');
      }
      const payload = await response.json();
      const { encryptedContent, encryptedMetadata, encryptedFileKey } = payload;

      // Convert base64 strings to ArrayBuffers
      const encContentBuffer = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0)).buffer;
      const encMetadataBuffer = Uint8Array.from(atob(encryptedMetadata), c => c.charCodeAt(0)).buffer;
      const encFileKeyBuffer = Uint8Array.from(atob(encryptedFileKey), c => c.charCodeAt(0)).buffer;

      // Decrypt the file key using the master key
      const fileKey = await BrowserFileEncryption.decryptFileKey(encFileKeyBuffer, masterKey);
      // Decrypt the content
      const decryptedContent = await BrowserFileEncryption.decrypt(encContentBuffer, fileKey);
      // Create a blob and trigger a download
      const blob = new Blob([decryptedContent], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decrypted-${filename}`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadStatus('File downloaded and decrypted');
    } catch (error) {
      console.error('Download error:', error);
      setDownloadStatus(`Download failed: ${error.message}`);
    }
    try {
      // Convert base64 strings to ArrayBuffers
      const encContentBuffer = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0)).buffer;
      const encMetadataBuffer = Uint8Array.from(atob(encryptedMetadata), c => c.charCodeAt(0)).buffer;
      const encFileKeyBuffer = Uint8Array.from(atob(encryptedFileKey), c => c.charCodeAt(0)).buffer;

      // TODO: Implement browser-compatible decryption in BrowserFileEncryption
      // For now, we'll show an error message
      setDownloadStatus('Decryption not yet implemented in browser version');

      // Once decryption is implemented, it would look something like this:
      /*
      const fileKey = await BrowserFileEncryption.decryptFileKey(encFileKeyBuffer, masterKey);
      const decryptedContent = await BrowserFileEncryption.decrypt(encContentBuffer, fileKey);

      // Create a blob and trigger a download
      const blob = new Blob([decryptedContent], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decrypted-${filename}`;
      a.click();
      URL.revokeObjectURL(url);

      setDownloadStatus('File downloaded and decrypted');
      */
    } catch (error) {
      console.error('Download error:', error);
      setDownloadStatus(`Download failed: ${error.message}`);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Download File</h1>
      <input
        type="text"
        placeholder="Enter filename from server"
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        className="border p-2 w-full mb-4"
      />
      <button onClick={handleDownload} className="bg-blue-500 text-white px-4 py-2">
        Download & Decrypt
      </button>
      {downloadStatus && <p className="mt-4">{downloadStatus}</p>}
    </div>
  );
};

export default DownloadFile;
