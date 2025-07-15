'use strict';

const catchAsyncSocket = require('@utils/catchAsyncSocket');
const events = require('@socket/events/driver/analytics/events');

module.exports = (io, socket) => {
  socket.on(events.METRICS_UPDATED, catchAsyncSocket(async (data) => {
    socket.emit(events.METRICS_UPDATED, data);
  }));

  socket.on(events.REPORT_GENERATED, catchAsyncSocket(async (data) => {
    socket.emit(events.REPORT_GENERATED, data);
  }));

  socket.on(events.RECOMMENDATIONS_UPDATED, catchAsyncSocket(async (data) => {
    socket.emit(events.RECOMMENDATIONS_UPDATED, data);
  }));

  socket.on(events.PERFORMANCE_COMPARISON, catchAsyncSocket(async (data) => {
    socket.emit(events.PERFORMANCE_COMPARISON, data);
  }));
};