'use strict';

const catchAsyncSocket = require('@utils/catchAsyncSocket');
const events = require('@socket/events/driver/financial/taxEvents');

module.exports = (io, socket) => {
  socket.on(events.TAX_CALCULATED, catchAsyncSocket(async (data) => {
    socket.emit(events.TAX_CALCULATED, data);
  }));

  socket.on(events.TAX_REPORT_GENERATED, catchAsyncSocket(async (data) => {
    socket.emit(events.TAX_REPORT_GENERATED, data);
  }));

  socket.on(events.TAX_SETTINGS_UPDATED, catchAsyncSocket(async (data) => {
    socket.emit(events.TAX_SETTINGS_UPDATED, data);
  }));

  socket.on(events.TAX_DATA_EXPORTED, catchAsyncSocket(async (data) => {
    socket.emit(events.TAX_DATA_EXPORTED, data);
  }));
};