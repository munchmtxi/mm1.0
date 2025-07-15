'use strict';

const catchAsyncSocket = require('@utils/catchAsyncSocket');
const events = require('@socket/events/driver/financial/financialEvents');

module.exports = (io, socket) => {
  socket.on(events.TRENDS_RETRIEVED, catchAsyncSocket(async (data) => {
    socket.emit(events.TRENDS_RETRIEVED, data);
  }));

  socket.on(events.SUMMARY_RETRIEVED, catchAsyncSocket(async (data) => {
    socket.emit(events.SUMMARY_RETRIEVED, data);
  }));

  socket.on(events.GOALS_RETRIEVED, catchAsyncSocket(async (data) => {
    socket.emit(events.GOALS_RETRIEVED, data);
  }));

  socket.on(events.PERFORMANCE_RETRIEVED, catchAsyncSocket(async (data) => {
    socket.emit(events.PERFORMANCE_RETRIEVED, data);
  }));
};