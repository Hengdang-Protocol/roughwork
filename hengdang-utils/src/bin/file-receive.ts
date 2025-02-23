#!/usr/bin/env node

import { FileEncryption } from '../utils/encryption';
import * as fs from 'fs';

async function main() {
  const filePath = process.argv[2];
  const sharedKeyPath = process.argv[3];
  const privateKey = process.argv[4];

  if (!filePath || !sharedKeyPath || !privateKey) {
    console.error('Usage: npm run file:receive <encrypted_file_path> <shared_key_path> <private_key>');
    process.exit(1);
  }

  try {
    // Get paths
    const metadataPath = filePath.replace('.encrypted', '.metadata');
    
    if (!fs.existsSync(metadataPath)) {
      console.error('Error: Metadata file not found:', metadataPath);
      process.exit(1);
    }
    
    // Read all files
    const encrypted = fs.readFileSync(filePath);
    const encryptedMetadata = fs.readFileSync(metadataPath);
    const wrappedKey = fs.readFileSync(sharedKeyPath);
    
    // Unwrap the file key using recipient's private key
    const fileKey = await FileEncryption.unwrapKey(wrappedKey, privateKey);
    
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
