'use strict';

const menuEvents = require('@socket/events/merchant/menu/menuEvents');
const logger = require('@utils/logger');

function setupMenuHandlers(io, socket) {
  socket.on(menuEvents.MENU_AMENDED, (data) => {
    logger.info('Menu amended event received', { branchId: data.branchId });
    socket.to(`merchant:${data.merchantId}`).emit(menuEvents.MENU_AMENDED, data);
  });

  socket.on(menuEvents.MENU_VIEWED, (data) => {
    logger.info('Menu viewed event received', { branchId: data.branchId });
    socket.to(`merchant:${data.merchantId}`).emit(menuEvents.MENU_VIEWED, data);
  });

  socket.on(menuEvents.MENU_CREATED, (data) => {
    logger.info('Menu created event received', { restaurantId: data.restaurantId });
    socket.to(`merchant:${data.restaurantId}`).emit(menuEvents.MENU_CREATED, data);
  });

  socket.on(menuEvents.MENU_UPDATED, (data) => {
    logger.info('Menu updated event received', { menuId: data.menuId });
    socket.to(`merchant:${data.restaurantId}`).emit(menuEvents.MENU_UPDATED, data);
  });

  socket.on(menuEvents.DYNAMIC_PRICING_APPLIED, (data) => {
    logger.info('Dynamic pricing applied event received', { menuId: data.menuId });
    socket.to(`merchant:${data.restaurantId}`).emit(menuEvents.DYNAMIC_PRICING_APPLIED, data);
  });
}

module.exports = { setupMenuHandlers };