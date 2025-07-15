'use strict';

const Joi = require('joi');
const mTablesConstants = require('@constants/common/mTablesConstants');
const { AppError } = require('@utils/AppError');

const createPreOrderSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  customerId: Joi.number().integer().positive().required(),
  branchId: Joi.number().integer().positive().required(),
  items: Joi.array()
    .items(
      Joi.object({
        menu_item_id: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().positive().required(),
        customization: Joi.array()
          .items(
            Joi.object({
              modifier_id: Joi.number().integer().positive().required(),
            })
          )
          .optional(),
      })
    )
    .min(1)
    .required(),
  staffId: Joi.number().integer().positive().optional(),
});

const manageGroupPaymentsSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  customerIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  paymentSplits: Joi.array()
    .items(
      Joi.object({
        customerId: Joi.number().integer().positive().required(),
        amount: Joi.number().positive().required(),
        paymentMethodId: Joi.number().integer().positive().optional(),
      })
    )
    .min(1)
    .required(),
  staffId: Joi.number().integer().positive().optional(),
});

const provideFeedbackSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  merchantId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
  comment: Joi.string().max(500).optional(),
  substitutions: Joi.array()
    .items(
      Joi.object({
        menu_item_id: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().positive().required(),
        customization: Joi.array()
          .items(
            Joi.object({
              modifier_id: Joi.number().integer().positive().required(),
            })
          )
          .optional(),
      })
    )
    .optional(),
});

const validateCreatePreOrder = (req, res, next) => {
  const { error } = createPreOrderSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'mtables', 'en', 'errors.invalidInput'), 400, mTablesConstants.ERROR_CODES.INVALID_INPUT);
  next();
};

const validateManageGroupPayments = (req, res, next) => {
  const { error } = manageGroupPaymentsSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'mtables', 'en', 'errors.invalidInput'), 400, mTablesConstants.ERROR_CODES.INVALID_INPUT);
  next();
};

const validateProvideFeedback = (req, res, next) => {
  const { error } = provideFeedbackSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'mtables', 'en', 'errors.invalidInput'), 400, mTablesConstants.ERROR_CODES.INVALID_INPUT);
  next();
};

module.exports = { validateCreatePreOrder, validateManageGroupPayments, validateProvideFeedback };