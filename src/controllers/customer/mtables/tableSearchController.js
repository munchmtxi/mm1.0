'use strict';

const { searchAvailableTables } = require('@services/customer/mtables/tableSearchService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localization');
const customerGamificationConstants = require('@constants/customer/customerGamificationConstants');
const customerConstants = require('@constants/customer/customerConstants');
const socketConstants = require('@constants/common/socketConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const catchAsync = require('@utils/catchAsync');

/** Handles table search requests */
const searchTables = catchAsync(async (req, res) => {
  const { coordinates, radius, date, time, partySize, seatingPreference } = req.body;
  const { user } = req;
  const io = req.app.get('io');

  const tables = await searchAvailableTables({
    coordinates,
    radius,
    date,
    time,
    partySize,
    seatingPreference,
    transaction: null,
  });

  await auditService.logAction({
    userId: user.id,
    role: 'customer',
    action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.SEARCH_TABLES,
    details: { coordinates, radius, date, time, partySize, seatingPreference },
    ipAddress: req.ip,
  });

  await pointService.awardPoints(
    user.id,
    customerGamificationConstants.GAMIFICATION_ACTIONS.mtables.find(a => a.action === 'table_searched').action,
    customerGamificationConstants.GAMIFICATION_ACTIONS.mtables.find(a => a.action === 'table_searched').points,
    {
      io,
      role: 'customer',
      languageCode: user.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      walletId: user.wallet_id,
    }
  );

  await notificationService.sendNotification({
    userId: user.id,
    notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
    messageKey: 'tables.search_success',
    messageParams: { count: tables.length },
    role: 'customer',
    module: 'tables',
  });

  await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.TABLE_SEARCH_RESULT, {
    userId: user.id,
    role: 'customer',
    tables: tables.map(table => ({
      id: table.id,
      branch: table.branch.name,
      capacity: table.capacity,
      section: table.section?.name,
    })),
    auditAction: socketConstants.SOCKET_AUDIT_ACTIONS.TABLE_SEARCH,
  }, `customer:${user.id}`);

  return res.status(200).json({
    success: true,
    message: formatMessage('customer', 'tables', user.preferred_language || localizationConstants.DEFAULT_LANGUAGE, 'tables.search_success', { count: tables.length }),
    data: tables,
  });
});

module.exports = { searchTables };