#!/usr/bin/env node

import { FileEncryption, FileMetadata } from '../utils/encryption';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const filePath = process.argv[2];
  const masterPrivateKey = process.argv[3];

  if (!filePath || !masterPrivateKey) {
    console.error('Usage: npm run file:encrypt <file_path> <master_private_key>');
    process.exit(1);
  }

  try {
    // Read the file
    const fileContent = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);

    // Generate a new file key
    const fileKey = FileEncryption.generateFileKey();
    
    // Create metadata
    const metadata: FileMetadata = {
      name: path.basename(filePath),
      size: stats.size,
      mimeType: path.extname(filePath) || 'application/octet-stream',
    };
    
    // Encrypt file and metadata
    const encryptedContent = FileEncryption.encrypt(fileContent, fileKey);
    const encryptedMetadata = FileEncryption.encryptMetadata(metadata, fileKey);
    
    // Encrypt the file key itself using master key
    const encryptedFileKey = await FileEncryption.encryptFileKey(fileKey, masterPrivateKey);
    
    // Save all files
    const basePath = filePath;
    const encryptedPath = `${basePath}.encrypted`;
    const metadataPath = `${basePath}.metadata`;
    const keyPath = `${basePath}.wrapped`;
    
    fs.writeFileSync(encryptedPath, encryptedContent);
    fs.writeFileSync(metadataPath, encryptedMetadata);
    fs.writeFileSync(keyPath, encryptedFileKey);
    
    console.log('\n✨ File encrypted successfully!');
    console.log('Encrypted file:', encryptedPath);
    console.log('Encrypted metadata:', metadataPath);
    console.log('Encrypted key:', keyPath);
    
    console.log('\n📝 File Metadata:');
    console.log(JSON.stringify(metadata, null, 2));
    
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
