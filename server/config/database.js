const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/skillx',
      {
        // Keeps the TCP connection alive so Atlas doesn't time out idle connections
        serverSelectionTimeoutMS: 10000,  // fail fast if Atlas is unreachable (10s)
        socketTimeoutMS: 45000,           // close sockets after 45s of inactivity
        // maxPoolSize defaults to 100 — fine for a single Render instance
      }
    );
    console.log(`📦 MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
