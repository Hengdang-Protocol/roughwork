import { FileEncryption } from '../utils/encryption';
import * as fs from 'fs';
import * as path from 'path';

describe('FileEncryption', () => {
  const testFilePath = path.join(__dirname, 'fixtures', 'test.md');
  let testFileContent: Buffer;

  beforeAll(() => {
    testFileContent = fs.readFileSync(testFilePath);
  });

  describe('generateFileKey', () => {
    it('should generate valid file key with correct lengths', () => {
      const fileKey = FileEncryption.generateFileKey();
      
      expect(fileKey.key.length).toBe(32); // 256 bits
      expect(fileKey.iv.length).toBe(12);  // 96 bits
    });

    it('should generate unique keys each time', () => {
      const fileKey1 = FileEncryption.generateFileKey();
      const fileKey2 = FileEncryption.generateFileKey();
      
      expect(fileKey1.key.equals(fileKey2.key)).toBe(false);
      expect(fileKey1.iv.equals(fileKey2.iv)).toBe(false);
    });
  });

  describe('encrypt and decrypt', () => {
    it('should successfully encrypt and decrypt test file', () => {
      // Generate a file key
      const fileKey = FileEncryption.generateFileKey();
      
      // Encrypt the file
      const encrypted = FileEncryption.encrypt(testFileContent, fileKey);
      
      // Verify encrypted content is different from original
      expect(encrypted.equals(testFileContent)).toBe(false);
      
      // Decrypt the file
      const decrypted = FileEncryption.decrypt(encrypted, fileKey.key);
      
      // Verify decrypted content matches original
      expect(decrypted.equals(testFileContent)).toBe(true);
      expect(decrypted.toString('utf8')).toBe(testFileContent.toString('utf8'));
    });

    it('should fail to decrypt with wrong key', () => {
      const fileKey = FileEncryption.generateFileKey();
      const wrongKey = FileEncryption.generateFileKey();
      
      const encrypted = FileEncryption.encrypt(testFileContent, fileKey);
      
      expect(() => {
        FileEncryption.decrypt(encrypted, wrongKey.key);
      }).toThrow();
    });

    it('should fail to decrypt tampered data', () => {
      const fileKey = FileEncryption.generateFileKey();
      const encrypted = FileEncryption.encrypt(testFileContent, fileKey);
      
      // Tamper with the encrypted data
      encrypted[encrypted.length - 1] ^= 1;
      
      expect(() => {
        FileEncryption.decrypt(encrypted, fileKey.key);
      }).toThrow();
    });
  });

  describe('encryptFileKey and decryptFileKey', () => {
    it('should successfully encrypt and decrypt a file key using master key', async () => {
      const fileKey = FileEncryption.generateFileKey();
      const masterPrivateKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      // Encrypt the file key
      const encryptedKey = await FileEncryption.encryptFileKey(fileKey, masterPrivateKey);
      
      // Verify encrypted key is different
      expect(encryptedKey.equals(Buffer.concat([fileKey.key, fileKey.iv]))).toBe(false);
      
      // Decrypt the key
      const decryptedKey = await FileEncryption.decryptFileKey(encryptedKey, masterPrivateKey);
      
      // Verify decrypted key matches original
      expect(decryptedKey.key.equals(fileKey.key)).toBe(true);
      expect(decryptedKey.iv.equals(fileKey.iv)).toBe(true);
    });

    it('should fail to decrypt key with wrong master key', async () => {
      const fileKey = FileEncryption.generateFileKey();
      const correctMasterKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const wrongMasterKey = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      
      const encryptedKey = await FileEncryption.encryptFileKey(fileKey, correctMasterKey);
      
      await expect(async () => {
        await FileEncryption.decryptFileKey(encryptedKey, wrongMasterKey);
      }).rejects.toThrow();
    });
  });
});
