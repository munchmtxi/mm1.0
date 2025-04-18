'use strict';

// Import individual handler setup functions
const { handleLogin, setupAuthHandlers } = require('./loginHandler');
const { handleLogout, setupLogoutHandlers } = require('./logoutHandler');
const { setupProfileHandlers: setupMerchantProfileHandlers } = require('./merchant/profile/profileHandler');
const { setupProfileHandlers: setupCustomerProfileHandlers } = require('./customer/profile/profileHandler');
const { setupProfileHandlers: setupDriverProfileHandlers } = require('./driver/profile/profileHandler');
const { setupProfileHandlers: setupStaffProfileHandlers } = require('./staff/profile/staffProfileHandler');
const { setupProfileHandlers: setupAdminProfileHandlers } = require('./admin/profile/adminProfileHandler');

// Define the login event handler
const setupAuthHandlersInternal = (io, socket) => {
  // Handle client-initiated login events
  socket.on('auth:login', (data) => {
    handleLogin(io, { id: socket.user.id, role: socket.user.role });
  });
};

// Ensure setupAuthHandlers is either the imported function or the internal one
const authHandlers = setupAuthHandlers || setupAuthHandlersInternal;

// Register all main socket handlers
const setupHandlers = (io, socket) => {
  authHandlers(io, socket);
  setupLogoutHandlers(io, socket);
  setupMerchantProfileHandlers(io, socket);
  setupCustomerProfileHandlers(io, socket);
  setupDriverProfileHandlers(io, socket);
  setupStaffProfileHandlers(io, socket);
  setupAdminProfileHandlers(io, socket);
};

module.exports = {
  setupHandlers,
  setupAuthHandlers: authHandlers,
  handleLogin,
  handleLogout,
};