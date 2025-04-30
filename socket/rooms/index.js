'use strict';

const authRooms = require('./authRooms');
const merchantRooms = require('./merchantRooms');
const customerRooms = require('./customerRooms');
const driverRooms = require('./driverRooms');
const adminRooms = require('./adminRooms');
const staffRoom = require('./staffRoom');
const rideRooms = require('./rideRooms');
const subscriptionRooms = require('./subscriptionRooms');

module.exports = {
  authRooms,
  merchantRooms,
  customerRooms,
  driverRooms,
  adminRooms,
  staffRoom,
  rideRooms,
  subscriptionRooms,
};