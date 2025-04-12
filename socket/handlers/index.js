'use strict';

const { handleLogin } = require('./loginHandler');
const { handleLogout } = require('./logoutHandler');

const setupAuthHandlers = (io, socket) => {
  // Placeholder for client-initiated events if needed
  socket.on('auth:login', (data) => {
    handleLogin(io, { id: socket.user.id, role: socket.user.role });
  });
};

module.exports = { setupAuthHandlers, handleLogin, handleLogout };