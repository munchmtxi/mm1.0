'use strict';

const logger = require('@utils/logger');

const orderHandlers = {
  'merchant:mtables:extraOrderProcessed': (data) => {
    logger.info('Extra order processed event emitted', { orderId: data.orderId, tableId: data.tableId });
  },
  'merchant:mtables:dietaryFiltersApplied': (data) => {
    logger.info('Dietary filters applied event emitted', { customerId: data.customerId, filteredItemCount: data.filteredItemCount });
  },
  'merchant:mtables:orderStatusUpdated': (data) => {
    logger.info('Order status updated event emitted', { orderId: data.orderId, status: data.status });
  },
  'merchant:mtables:orderPaidWithWallet': (data) => {
    logger.info('Order paid with wallet event emitted', { orderId: data.orderId, paymentId: data.paymentId });
  },
};

module.exports = orderHandlers;