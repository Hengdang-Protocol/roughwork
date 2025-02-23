import * as bip39 from 'bip39';
import { HDKey } from '@scure/bip32';
import { bech32 } from 'bech32';

export interface KeyPair {
  privateKey: string;
  publicKey: string;
  hpub: string;
}

export class KeyGenerator {
  private static readonly HENGDANG_PATH = "m/44'/65535'/0'/0/0";
  private static readonly HPUB_PREFIX = 'hpub';

  static generateMnemonic(): string {
    return bip39.generateMnemonic(256); // 24 words
  }

  static async generateKeyPair(mnemonic: string): Promise<KeyPair> {
    // Validate mnemonic
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    // Generate seed from mnemonic
    const seed = await bip39.mnemonicToSeed(mnemonic);
    
    // Generate master key
    const masterKey = HDKey.fromMasterSeed(seed);
    
    // Derive key pair using Hengdang path
    const derived = masterKey.derive(this.HENGDANG_PATH);
    
    if (!derived.privateKey || !derived.publicKey) {
      throw new Error('Failed to derive key pair');
    }

    // Convert to hex strings
    const privateKey = Buffer.from(derived.privateKey).toString('hex');
    const publicKey = Buffer.from(derived.publicKey).toString('hex');
    
    // Generate bech32 encoded public key
    const words = bech32.toWords(Buffer.from(publicKey, 'hex'));
    const hpub = bech32.encode(this.HPUB_PREFIX, words);

    return {
      privateKey,
      publicKey,
      hpub
    };
  }

  static validateHpub(hpub: string): boolean {
    try {
      const decoded = bech32.decode(hpub);
      return decoded.prefix === this.HPUB_PREFIX;
    } catch {
      return false;
    }
  }

  static hpubToPublicKey(hpub: string): string {
    try {
      const decoded = bech32.decode(hpub);
      if (decoded.prefix !== this.HPUB_PREFIX) {
        throw new Error('Invalid HPUB prefix');
      }
      return Buffer.from(bech32.fromWords(decoded.words)).toString('hex');
    } catch (error) {
      throw new Error('Invalid HPUB format');
    }
  }
}
