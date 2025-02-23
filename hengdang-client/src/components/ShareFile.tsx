import React, { useContext, useState } from 'react';
import { ConfigContext } from '../contexts/ConfigContext';
import { BrowserFileEncryption } from 'hengdang-utils/src/utils/browser-encryption';
import { KeyGenerator } from 'hengdang-utils/src/utils/keys';

const ShareFile = () => {
  const { masterKey } = useContext(ConfigContext);
  const [payloadJSON, setPayloadJSON] = useState('');
  const [recipientHpub, setRecipientHpub] = useState('');
  const [shareStatus, setShareStatus] = useState('');

  const handleShare = async () => {
    if (!payloadJSON) return alert('Please paste the encrypted JSON payload of the file');
    if (!recipientHpub) return alert("Please enter the recipient's HPUB");
    if (!masterKey) return alert('Please set your master private key in configuration');

    try {
      // Parse the JSON payload to extract the encrypted file key
      let payload;
      try {
        payload = JSON.parse(payloadJSON);
      } catch {
        return alert('Invalid JSON payload');
      }

      const { encryptedFileKey } = payload;
      if (!encryptedFileKey) {
        return alert('Payload does not contain an encrypted file key');
      }
      // Convert base64 string to ArrayBuffer
      const encFileKeyBuffer = Uint8Array.from(atob(encryptedFileKey), c => c.charCodeAt(0)).buffer;
      // Recover the file key using the master key
      const fileKey = await BrowserFileEncryption.decryptFileKey(encFileKeyBuffer, masterKey);

      // Convert recipient HPUB to a public key (hex)
      let recipientPubKey: string;
      try {
        recipientPubKey = KeyGenerator.hpubToPublicKey(recipientHpub);
      } catch (error) {
        return alert('Invalid recipient HPUB');
      }

      // Wrap the file key for sharing with the recipient
      const wrappedKeyBuffer = await BrowserFileEncryption.wrapKey(fileKey, recipientPubKey);
      const wrappedKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(wrappedKeyBuffer)));

      setShareStatus(`Wrapped key for recipient:\n${wrappedKeyBase64}`);
      console.error('Share error:', error);
      setShareStatus(`Share failed: ${error.message}`);
      // TODO: Implement browser-compatible key wrapping in BrowserFileEncryption
      // For now, we'll show an error message
      setShareStatus('Key wrapping not yet implemented in browser version');
      // Once implemented, it would look something like this:
      /*
      // Convert base64 string to ArrayBuffer
      const encFileKeyBuffer = Uint8Array.from(atob(encryptedFileKey), c => c.charCodeAt(0)).buffer;

      // Recover the file key using the master key
      const fileKey = await BrowserFileEncryption.decryptFileKey(encFileKeyBuffer, masterKey);

      // Convert recipient HPUB to a public key (hex)
      let recipientPubKey: string;
      try {
        recipientPubKey = KeyGenerator.hpubToPublicKey(recipientHpub);
      } catch (error) {
        return alert('Invalid recipient HPUB');
      }

      // Wrap the file key for sharing with the recipient
      const wrappedKeyBuffer = await BrowserFileEncryption.wrapKey(fileKey, recipientPubKey);
      const wrappedKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(wrappedKeyBuffer)));

      setShareStatus(`Wrapped key for recipient:\n${wrappedKeyBase64}`);
      */
    } catch (error) {
      console.error('Share error:', error);
      setShareStatus(`Share failed: ${error.message}`);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Share File</h1>
      <textarea
        placeholder="Paste JSON payload of the encrypted file"
        value={payloadJSON}
        onChange={(e) => setPayloadJSON(e.target.value)}
        className="border p-2 w-full mb-4 h-32"
      />
      <input
        type="text"
        placeholder="Recipient HPUB"
        value={recipientHpub}
        onChange={(e) => setRecipientHpub(e.target.value)}
        className="border p-2 w-full mb-4"
      />
      <button onClick={handleShare} className="bg-purple-500 text-white px-4 py-2">
        Generate Wrapped Key for Sharing
      </button>
      {shareStatus && <p className="mt-4 whitespace-pre-wrap break-words">{shareStatus}</p>}
    </div>
  );
};

export default ShareFile;
