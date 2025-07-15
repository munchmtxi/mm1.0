'use strict';

const catchAsyncSocket = require('@utils/catchAsyncSocket');
const events = require('@socket/events/driver/financial/payoutEvents');

module.exports = (io, socket) => {
  socket.on(events.PAYOUT_REQUESTED, catchAsyncSocket(async (data) => {
    socket.emit(events.PAYOUT_REQUESTED, data);
  }));

  socket.on(events.PAYOUT_HISTORY_RETRIEVED, catchAsyncSocket(async (data) => {
    socket.emit(events.PAYOUT_HISTORY_RETRIEVED, data);
  }));

  socket.on(events.PAYOUT_METHOD_VERIFIED, catchAsyncSocket(async (data) => {
    socket.emit(events.PAYOUT_METHOD_VERIFIED, data);
  }));

  socket.on(events.PAYOUT_SCHEDULED, catchAsyncSocket(async (data) => {
    socket.emit(events.PAYOUT_SCHEDULED, data);
  }));
};