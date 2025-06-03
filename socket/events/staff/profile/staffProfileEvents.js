'use strict';

/**
 * Staff Profile Events
 * Defines WebSocket event constants for staff profile and role operations, including profile creation,
 * updates, compliance verification, profile retrieval, wallet updates, task assignments, shift updates,
 * training reminders, and gamification rewards. Supports real-time communication for the Staff Role System.
 *
 * Last Updated: May 15, 2025
 */

module.exports = {
  // Client-to-server events (staff actions)
  CREATE_PROFILE: 'staff:profile:create',
  UPDATE_PROFILE: 'staff:profile:update',
  VERIFY_COMPLIANCE: 'staff:profile:compliance:verify',
  GET_PROFILE: 'staff:profile:get',
  UPDATE_WALLET: 'staff:profile:wallet:update',
  ASSIGN_TASK: 'staff:task:assign',
  UPDATE_SHIFT: 'staff:shift:update',
  SEND_TRAINING_REMINDER: 'staff:training:reminder',
  AWARD_GAMIFICATION_POINTS: 'staff:gamification:award',

  // Server-to-client events (notifications)
  PROFILE_CREATED: 'staff:profile:created',
  PROFILE_UPDATED: 'staff:profile:updated',
  COMPLIANCE_VERIFIED: 'staff:profile:compliance:verified',
  COMPLIANCE_FAILED: 'staff:profile:compliance:failed',
  PROFILE_RETRIEVED: 'staff:profile:retrieved',
  WALLET_UPDATED: 'staff:profile:wallet:updated',
  TASK_ASSIGNED: 'staff:task:assigned',
  SHIFT_UPDATED: 'staff:shift:updated',
  TRAINING_REMINDER_SENT: 'staff:training:reminder:sent',
  GAMIFICATION_POINTS_AWARDED: 'staff:gamification:points:awarded',
  ERROR: 'staff:profile:error',
};