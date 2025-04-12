'use strict';
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { User } = require('@models');
const jwtConfig = require('@config/jwtConfig');
const config = require('@config/config');
const logger = require('@utils/logger');
const authConstants = require('@constants/common/authConstants');

console.log('Initializing passport with jwtConfig:', {
  secretOrKey: jwtConfig.secretOrKey || '[MISSING]',
  jwtFromRequest: typeof jwtConfig.jwtFromRequest,
});

if (!jwtConfig.secretOrKey) {
  console.error('JWT_SECRET is missing or invalid. Check your .env file.');
  process.exit(1);
}
if (!jwtConfig.jwtFromRequest) {
  console.error('jwtFromRequest is missing in jwtConfig.');
  process.exit(1);
}
if (!config.googleOAuth.clientId || !config.googleOAuth.clientSecret) {
  console.error('Google OAuth credentials missing. Check your .env file.');
  process.exit(1);
}

const configurePassport = () => {
  // JWT Strategy
  const jwtStrategy = new JwtStrategy(jwtConfig, async (payload, done) => {
    logger.info('JWT Payload received:', payload);
    try {
      if (!payload || !payload.id) {
        logger.warn('Invalid token payload:', payload);
        return done(null, false, { message: 'Invalid token payload' });
      }

      const user = await User.findByPk(payload.id);
      if (!user) {
        logger.warn('User not found for ID:', payload.id);
        return done(null, false, { message: 'User not found' });
      }
      if (user.status !== 'active') {
        logger.warn('User inactive:', payload.id);
        return done(null, false, { message: 'User account is inactive' });
      }

      const userData = {
        id: user.id,
        roleId: user.role_id,
        role: user.role ? user.role.name : null,
      };
      logger.info('User authenticated:', { id: user.id, roleId: user.role_id });
      return done(null, userData);
    } catch (error) {
      logger.error('Error during JWT verification:', error);
      return done(error, false);
    }
  });

  // Google OAuth Strategy
  const googleStrategy = new GoogleStrategy(
    {
      clientID: config.googleOAuth.clientId,
      clientSecret: config.googleOAuth.clientSecret,
      callbackURL: config.googleOAuth.redirectUri,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      logger.info('Google OAuth profile received:', { profileId: profile.id });
      try {
        let user = await User.findOne({
          where: { google_id: profile.id },
          include: [{ model: require('@models').Role, as: 'role' }],
        });

        if (!user) {
          user = await User.findOne({
            where: { email: profile.emails[0].value },
            include: [{ model: require('@models').Role, as: 'role' }],
          });

          if (user) {
            // Link existing user with Google ID
            await user.update({ google_id: profile.id });
          } else {
            // Create new user
            const role = await require('@models').Role.findOne({
              where: { name: authConstants.ROLES.CUSTOMER },
            });
            user = await User.create({
              google_id: profile.id,
              email: profile.emails[0].value,
              first_name: profile.name.givenName || 'Google',
              last_name: profile.name.familyName || 'User',
              is_verified: true,
              status: authConstants.AUTH.STATUS.ACTIVE,
              role_id: role.id,
            });
            await require('@models').Customer.create({
              user_id: user.id,
              phone_number: null,
              address: 'Default Address',
              country: 'MWI',
            });
          }
        }

        if (user.status !== authConstants.AUTH.STATUS.ACTIVE) {
          logger.warn('User inactive:', user.id);
          return done(null, false, { message: 'User account is inactive' });
        }

        const userData = {
          id: user.id,
          roleId: user.role_id,
          role: user.role.name,
        };
        logger.info('Google user authenticated:', { id: user.id, role: user.role.name });
        return done(null, userData);
      } catch (error) {
        logger.error('Error during Google OAuth:', error);
        return done(error, false);
      }
    }
  );

  passport.use('jwt', jwtStrategy);
  passport.use('google', googleStrategy);
  logger.info('JWT and Google strategies registered');
};

const setupPassport = (app) => {
  configurePassport();
  app.use(passport.initialize());
  logger.info('Passport initialized');
};

module.exports = { setupPassport };