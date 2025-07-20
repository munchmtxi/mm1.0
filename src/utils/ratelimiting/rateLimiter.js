const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
const logger = require('../logger');
const { REDIS_URL } = process.env;

// Initialize Redis client using ioredis
const redisClient = new Redis({
  url: REDIS_URL || 'redis://localhost:6379',
  enableOfflineQueue: true,
  reconnectOnError: (err) => {
    logger.error(`Redis reconnect error: ${err.message}`);
    return true;
  },
  maxRetriesPerRequest: 20,
});

redisClient.on('error', (err) => {
  logger.error(`Redis error: ${err.message}`);
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis for rate limiting');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready for rate limiting');
});

// Default rate limiter configuration
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    keyGenerator = (req) => req.ip,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    skip = () => false,
  } = options;

  const store = new RedisStore({
    sendCommand: (...args) => {
      logger.debug(`Redis command: ${args.join(' ')}`);
      return redisClient.call(...args);
    },
    prefix: 'rate-limit:',
    client: redisClient,
  });

  return rateLimit({
    store,
    windowMs,
    max,
    keyGenerator,
    message: async (req, res) => ({
      status: 'error',
      message,
      retryAfter: Math.ceil(windowMs / 1000),
    }),
    statusCode,
    skip,
    handler: (req, res, next, optionsTriggered) => {
      logger.warn(`Rate limit exceeded for ${keyGenerator(req)}`);
      res.status(optionsTriggered.statusCode).json(optionsTriggered.message);
    },
  });
};

// Specific rate limiters for different use cases
const rateLimiters = {
  general: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many API requests, please try again later.',
  }),

  auth: createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: 'Too many authentication attempts, please wait before trying again.',
    keyGenerator: (req) => `${req.ip}:${req.body.email || req.body.phone || 'unknown'}`,
  }),

  sensitive: createRateLimiter({
    windowMs: 30 * 60 * 1000,
    max: 5,
    message: 'Too many sensitive requests, please try again later.',
    keyGenerator: (req) => `${req.ip}:${req.body.email || req.body.phone || 'unknown'}`,
  }),

  socket: createRateLimiter({
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many socket connections, please try again later.',
  }),
};

module.exports = {
  createRateLimiter,
  rateLimiters,
};