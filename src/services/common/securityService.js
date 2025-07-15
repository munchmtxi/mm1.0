'use strict';

/**
 * Security Service
 * Handles password encryption, MFA token management, and data encryption/decryption for admin, customer, driver, staff, and merchant roles.
 * Uses centralized securityConstants for configurations and supports localization for error messages.
 *
 * Dependencies:
 * - bcryptjs: For password hashing
 * - crypto: For data encryption/decryption
 * - Models: User, mfaTokens
 * - Constants: securityConstants, localizationConstants
 * - Utils: logger
 *
 * Last Updated: June 25, 2025
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const securityConstants = require('@constants/common/securityConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { User, MfaTokens } = require('@models');
const logger = require('@utils/logger');

/**
 * Derives encryption key from environment variable.
 * @returns {Buffer} 32-byte key.
 */
function deriveEncryptionKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    logger.error('ENCRYPTION_KEY not set in environment');
    throw new Error(`${securityConstants.SECURITY_CONSTANTS.ERROR_CODES.ENVIRONMENT_NOT_CONFIGURED}: ${localizationConstants.getMessage('security.missing_encryption_key', localizationConstants.DEFAULT_LANGUAGE)}`);
  }
  try {
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== securityConstants.SECURITY_CONSTANTS.ENCRYPTION_KEY_LENGTH) {
      throw new Error('Invalid key length');
    }
    return key;
  } catch (error) {
    logger.error('Invalid ENCRYPTION_KEY format', { error: error.message });
    throw new Error(`${securityConstants.SECURITY_CONSTANTS.ERROR_CODES.INVALID_KEY}: ${localizationConstants.getMessage('security.invalid_encryption_key', localizationConstants.DEFAULT_LANGUAGE)}`);
  }
}

/**
 * Encrypts a password using bcrypt.
 * @param {string} password - Plaintext password.
 * @param {string} role - User role (admin, customer, driver, staff, merchant).
 * @param {string} [languageCode] - Language code for localized error messages.
 * @returns {Promise<string>} Hashed password.
 */
