'use strict';

const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Role, sequelize } = require('@models');

const restrictTipAdmin = async (req, res, next) => {
  const { user } = req;
  if (!user || !user.role_id) {
    logger.warn('Unauthorized access attempt to tip management', { userId: user?.id });
    return next(new AppError('Unauthorized: Admin access required', 403, 'UNAUTHORIZED'));
  }

  const role = await Role.findByPk(user.role_id, {
    include: [{ model: sequelize.models.Permission, as: 'permissions' }],
  });
  if (!role) {
    logger.warn('Role not found for user', { userId: user.id, roleId: user.role_id });
    return next(new AppError('Unauthorized: Role not found', 403, 'UNAUTHORIZED'));
  }
  if (role.name !== 'admin') {
    logger.warn('Unauthorized access attempt to tip management', { userId: user.id, role: role.name });
    return next(new AppError('Unauthorized: Admin access required', 403, 'UNAUTHORIZED'));
  }

  const permissions = role.permissions.map(p => p.name); // Adjust based on actual Permission model
  if (!permissions.includes('manage_tips')) {
    logger.warn('Admin lacks tip management permission', { userId: user.id, permissions });
    return next(new AppError('Unauthorized: Tip management permission required', 403, 'UNAUTHORIZED'));
  }

  logger.info('Tip admin access granted', { userId: user.id });
  next();
};

module.exports = { restrictTipAdmin };