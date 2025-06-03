'use strict';

/**
 * Security Service
 * Handles password encryption, MFA token management, and data encryption/decryption for all roles.
 * Uses centralized securityConstants for configurations.
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const securityConstants = require('@constants/common/securityConstants');
const { mfaTokens, User } = require('@models');
const logger = require('@utils/logger');

/**
 * Derives encryption key from environment variable.
 * @returns {Buffer} 32-byte key.
 */
function deriveEncryptionKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    logger.error('ENCRYPTION_KEY not set in environment');
    throw new Error('ENCRYPTION_KEY not set');
  }
  try {
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== securityConstants.SECURITY_CONSTANTS.ENCRYPTION_KEY_LENGTH) {
      throw new Error('Invalid key length');
    }
    return key;
  } catch (error) {
    logger.error('Invalid ENCRYPTION_KEY format', { error: error.message });
    throw new Error('Invalid encryption key');
  }
}

/**
 * Encrypts a password using bcrypt.
 * @param {string} password - Plaintext password.
 * @param {string} role - User role.
 * @returns {string} Hashed password.
 */
async function encryptPassword(password, role) {
  if (!password || typeof password !== 'string') throw new Error('Invalid password');
  const config = securityConstants.SECURITY_CONSTANTS.ROLES[role.toUpperCase()];
  if (!config) throw new Error('Invalid role');

  try {
    const salt = await bcrypt.genSalt(config.SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    logger.info('Password encrypted', { role });
    return hashedPassword;
  } catch (error) {
    logger.error('Password encryption failed', { role, error: error.message });
    throw new Error(`${config.ERROR_CODES.SECURITY_INCIDENT}: Password encryption failed`);
  }
}

/**
 * Generates an MFA token for a user.
 * @param {number} userId - User ID.
 * @param {string} method - MFA method.
 * @param {string} role - User role.
 * @returns {Object} MFA token record.
 */
async function generateMFAToken(userId, method, role) {
  if (!userId || typeof userId !== 'number') throw new Error('Invalid userId');
  const config = securityConstants.SECURITY_CONSTANTS.ROLES[role.toUpperCase()];
  if (!config) throw new Error('Invalid role');
  if (!config.MFA_METHODS.includes(method)) {
    logger.warn('Invalid MFA method', { method, role });
    throw new Error(`${config.ERROR_CODES.INVALID_MFA_METHOD}: Invalid MFA method`);
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    await mfaTokens.destroy({
      where: {
        user_id: userId,
        expires_at: { $lte: new Date() },
      },
    });

    const activeTokens = await mfaTokens.count({
      where: {
        user_id: userId,
        expires_at: { $gte: new Date() },
      },
    });
    if (activeTokens >= config.MAX_ACTIVE_TOKENS) {
      logger.warn('Too many active MFA tokens', { userId, role });
      throw new Error(`${config.ERROR_CODES.TOKEN_LIMIT_EXCEEDED}: Maximum active tokens reached`);
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
    throw new Error(`${config.ERROR_CODES.SECURITY_INCIDENT}: MFA token generation failed`);
  }
}

/**
 * Validates an MFA token.
 * @param {number} userId - User ID.
 * @param {string} token - MFA token.
 * @param {string} role - User role.
 * @returns {boolean} True if valid, false otherwise.
 */
async function validateMFAToken(userId, token, role) {
  if (!userId || !token || !role) throw new Error('Invalid input');
  const config = securityConstants.SECURITY_CONSTANTS.ROLES[role.toUpperCase()];
  if (!config) throw new Error('Invalid role');

  try {
    const tokenRecord = await mfaTokens.findOne({
      where: {
        user_id: userId,
        token,
        expires_at: { $gte: new Date() },
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
    throw new Error(`${config.ERROR_CODES.SECURITY_INCIDENT}: MFA token validation failed`);
  }
}

/**
 * Encrypts sensitive data using AES-256.
 * @param {string} data - Data to encrypt.
 * @param {string} role - User role.
 * @returns {string} Encrypted data (iv:encrypted).
 */
function encryptData(data, role) {
  if (!data || typeof data !== 'string') throw new Error('Invalid data');
  const config = securityConstants.SECURITY_CONSTANTS.ROLES[role.toUpperCase()];
  if (!config) throw new Error('Invalid role');

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
    throw new Error(`${config.ERROR_CODES.SECURITY_INCIDENT}: Data encryption failed`);
  }
}

/**
 * Decrypts sensitive data.
 * @param {string} encryptedData - Encrypted data (iv:encrypted).
 * @param {string} role - User role.
 * @returns {string} Decrypted data.
 */
function decryptData(encryptedData, role) {
  if (!encryptedData || typeof encryptedData !== 'string') throw new Error('Invalid encrypted data');
  const config = securityConstants.SECURITY_CONSTANTS.ROLES[role.toUpperCase()];
  if (!config) throw new Error('Invalid role');

  try {
    const [ivHex, encrypted] = encryptedData.split(':');
    if (!ivHex || !encrypted) throw new Error('Invalid encrypted data format');

    const key = deriveEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(config.ENCRYPTION_ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    logger.info('Data decrypted', { role });
    return decrypted;
  } catch (error) {
    logger.error('Data decryption failed', { role, error: error.message });
    throw new Error(`${config.ERROR_CODES.SECURITY_INCIDENT}: Data decryption failed`);
  }
}

module.exports = {
  encryptPassword,
  generateMFAToken,
  validateMFAToken,
  encryptData,
  decryptData,
};