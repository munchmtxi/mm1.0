'use strict';
require('module-alias/register');
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const config = require('@config/config');
const logger = require('@utils/logger');

const db = {};

// Destructure database configuration parameters
const { username, password, database, host, port, dialect } = config.database;

// Create Sequelize instance
const sequelize = new Sequelize(database, username, password, {
  host,
  port,
  dialect,
  logging: (msg) => logger.info(msg),
  pool: config.database.pool,
});

// Load models
const modelFiles = fs
  .readdirSync(__dirname)
  .filter((file) => file !== 'index.js' && file.endsWith('.js'));

modelFiles.forEach((file) => {
  try {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    if (!model || !model.name) {
      throw new Error(`Model in ${file} did not return a valid Sequelize model`);
    }
    db[model.name] = model;
    logger.info(`Loaded model: ${model.name} from ${file}`);
  } catch (error) {
    logger.error(`Error loading model ${file}: ${error.message}`);
    throw error; // Fail fast to avoid partial model loading
  }
});

// Define association order to ensure dependencies are resolved
const associationOrder = [
  // Auth-critical
  'Role',
  'User',
  'Customer',
  'Merchant',
  'admin', // Kept lowercase as clarified
  'Staff',
  // Core entities
  'Ride', // Moved before Driver
  'Driver', // Now after Ride
  'Order',
  'Payment',
  'Route',
  'RideSubscription',
  'RouteOptimization',
  'RideParticipant',
  // Supporting entities
  'DriverAvailability',
  'DriverEarnings',
  'DriverRatings',
  'Vehicle',
  'MenuInventory',
  'ProductCategory',
  'Booking',
  'Notification',
  'Geofence',
  'PasswordHistory',
  'PasswordResetLog',
  'ProductPromotion',
  'PromotionRule',
  'OrderItems',
  'PromotionRedemption',
  // Catch-all for any remaining models
  ...Object.keys(db).filter(
    (model) =>
      ![
        'Role',
        'User',
        'Customer',
        'Merchant',
        'admin',
        'Staff',
        'Ride',
        'Driver',
        'Order',
        'Payment',
        'Route',
        'RideSubscription',
        'RouteOptimization',
        'RideParticipant',
        'DriverAvailability',
        'DriverEarnings',
        'DriverRatings',
        'Vehicle',
        'MenuInventory',
        'ProductCategory',
        'Booking',
        'Notification',
        'Geofence',
        'PasswordHistory',
        'PasswordResetLog',
        'ProductPromotion',
        'PromotionRule',
        'OrderItems',
        'PromotionRedemption',
      ].includes(model)
  ),
];

// Apply associations
associationOrder.forEach((modelName) => {
  if (db[modelName] && db[modelName].associate) {
    try {
      db[modelName].associate(db);
      logger.info(`Associated model: ${modelName}`);
    } catch (error) {
      logger.error(`Error associating ${modelName}: ${error.message}`);
      throw error; // Fail fast to catch association issues
    }
  } else if (!db[modelName]) {
    logger.warn(`Model ${modelName} not found in db`);
  }
});

// Validate that all expected models are loaded
const expectedModels = associationOrder.filter((model) => !db[model]);
if (expectedModels.length > 0) {
  logger.error(`Missing models: ${expectedModels.join(', ')}`);
  throw new Error('Not all expected models were loaded');
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;