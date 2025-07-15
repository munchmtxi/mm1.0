'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const munchConstants = require('@constants/common/munchConstants');

const analyticsAuth = (permission) => (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo(['merchant'])(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(permission)(req, res, next);
    });
  });
};

const trackOrderTrendsAuth = analyticsAuth(munchConstants.PERMISSIONS.TRACK_ORDER_TRENDS);
const monitorDeliveryPerformanceAuth = analyticsAuth(munchConstants.PERMISSIONS.MONITOR_DELIVERY_PERFORMANCE);
const aggregateCustomerInsightsAuth = analyticsAuth(munchConstants.PERMISSIONS.AGGREGATE_CUSTOMER_INSIGHTS);
const trackGamificationAuth = analyticsAuth(munchConstants.PERMISSIONS.TRACK_GAMIFICATION);
const analyzeDeliveryLocationsAuth = analyticsAuth(munchConstants.PERMISSIONS.ANALYZE_DELIVERY_LOCATIONS);

module.exports = {
  trackOrderTrendsAuth,
  monitorDeliveryPerformanceAuth,
  aggregateCustomerInsightsAuth,
  trackGamificationAuth,
  analyzeDeliveryLocationsAuth,
};