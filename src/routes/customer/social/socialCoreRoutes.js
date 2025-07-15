'use strict';

const express = require('express');
const router = express.Router();
const socialCoreController = require('@controllers/customer/social/socialCoreController');
const socialCoreValidator = require('@validators/customer/social/socialCoreValidator');
const validate = require('@middleware/validate');
const socialMiddleware = require('@middleware/customer/social/socialMiddleware');

/**
 * @swagger
 * tags:
 *   name: SocialCore
 *   description: Social core functionality for customers
 */

/**
 * @swagger
 * /customer/social/core/friends:
 *   post:
 *     summary: Manage friend list
 *     tags: [SocialCore]
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
router.post('/core/friends', validate(socialCoreValidator.manageFriendList), socialMiddleware.checkFriendExists, socialCoreController.manageFriendList);

/**
 * @swagger
 * /customer/social/core/permissions:
 *   post:
 *     summary: Set friend permissions
 *     tags: [SocialCore]
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
router.post('/core/permissions', validate(socialCoreValidator.setFriendPermissions), socialMiddleware.checkFriendExists, socialCoreController.setFriendPermissions);

/**
 * @swagger
 * /customer/social/core/chat:
 *   post:
 *     summary: Facilitate group chat
 *     tags: [SocialCore]
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
router.post('/core/chat', validate(socialCoreValidator.facilitateGroupChat), socialMiddleware.checkChatPermissions, socialCoreController.facilitateGroupChat);

module.exports = router;