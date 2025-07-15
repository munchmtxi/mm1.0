# Staff mTables Support API Documentation

This document outlines the Staff mTables Support API, which manages support operations for front-of-house (FOH) staff in the Munch service, including processing support inquiries, escalating issues, and logging resolutions. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/mtables/supportService.js`
- **Controller**: `src/controllers/staff/mtables/supportController.js`
- **Validator**: `src/validators/staff/mtables/supportValidator.js`
- **Middleware**: `src/middleware/staff/mtables/supportMiddleware.js`
- **Routes**: `src/routes/staff/mtables/supportRoutes.js`
- **Events**: `socket/events/staff/mtables/supportEvents.js`
- **Handler**: `socket/handlers/staff/mtables/supportHandler.js`
- **Localization**: `locales/staff/mtables/en.json`

## Service: `supportService.js`

The service layer handles core support operations, interacting with Sequelize models (`SupportTicket`, `Booking`, `Staff`) and constants (`mtablesConstants.js`, `staffConstants.js`). It includes:

- **handleSupportRequest(bookingId, issue, staffId)**: Creates a support ticket for a booking.
- **escalateIssue(bookingId, staffId)**: Escalates an open support ticket.
- **logSupportResolution(bookingId, resolutionDetails, staffId)**: Records the resolution of a support ticket.

The service uses Sequelize’s `Op` for querying and logs errors using a logger utility.

## Controller: `supportController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Handle Support Request**: 10 points (`supportRequestHandled`).
- **Escalate Issue**: 10 points (`issueEscalated`).
- **Log Support Resolution**: 10 points (`issueResolved`).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the customer’s preferred language.

## Validator: `supportValidator.js`

Uses Joi to validate request inputs:

- **handleSupportRequestSchema**: Requires `bookingId`, `staffId` (integers), and `issue` (object with `description` and `issue_type`).
- **escalateIssueSchema**: Requires `bookingId`, `staffId` (integers).
- **logSupportResolutionSchema**: Requires `bookingId`, `staffId` (integers), and `resolutionDetails` (string).

## Middleware: `supportMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `supportRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/mtables/support-request**: Processes a support inquiry.
- **POST /staff/mtables/escalate-issue**: Escalates an unresolved issue.
- **POST /staff/mtables/log-resolution**: Logs a support issue resolution.

## Events: `supportEvents.js`

Defines socket event names in a namespaced format:

- `staff:mtables:support:request_created`
- `staff:mtables:support:escalated`
- `staff:mtables:support:resolved`

## Handler: `supportHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains English translations for user-facing messages, including support-specific messages:

- `mtables.support_request_created`: Support ticket creation confirmation.
- `mtables.support_escalated`: Support ticket escalation confirmation.
- `mtables.support_resolved`: Support ticket resolution confirmation.

## Endpoints

### POST /staff/mtables/support-request
- **Summary**: Process support inquiries.
- **Request Body**:
  - `bookingId` (integer, required): Booking ID.
  - `issue` (object, required): Object with `description` (string, 10-500 characters) and `issue_type` (valid support issue type).
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Support ticket {ticketNumber} created", data: { id, ticket_number, status, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:support:request_created`, sends notification.

### POST /staff/mtables/escalate-issue
- **Summary**: Escalate unresolved issues.
- **Request Body**:
  - `bookingId` (integer, required): Booking ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Support ticket {ticketNumber} escalated", data: { id, ticket_number, status } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:support:escalated`, sends notification.

### POST /staff/mtables/log-resolution
- **Summary**: Record support issue resolutions.
- **Request Body**:
  - `bookingId` (integer, required): Booking ID.
  - `resolutionDetails` (string, required): Resolution details (10-500 characters).
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Support ticket {ticketNumber} resolved", data: { id, ticket_number, status } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:support:resolved`, sends notification.

## Notes

- Authentication is handled at the main route index, providing `req.user.id` for staff identification.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, using actions from `staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`.
- User-facing messages are localized using the customer’s preferred language for all support operations.
- The `en.json` file is updated to include support-related messages.
- Constants from `mtablesConstants.js` are used for support statuses, issue types, errors, and notifications, while `staffConstants.js` provides staff-related constants.
- Permission checks are simplified, assuming role-based access is enforced via authentication middleware.
- Resolution details are stored as plaintext, removing the encryption step.