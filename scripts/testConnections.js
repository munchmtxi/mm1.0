'use strict';

require('module-alias/register');
const { createClient } = require('redis');
const { Sequelize } = require('sequelize');
const config = require('@config/config');
const logger = require('@utils/logger');

async function testConnections() {
  try {
    logger.info('Starting connection tests...');

    // Test Redis
    const redisUrl = `redis://${config.redis.host}:${config.redis.port}`;
    logger.info(`Connecting to Redis at ${redisUrl}`);
    const redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
    const pingResponse = await redisClient.ping();
    logger.info(`Redis ping response: ${pingResponse}`);
    await redisClient.disconnect();
    logger.info('✓ Redis connection successful');

    // Test Database
    // Destructure individual database configuration parameters
    const { username, password, database, host, port, dialect, pool } = config.database;
    logger.info(`Connecting to Database "${database}" at ${host}:${port} as "${username}"`);
    const sequelize = new Sequelize(database, username, password, {
      host,
      port,
      dialect,
      pool,
      logging: (msg) => logger.info(msg),
    });
    await sequelize.authenticate();
    logger.info('✓ Database connection successful');
    await sequelize.close();

    logger.info('All connection tests passed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Connection test failed', { error: error.message });
    process.exit(1);
  }
}

testConnections();
