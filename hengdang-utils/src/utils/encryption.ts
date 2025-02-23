import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import * as secp256k1 from '@noble/secp256k1';

export interface FileKey {
  key: Buffer;
  iv: Buffer;
}

export interface FileMetadata {
  name: string;
  size: number;
  mimeType?: string;
}

export class FileEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 12; // 96 bits for GCM

  static generateFileKey(): FileKey {
    return {
      key: randomBytes(this.KEY_LENGTH),
      iv: randomBytes(this.IV_LENGTH)
    };
  }

  static encrypt(data: Buffer, fileKey: FileKey): Buffer {
    const cipher = createCipheriv(
      this.ALGORITHM,
      fileKey.key,
      fileKey.iv
    );

    const encryptedContent = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);

    // Get the auth tag
    const authTag = cipher.getAuthTag();

    // Combine IV + Auth Tag + Encrypted Content
    return Buffer.concat([fileKey.iv, authTag, encryptedContent]);
  }

  static decrypt(encryptedData: Buffer, key: Buffer): Buffer {
    // Extract IV, Auth Tag, and encrypted content
    const iv = encryptedData.subarray(0, this.IV_LENGTH);
    const authTag = encryptedData.subarray(this.IV_LENGTH, this.IV_LENGTH + 16);
    const content = encryptedData.subarray(this.IV_LENGTH + 16);

    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(content),
      decipher.final()
    ]);
  }

  static encryptMetadata(metadata: FileMetadata, fileKey: FileKey): Buffer {
    const metadataString = JSON.stringify(metadata);
    return this.encrypt(Buffer.from(metadataString), fileKey);
  }

  static decryptMetadata(encryptedMetadata: Buffer, key: Buffer): FileMetadata {
    const decryptedBuffer = this.decrypt(encryptedMetadata, key);
    return JSON.parse(decryptedBuffer.toString());
  }

  static async wrapKey(fileKey: FileKey, recipientPublicKey: string): Promise<Buffer> {
    // Generate an ephemeral key pair
    const ephemeralPrivateKey = randomBytes(32);
    const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey, true);
    
    // Generate wrapping IV
    const wrappingIv = randomBytes(this.IV_LENGTH);
    
    // Convert hex public key to Uint8Array and ensure it's compressed
    const recipientPubKeyBytes = Uint8Array.from(
      Buffer.from(recipientPublicKey, 'hex')
    );
    
    // Compute shared secret using ECDH
    const sharedSecret = await secp256k1.getSharedSecret(
      ephemeralPrivateKey,
      recipientPubKeyBytes,
      true
    );
    
    // Encrypt the file key with the shared secret
    const cipher = createCipheriv(this.ALGORITHM, sharedSecret.slice(0, 32), wrappingIv);
    const wrappedKey = Buffer.concat([
      cipher.update(Buffer.concat([fileKey.key, fileKey.iv])),
      cipher.final()
    ]);
    
    // Get the auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine: ephemeral public key + wrapping IV + auth tag + wrapped key
    return Buffer.concat([
      Buffer.from(ephemeralPublicKey),
      wrappingIv,
      authTag,
      wrappedKey
    ]);
  }

  static async unwrapKey(wrappedKeyData: Buffer, privateKey: string): Promise<FileKey> {
    // Extract components
    const ephemeralPublicKey = wrappedKeyData.subarray(0, 33); // 33 bytes for compressed public key
    const wrappingIv = wrappedKeyData.subarray(33, 45);
    const authTag = wrappedKeyData.subarray(45, 61);
    const wrappedKey = wrappedKeyData.subarray(61);
    
    // Convert hex private key to Uint8Array
    const privateKeyBytes = Uint8Array.from(
      Buffer.from(privateKey, 'hex')
    );
    
    // Compute shared secret
    const sharedSecret = await secp256k1.getSharedSecret(
      privateKeyBytes,
      Uint8Array.from(ephemeralPublicKey),
      true
    );
    
    // Decrypt the wrapped key
    const decipher = createDecipheriv(this.ALGORITHM, sharedSecret.slice(0, 32), wrappingIv);
    decipher.setAuthTag(authTag);
    
    const unwrappedBuffer = Buffer.concat([
      decipher.update(wrappedKey),
      decipher.final()
    ]);
    
    // Split into key and IV
    return {
      key: unwrappedBuffer.subarray(0, 32),
      iv: unwrappedBuffer.subarray(32)
    };
  }

  static async encryptFileKey(fileKey: FileKey, masterPrivateKey: string): Promise<Buffer> {
    // Convert the file key to a buffer
    const fileKeyBuffer = Buffer.concat([fileKey.key, fileKey.iv]);
    
    // Generate a random IV for wrapping
    const wrappingIv = randomBytes(this.IV_LENGTH);
    
    // Use master private key to derive an encryption key
    const masterKeyBytes = Uint8Array.from(Buffer.from(masterPrivateKey, 'hex'));
    const derivedKey = await secp256k1.utils.sha256(masterKeyBytes);
    
    // Encrypt the file key
    const cipher = createCipheriv(this.ALGORITHM, derivedKey, wrappingIv);
    const encryptedKey = Buffer.concat([
      cipher.update(fileKeyBuffer),
      cipher.final()
    ]);
    
    // Get the auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine: IV + auth tag + encrypted key
    return Buffer.concat([wrappingIv, authTag, encryptedKey]);
  }

  static async decryptFileKey(encryptedFileKey: Buffer, masterPrivateKey: string): Promise<FileKey> {
    // Extract components
    const wrappingIv = encryptedFileKey.subarray(0, this.IV_LENGTH);
    const authTag = encryptedFileKey.subarray(this.IV_LENGTH, this.IV_LENGTH + 16);
    const encryptedKey = encryptedFileKey.subarray(this.IV_LENGTH + 16);
    
    // Derive the encryption key from master private key
    const masterKeyBytes = Uint8Array.from(Buffer.from(masterPrivateKey, 'hex'));
    const derivedKey = await secp256k1.utils.sha256(masterKeyBytes);
    
    // Decrypt the file key
    const decipher = createDecipheriv(this.ALGORITHM, derivedKey, wrappingIv);
    decipher.setAuthTag(authTag);
    
    const fileKeyBuffer = Buffer.concat([
      decipher.update(encryptedKey),
      decipher.final()
    ]);
    
    // Split into key and IV
    return {
      key: fileKeyBuffer.subarray(0, 32),
      iv: fileKeyBuffer.subarray(32)
    };
  }
}
