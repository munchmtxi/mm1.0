'use strict';

const catchAsyncSocket = require('@utils/catchAsyncSocket');
const events = require('@socket/events/driver/location/locationEvents');

module.exports = (io, socket) => {
  socket.on(events.LOCATION_UPDATED, catchAsyncSocket(async (data) => {
    socket.broadcast.emit(events.LOCATION_UPDATED, data);
  }));

  socket.on(events.LOCATION_RETRIEVED, catchAsyncSocket(async (data) => {
    socket.emit(events.LOCATION_RETRIEVED, data);
  }));

  socket.on(events.MAP_CONFIGURED, catchAsyncSocket(async (data) => {
    socket.emit(events.MAP_CONFIGURED, data);
  }));
};