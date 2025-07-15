'use strict';

const catchAsyncSocket = require('@utils/catchAsyncSocket');
const events = require('@socket/events/driver/availability/availabilityEvents');

module.exports = (io, socket) => {
  socket.on(events.UPDATED, catchAsyncSocket(async (data) => {
    socket.emit(events.UPDATED, data);
  }));

  socket.on(events.RETRIEVED, catchAsyncSocket(async (data) => {
    socket.emit(events.RETRIEVED, data);
  }));

  socket.on(events.TOGGLED, catchAsyncSocket(async (data) => {
    socket.emit(events.TOGGLED, data);
  }));
};