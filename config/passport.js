import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User.js';
import { generateUserCode, manageReferrals } from '../utils/helper.js';
import jwt from 'jsonwebtoken';

// Serialize user to store in session
passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || null);
  } catch (err) {
    console.error('Deserialize error:', err);
    done(err, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google profile:', profile);
        let user = await User.findOne({ mail: profile.emails[0].value.toLowerCase().trim() });

        if (!user) {
          user = new User({
            name: profile.displayName,
            mail: profile.emails[0].value.toLowerCase().trim(),
            age: null, // Use null or a birthdate field
            gender: 'unspecified', // Google doesn't provide gender reliably
            user_type: 'user',
            user_code: await generateUserCode(),
            provider: 'google',
            providerId: profile.id,
            relationship_goal: 'unspecified',
            device_type: 'unknown',
            device_id: `google_${profile.id}`,
            device_token: 'none',
            country: profile._json.locale || 'unknown',
          });
          await user.save();
          console.log('New user created:', user._id);
          const referral_code = profile.state || null; // Use state for referral
          if (referral_code) {
            user.referral_code = referral_code; // Fix typo
            await user.save();
            await manageReferrals(user._id);
          }
        } else if (!user.provider) {
          user.provider = 'google';
          user.providerId = profile.id;
          await user.save();
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '7d' });
        user.jwtToken = token;
        console.log('JWT generated for user:', user._id);

        done(null, user);
      } catch (err) {
        console.error('Google auth error:', {
          message: err.message,
          stack: err.stack,
          email: profile.emails ? profile.emails[0].value : 'no email',
        });
        done(err, null);
      }
    }
  )
);

export default passport;