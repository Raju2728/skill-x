import keyManager from './keyManager';
import {
  importPublicJWK,
  deriveSharedSecret,
  deriveAESKeyFromRaw,
  encryptText,
  decryptText,
  generateSafetyNumber,
} from './cryptoUtils';
import { keysAPI } from '../../services/api';

class E2EEService {
  constructor() {
    this.sessionKeys = new Map(); // conversationId -> AES CryptoKey
  }

  /**
   * Establish or retrieve AES session key for a conversation
   */
  async getOrCreateSessionKey(conversationId, currentUserId, partnerUserId) {
    if (this.sessionKeys.has(conversationId)) {
      return this.sessionKeys.get(conversationId);
    }

    // Load local private key
    let myIdentity = await keyManager.getIdentityKeyPair(currentUserId);
    if (!myIdentity) {
      myIdentity = await keyManager.initializeKeys(currentUserId);
    }

    const myPrivateKey = await window.crypto.subtle.importKey(
      'jwk',
      myIdentity.privateJWK,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits']
    );

    // Fetch partner's public key bundle
    const { data } = await keysAPI.getBundle(partnerUserId);
    if (!data.bundle?.identityKey) {
      throw new Error('Partner public key bundle not found');
    }

    const partnerPublicJWK = JSON.parse(data.bundle.identityKey);
    const partnerPublicKey = await importPublicJWK(partnerPublicJWK);

    // ECDH key agreement
    const sharedBits = await deriveSharedSecret(myPrivateKey, partnerPublicKey);
    const aesKey = await deriveAESKeyFromRaw(
      sharedBits,
      new Uint8Array(32),
      `SkillX-Conv-${[currentUserId, partnerUserId].sort().join(':')}`
    );

    this.sessionKeys.set(conversationId, aesKey);
    return aesKey;
  }

  /**
   * Encrypt a text message for a conversation
   */
  async encryptMessage(conversationId, currentUserId, partnerUserId, plaintext) {
    try {
      const aesKey = await this.getOrCreateSessionKey(conversationId, currentUserId, partnerUserId);
      const encrypted = await encryptText(aesKey, plaintext);
      return encrypted;
    } catch (err) {
      console.error('E2EE Encryption error:', err);
      // Dev fallback if keys fail
      return {
        ciphertext: window.btoa(plaintext),
        nonce: window.btoa('dev_fallback_iv'),
      };
    }
  }

  /**
   * Decrypt a message ciphertext
   */
  async decryptMessage(conversationId, currentUserId, partnerUserId, ciphertext, nonce) {
    if (!ciphertext) return '';
    try {
      const aesKey = await this.getOrCreateSessionKey(conversationId, currentUserId, partnerUserId);
      return await decryptText(aesKey, ciphertext, nonce);
    } catch (err) {
      // If native decrypt fails, try fallback decode
      try {
        return window.atob(ciphertext);
      } catch {
        return '[Encrypted message: session key mismatch]';
      }
    }
  }

  /**
   * Get Safety Number for identity verification
   */
  async getSafetyNumber(currentUserId, partnerUserId) {
    const myIdentity = await keyManager.getIdentityKeyPair(currentUserId);
    const { data } = await keysAPI.getBundle(partnerUserId);

    if (!myIdentity || !data.bundle?.identityKey) {
      return '00000 00000 00000 00000 00000 00000';
    }

    return await generateSafetyNumber(
      JSON.stringify(myIdentity.publicJWK),
      data.bundle.identityKey
    );
  }
}

export default new E2EEService();
