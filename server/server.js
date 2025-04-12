'use strict';

require('module-alias/register');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const config = require('@config/config');
const { setupPassport } = require('@config/passport');
const { initializeSocket } = require('@socket/index');
const authRoutes = require('@routes/common/authRoutes');
const errorMiddleware = require('@middleware/common/errorMiddleware');
const logger = require('@utils/logger');
const { applySecurityHeaders, sanitizeXSS } = require('@utils/security');
const { rateLimiters } = require('@utils/rateLimiter');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = initializeSocket(server);

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl || 'http://localhost:5173',
    credentials: true,
  })
);

// Make sure express.json() comes before sanitization and other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitization and security middlewares after body parsing
app.use(sanitizeXSS());
app.use(applySecurityHeaders);

// Passport setup
setupPassport(app);

// Make io available in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes with rate-limiting
app.use('/auth', rateLimiters.auth, authRoutes); // Apply rate limiter to auth routes
app.use(rateLimiters.general); // Apply general limiter to all routes (optional)

// Error handling
app.use(errorMiddleware);

// Start server
const PORT = config.port || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
});

module.exports = { app, server };