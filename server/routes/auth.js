const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { JWT_SECRET, generateToken, verifyToken } = require('../config/jwt');

const router = express.Router();

// Ephemeral single-use OAuth authorization codes (TTL 60s)
const oauthExchangeCodes = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of oauthExchangeCodes.entries()) {
    if (data.expiresAt < now) {
      oauthExchangeCodes.delete(code);
    }
  }
}, 60000);

function setTokenCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    // In production the frontend (Vercel) and backend (Render) are on different
    // domains, so we need sameSite='none' + secure=true for cookies to be sent
    // cross-origin with credentials.
    // In development (same origin via Vite proxy) sameSite='lax' works fine.
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// Register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 chars, only letters/numbers/underscores'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { name, username, email, password } = req.body;

    // Check existing
    const existingUser = await User.findOne({ $or: [{ email }, { username: username.toLowerCase() }] });
    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(409).json({ message: 'Email already registered' });
      }
      return res.status(409).json({ message: 'Username already taken' });
    }

    const user = await User.create({
      name,
      username: username.toLowerCase(),
      email,
      passwordHash: password,
      status: 'active',
    });

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.status(201).json({
      message: 'Registration successful',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', [
  body('emailOrUsername').trim().notEmpty().withMessage('Email or username required'),
  body('password').notEmpty().withMessage('Password required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { emailOrUsername, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername.toLowerCase() },
      ],
    }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ message: 'Please sign in with Google' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended' });
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ message: 'Logged out' });
});

// Public config — tells the client which auth features are available
router.get('/config', (req, res) => {
  res.json({
    googleOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
});

// Google OAuth — guard against missing credentials
function requireGoogleOAuth(req, res, next) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ message: 'Google OAuth is not configured on this server' });
  }
  next();
}

router.get('/google',
  requireGoogleOAuth,
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  requireGoogleOAuth,
  (req, res, next) => {
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${frontendUrl}/login?error=google_auth_failed`,
    })(req, res, next);
  },
  (req, res) => {
    const token = generateToken(req.user._id);
    setTokenCookie(res, token);
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    // Issue ephemeral single-use authorization code for frontend exchange
    // This prevents exposing raw JWT in browser history, logs, or Referrer headers
    const exchangeCode = crypto.randomBytes(32).toString('hex');
    oauthExchangeCodes.set(exchangeCode, {
      token,
      user: {
        _id: req.user._id,
        name: req.user.name,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar,
        role: req.user.role,
      },
      expiresAt: Date.now() + 60000, // 60-second TTL
    });

    res.redirect(`${frontendUrl}/app/dashboard?code=${exchangeCode}`);
  }
);

// Secure exchange endpoint for single-use OAuth authorization codes
router.post('/oauth-exchange', (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ message: 'Authorization code is required' });
  }

  const exchangeData = oauthExchangeCodes.get(code);
  if (!exchangeData) {
    return res.status(400).json({ message: 'Invalid or expired authorization code' });
  }

  if (Date.now() > exchangeData.expiresAt) {
    oauthExchangeCodes.delete(code);
    return res.status(400).json({ message: 'Authorization code expired' });
  }

  // Single-use: delete immediately upon redemption
  oauthExchangeCodes.delete(code);
  setTokenCookie(res, exchangeData.token);

  res.json({
    token: exchangeData.token,
    user: exchangeData.user,
  });
});

// Forgot password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond success to prevent email enumeration
    res.json({ message: 'If an account exists, a reset link has been sent' });

    if (!user) return;

    // Generate reset token (never logged to console in any environment)
    const resetToken = jwt.sign({ userId: user._id, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
    // In production, dispatch via configured email transport
  } catch (error) {
    next(error);
  }
});

// Reset password
router.post('/reset-password/:token', [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const decoded = verifyToken(req.params.token);
    if (decoded.type !== 'reset') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.passwordHash = req.body.password;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Reset link expired' });
    }
    next(error);
  }
});

module.exports = router;
