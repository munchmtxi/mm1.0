'use strict';

const express = require('express');
const router = express.Router();
const socialContentController = require('@controllers/customer/social/socialContentController');
const socialContentValidator = require('@validators/customer/social/socialContentValidator');
const validate = require('@middleware/validate');
const socialMiddleware = require('@middleware/customer/social/socialMiddleware');

/**
 * @swagger
 * tags:
 *   name: SocialContent
 *   description: Social content management for customers
 */

/**
 * @swagger
 * /customer/social/content/post:
 *   post:
 *     summary: Create a new post
 *     tags: [SocialContent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, maxLength: 500 }
 *               media: { type: array, items: { type: object, properties: { type: { type: string, enum: ['image', 'video'] }, url: { type: string, format: uri } } } }
 *               visibility: { type: string, enum: ['public', 'friends', 'private'], default: 'public' }
 *     responses:
 *       201: { description: Post created successfully, content: { $ref: '#/components/schemas/Post' } }
 *       400: { description: Invalid input }
 *       500: { description: Server error }
 */
router.post('/content/post', validate(socialContentValidator.createPost), socialContentController.createPost);

/**
 * @swagger
 * /customer/social/content/reaction:
 *   post:
 *     summary: Manage post reactions
 *     tags: [SocialContent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [postId, reaction]
 *             properties:
 *               postId: { type: integer }
 *               reaction: { type: string, enum: ['like', 'love', 'laugh', 'sad', 'angry'] }
 *     responses:
 *       200: { description: Reaction managed successfully }
 *       400: { description: Invalid input }
 *       500: { description: Server error }
 */
router.post('/content/reaction', validate(socialContentValidator.managePostReactions), socialMiddleware.checkPostOwnership, socialContentController.managePostReactions);

/**
 * @swagger
 * /customer/social/content/story:
 *   post:
 *     summary: Share a story
 *     tags: [SocialContent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [media]
 *             properties:
 *               media: { type: object, required: [type, url], properties: { type: { type: string, enum: ['image', 'video'] }, url: { type: string, format: uri } } }
 *               caption: { type: string, maxLength: 200 }
 *               duration: { type: integer, minimum: 1, maximum: 24, default: 24 }
 *     responses:
 *       201: { description: Story shared successfully, content: { $ref: '#/components/schemas/Story' } }
 *       400: { description: Invalid input }
 *       500: { description: Server error }
 */
router.post('/content/story', validate(socialContentValidator.shareStory), socialContentController.shareStory);

/**
 * @swagger
 * /customer/social/content/invite:
 *   post:
 *     summary: Invite a friend to a service
 *     tags: [SocialContent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [friendId, serviceType, serviceId]
 *             properties:
 *               friendId: { type: integer }
 *               serviceType: { type: string, enum: ['event', 'table', 'deal'] }
 *               serviceId: { type: integer }
 *     responses:
 *       201: { description: Invite sent successfully }
 *       400: { description: Invalid input }
 *       500: { description: Server error }
 */
router.post('/content/invite', validate(socialContentValidator.inviteFriendToService), socialMiddleware.checkFriendExists, socialContentController.inviteFriendToService);

module.exports = router;