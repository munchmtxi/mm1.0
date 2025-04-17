'use strict';
const express = require('express');
const router = express.Router();
const { authenticate } = require('@middleware/common/authMiddleware');
const staffProfileController = require('@controllers/staff/profile/staffProfileController');
const staffProfileMiddleware = require('@middleware/staff/profile/staffProfileMiddleware');
const multerConfig = require('@config/multerConfig');

router.use(authenticate);

router.get('/profile', staffProfileMiddleware.validateStaff, staffProfileController.getProfile);
router.put('/profile', staffProfileMiddleware.validateStaff, staffProfileMiddleware.validatePersonalInfo, staffProfileController.updatePersonalInfo);
router.put('/password', staffProfileMiddleware.validateStaff, staffProfileMiddleware.validatePasswordChange, staffProfileController.changePassword);
router.post('/profile/picture', staffProfileMiddleware.validateStaff, multerConfig.single('avatar'), staffProfileController.uploadProfilePicture);
router.delete('/profile/picture', staffProfileMiddleware.validateStaff, staffProfileController.deleteProfilePicture);

module.exports = router;