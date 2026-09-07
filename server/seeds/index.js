require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const seedSkills = require('./skills');

async function seedAll() {
  await connectDB();
  console.log('🌱 Starting database seeding...');

  try {
    // Seed the skills catalog only — no fake user profiles
    await seedSkills();
    console.log('✨ Skills catalog seeded successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

if (require.main === module) {
  seedAll();
}

module.exports = seedAll;
