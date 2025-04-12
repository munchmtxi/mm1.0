'use strict';
require('module-alias/register');
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const config = require('@config/config');   // Ensure alias points to the correct file
const logger = require('@utils/logger');

const db = {};

// Destructure individual database configuration parameters
const { username, password, database, host, port, dialect } = config.database;

// Create Sequelize instance using separate parameters
const sequelize = new Sequelize(database, username, password, {
  host,
  port,
  dialect,
  logging: (msg) => logger.info(msg),
  pool: config.database.pool
});

// Load models
fs.readdirSync(__dirname)
  .filter((file) => file !== 'index.js' && file.endsWith('.js'))
  .forEach((file) => {
    try {
      const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    } catch (error) {
      logger.error(`Error loading model ${file}: ${error.message}`);
    }
  });

// Establish associations in a defined order
const associationOrder = [
  // Auth-critical
  'Role',
  'User',
  'Customer',
  'Merchant',
  'Driver',
  'admin',
  'Device',
  // Non-auth (deferred)
  'Staff',
  'Order',
  'MenuInventory',
  'ProductCategory',
  'Booking',
  'Payment',
  'Notification',
  'Geofence',
  'PasswordHistory',
  'PasswordResetLog',
  'Route',
  'ProductPromotion',
  'PromotionRule',
  'OrderItems',
  'PromotionRedemption',
  // Catch-all
  ...Object.keys(db).filter(
    (model) =>
      ![
        'Role',
        'User',
        'Customer',
        'Merchant',
        'Driver',
        'admin',
        'Device',
        'Staff',
        'Order',
        'MenuInventory',
        'ProductCategory',
        'Booking',
        'Payment',
        'Notification',
        'Geofence',
        'PasswordHistory',
        'PasswordResetLog',
        'Route',
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
      logger.warn(`Error associating ${modelName}: ${error.message}`);
    }
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
