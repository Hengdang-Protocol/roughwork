import { KeyGenerator } from '../utils/keys';
import { FileEncryption, FileMetadata } from '../utils/encryption';
import * as fs from 'fs';
import * as path from 'path';

describe('Key Sharing', () => {
  let aliceMnemonic: string;
  let bobMnemonic: string;
  let aliceKeyPair: any;
  let bobKeyPair: any;
  let testFileContent: string;

  beforeAll(async () => {
    // Generate keys for two users
    aliceMnemonic = KeyGenerator.generateMnemonic();
    bobMnemonic = KeyGenerator.generateMnemonic();
    
    aliceKeyPair = await KeyGenerator.generateKeyPair(aliceMnemonic);
    bobKeyPair = await KeyGenerator.generateKeyPair(bobMnemonic);
    
    // Create test content
    testFileContent = "This is a secret message from Alice to Bob";
  });

  it('should allow sharing encrypted files between users', async () => {
    // Alice encrypts a file
    const fileKey = FileEncryption.generateFileKey();
    
    // Encrypt file content
    const content = Buffer.from(testFileContent);
    const encryptedContent = FileEncryption.encrypt(content, fileKey);
    
    // Encrypt metadata
    const metadata: FileMetadata = {
      name: 'secret.txt',
      size: content.length,
      mimeType: '.txt'
    };
    const encryptedMetadata = FileEncryption.encryptMetadata(metadata, fileKey);
    
    // Alice wraps the file key for Bob using his public key
    const wrappedKey = await FileEncryption.wrapKey(fileKey, bobKeyPair.publicKey);
    
    // Bob unwraps the file key using his private key
    const unwrappedKey = await FileEncryption.unwrapKey(wrappedKey, bobKeyPair.privateKey);
    
    // Bob decrypts the content and metadata
    const decryptedContent = FileEncryption.decrypt(encryptedContent, unwrappedKey.key);
    const decryptedMetadata = FileEncryption.decryptMetadata(encryptedMetadata, unwrappedKey.key);
    
    // Verify decryption
    expect(decryptedContent.toString()).toBe(testFileContent);
    expect(decryptedMetadata.name).toBe('secret.txt');
    expect(decryptedMetadata.size).toBe(testFileContent.length);
  });

  it('should fail to unwrap key with wrong private key', async () => {
    // Alice encrypts and wraps a key for Bob
    const fileKey = FileEncryption.generateFileKey();
    const wrappedKey = await FileEncryption.wrapKey(fileKey, bobKeyPair.publicKey);
    
    // Try to unwrap with Alice's key instead of Bob's
    await expect(async () => {
      await FileEncryption.unwrapKey(wrappedKey, aliceKeyPair.privateKey);
    }).rejects.toThrow();
  });
});
