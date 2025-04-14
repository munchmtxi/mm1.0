'use strict';

// Import individual handler setup functions
const { handleLogin } = require('./loginHandler');
const { handleLogout } = require('./logoutHandler');

const { setupAuthHandlers } = require('./loginHandler');
const { setupLogoutHandlers } = require('./logoutHandler');
const { setupProfileHandlers } = require('./merchant/profile/profileHandler');

// Define the login event handler
const setupAuthHandlersInternal = (io, socket) => {
  // Placeholder for client-initiated events if needed
  socket.on('auth:login', (data) => {
    handleLogin(io, { id: socket.user.id, role: socket.user.role });
  });
};

// Register all main socket handlers
const setupHandlers = (io, socket) => {
  setupAuthHandlersInternal(io, socket); // Internal login event
  setupLogoutHandlers(io, socket);
  setupProfileHandlers(io, socket);
};

module.exports = {
  setupHandlers,
  setupAuthHandlers: setupAuthHandlersInternal,
  handleLogin,
  handleLogout,
};
