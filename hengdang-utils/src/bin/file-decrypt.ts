#!/usr/bin/env node

import { FileEncryption } from '../utils/encryption';
import * as fs from 'fs';

async function main() {
  const filePath = process.argv[2];
  const masterPrivateKey = process.argv[3];

  if (!filePath || !masterPrivateKey) {
    console.error('Usage: npm run file:decrypt <encrypted_file_path> <master_private_key>');
    process.exit(1);
  }

  try {
    // Get paths
    const keyPath = filePath.replace('.encrypted', '.wrapped');
    const metadataPath = filePath.replace('.encrypted', '.metadata');
    
    if (!fs.existsSync(keyPath)) {
      console.error('Error: Encrypted key file not found:', keyPath);
      process.exit(1);
    }
    
    if (!fs.existsSync(metadataPath)) {
      console.error('Error: Metadata file not found:', metadataPath);
      process.exit(1);
    }
    
    // Read all files
    const encrypted = fs.readFileSync(filePath);
    const encryptedMetadata = fs.readFileSync(metadataPath);
    const encryptedKey = fs.readFileSync(keyPath);
    
    // First decrypt the file key using master key
    const fileKey = await FileEncryption.decryptFileKey(encryptedKey, masterPrivateKey);
    
    // Decrypt metadata
    const metadata = FileEncryption.decryptMetadata(encryptedMetadata, fileKey.key);
    console.log('\n📝 File Metadata:');
    console.log(JSON.stringify(metadata, null, 2));
    
    // Decrypt content
    const decrypted = FileEncryption.decrypt(encrypted, fileKey.key);
    const decryptedPath = filePath.replace('.encrypted', '.decrypted');
    fs.writeFileSync(decryptedPath, decrypted);
    
    console.log('\n✨ File decrypted successfully!');
    console.log('Decrypted file:', decryptedPath);
    
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('An unknown error occurred');
    }
    process.exit(1);
  }
}

main();
