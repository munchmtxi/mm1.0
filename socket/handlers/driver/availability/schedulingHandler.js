'use strict';

const catchAsyncSocket = require('@utils/catchAsyncSocket');
const events = require('@socket/events/driver/scheduling/schedulingEvents');

module.exports = (io, socket) => {
  socket.on(events.CREATED, catchAsyncSocket(async (data) => {
    socket.emit(events.CREATED, data);
  }));

  socket.on(events.RETRIEVED, catchAsyncSocket(async (data) => {
    socket.emit(events.RETRIEVED, data);
  }));

  socket.on(events.UPDATED, catchAsyncSocket(async (data) => {
    socket.emit(events.UPDATED, data);
  }));

  socket.on(events.HIGH_DEMAND, catchAsyncSocket(async (data) => {
    socket.emit(events.HIGH_DEMAND, data);
  }));
};