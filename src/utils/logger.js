'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('@config/config');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define custom log levels and colors
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    verbose: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    verbose: 'cyan',
  },
};

winston.addColors(customLevels.colors);

// Custom log format for console output
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  })
);

// Set up transports
const transports = [
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
  }),
  new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
  }),
];

if (config.nodeEnv !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        customFormat
      ),
    })
  );
}

// Create logger
const logger = winston.createLogger({
  level: config.logging.level || 'info',
  levels: customLevels.levels,
  format: winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
),

  transports,
});

// Custom logging methods
logger.logSecurityEvent = (message, metadata = {}) => logger.info(message, { ...metadata, type: 'security' });
logger.logErrorEvent = (message, metadata = {}) => logger.error(message, { ...metadata, type: 'error' });
logger.logApiEvent = (message, metadata = {}) => logger.info(message, { ...metadata, type: 'api' });
logger.logWarnEvent = (message, metadata = {}) => logger.warn(message, { ...metadata, type: 'warn' });

module.exports = logger;