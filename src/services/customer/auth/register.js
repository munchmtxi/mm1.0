'use strict';
const { User, Customer, Role, sequelize } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authConstants = require('@constants/customer/customerAuthConstants');
const jwt = require('jsonwebtoken');

async function startRegistration() {
  try {
    const sessionToken = jwt.sign(
      { stage: 'personal_info' },
      authConstants.SECURITY.JWT.SECRET,
      { expiresIn: '1h' }
    );
    logger.logSecurityEvent('Registration started', { sessionToken });
    return {
      sessionToken,
      message: "Let's get started! First, tell us a bit about yourself.",
      nextStage: 'personal_info',
      requiredFields: ['first_name', 'last_name', 'email', 'password'],
    };
  } catch (error) {
    logger.error('Start registration error', { error: error.message });
    throw new AppError('Failed to start registration', 500, 'START_REGISTRATION_FAILED', error.message);
  }
}

async function submitPersonalInfo(sessionToken, data) {
  try {
    const decoded = jwt.verify(sessionToken, authConstants.SECURITY.JWT.SECRET);
    if (decoded.stage !== 'personal_info') {
      throw new AppError('Invalid registration stage', 400, 'INVALID_STAGE');
    }

    const requiredFields = ['first_name', 'last_name', 'email', 'password'];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new AppError(`${field} is required`, 400, `MISSING_${field.toUpperCase()}`);
      }
    }

    const { first_name, last_name, email, password } = data;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already in use', 409, 'EMAIL_EXISTS');
    }

    authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.first_name.validate.notEmpty.fn(first_name);
    authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.last_name.validate.notEmpty.fn(last_name);
    authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.email.validate.isEmail.fn(email);
    authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.password.validate.isValidPassword(password);

    const nextToken = jwt.sign(
      { stage: 'contact_info', email },
      authConstants.SECURITY.JWT.SECRET,
      { expiresIn: '1h' }
    );

    logger.logSecurityEvent('Personal info submitted', { email });
    return {
      sessionToken: nextToken,
      message: "Awesome, you're off to a great start! Now, let's get your contact details.",
      nextStage: 'contact_info',
      requiredFields: ['phone_number', 'country', 'address'],
    };
  } catch (error) {
    logger.error('Personal info submission error', { error: error.message });
    throw new AppError(error.message || 'Personal info submission failed', error.statusCode || 400, 'PERSONAL_INFO_FAILED', error.message);
  }
}

async function submitContactInfo(sessionToken, data) {
  try {
    const decoded = jwt.verify(sessionToken, authConstants.SECURITY.JWT.SECRET);
    if (decoded.stage !== 'contact_info') {
      throw new AppError('Invalid registration stage', 400, 'INVALID_STAGE');
    }

    const requiredFields = ['phone_number', 'country', 'address'];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new AppError(`${field} is required`, 400, `MISSING_${field.toUpperCase()}`);
      }
    }

    const { phone_number, country, address } = data;
    authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.phone_number.validate.isValidPhone(phone_number);
    authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.country.validate.isIn.fn(country);
    authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.address.validate.notEmpty.fn(address);

    const nextToken = jwt.sign(
      { stage: 'preferences', email: decoded.email },
      authConstants.SECURITY.JWT.SECRET,
      { expiresIn: '1h' }
    );

    logger.logSecurityEvent('Contact info submitted', { email: decoded.email });
    return {
      sessionToken: nextToken,
      message: "Nice one! You're almost there. Let's personalize your experience with some preferences.",
      nextStage: 'preferences',
      requiredFields: ['preferred_language', 'preferred_currency'],
      optionalFields: ['notification_preferences', 'privacy_settings'],
    };
  } catch (error) {
    logger.error('Contact info submission error', { error: error.message });
    throw new AppError(error.message || 'Contact info submission failed', error.statusCode || 400, 'CONTACT_INFO_FAILED', error.message);
  }
}

async function submitPreferencesAndFinalize(sessionToken, data, previousData) {
  const transaction = await sequelize.transaction();
  try {
    const decoded = jwt.verify(sessionToken, authConstants.SECURITY.JWT.SECRET);
    if (decoded.stage !== 'preferences') {
      throw new AppError('Invalid registration stage', 400, 'INVALID_STAGE');
    }

    const { preferred_language, preferred_currency, notification_preferences, privacy_settings } = data;
    if (preferred_language) {
      authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.preferred_language.validate.isIn.fn(preferred_language);
    }
    if (preferred_currency) {
      authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.preferred_currency.validate.isIn.fn(preferred_currency);
    }
    if (notification_preferences) {
      authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.notification_preferences.validate.isValidPreferences(notification_preferences);
    }
    if (privacy_settings) {
      authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.privacy_settings.validate.isValidPrivacySettings(privacy_settings);
    }

    const allData = {
      ...previousData,
      preferred_language: preferred_language || authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.preferred_language.defaultValue,
      preferred_currency: preferred_currency || authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.preferred_currency.defaultValue(previousData.country),
      notification_preferences: notification_preferences || authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.notification_preferences.defaultValue,
      privacy_settings: privacy_settings || authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.privacy_settings.defaultValue,
    };

    const role = await Role.findOne({ where: { name: authConstants.AUTH.ROLES.CUSTOMER } }, { transaction });
    if (!role) {
      throw new AppError('Customer role not found', 500, 'ROLE_NOT_FOUND');
    }

    const user = await User.create(
      {
        email: allData.email,
        password: allData.password,
        first_name: allData.first_name,
        last_name: allData.last_name,
        phone: allData.phone_number,
        country: allData.country,
        preferred_language: allData.preferred_language,
        role_id: role.id,
        status: authConstants.AUTH.STATUS.ACTIVE,
        notification_preferences: allData.notification_preferences,
        privacy_settings: allData.privacy_settings,
      },
      { transaction }
    );

    await Customer.create(
      {
        user_id: user.id,
        phone_number: allData.phone_number,
        address: allData.address || authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.address.defaultValue,
        country: allData.country || authConstants.CUSTOMER_AUTH_CONSTANTS.VALIDATION_RULES.country.defaultValue,
        preferences: {
          currency: allData.preferred_currency,
        },
      },
      { transaction }
    );

    const token = jwt.sign(
      { id: user.id, role: authConstants.AUTH.ROLES.CUSTOMER },
      authConstants.SECURITY.JWT.SECRET,
      { expiresIn: authConstants.SECURITY.JWT.EXPIRES_IN }
    );

    await transaction.commit();
    logger.logSecurityEvent('Customer registered', { userId: user.id, email: allData.email });
    return {
      token,
      user: { id: user.id, email: allData.email, role: authConstants.AUTH.ROLES.CUSTOMER },
      message: "Woohoo! You're all set! Welcome to MunchMtxi!",
    };
  } catch (error) {
    await transaction.rollback();
    logger.error('Preferences submission error', { error: error.message });
    throw new AppError(error.message || 'Registration failed', error.statusCode || 500, 'REGISTRATION_FAILED', error.message);
  }
}

module.exports = {
  startRegistration,
  submitPersonalInfo,
  submitContactInfo,
  submitPreferencesAndFinalize,
};