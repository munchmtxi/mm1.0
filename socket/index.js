'use strict';

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
const config = require('@config/config');
const jwtConfig = require('@config/jwtConfig');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { User, Role } = require('@models');
const authRooms = require('./rooms/authRooms');
const merchantRooms = require('./rooms/merchantRooms');
const { setupHandlers } = require('./handlers');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: config.frontendUrl || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Redis adapter
  const pubClient = createClient({
    url: `redis://${config.redis.host}:${config.redis.port}`,
  });
  const subClient = pubClient.duplicate();

  const connectRedis = async () => {
    try {
      await pubClient.connect();
      await subClient.connect();
      logger.info('Redis clients connected');
    } catch (error) {
      logger.logErrorEvent('Redis connection failed', { error: error.message });
    }
  };

  connectRedis();

  pubClient.on('error', (err) => {
    logger.logErrorEvent('Redis pubClient error', { error: err.message });
  });
  subClient.on('error', (err) => {
    logger.logErrorEvent('Redis subClient error', { error: err.message });
  });
  pubClient.on('end', () => {
    logger.info('Redis pubClient disconnected, reconnecting...');
    setTimeout(connectRedis, 5000);
  });
  subClient.on('end', () => {
    logger.info('Redis subClient disconnected, reconnecting...');
    setTimeout(connectRedis, 5000);
  });

  io.adapter(createAdapter(pubClient, subClient));

  // Socket authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new AppError('No token provided', 401, 'NO_TOKEN');
      }

      const decoded = jwt.verify(token, jwtConfig.secretOrKey);
      const user = await User.findByPk(decoded.id, {
        include: [{ model: Role, as: 'role' }],
      });

      if (!user) {
        throw new AppError('User not found', 401, 'USER_NOT_FOUND');
      }
      if (user.status !== 'active') {
        throw new AppError('User account is inactive', 403, 'ACCOUNT_INACTIVE');
      }

      socket.user = { id: user.id, role: user.role.name };
      await authRooms.joinAuthRooms(socket, user.role.name);
      if (user.role.name === 'merchant') {
        await merchantRooms.joinMerchantRooms(socket);
      } else if (user.role.name === 'staff') {
        await merchantRooms.joinStaffRooms(socket);
      }
      logger.logSecurityEvent('Socket authenticated', {
        userId: user.id,
        role: user.role.name,
        socketId: socket.id,
      });
      next();
    } catch (error) {
      logger.logErrorEvent('Socket authentication failed', {
        error: error.message,
        socketId: socket.id,
      });
      next(error);
    }
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected', {
      socketId: socket.id,
      userId: socket.user.id,
      role: socket.user.role,
    });

    setupHandlers(io, socket);

    socket.on('disconnect', async () => {
      try {
        await authRooms.leaveAuthRooms(socket, socket.user.role);
        if (socket.user.role === 'merchant') {
          await merchantRooms.leaveMerchantRooms(socket);
        }
        logger.info('Socket disconnected', {
          socketId: socket.id,
          userId: socket.user.id,
          role: socket.user.role,
        });
      } catch (error) {
        logger.logErrorEvent('Disconnect cleanup failed', {
          error: error.message,
          socketId: socket.id,
        });
      }
    });
  });

  return io;
};

module.exports = { initializeSocket };