async function encryptPassword(password, role, languageCode = localizationConstants.DEFAULT_LANGUAGE) {
  if (!password || typeof password !== 'string' || password.length < securityConstants.SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH) {
    logger.warn('Invalid password input', { role });
    throw new Error(`${securityConstants.SECURITY_CONSTANTS.ERROR_CODES.INVALID_INPUT}: ${localizationConstants.getMessage('security.invalid_password', languageCode)}`);
  }
  const config = securityConstants.SECURITY_CONSTANTS.ROLES[role.toUpperCase()];
  if (!config) {
    logger.warn('Invalid role for password encryption', { role });
    throw new Error(`${securityConstants.SECURITY_CONSTANTS.ERROR_CODES.INVALID_ROLE}: ${localizationConstants.getMessage('security.invalid_role', languageCode, { role })}`);
  }

  try {
    const salt = await bcrypt.genSalt(config.SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    logger.info('Password encrypted', { role });
    return hashedPassword;
  } catch (error) {
    logger.error('Password encryption failed', { role, error: error.message });
    throw new Error(`${config.ERROR_CODES.SECURITY_INCIDENT}: ${localizationConstants.getMessage('security.encryption_failed', languageCode)}`);
  }
}

/**
 * Generates an MFA token for a user.
 * @param {number} userId - User ID.
 * @param {string} method - MFA method (e.g., email, sms, authenticator).
 * @param {string} role - User role (admin, customer, driver, staff, merchant).
 * @param {string} [languageCode] - Language code for localized error messages.
 * @returns {Promise<Object>} MFA token record.
 */
async function generateMFAToken(userId, method, role, languageCode = localizationConstants.DEFAULT_LANGUAGE) {
  if (!userId || typeof userId !== 'number' || userId <= 0) {
    logger.warn('Invalid userId for MFA token generation', { userId });
    throw new Error(`${securityConstants.SECURITY_CONSTANTS.ERROR_CODES.INVALID_INPUT}: ${localizationConstants.getMessage('security.invalid_user_id', languageCode)}`);
  }
  const config = securityConstants.SECURITY_CONSTANTS.ROLES[role.toUpperCase()];
  if (!config) {
    logger.warn('Invalid role for MFA token generation', { role });
    throw new Error(`${securityConstants.SECURITY_CONSTANTS.ERROR_CODES.INVALID_ROLE}: ${localizationConstants.getMessage('security.invalid_role', languageCode, { role })}`);
  }
  if (!config.MFA_METHODS.includes(method)) {
    logger.warn('Invalid MFA method', { method, role });
    throw new Error(`${config.ERROR_CODES.INVALID_MFA_METHOD}: ${localizationConstants.getMessage('security.invalid_mfa_method', languageCode, { method })}`);
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn('User not found for MFA token generation', { userId });
      throw new Error(`${securityConstants.SECURITY_CONSTANTS.ERROR_CODES.USER_NOT_FOUND}: ${localizationConstants.getMessage('security.user_not_found', languageCode)}`);
    }

    await mfaTokens.destroy({
      where: {
        user_id: userId,
        expires_at: { [User.sequelize.Op.lte]: new Date() },
      },
    });

    const activeTokens = await mfaTokens.count({
      where: {
        user_id: userId,
        expires_at: { [User.sequelize.Op.gte]: new Date() },
      },
    });
    if (activeTokens >= config.MAX_ACTIVE_TOKENS) {
      logger.warn('Too many active MFA tokens', { userId, role });
      throw new Error(`${config.ERROR_CODES.TOKEN_LIMIT_EXCEEDED}: ${localizationConstants.getMessage('security.token_limit_exceeded', languageCode, { max: config.MAX_ACTIVE_TOKENS })}`);
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + config.TOKEN_EXPIRY_MINUTES * 60 * 1000);

    const tokenRecord = await mfaTokens.create({
      user_id: userId,
      token,
      method,
      expires_at: expiresAt,
      created_at: new Date(),
      updated_at: new Date(),
    });

    logger.info('MFA token generated', { userId, role, method });
    return tokenRecord;
  } catch (error) {
    logger.error('MFA token generation failed', { userId, role, method, error: error.message });
    throw new Error(`${config.ERROR_CODES.SECURITY_INCIDENT}: ${localizationConstants.getMessage('security.mfa_generation_failed', languageCode)}`);
  }
}

/**
 * Validates an MFA token.
 * @param {number} userId - User ID.
 * @param {string} token - MFA token.
 * @param {string} role - User role (admin, customer, driver, staff, merchant).
 * @param {string} [languageCode] - Language code for localized error messages.
 * @returns {Promise<boolean>} True if valid, false otherwise.
 */
async function validateMFAToken(userId, token, role, languageCode = localizationConstants.DEFAULT_LANGUAGE) {
  if (!userId || typeof userId !== 'number' || userId <= 0 || !token || typeof token !== 'string' || !role) {
    logger.warn('Invalid input for MFA token validation', { userId, role });
    throw new Error(`${securityConstants.SECURITY_CONSTANTS.ERROR_CODES.INVALID_INPUT}: ${localizationConstants.getMessage('security.invalid_input', languageCode)}`);
  }
  const config = securityConstants.SECURITY_CONSTANTS.ROLES[role.toUpperCase()];
  if (!config) {
    logger.warn('Invalid role for MFA token validation', { role });
    throw new Error(`${securityConstants.SECURITY_CONSTANTS.ERROR_CODES.INVALID_ROLE}: ${localizationConstants.getMessage('security.invalid_role', languageCode, { role })}`);
  }

  try {
    const tokenRecord = await mfaTokens.findOne({
      where: {
        user_id: userId,
        token,
        expires_at: { [User.sequelize.Op.gte]: new Date() },
      },
    });

    if (!tokenRecord) {
      logger.warn('Invalid or expired MFA token', { userId, role });
      return false;
    }

    await tokenRecord.destroy();
    logger.info('MFA token validated', { userId, role });
    return true;
  } catch (error) {
    logger.error('MFA token validation failed', { userId, role, error: error.message });
    throw new Error(`${config.ERROR_CODES.SECURITY_INCIDENT}: ${localizationConstants.getMessage('security.mfa_validation_failed', languageCode)}`);
  }
}

