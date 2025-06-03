// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\socket\handlers\index.js

// Common Handlers
const { handleLogin } = require('./common/loginHandler');
const { handleLogout } = require('./common/logoutHandler');
const { handleMfaEnabled, handleMfaVerified } = require('./common/mfaHandler');
const { handleVerificationSubmitted, handleVerificationApproved } = require('./common/verificationHandler');

// Role-Specific Handlers
const staffProfileHandler = require('./staff/profile/staffProfileHandler');
const merchantProfileHandler = require('./merchant/profile/profileHandler');
const driverProfileHandler = require('./driver/profile/profileHandler');
const customerProfileHandler = require('./customer/profile/profileHandler');

// Admin Sub-Handlers
const adminStaffProfileHandler = require('./admin/profile/staffProfileHandler');
const adminMerchantProfileHandler = require('./admin/profile/merchantProfileHandler');
const adminDriverProfileHandler = require('./admin/profile/driverProfileHandler');
const adminCustomerProfileHandler = require('./admin/profile/customerProfileHandler');
const adminBranchProfileHandler = require('./admin/profile/branchProfileHandler');
const adminAdminProfileHandler = require('./admin/profile/adminProfileHandler');

module.exports = {
  // Common Auth Handlers
  handleLogin,
  handleLogout,
  handleMfaEnabled,
  handleMfaVerified,
  handleVerificationSubmitted,
  handleVerificationApproved,

  // User Profile Handlers
  staffProfileHandler,
  merchantProfileHandler,
  driverProfileHandler,
  customerProfileHandler,

  // Admin Panel Handlers
  adminStaffProfileHandler,
  adminMerchantProfileHandler,
  adminDriverProfileHandler,
  adminCustomerProfileHandler,
  adminBranchProfileHandler,
  adminAdminProfileHandler,
};