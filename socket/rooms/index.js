'use strict';

/**
 * socket/rooms/index.js
 *
 * Centralized export for room-related utilities and validation.
 * Supports rooms for munch, mtxi, mtickets, mtables, mstays, mpark, and mevents.
 *
 * Dependencies:
 * - rooms/staffRoom.js
 * - rooms/merchantRooms.js
 * - rooms/groupRooms.js
 * - rooms/eventRooms.js
 * - rooms/authRooms.js
 * - rooms/adminRooms.js
 *
 * Last Updated: July 19, 2025
 */

const staffRoom = require('./staffRoom');
const merchantRooms = require('./merchantRooms');
const groupRooms = require('./groupRooms');
const eventRooms = require('./eventRooms');
const authRooms = require('./authRooms');
const adminRooms = require('./adminRooms');

/**
 * Validates if a room is valid for a given role and service.
 * @param {string} room - Room name (e.g., mm:merchant-123, mm:role:admin).
 * @param {string} role - User role (e.g., admin, merchant, staff).
 * @param {string} service - Service (e.g., munch, mtxi, mtickets).
 * @returns {boolean} - True if room is valid.
 */
const validateRoom = (room, role, service) => {
  if (!room || !role || !service) return false;

  const validServices = ['munch', 'mtxi', 'mtickets', 'mtables', 'mstays', 'mpark', 'mevents'];
  if (!validServices.includes(service)) return false;

  const roleRoomPrefixes = {
    admin: ['mm:admin:', 'mm:role:admin'],
    merchant: ['mm:merchant-', 'mm:branch-', 'mm:role:merchant'],
    staff: ['mm:merchant-', 'mm:branch-', 'mm:staff-', 'mm:role:staff'],
    customer: ['mm:role:customer'],
    driver: ['mm:role:driver'],
    group: ['mm:group:'],
    event: ['mm:event:']
  };

  const validPrefixes = roleRoomPrefixes[role] || [];
  return validPrefixes.some(prefix => room.startsWith(prefix));
};

module.exports = {
  staffRoom,
  ...merchantRooms,
  ...groupRooms,
  ...eventRooms,
  ...authRooms,
  ...adminRooms,
  validateRoom
};