'use strict';

const walletEvents = require('@socket/events/customer/wallet/walletEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

const handleWalletCreated = (io, data) => {
  const { userId, walletId, currency } = data;
  socketService.emit(io, walletEvents.WALLET_CREATED, { walletId, currency }, `customer:${userId}`);
  logger.info('Wallet created event emitted', { walletId, userId });
};

const handleFundsAdded = (io, data) => {
  const { userId, walletId, amount, currency } = data;
  socketService.emit(io, walletEvents.FUNDS_ADDED, { walletId, amount, currency }, `customer:${userId}`);
  logger.info('Funds added event emitted', { walletId, userId });
};

const handleFundsWithdrawn = (io, data) => {
  const { userId, walletId, amount, currency } = data;
  socketService.emit(io, walletEvents.FUNDS_WITHDRAWN, { walletId, amount, currency }, `customer:${userId}`);
  logger.info('Funds withdrawn event emitted', { walletId, userId });
};

const handlePaymentProcessed = (io, data) => {
  const { userId, walletId, serviceId, amount, currency } = data;
  socketService.emit(io, walletEvents.PAYMENT_PROCESSED, { walletId, serviceId, amount, currency }, `customer:${userId}`);
  logger.info('Payment processed event emitted', { walletId, userId });
};

const handleBalanceRetrieved = (io, data) => {
  const { userId, walletId, balance, currency } = data;
  socketService.emit(io, walletEvents.BALANCE_RETRIEVED, { walletId, balance, currency }, `customer:${userId}`);
  logger.info('Balance retrieved event emitted', { walletId, userId });
};

const handleTransactionsRetrieved = (io, data) => {
  const { userId, walletId, transactionCount } = data;
  socketService.emit(io, walletEvents.TRANSACTIONS_RETRIEVED, { walletId, transactionCount }, `customer:${userId}`);
  logger.info('Transactions retrieved event emitted', { walletId, userId });
};

const handleGamificationReward = (io, data) => {
  const { userId, walletId, amount, currency, description } = data;
  socketService.emit(io, walletEvents.GAMIFICATION_REWARD, { walletId, amount, currency, description }, `customer:${userId}`);
  logger.info('Gamification reward event emitted', { walletId, userId });
};

module.exports = {
  handleWalletCreated,
  handleFundsAdded,
  handleFundsWithdrawn,
  handlePaymentProcessed,
  handleBalanceRetrieved,
  handleTransactionsRetrieved,
  handleGamificationReward,
};