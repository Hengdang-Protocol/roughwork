import { KeyGenerator } from '../utils/keys';
import * as bip39 from 'bip39';

describe('KeyGenerator', () => {
  describe('generateMnemonic', () => {
    it('should generate a valid 24-word mnemonic', () => {
      const mnemonic = KeyGenerator.generateMnemonic();
      const words = mnemonic.split(' ');
      
      expect(words).toHaveLength(24);
      expect(bip39.validateMnemonic(mnemonic)).toBe(true);
    });
  });

  describe('generateKeyPair', () => {
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    
    it('should generate consistent keys from the same mnemonic', async () => {
      const keyPair1 = await KeyGenerator.generateKeyPair(testMnemonic);
      const keyPair2 = await KeyGenerator.generateKeyPair(testMnemonic);
      
      expect(keyPair1.privateKey).toBe(keyPair2.privateKey);
      expect(keyPair1.publicKey).toBe(keyPair2.publicKey);
      expect(keyPair1.hpub).toBe(keyPair2.hpub);
    });

    it('should throw error for invalid mnemonic', async () => {
      const invalidMnemonic = 'invalid mnemonic phrase here';
      
      await expect(KeyGenerator.generateKeyPair(invalidMnemonic))
        .rejects
        .toThrow('Invalid mnemonic');
    });

    it('should generate keys in correct format', async () => {
      const keyPair = await KeyGenerator.generateKeyPair(testMnemonic);
      
      // Check private key format (64 char hex)
      expect(keyPair.privateKey).toMatch(/^[0-9a-f]{64}$/);
      
      // Check public key format (66 char hex, starts with 02 or 03 for compressed)
      expect(keyPair.publicKey).toMatch(/^0[23][0-9a-f]{64}$/);
      
      // Check HPUB format (starts with 'hpub1')
      expect(keyPair.hpub).toMatch(/^hpub1[a-zA-Z0-9]+$/);
    });
  });

  describe('validateHpub', () => {
    it('should validate correct HPUB format', async () => {
      const mnemonic = KeyGenerator.generateMnemonic();
      const { hpub } = await KeyGenerator.generateKeyPair(mnemonic);
      
      expect(KeyGenerator.validateHpub(hpub)).toBe(true);
    });

    it('should reject invalid HPUB format', () => {
      const invalidHpubs = [
        'not-an-hpub',
        'hpub2abcdef', // wrong version
        'npub1abcdef', // wrong prefix
        'hpub1!@#$%'   // invalid chars
      ];

      invalidHpubs.forEach(hpub => {
        expect(KeyGenerator.validateHpub(hpub)).toBe(false);
      });
    });
  });

  describe('hpubToPublicKey', () => {
    it('should convert valid HPUB to public key', async () => {
      const mnemonic = KeyGenerator.generateMnemonic();
      const { publicKey, hpub } = await KeyGenerator.generateKeyPair(mnemonic);
      
      const convertedPubKey = KeyGenerator.hpubToPublicKey(hpub);
      expect(convertedPubKey).toBe(publicKey);
    });

    it('should throw error for invalid HPUB', () => {
      const invalidHpubs = [
        'not-an-hpub',
        'hpub2abcdef', // wrong version
        'npub1abcdef', // wrong prefix
        'hpub1!@#$%'   // invalid chars
      ];

      invalidHpubs.forEach(hpub => {
        expect(() => KeyGenerator.hpubToPublicKey(hpub)).toThrow();
      });
    });
  });
});
