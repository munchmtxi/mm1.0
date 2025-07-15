'use strict';

const express = require('express');
const router = express.Router();
const socialController = require('@controllers/customer/social/socialController');
const socialValidator = require('@validators/customer/social/socialValidator');
const validate = require('@middleware/validate');
const socialMiddleware = require('@middleware/customer/social/socialMiddleware');

/**
 * @swagger
 * tags:
 *   name: Social
 *   description: Social module for customers
 */

/**
 * @swagger
 * /customer/social/friends:
 *   post:
 *     summary: Manage friend list
 *     tags: [Social]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [friendId, action]
 *             properties:
 *               friendId: { type: integer }
 *               action: { type: string, enum: ['add', 'remove', 'accept', 'reject'] }
 *     responses:
 *       200: { description: Friend list updated successfully }
 *       400: { description: Invalid input }
 *       500: { description: Server error }
 */
router.post('/friends', validate(socialValidator.manageFriendList), socialMiddleware.checkFriendExists, socialController.manageFriendList);

/**
 * @swagger
 * /customer/social/permissions:
 *   post:
 *     summary: Set friend permissions
 *     tags: [Social]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [friendId, permissions]
 *             properties:
 *               friendId: { type: integer }
 *               permissions: { type: object, properties: { viewPosts: { type: boolean }, viewStories: { type: boolean }, sendMessages: { type: boolean } } }
 *     responses:
 *       200: { description: Permissions updated successfully }
 *       400: { description: Invalid input }
 *       500: { description: Server error }
 */
router.post('/permissions', validate(socialValidator.setFriendPermissions), socialMiddleware.checkFriendExists, socialController.setFriendPermissions);

/**
 * @swagger
 * /customer/social/chat:
 *   post:
 *     summary: Facilitate group chat
 *     tags: [Social]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [chatId]
 *             properties:
 *               chatId: { type: integer }
 *               message: { type: string, maxLength: 1000 }
 *               media: { type: object, properties: { type: { type: string, enum: ['image', 'video'] }, url: { type: string, format: uri } } }
 *     responses:
 *       200: { description: Group chat action completed }
 *       400: { description: Invalid input }
 *       500: { description: Server error }
 */
router.post('/chat', validate(socialValidator.facilitateGroupChat), socialMiddleware.checkChatPermissions, socialController.facilitateGroupChat);

/**
 * @swagger
 * /customer/social/stream:
 *   post:
 *     summary: Create a live event stream
 *     tags: [Social]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId, title, streamUrl]
 *             properties:
 *               eventId: { type: integer }
 *               title: { type: string, maxLength: 100 }
 *               description: { type: string, maxLength: 500 }
 *               streamUrl: { type: string, format: uri }
 *     responses:
 *       201: { description: Live stream created successfully, content: { $ref: '#/components/schemas/LiveStream' } }
 *       400: { description: Invalid input }
 *       500: { description: Server error }
 */
router.post('/stream', validate(socialValidator.createLiveEventStream), socialMiddleware.checkEventAccess, socialController.createLiveEventStream);

/**
 * @swagger
 * /customer/social/recommendations:
 *   post:
 *     summary: Manage social recommendations
 *     tags: [Social]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [preferences]
 *             properties:
 *               preferences: { type: object, properties: { interests: { type: array, items: { type: string, maxLength: 50 } }, location: { type: string, maxLength: 100 }, maxDistance: { type: integer, minimum: 1, maximum: 100 } } }
 *     responses:
 *       200: { description: Recommendations received successfully }
 *       400: { description: Invalid input }
 *       500: { description: Server error }
 */
router.post('/recommendations', validate(socialValidator.manageSocialRecommendations), socialController.manageSocialRecommendations);

module.exports = router;