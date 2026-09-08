import {
  generateECDHKeyPair,
  generateSigningKeyPair,
  signData,
  verifySignature,
  exportJWK,
  importPublicJWK,
  importPublicSigningJWK,
} from './cryptoUtils';
import { keysAPI } from '../../services/api';

const DB_NAME = 'SkillX_KeyStore';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

class KeyManager {
  constructor() {
    this.db = null;
  }

  async openDB() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setItem(key, value) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getItem(key) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Ensure user's identity keys and cryptographic pre-keys are generated and registered on backend
   */
  async initializeKeys(userId) {
    const existingIdentity = await this.getItem(`identity_${userId}`);

    if (existingIdentity) {
      return existingIdentity;
    }

    // Generate Identity Key Pair (ECDH for key agreement)
    const identityKeyPair = await generateECDHKeyPair();
    const identityPublicJWK = await exportJWK(identityKeyPair.publicKey);
    const identityPrivateJWK = await exportJWK(identityKeyPair.privateKey);

    // Generate Signing Key Pair (ECDSA for authenticating pre-keys and identity)
    const signingKeyPair = await generateSigningKeyPair();
    const signingPublicJWK = await exportJWK(signingKeyPair.publicKey);
    const signingPrivateJWK = await exportJWK(signingKeyPair.privateKey);

    // Generate Signed Pre-Key
    const signedPreKeyPair = await generateECDHKeyPair();
    const signedPreKeyPublicJWK = await exportJWK(signedPreKeyPair.publicKey);
    const signedPreKeyPrivateJWK = await exportJWK(signedPreKeyPair.privateKey);

    // Cryptographically sign the pre-key with the identity signing private key (HIGH-002)
    const preKeyString = JSON.stringify(signedPreKeyPublicJWK);
    const signature = await signData(signingKeyPair.privateKey, preKeyString);

    // Generate One-Time Pre-Keys
    const oneTimeKeys = [];
    const oneTimePublicKeys = [];
    for (let i = 1; i <= 5; i++) {
      const opk = await generateECDHKeyPair();
      const opkPub = await exportJWK(opk.publicKey);
      const opkPriv = await exportJWK(opk.privateKey);
      oneTimeKeys.push({ keyId: i, privateJWK: opkPriv, publicJWK: opkPub });
      oneTimePublicKeys.push({ keyId: i, key: JSON.stringify(opkPub) });
    }

    // Save private material safely in client IndexedDB
    await this.setItem(`identity_${userId}`, {
      publicJWK: identityPublicJWK,
      privateJWK: identityPrivateJWK,
      signingPublicJWK,
      signingPrivateJWK,
    });
    await this.setItem(`signedPreKey_${userId}`, {
      publicJWK: signedPreKeyPublicJWK,
      privateJWK: signedPreKeyPrivateJWK,
      signature,
    });
    await this.setItem(`oneTimeKeys_${userId}`, oneTimeKeys);

    // Upload authenticated public bundle to backend
    try {
      await keysAPI.uploadBundle({
        identityKey: JSON.stringify(identityPublicJWK),
        signingKey: JSON.stringify(signingPublicJWK),
        signedPreKey: {
          key: preKeyString,
          signature,
          keyId: 1,
        },
        oneTimePreKeys: oneTimePublicKeys,
      });
    } catch (err) {
      console.warn('Could not upload key bundle immediately (will retry on login):', err);
    }

    return {
      publicJWK: identityPublicJWK,
      privateJWK: identityPrivateJWK,
      signingPublicJWK,
    };
  }

  /**
   * Cryptographically verify a peer's signed pre-key signature (HIGH-002)
   */
  async verifyPeerPreKey(signingKeyJWK, preKeyJWK, signature) {
    try {
      if (!signingKeyJWK || !signature) return false;
      const publicSigningKey = await importPublicSigningJWK(signingKeyJWK);
      const preKeyString = typeof preKeyJWK === 'string' ? preKeyJWK : JSON.stringify(preKeyJWK);
      return await verifySignature(publicSigningKey, signature, preKeyString);
    } catch (err) {
      console.error('Peer pre-key signature verification failed:', err);
      return false;
    }
  }

  async getIdentityKeyPair(userId) {
    return await this.getItem(`identity_${userId}`);
  }

  async getSignedPreKeyPair(userId) {
    return await this.getItem(`signedPreKey_${userId}`);
  }
}

export default new KeyManager();
