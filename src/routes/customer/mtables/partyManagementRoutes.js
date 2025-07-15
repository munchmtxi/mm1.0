'use strict';

const express = require('express');
const router = express.Router();
const partyManagementController = require('@controllers/customer/mtables/partyManagementController');
const partyManagementValidator = require('@validators/customer/mtables/partyManagementValidator');
const { validate } = require('express-validation');
const authMiddleware = require('@middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Party Management
 *     description: Customer party management endpoints for mtables
 */

/**
 * @swagger
 * /customer/mtables/party/invite:
 *   post:
 *     summary: Invite a customer to a party
 *     tags: [Party Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, customerId, inviteMethod]
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 example: 1
 *               customerId:
 *                 type: integer
 *                 example: 2
 *               inviteMethod:
 *                 type: string
 *                 enum: ['email', 'sms', 'push', 'whatsapp', 'in_app']
 *                 example: push
 *     responses:
 *       200:
 *         description: Party member invited successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     partyMember:
 *                       type: object
 *                     booking:
 *                       type: object
 *       400:
 *         description: Invalid input or error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/invite',
  authMiddleware.authenticate,
  partyManagementValidator.invitePartyMember,
  validate(partyManagementValidator.invitePartyMember, {}, { abortEarly: false }),
  partyManagementController.invitePartyMember
);

/**
 * @swagger
 * /customer/mtables/party/status:
 *   put:
 *     summary: Update party member status
 *     tags: [Party Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, status]
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 example: 1
 *               status:
 *                 type: string
 *                 enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'REMOVED']
 *                 example: ACCEPTED
 *     responses:
 *       200:
 *         description: Party member status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     partyMember:
 *                       type: object
 *       400:
 *         description: Invalid input or error
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/status',
  authMiddleware.authenticate,
  partyManagementValidator.updatePartyMemberStatus,
  validate(partyManagementValidator.updatePartyMemberStatus, {}, { abortEarly: false }),
  partyManagementController.updatePartyMemberStatus
);

/**
 * @swagger
 * /customer/mtables/party/remove:
 *   delete:
 *     summary: Remove a party member
 *     tags: [Party Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, customerId]
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 example: 1
 *               customerId:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Party member removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     booking:
 *                       type: object
 *       400:
 *         description: Invalid input or error
 *       401:
 *         description: Unauthorized
 */
router.delete(
  '/remove',
  authMiddleware.authenticate,
  partyManagementValidator.removePartyMember,
  validate(partyManagementValidator.removePartyMember, {}, { abortEarly: false }),
  partyManagementController.removePartyMember
);

/**
 * @swagger
 * /customer/mtables/party/split-bill:
 *   post:
 *     summary: Initiate bill splitting
 *     tags: [Party Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, customerIds, amount, currency, billSplitType]
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 example: 1
 *               customerIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [2, 3]
 *               amount:
 *                 type: number
 *                 example: 100.50
 *               currency:
 *                 type: string
 *                 enum: ['USD', 'EUR', 'GBP']
 *                 example: USD
 *               billSplitType:
 *                 type: string
 *                 enum: ['EQUAL', 'CUSTOM', 'ITEMIZED', 'PERCENTAGE', 'SPONSOR_CONTRIBUTION']
 *                 example: EQUAL
 *     responses:
 *       200:
 *         description: Bill split initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentRequests:
 *                       type: array
 *                       items:
 *                         type: object
 *                     booking:
 *                       type: object
 *       400:
 *         description: Invalid input or error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/split-bill',
  authMiddleware.authenticate,
  partyManagementValidator.splitBill,
  validate(partyManagementValidator.splitBill, {}, { abortEarly: false }),
  partyManagementController.splitBill
);

module.exports = router;