/**
 * Web Crypto API utilities for End-to-End Encryption (E2EE)
 * Uses native ECDH P-256 for key agreement, HKDF-SHA256 for key derivation,
 * and AES-256-GCM for authenticated encryption.
 */

// Convert ArrayBuffer to Base64 string
export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 string to ArrayBuffer
export function base64ToBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate ECDH P-256 Key Pair
export async function generateECDHKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );
}

// Export CryptoKey to JWK format
export async function exportJWK(key) {
  return await window.crypto.subtle.exportKey('jwk', key);
}

// Import Public Key from JWK format
export async function importPublicJWK(jwk) {
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
}

// Derive a shared secret between our private key and peer's public key
export async function deriveSharedSecret(privateKey, peerPublicKey) {
  return await window.crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: peerPublicKey,
    },
    privateKey,
    256 // 256 bits
  );
}

// Derive AES-256-GCM encryption key from raw shared bits using HKDF
export async function deriveAESKeyFromRaw(rawBits, salt = new Uint8Array(32), info = 'SkillX-E2EE-Session') {
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    rawBits,
    'HKDF',
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: new TextEncoder().encode(info),
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext string using AES-256-GCM
export async function encryptText(aesKey, plaintext) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit standard IV
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    aesKey,
    encoded
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    nonce: bufferToBase64(iv),
  };
}

// Decrypt ciphertext using AES-256-GCM
export async function decryptText(aesKey, ciphertextBase64, nonceBase64) {
  const iv = new Uint8Array(base64ToBuffer(nonceBase64));
  const ciphertext = base64ToBuffer(ciphertextBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    aesKey,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuffer);
}

// Generate Safety Number (Numeric Fingerprint) for identity verification
export async function generateSafetyNumber(keyAJson, keyBJson) {
  const combined = [keyAJson, keyBJson].sort().join('::');
  const hashBuffer = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(combined)
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Format as 6 blocks of 5 digits
  let digits = '';
  for (let i = 0; i < hashArray.length && digits.length < 30; i++) {
    digits += hashArray[i].toString().padStart(3, '0');
  }

  return (
    digits.slice(0, 5) + ' ' +
    digits.slice(5, 10) + ' ' +
    digits.slice(10, 15) + ' ' +
    digits.slice(15, 20) + ' ' +
    digits.slice(20, 25) + ' ' +
    digits.slice(25, 30)
  );
}
