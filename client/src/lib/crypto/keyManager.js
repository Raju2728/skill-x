import { generateECDHKeyPair, exportJWK, importPublicJWK } from './cryptoUtils';
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
   * Ensure user's identity keys are generated and registered on backend
   */
  async initializeKeys(userId) {
    const existingIdentity = await this.getItem(`identity_${userId}`);

    if (existingIdentity) {
      return existingIdentity;
    }

    // Generate new Identity Key Pair
    const identityKeyPair = await generateECDHKeyPair();
    const identityPublicJWK = await exportJWK(identityKeyPair.publicKey);
    const identityPrivateJWK = await exportJWK(identityKeyPair.privateKey);

    // Generate Signed Pre-Key
    const signedPreKeyPair = await generateECDHKeyPair();
    const signedPreKeyPublicJWK = await exportJWK(signedPreKeyPair.publicKey);
    const signedPreKeyPrivateJWK = await exportJWK(signedPreKeyPair.privateKey);

    // Generate One-Time Pre-Keys (e.g. 5 pre-keys)
    const oneTimeKeys = [];
    const oneTimePublicKeys = [];
    for (let i = 1; i <= 5; i++) {
      const opk = await generateECDHKeyPair();
      const opkPub = await exportJWK(opk.publicKey);
      const opkPriv = await exportJWK(opk.privateKey);
      oneTimeKeys.push({ keyId: i, privateJWK: opkPriv, publicJWK: opkPub });
      oneTimePublicKeys.push({ keyId: i, key: JSON.stringify(opkPub) });
    }

    // Save private material in IndexedDB
    await this.setItem(`identity_${userId}`, {
      publicJWK: identityPublicJWK,
      privateJWK: identityPrivateJWK,
    });
    await this.setItem(`signedPreKey_${userId}`, {
      publicJWK: signedPreKeyPublicJWK,
      privateJWK: signedPreKeyPrivateJWK,
    });
    await this.setItem(`oneTimeKeys_${userId}`, oneTimeKeys);

    // Upload public bundle to backend
    try {
      await keysAPI.uploadBundle({
        identityKey: JSON.stringify(identityPublicJWK),
        signedPreKey: {
          key: JSON.stringify(signedPreKeyPublicJWK),
          signature: 'sig_valid', // in full Signal this is signed with Ed25519
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
    };
  }

  async getIdentityKeyPair(userId) {
    return await this.getItem(`identity_${userId}`);
  }

  async getSignedPreKeyPair(userId) {
    return await this.getItem(`signedPreKey_${userId}`);
  }
}

export default new KeyManager();
