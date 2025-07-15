# Staff Communication API Documentation

This document outlines the Staff Communication API, which manages internal messaging for staff in the Munch service, including direct messages, shift announcements, and communication logging. The API integrates with Sequelize for database operations, Socket.IO for real-time messaging, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `services/staff/communication/messagingService.js`
- **Controller**: `controllers/staff/communication/messagingController.js`
- **Validator**: `validators/staff/communication/messagingValidator.js`
- **Middleware**: `middleware/staff/communication/messagingMiddleware.js`
- **Routes**: `routes/staff/communication/messagingRoutes.js`
- **Events**: `socket/events/staff/communication/messagingEvents.js`
- **Handler**: `socket/handlers/staff/communication/messagingHandler.js`
- **Localization**: `locales/staff/communication/en.json`

## Service: `messagingService.js`

The service layer handles core messaging operations, interacting with Sequelize models (`Message`, `Staff`, `Shift`, `GroupChat`, `GroupChatMessage`) and constants (`staffConstants.js`). It includes:

- **sendMessage(staffId, { receiverId, content })**: Sends a direct message to a staff member.
- **broadcastAnnouncement(scheduleId, { content })**: Broadcasts an announcement to staff assigned to a shift, using a group chat.
- **logCommunication(staffId)**: Retrieves recent direct and group message logs for a staff member.

The service uses Sequelize’s `Op` for querying messages and logs errors using a logger utility.

## Controller: `messagingController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Send Message**: 10 points (`task_completion`).
- **Broadcast Announcement**: 10 points (`task_completion`).
- **Log Communication**: 10 points (`task_completion`).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the staff’s preferred language.

## Validator: `messagingValidator.js`

Uses Joi to validate request inputs:

- **sendMessageSchema**: Requires `staffId`, `receiverId` (integers), and `content` (string, 1–1000 characters).
- **broadcastAnnouncementSchema**: Requires `scheduleId` (integer) and `content` (string, 1–1000 characters).
- **logCommunicationSchema**: Requires `staffId` (integer).

## Middleware: `messagingMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `messagingRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/communication/message**: Sends a direct message.
- **POST /staff/communication/announcement**: Broadcasts an announcement.
- **POST /staff/communication/logs**: Retrieves communication logs.

## Events: `messagingEvents.js`

Defines socket event names in a namespaced format:

- `staff:communication:messaging_received`
- `staff:communication:announcement_broadcast`
- `staff:communication:logs_retrieved`

## Handler: `messagingHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains English translations for user-facing messages:

- `communication.message_sent`: Message sent confirmation.
- `communication.announcement_broadcast`: Announcement broadcast confirmation.
- `communication.logs_retrieved`: Logs retrieval confirmation.

## Endpoints

### POST /staff/communication/message
- **Summary**: Send a direct message to a staff member.
- **Request Body**:
  - `staffId` (integer, required): Sender ID.
  - `receiverId` (integer, required): Receiver ID.
  - `content` (string, required): Message content (1–1000 characters).
- **Responses**:
  - **200**: `{ success: true, message: "Message {messageId} sent successfully", data: { id, sender_id, receiver_id, content } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:communication_message_received`, sends notification.

### POST /staff/communication/announcement
- **Summary**: Broadcast an announcement to staff in a shift.
- **Request Body**:
  - `scheduleId` (integer, required): Shift schedule ID.
  - `content` (string, required): Announcement content (1–1000 characters).
- **Responses**:
  - **200**: `{ success: true, message: "Announcement broadcast to shift {shiftId} successfully", data: { id, chat_id, sender_id, content } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:communication:announcement_broadcast`, sends notification.

### POST /staff/communication/logs
- **Summary**: Retrieve communication logs for a staff member.
- **Request Body**:
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Retrieved {count} communication logs", data: [{ type, messageId, chatId, content, timestamp }, ...] }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:communication:logs_retrieved`.

## Notes

- Authentication is handled at the main route index.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, occurs after successful operations, and has no dedicated endpoints.
- All user-facing messages are localized using the staff’s preferred language.
- The `en.json` file is dedicated to communication-related messages.
- Constants from `staffConstants.js` are used for errors, notifications, and gamification actions.