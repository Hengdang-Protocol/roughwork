#!/usr/bin/env node

import { FileEncryption } from '../utils/encryption';
import { KeyGenerator } from '../utils/keys';
import * as fs from 'fs';

async function main() {
  const filePath = process.argv[2];
  const recipientHpub = process.argv[3];
  const masterPrivateKey = process.argv[4];

  if (!filePath || !recipientHpub || !masterPrivateKey) {
    console.error('Usage: npm run file:share <encrypted_file_path> <recipient_hpub> <master_private_key>');
    process.exit(1);
  }

  try {
    // Validate recipient's HPUB
    if (!KeyGenerator.validateHpub(recipientHpub)) {
      console.error('Error: Invalid recipient HPUB');
      process.exit(1);
    }

    // Get paths
    const keyPath = filePath.replace('.encrypted', '.wrapped');
    
    if (!fs.existsSync(keyPath)) {
      console.error('Error: Encrypted key file not found:', keyPath);
      process.exit(1);
    }
    
    // Read the encrypted file key
    const encryptedKey = fs.readFileSync(keyPath);
    
    // First decrypt the file key using master key
    const fileKey = await FileEncryption.decryptFileKey(encryptedKey, masterPrivateKey);
    
    // Convert HPUB to hex public key
    const recipientPubKey = KeyGenerator.hpubToPublicKey(recipientHpub);
    
    // Wrap the file key for the recipient
    const wrappedKey = await FileEncryption.wrapKey(fileKey, recipientPubKey);
    
    // Save the wrapped key
    const sharedKeyPath = `${filePath}.shared.${recipientHpub}`;
    fs.writeFileSync(sharedKeyPath, wrappedKey);
    
    console.log('\n✨ File key shared successfully!');
    console.log('Shared key file:', sharedKeyPath);
    
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
