const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function configurePassport(passport) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log('⚠️  Google OAuth not configured (missing GOOGLE_CLIENT_ID/SECRET)');
    return;
  }

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        return done(null, user);
      }

      // Check if email already registered
      const existingUser = await User.findOne({ email: profile.emails[0].value });
      if (existingUser) {
        existingUser.googleId = profile.id;
        if (!existingUser.avatar && profile.photos?.[0]) {
          existingUser.avatar = profile.photos[0].value;
        }
        await existingUser.save();
        return done(null, existingUser);
      }

      // Create new user
      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        avatar: profile.photos?.[0]?.value || '',
        username: profile.emails[0].value.split('@')[0] + '_' + Date.now().toString(36),
        emailVerified: true,
        status: 'active',
      });

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
