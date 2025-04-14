'use strict';

const Joi = require('joi');
const { CODES: BUSINESS_TYPE_CODES } = require('@constants/merchant/businessTypes');

const profileValidator = {
  getProfile: Joi.object({
    includeBranches: Joi.boolean().default(false),
  }).unknown(true),

  updateProfile: Joi.object({
    business_name: Joi.string().min(2).max(100),
    business_type: Joi.string().valid(...BUSINESS_TYPE_CODES),
    business_type_details: Joi.object({
      service_types: Joi.array().items(Joi.string()).optional(),
      licenses: Joi.array().items(Joi.string()).optional(),
    }).optional(),
    address: Joi.string().max(255),
    phone_number: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
    currency: Joi.string().length(3),
    time_zone: Joi.string(),
    business_hours: Joi.object({
      open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
      close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    }).optional(),
    whatsapp_enabled: Joi.boolean(),
    delivery_area: Joi.object().optional(),
    service_radius: Joi.number().min(0).optional(),
  }).min(1),

  updateNotificationPreferences: Joi.object({
    orderUpdates: Joi.boolean().optional(),
    bookingNotifications: Joi.boolean().optional(),
    customerFeedback: Joi.boolean().optional(),
    marketingMessages: Joi.boolean().optional(),
  }).min(1),

  changePassword: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/).required(),
    confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
    deviceId: Joi.string().optional(),
    deviceType: Joi.string().optional(),
  }),

  updateGeolocation: Joi.object({
    placeId: Joi.string().optional(),
    address: Joi.string().max(255).optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional(),
    }).optional(),
  }).or('placeId', 'address', 'coordinates'),

  createBranchProfile: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    contact_email: Joi.string().email().required(),
    contact_phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
    address: Joi.string().max(255).optional(),
    placeId: Joi.string().optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional(),
    }).optional(),
    operating_hours: Joi.object({
      monday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
      tuesday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
      wednesday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
      thursday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
      friday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
      saturday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
      sunday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
    }).optional(),
    delivery_radius: Joi.number().min(0).optional(),
    payment_methods: Joi.array().items(Joi.string()).optional(),
  }).or('address', 'placeId', 'coordinates'),

  getBranchProfile: Joi.object({
    branchId: Joi.number().integer().positive().required(),
  }),

  updateBranchProfile: Joi.object({
    branchId: Joi.number().integer().positive().required(),
    name: Joi.string().min(2).max(100),
    contact_email: Joi.string().email(),
    contact_phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
    address: Joi.string().max(255).optional(),
    placeId: Joi.string().optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional(),
    }).optional(),
    operating_hours: Joi.object({
      monday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
      tuesday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
      wednesday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
      thursday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
      friday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
      saturday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
      sunday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
    }).optional(),
    delivery_radius: Joi.number().min(0).optional(),
    payment_methods: Joi.array().items(Joi.string()).optional(),
    is_active: Joi.boolean().optional(),
  }).min(1),

  deleteBranchProfile: Joi.object({
    branchId: Joi.number().integer().positive().required(),
  }),

  listBranchProfiles: Joi.object({}),

  bulkUpdateBranches: Joi.array().items(
    Joi.object({
      branchId: Joi.number().integer().positive().required(),
      operating_hours: Joi.object({
        monday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
        tuesday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
        wednesday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
        thursday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
        friday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
        saturday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
        sunday: Joi.object({ open: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), close: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) }).optional(),
      }).optional(),
      payment_methods: Joi.array().items(Joi.string()).optional(),
      delivery_radius: Joi.number().min(0).optional(),
      is_active: Joi.boolean().optional(),
    }).min(1)
  ).min(1),

  updateMerchantMedia: Joi.object({
    storefront_url: Joi.string().uri().optional(),
  }),

  getPlaceDetails: Joi.object({
    placeId: Joi.string().required(),
    sessionToken: Joi.string().optional(),
  }),

  getAddressPredictions: Joi.object({
    input: Joi.string().required(),
    sessionToken: Joi.string().optional(),
  }),
};

module.exports = profileValidator;