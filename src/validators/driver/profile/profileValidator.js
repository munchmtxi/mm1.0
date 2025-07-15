'use strict';

const Joi = require('joi');
const driverConstants = require('@constants/driverConstants');

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^\+\d{10,15}$/).optional(),
  vehicleType: Joi.string()
    .valid(...Object.values(driverConstants.PROFILE_CONSTANTS.VEHICLE_TYPES))
    .optional(),
});

const uploadCertificationSchema = Joi.object({
  type: Joi.string().valid('driver_license', 'insurance').required(),
}).unknown(true); // Allow file field handled by multer

module.exports = {
  updateProfile: {
    body: updateProfileSchema,
  },
  uploadCertification: {
    body: uploadCertificationSchema,
  },
  getProfile: {},
  verifyProfile: {},
};