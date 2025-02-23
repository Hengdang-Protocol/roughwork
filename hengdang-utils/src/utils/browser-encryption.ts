import * as secp256k1 from '@noble/secp256k1';

export interface FileKey {
  key: Uint8Array;
  iv: Uint8Array;
}

export interface FileMetadata {
  name: string;
  size: number;
  mimeType?: string;
}

export class BrowserFileEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 12; // 96 bits for GCM

  static async generateFileKey(): Promise<FileKey> {
    const key = secp256k1.utils.randomBytes(this.KEY_LENGTH);
    const iv = secp256k1.utils.randomBytes(this.IV_LENGTH);
    return { key, iv };
  }

  static async encrypt(data: ArrayBuffer, fileKey: FileKey): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      fileKey.key,
      { name: this.ALGORITHM },
      false,
      ['encrypt']
    );

    const encrypted = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv: fileKey.iv },
      cryptoKey,
      data
    );

    // Combine IV + Encrypted Content
    const result = new Uint8Array(fileKey.iv.length + encrypted.byteLength);
    result.set(fileKey.iv);
    result.set(new Uint8Array(encrypted), fileKey.iv.length);
    
    return result.buffer;
  }

  static async decrypt(encryptedData: ArrayBuffer, fileKey: FileKey): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      fileKey.key,
      { name: this.ALGORITHM },
      false,
      ['decrypt']
    );

    // Extract IV and encrypted content
    const dataArray = new Uint8Array(encryptedData);
    const iv = dataArray.slice(0, this.IV_LENGTH);
    const content = dataArray.slice(this.IV_LENGTH);

    return crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv },
      cryptoKey,
      content
    );
  }

  static async encryptMetadata(metadata: FileMetadata, fileKey: FileKey): Promise<ArrayBuffer> {
    const metadataString = JSON.stringify(metadata);
    const encoder = new TextEncoder();
    const data = encoder.encode(metadataString);
    return this.encrypt(data, fileKey);
  }

  static async decryptMetadata(encryptedMetadata: ArrayBuffer, fileKey: FileKey): Promise<FileMetadata> {
    const decrypted = await this.decrypt(encryptedMetadata, fileKey);
    const decoder = new TextDecoder();
    const metadataString = decoder.decode(decrypted);
    return JSON.parse(metadataString);
  }

  static async encryptFileKey(fileKey: FileKey, masterPrivateKey: string): Promise<ArrayBuffer> {
    const fileKeyBuffer = new Uint8Array(fileKey.key.length + fileKey.iv.length);
    fileKeyBuffer.set(fileKey.key);
    fileKeyBuffer.set(fileKey.iv, fileKey.key.length);
    
    const masterKeyBytes = new TextEncoder().encode(masterPrivateKey);
    const derivedKeyBuffer = await secp256k1.utils.sha256(masterKeyBytes);
    
    const wrappingIv = secp256k1.utils.randomBytes(this.IV_LENGTH);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      derivedKeyBuffer,
      { name: this.ALGORITHM },
      false,
      ['encrypt']
    );
    
    const encrypted = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv: wrappingIv },
      cryptoKey,
      fileKeyBuffer
    );
    
    const result = new Uint8Array(wrappingIv.length + encrypted.byteLength);
    result.set(wrappingIv);
    result.set(new Uint8Array(encrypted), wrappingIv.length);
    
    return result.buffer;
  }

  static async decryptFileKey(encryptedFileKey: ArrayBuffer, masterPrivateKey: string): Promise<FileKey> {
    const encryptedData = new Uint8Array(encryptedFileKey);
    const wrappingIv = encryptedData.slice(0, this.IV_LENGTH);
    const encryptedContent = encryptedData.slice(this.IV_LENGTH);
    
    const masterKeyBytes = new TextEncoder().encode(masterPrivateKey);
    const derivedKeyBuffer = await secp256k1.utils.sha256(masterKeyBytes);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      derivedKeyBuffer,
      { name: this.ALGORITHM },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv: wrappingIv },
      cryptoKey,
      encryptedContent
    );
    
    const decryptedArray = new Uint8Array(decrypted);
    return {
      key: decryptedArray.slice(0, this.KEY_LENGTH),
      iv: decryptedArray.slice(this.KEY_LENGTH)
    };
  }

  static async wrapKey(fileKey: FileKey, recipientPublicKey: string): Promise<ArrayBuffer> {
    // Generate an ephemeral key pair
    const ephemeralPrivateKey = secp256k1.utils.randomBytes(32);
    const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey, true);
    
    // Generate wrapping IV
    const wrappingIv = secp256k1.utils.randomBytes(this.IV_LENGTH);
    
    // Convert hex public key to Uint8Array
    const recipientPubKeyBytes = Uint8Array.from(
      recipientPublicKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    // Compute shared secret using ECDH
    const sharedSecret = await secp256k1.getSharedSecret(
      ephemeralPrivateKey,
      recipientPubKeyBytes,
      true
    );
    
    // Import the shared secret as a key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret.slice(0, 32),
      { name: this.ALGORITHM },
      false,
      ['encrypt']
    );
    
    // Combine file key and IV
    const fileKeyBuffer = new Uint8Array(fileKey.key.length + fileKey.iv.length);
    fileKeyBuffer.set(fileKey.key);
    fileKeyBuffer.set(fileKey.iv, fileKey.key.length);
    
    // Encrypt the file key
    const encrypted = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv: wrappingIv },
      cryptoKey,
      fileKeyBuffer
    );
    
    // Combine: ephemeral public key + wrapping IV + encrypted key
    const result = new Uint8Array(ephemeralPublicKey.length + wrappingIv.length + encrypted.byteLength);
    result.set(ephemeralPublicKey);
    result.set(wrappingIv, ephemeralPublicKey.length);
    result.set(new Uint8Array(encrypted), ephemeralPublicKey.length + wrappingIv.length);
    
    return result.buffer;
  }

  static async unwrapKey(wrappedKeyData: ArrayBuffer, privateKey: string): Promise<FileKey> {
    const wrappedKeyArray = new Uint8Array(wrappedKeyData);
    
    // Extract components
    const ephemeralPublicKey = wrappedKeyArray.slice(0, 33); // 33 bytes for compressed public key
    const wrappingIv = wrappedKeyArray.slice(33, 33 + this.IV_LENGTH);
    const encryptedKey = wrappedKeyArray.slice(33 + this.IV_LENGTH);
    
    // Convert hex private key to Uint8Array
    const privateKeyBytes = Uint8Array.from(
      privateKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    // Compute shared secret
    const sharedSecret = await secp256k1.getSharedSecret(
      privateKeyBytes,
      ephemeralPublicKey,
      true
    );
    
    // Import the shared secret as a key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret.slice(0, 32),
      { name: this.ALGORITHM },
      false,
      ['decrypt']
    );
    
    // Decrypt the wrapped key
    const decrypted = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv: wrappingIv },
      cryptoKey,
      encryptedKey
    );
    
    const decryptedArray = new Uint8Array(decrypted);
    return {
      key: decryptedArray.slice(0, this.KEY_LENGTH),
      iv: decryptedArray.slice(this.KEY_LENGTH)
    };
  }
}
