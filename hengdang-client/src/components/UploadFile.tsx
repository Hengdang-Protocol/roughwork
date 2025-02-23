import React, { useContext, useState } from 'react';
import { ConfigContext } from '../contexts/ConfigContext';
import { BrowserFileEncryption } from 'hengdang-utils/src/utils/browser-encryption';

const UploadFile = () => {
  const { serverUrl, masterKey } = useContext(ConfigContext);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return alert('Please select a file');
    if (!masterKey) return alert('Please set your master private key in configuration');

    try {
      // Read the file as an ArrayBuffer
      const fileBuffer = await selectedFile.arrayBuffer();

      // Generate a file key and encrypt file content
      const fileKey = await BrowserFileEncryption.generateFileKey();
      const encryptedContent = await BrowserFileEncryption.encrypt(fileBuffer, fileKey);

      // Create metadata and encrypt it
      const metadata = {
        name: selectedFile.name,
        size: selectedFile.size,
        mimeType: selectedFile.type || 'application/octet-stream'
      };
      const encryptedMetadata = await BrowserFileEncryption.encryptMetadata(metadata, fileKey);

      // Encrypt the file key with the master key
      const encryptedFileKey = await BrowserFileEncryption.encryptFileKey(fileKey, masterKey);

      // Convert ArrayBuffers to base64 strings
      const payload = {
        encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
        encryptedMetadata: btoa(String.fromCharCode(...new Uint8Array(encryptedMetadata))),
        encryptedFileKey: btoa(String.fromCharCode(...new Uint8Array(encryptedFileKey)))
      };

      // Send payload to server
      const response = await fetch(`${serverUrl}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setUploadStatus(`File uploaded successfully as ${result.filename}`);
      } else {
        setUploadStatus('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(`Upload failed: ${error.message}`);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Upload File</h1>
      <input type="file" onChange={handleFileChange} className="mb-4" />
      <button onClick={handleUpload} className="bg-green-500 text-white px-4 py-2">
        Upload
      </button>
      {uploadStatus && <p className="mt-4">{uploadStatus}</p>}
    </div>
  );
};

export default UploadFile;
