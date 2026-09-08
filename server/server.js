require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { Server: SocketServer } = require('socket.io');
const passport = require('passport');

const connectDB = require('./config/database');
const configurePassport = require('./config/passport');
const { JWT_SECRET } = require('./config/jwt');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const skillRoutes = require('./routes/skills');
const matchRoutes = require('./routes/matches');
const exchangeRoutes = require('./routes/exchangeRequests');
const connectionRoutes = require('./routes/connections');
const conversationRoutes = require('./routes/conversations');
const sessionRoutes = require('./routes/sessions');
const reviewRoutes = require('./routes/reviews');
const learningRoutes = require('./routes/learning');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const keyRoutes = require('./routes/keys');
const fileRoutes = require('./routes/files');

// Socket handlers
const initSocket = require('./socket');

const app = express();
const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Trust proxy — required when running behind Render/Railway/Heroku reverse
// proxies so that express-rate-limit sees the real client IP, and so
// res.cookie({ secure: true }) works correctly over HTTPS.
// ---------------------------------------------------------------------------
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// CORS — allow the configured frontend origin.
// In production CLIENT_URL must be your Vercel URL (no trailing slash).
// Multiple origins can be added as comma-separated in the env var.
// ---------------------------------------------------------------------------
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
};

// Socket.IO
const io = new SocketServer(server, {
  cors: corsOptions,
});

// Connect to MongoDB
connectDB();

// Configure Passport
configurePassport(passport);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      mediaSrc: ["'self'", "blob:", "data:"],
      connectSrc: ["'self'", "https:", "wss:", "ws:", "http:"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting — generous limits for SPA usage where multiple components
// fetch simultaneously on page load
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,                  // 500 requests per window per IP (was 100, too low for SPA)
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/exchange-requests', exchangeRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/files', fileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static uploads
app.use('/uploads', express.static('uploads'));

// Error handler
app.use(errorHandler);

// Initialize Socket.IO
initSocket(io);

// Make io accessible
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = { app, server };