/**
 * Encrypts sensitive data using AES-256.
 * @param {string} data - Data to encrypt.
 * @param {string} role - User role (admin, customer, driver, staff, merchant).
 * @param {string} [languageCode] - Language code for localized error messages.
 * @returns {string} Encrypted data (iv:encrypted).
 */
function encryptData(data, role, languageCode = localizationConstants.DEFAULT_LANGUAGE) {
  if (!data || typeof data !== 'string') {
    logger.warn('Invalid data for encryption', { role });
    throw new Error(`${securityConstants.SECURITY_CONSTANTS.ERROR_CODES.INVALID_INPUT}: ${localizationConstants.getMessage('security.invalid_data', languageCode)}`);
  }
  const config = securityConstants.SECURITY_CONSTANTS.ROLES[role.toUpperCase()];
  if (!config) {
    logger.warn('Invalid role for data encryption', { role });
    throw new Error(`${securityConstants.SECURITY_CONSTANTS.ERROR_CODES.INVALID_ROLE}: ${localizationConstants.getMessage('security.invalid_role', languageCode, { role })}`);
  }

  try {
    const key = deriveEncryptionKey();
    const iv = crypto.randomBytes(securityConstants.SECURITY_CONSTANTS.IV_LENGTH);
    const cipher = crypto.createCipheriv(config.ENCRYPTION_ALGORITHM, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const result = `${iv.toString('hex')}:${encrypted}`;
    logger.info('Data encrypted', { role });
    return result;
  } catch (error) {
    logger.error('Data encryption failed', { role, error: error.message });
    throw new Error(`${config.ERROR_CODES.SECURITY_INCIDENT}: ${localizationConstants.getMessage('security.encryption_failed', languageCode)}`);
  }
}

/**
 * Decrypts sensitive data.
 * @param {string} encryptedData - Encrypted data (iv:encrypted).
 * @param {string} role - User role (admin, customer, driver, staff, merchant).
 * @param {string} [languageCode] - Language code for localized error messages.
 * @returns {string} Decrypted data.
 */
function decryptData(encryptedData, role, languageCode = localizationConstants.DEFAULT_LANGUAGE) {
  if (!encryptedData || typeof encryptedData !== 'string') {
    logger.warn('Invalid encrypted data for decryption', { role });
    throw new Error(`${securityConstants.SECURITY_CONSTANTS.ERROR_CODES.INVALID_INPUT}: ${localizationConstants.getMessage('security.invalid_encrypted_data', languageCode)}`);
  }
  const config = securityConstants.SECURITY_CONSTANTS.ROLES[role.toUpperCase()];
  if (!config) {
    logger.warn('Invalid role for data decryption', { role });
    throw new Error(`${securityConstants.SECURITY_CONSTANTS.ERROR_CODES.INVALID_ROLE}: ${localizationConstants.getMessage('security.invalid_role', languageCode, { role })}`);
  }

  try {
    const [ivHex, encrypted] = encryptedData.split(':');
    if (!ivHex || !encrypted) {
      logger.warn('Invalid encrypted data format', { role });
      throw new Error(`${securityConstants.SECURITY_CONSTANTS.ERROR_CODES.INVALID_INPUT}: ${localizationConstants.getMessage('security.invalid_encrypted_data_format', languageCode)}`);
    }

    const key = deriveEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(config.ENCRYPTION_ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    logger.info('Data decrypted', { role });
    return decrypted;
  } catch (error) {
    logger.error('Data decryption failed', { role, error: error.message });
    throw new Error(`${config.ERROR_CODES.SECURITY_INCIDENT}: ${localizationConstants.getMessage('security.decryption_failed', languageCode)}`);
  }
}

module.exports = {
  encryptPassword,
  generateMFAToken,
  validateMFAToken,
  encryptData,
  decryptData,
};