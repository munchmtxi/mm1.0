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
const rooms = require('./rooms');
const { setupHandlers } = require('./handlers');
const socketService = require('@services/common/socketService');

const initializeSocket = (server) => {
  logger.info('Initializing Socket.IO server', { frontendUrl: config.frontendUrl, redisHost: config.redis.host, redisPort: config.redis.port });

  const io = new Server(server, {
    cors: {
      origin: config.frontendUrl || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Set Socket.IO instance for socketService
  socketService.setIoInstance(io);

  // Redis adapter
  const pubClient = createClient({ url: `redis://${config.redis.host}:${config.redis.port}` });
  const subClient = pubClient.duplicate();

  const connectRedis = async () => {
    try {
      logger.info('Connecting to Redis', { url: pubClient.options.url });
      await pubClient.connect();
      await subClient.connect();
      logger.info('Redis clients connected successfully');
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
    logger.warn('Redis pubClient disconnected, attempting reconnect');
    setTimeout(connectRedis, 5000);
  });
  subClient.on('end', () => {
    logger.warn('Redis subClient disconnected, attempting reconnect');
    setTimeout(connectRedis, 5000);
  });

  io.adapter(createAdapter(pubClient, subClient));
  logger.info('Socket.IO adapter configured with Redis');

  // Socket authentication
  io.use(async (socket, next) => {
    try {
      logger.info('Authenticating socket', { handshakeAuth: socket.handshake.auth });
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new AppError('No token provided', 401, 'NO_TOKEN');
      }

      const decoded = jwt.verify(token, jwtConfig.secretOrKey);
      logger.info('JWT decoded', { userId: decoded.id });

      const user = await User.findByPk(decoded.id, { include: [{ model: Role, as: 'role' }] });
      logger.info('User fetched from DB', { userId: decoded.id, userStatus: user?.status, role: user?.role?.name });

      if (!user) {
        throw new AppError('User not found', 401, 'USER_NOT_FOUND');
      }
      if (user.status !== 'active') {
        throw new AppError('User account is inactive', 403, 'ACCOUNT_INACTIVE');
      }

      socket.user = {
        id: user.id,
        role: user.role.name,
        merchant_id: user.staff_profile?.merchant_id,
        admin_access: user.role.name === 'admin',
      };
      logger.info('Socket user set', socket.user);

      await rooms.authRooms.joinAuthRooms(socket, user.role.name);
      logger.info('Joined authRooms', { role: user.role.name });

      switch (user.role.name) {
        case 'merchant':
          await rooms.merchantRooms.joinMerchantRooms(socket);
          logger.info('Joined merchantRooms', { userId: user.id });
          break;
        case 'staff':
          await rooms.staffRoom.joinStaffRoom(io, socket, socket.user);
          logger.info('Joined staffRoom', { userId: user.id });
          break;
        case 'customer':
          await rooms.customerRooms.joinCustomerRooms(socket);
          await rooms.subscriptionRooms.joinSubscriptionRooms(socket);
          logger.info('Joined customerRooms and subscriptionRooms', { userId: user.id });
          break;
        case 'driver':
          await rooms.driverRooms.setupDriverRooms(socket, io).joinDriverRoom(user.id);
          logger.info('Joined driverRooms', { userId: user.id });
          break;
        case 'admin':
          await rooms.adminRooms.joinAdminRooms(socket, socket.user.id);
          logger.info('Joined adminRooms', { userId: user.id });
          break;
        default:
          logger.warn('No rooms to join for role', { role: user.role.name });
      }

      logger.logSecurityEvent('Socket authenticated successfully', { socketId: socket.id, user: socket.user });
      next();
    } catch (error) {
      logger.logErrorEvent('Socket authentication failed', { error: error.message, stack: error.stack, socketId: socket.id });
      next(error);
    }
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected', { socketId: socket.id, user: socket.user });

    socket.on('joinRideRoom', async (rideId, callback) => {
      try {
        if (socket.user.admin_access) {
          await rooms.adminRooms.joinRideRoom(socket, rideId, callback);
        } else if (!['customer', 'driver'].includes(socket.user.role)) {
          throw new AppError('Unauthorized to join ride room', 403, 'UNAUTHORIZED');
        } else {
          await rooms.rideRooms.joinRideRoom(socket, rideId);
          logger.info('Socket joined ride room', { socketId: socket.id, userId: socket.user.id, rideId });
          if (callback) {
            callback({ success: true, room: `ride:${rideId}` });
          }
        }
      } catch (error) {
        logger.error('Failed to join ride room', { socketId: socket.id, userId: socket.user.id, rideId, error: error.message });
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    socket.on('joinSubscriptionRoom', async (subscriptionId, callback) => {
      try {
        if (socket.user.admin_access) {
          await rooms.subscriptionRooms.joinSubscriptionRoom(socket, subscriptionId, callback);
        } else if (socket.user.role !== 'customer') {
          throw new AppError('Unauthorized to join subscription room', 403, 'UNAUTHORIZED');
        } else {
          await rooms.subscriptionRooms.joinSubscriptionRoom(socket, subscriptionId, callback);
          logger.info('Socket joined subscription room', { socketId: socket.id, userId: socket.user.id, subscriptionId });
          if (callback) {
            callback({ success: true, room: `subscription:${subscriptionId}` });
          }
        }
      } catch (error) {
        logger.error('Failed to join subscription room', { socketId: socket.id, userId: socket.user.id, subscriptionId, error: error.message });
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    socket.on('joinAdminRoom', async (adminRoom, callback) => {
      try {
        if (socket.user.role !== 'admin') {
          throw new AppError('Unauthorized to join admin room', 403, 'UNAUTHORIZED');
        }
        await socket.join(`admin:${adminRoom}`);
        logger.info('Socket joined admin room', { socketId: socket.id, userId: socket.user.id, room: `admin:${adminRoom}` });
        if (callback) {
          callback({ success: true, room: `admin:${adminRoom}` });
        }
      } catch (error) {
        logger.error('Failed to join admin room', { socketId: socket.id, userId: socket.user.id, room: `admin:${adminRoom}`, error: error.message });
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    socket.on('joinDriverRoom', async (driverId, callback) => {
      try {
        if (socket.user.admin_access) {
          await rooms.adminRooms.joinDriverRoom(socket, driverId, callback);
        } else if (socket.user.role !== 'driver' || socket.user.id !== parseInt(driverId)) {
          throw new AppError('Unauthorized to join driver room', 403, 'UNAUTHORIZED');
        } else {
          await rooms.driverRooms.setupDriverRooms(socket, io).joinDriverRoom(driverId);
          logger.info('Socket joined driver room', { socketId: socket.id, userId: socket.user.id, room: `driver:${driverId}` });
          if (callback) {
            callback({ success: true, room: `driver:${driverId}` });
          }
        }
      } catch (error) {
        logger.error('Failed to join driver room', { socketId: socket.id, userId: socket.user.id, room: `driver:${driverId}`, error: error.message });
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    socket.on('joinCustomerRoom', async (customerId, callback) => {
      try {
        if (socket.user.admin_access) {
          await rooms.adminRooms.joinCustomerRoom(socket, customerId, callback);
        } else if (socket.user.role !== 'customer' || socket.user.id !== parseInt(customerId)) {
          throw new AppError('Unauthorized to join customer room', 403, 'UNAUTHORIZED');
        } else {
          await socket.join(`customer:${customerId}`);
          await socket.join(`user:${customerId}`);
          logger.info('Socket joined customer rooms', { socketId: socket.id, userId: socket.user.id, rooms: [`customer:${customerId}`, `user:${customerId}`] });
          if (callback) {
            callback({ success: true, rooms: [`customer:${customerId}`, `user:${customerId}`] });
          }
        }
      } catch (error) {
        logger.error('Failed to join customer room', { socketId: socket.id, userId: socket.user.id, room: `customer:${customerId}`, error: error.message });
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    socket.on('joinMerchantRoom', async (merchantId, callback) => {
      try {
        if (socket.user.admin_access) {
          await rooms.adminRooms.joinMerchantRoom(socket, merchantId, callback);
        } else if (socket.user.role !== 'merchant') {
          throw new AppError('Unauthorized to join merchant room', 403, 'UNAUTHORIZED');
        } else {
          const merchant = await rooms.merchantRooms.Merchant.findOne({ where: { user_id: socket.user.id } });
          if (!merchant || merchant.id !== parseInt(merchantId)) {
            throw new AppError('Merchant not found or unauthorized', 404, 'NOT_FOUND');
          }
          const merchantRoom = `merchant-${merchantId}`;
          await socket.join(merchantRoom);
          logger.info('Socket joined merchant room', { socketId: socket.id, userId: socket.user.id, room: merchantRoom });
          if (callback) {
            callback({ success: true, room: merchantRoom });
          }
        }
      } catch (error) {
        logger.error('Failed to join merchant room', { socketId: socket.id, userId: socket.user.id, merchantId, error: error.message });
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    socket.on('joinStaffRoom', async (merchantId, callback) => {
      try {
        if (socket.user.admin_access) {
          await rooms.adminRooms.joinStaffRoom(socket, merchantId, callback);
        } else if (socket.user.role !== 'staff' || socket.user.merchant_id !== parseInt(merchantId)) {
          throw new AppError('Unauthorized to join staff room', 403, 'UNAUTHORIZED');
        } else {
          const room = `merchant:${merchantId}`;
          await socket.join(room);
          logger.info('Socket joined staff room', { socketId: socket.id, userId: socket.user.id, room });
          if (callback) {
            callback({ success: true, room });
          }
        }
      } catch (error) {
        logger.error('Failed to join staff room', { socketId: socket.id, userId: socket.user.id, merchantId, error: error.message });
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    socket.on('joinRoleRoom', async (role, callback) => {
      try {
        if (socket.user.admin_access || socket.user.role === role) {
          await socket.join(`role:${role}`);
          logger.info('Socket joined role room', { socketId: socket.id, userId: socket.user.id, room: `role:${role}` });
          if (callback) {
            callback({ success: true, room: `role:${role}` });
          }
        } else {
          throw new AppError(`Unauthorized to join role:${role} room`, 403, 'UNAUTHORIZED');
        }
      } catch (error) {
        logger.error('Failed to join role room', { socketId: socket.id, userId: socket.user.id, room: `role:${role}`, error: error.message });
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    socket.on('debug:rooms', (callback) => {
      if (typeof callback === 'function') {
        callback({ rooms: Array.from(socket.rooms) });
      }
    });

    setupHandlers(io, socket);
    logger.info('Handlers set up for socket', { socketId: socket.id });

    socket.on('disconnect', async (reason) => {
      logger.info('Disconnect event triggered', { socketId: socket.id, reason });
      try {
        logger.info('Leaving authRooms', { user: socket.user });
        await rooms.authRooms.leaveAuthRooms(socket, socket.user.role);

        switch (socket.user.role) {
          case 'merchant':
            await rooms.merchantRooms.leaveMerchantRooms(socket);
            logger.info('Left merchantRooms', { userId: socket.user.id });
            break;
          case 'staff':
            break;
          case 'customer':
            await rooms.customerRooms.leaveCustomerRooms(socket);
            await rooms.subscriptionRooms.leaveSubscriptionRooms(socket);
            logger.info('Left customerRooms and subscriptionRooms', { userId: socket.user.id });
            break;
          case 'driver':
            await rooms.driverRooms.setupDriverRooms(socket, io).leaveDriverRoom(socket.user.id);
            logger.info('Left driverRooms', { userId: socket.user.id });
            break;
          case 'admin':
            await rooms.adminRooms.leaveAdminRooms(socket, socket.user.id);
            logger.info('Left adminRooms', { userId: socket.user.id });
            break;
          default:
            logger.warn('No leave logic for role', { role: socket.user.role });
        }

        logger.info('Socket cleanup completed', { socketId: socket.id });
      } catch (err) {
        logger.logErrorEvent('Disconnect cleanup failed', { error: err.message, stack: err.stack, socketId: socket.id });
      }
    });
  });

  logger.info('Socket.IO initialization complete');
  return io;
};

module.exports = { initializeSocket };