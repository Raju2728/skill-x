const jwt = require('jsonwebtoken');

const isProduction = process.env.NODE_ENV === 'production';
let JWT_SECRET = process.env.JWT_SECRET;

if (isProduction) {
  if (!JWT_SECRET || JWT_SECRET === 'dev-secret' || JWT_SECRET.length < 32) {
    console.error('FATAL: Insecure or missing JWT_SECRET in production. Set a strong secret (at least 32 characters) in your environment variables.');
    process.exit(1);
  }
} else {
  if (!JWT_SECRET || JWT_SECRET === 'dev-secret') {
    console.warn('⚠️ [SECURITY WARNING] Using default/weak JWT_SECRET. Ensure a strong JWT_SECRET is configured in .env before production deployment.');
    JWT_SECRET = 'dev-secret-skillx-local-dev-key-change-in-prod';
  }
}

const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(userId, options = {}) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: options.expiresIn || JWT_EXPIRES, ...options });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES,
  generateToken,
  verifyToken,
};
