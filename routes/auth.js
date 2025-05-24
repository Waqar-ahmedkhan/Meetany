import express from 'express';
import passport from '../config/passport.js';

const router = express.Router();

// Initiate Google OAuth
router.get(
  '/google',
  (req, res, next) => {
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: req.query.referral_code || '', // Support referral code
    })(req, res, next);
  }
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:3000/api/auth/failure' }),
  (req, res) => {
    const redirectUrl = `http://localhost:3000/?token=${req.user.jwtToken}&user_id=${req.user._id}&name=${encodeURIComponent(req.user.name)}&mail=${req.user.mail}&user_code=${req.user.user_code}&country=${req.user.country || ''}`;
    res.redirect(redirectUrl);
  }
);

// Failure route
router.get('/failure', (req, res) => {
  res.redirect('http://localhost:3000/api/auth/failure');
});

export default router;