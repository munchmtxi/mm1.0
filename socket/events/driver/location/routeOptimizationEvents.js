'use strict';

const routeOptimizationConstants = require('@constants/driver/routeOptimizationConstants');

module.exports = {
  ROUTE_CALCULATED: `./${routeOptimizationConstants.EVENT_TYPES.ROUTE_CALCULATED}`,
  ROUTE_UPDATED: `./${routeOptimizationConstants.EVENT_TYPES.ROUTE_UPDATED}`,
  ROUTE_DETAILS_RETRIEVED: `./${routeOptimizationConstants.EVENT_TYPES.ROUTE_DETAILS_RETRIEVED}`,
};