'use strict';

const jwt = require('jsonwebtoken');
const { User, Role, Permission } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

module.exports = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      throw new AppError('No token provided', 401, 'UNAUTHORIZED');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      throw new AppError('User not found', 401, 'UNAUTHORIZED');
    }

    const role = await Role.findOne({
      where: { id: user.role_id },
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['action', 'resource'],
        },
      ],
    });

    if (!role) {
      throw new AppError('Role not found', 403, 'FORBIDDEN');
    }

    socket.user = {
      id: user.id,
      role: role.name,
      permissions: role.permissions.map(perm => ({
        action: perm.action,
        resource: perm.resource,
      })),
    };

    logger.info('Socket user authenticated', {
      userId: user.id,
      role: role.name,
      permissions: socket.user.permissions,
    });
    next();
  } catch (error) {
    logger.error('Socket authentication error', { error: error.message });
    next(error instanceof AppError ? error : new AppError('Invalid token', 401, 'UNAUTHORIZED'));
  }
};