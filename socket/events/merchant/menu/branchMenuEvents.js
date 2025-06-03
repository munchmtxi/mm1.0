'use strict';

/**
 * branchMenuEvents.js
 * Event constants for branch menu-related actions in Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  EVENT_TYPES: {
    MENU_AMENDED: 'branchMenu:menuAmended',
    MENU_VIEWED: 'branchMenu:menuViewed',
  },

  NOTIFICATION_TYPES: {
    BRANCH_MENU_AMENDED: 'branch_menu_amended',
    BRANCH_MENU_VIEWED: 'branch_menu_viewed',
  },

  AUDIT_TYPES: {
    AMEND_BRANCH_MENU: 'amend_branch_menu',
    VIEW_BRANCH_MENU: 'view_branch_menu',
  },

  SETTINGS: {
    DEFAULT_LANGUAGE: 'en',
  },

  ERROR_CODES: {
    BRANCH_NOT_FOUND: 'BRANCH_NOT_FOUND',
  },
};