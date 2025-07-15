# Staff Munch Support API Documentation

This document outlines the Staff Munch Support API, which manages support operations for staff in the Munch service, including handling order inquiries, resolving issues, and escalating disputes. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/munch/supportService.js`
- **Controller**: `src/controllers/staff/munch/supportController.js`
- **Validator**: `src/validators/staff/munch/supportValidator.js`
- **Middleware**: `src/middleware/staff/munch/supportMiddleware.js`
- **Routes**: `src/routes/staff/munch/supportRoutes.js`
- **Events**: `socket/events/staff/munch/supportEvents.js`
- **Handler**: `socket/handlers/staff/munch/supportHandler.js`
- **Localization**: `locales/staff/munch/en.json`

## Service: `supportService.js`

The service layer handles core support operations, interacting with Sequelize models (`SupportTicket`, `Order`, `Dispute`, `Staff`) and constants (`munchConstants.js`, `staffConstants.js`). It includes:

- **handleOrderInquiry(orderId, issue, staffId)**: Creates a support ticket for an order inquiry.
- **resolveOrderIssue(orderId, resolution, staffId)**: Resolves an open support ticket with resolution details.
- **escalateOrderDispute(orderId, staffId)**: Escalates a support ticket to a dispute for merchant review.

The service uses Sequelize’s `Op` for querying and logs errors using a logger utility.

## Controller: `supportController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Handle Order Inquiry**: 10 points (`inquiryHandled`).
- **Resolve Order Issue**: 10 points (`issueResolved`).
- **Escalate Order Dispute**: 10 points (`disputeEscalated`).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the customer’s preferred language or default language.

## Validator: `supportValidator.js`

Uses Joi to validate request inputs:

- **handleOrderInquirySchema**: Requires `orderId`, `staffId` (integers), and `issue` (object with `description`, `issue_type`).
- **resolveOrderIssueSchema**: Requires `orderId`, `staffId` (integers), and `resolution` (string).
- **escalateOrderDisputeSchema**: Requires `orderId`, `staffId` (integers).

## Middleware: `supportMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `supportRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/munch/handle-inquiry**: Handles an order inquiry.
- **POST /staff/munch/resolve-issue**: Resolves an order issue.
- **POST /staff/munch/escalate-dispute**: Escalates an order dispute.

## Events: `supportEvents.js`

Defines socket event names in a namespaced format:

- `staff:munch:support:inquiry_created`
- `staff:munch:support:resolved`
- `staff:munch:support:escalated`

## Handler: `supportHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Updated to include support-specific messages:

- `munch.inquiry_created`: Inquiry creation confirmation.
- `munch.issue_resolved`: Issue resolution confirmation.
- `munch.dispute_escalated`: Dispute escalation confirmation.

## Endpoints

### POST /staff/munch/handle-inquiry
- **Summary**: Handle order inquiry.
- **Request Body**:
  - `orderId` (integer, required): Order ID.
  - `issue` (object, required): `{ description: string, issue_type: string }`.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Support inquiry created with ticket {ticketNumber}", data: { id, ticket_number, status, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:munch:support:inquiry_created`, sends notification.

### POST /staff/munch/resolve-issue
- **Summary**: Resolve order issue.
- **Request Body**:
  - `orderId` (integer, required): Order ID.
  - `resolution` (string, required): Resolution details.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Support issue resolved for ticket {ticketNumber}", data: { id, ticket_number, status, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:munch:support:resolved`, sends notification.

### POST /staff/munch/escalate-dispute
- **Summary**: Escalate order dispute.
- **Request Body**:
  - `orderId` (integer, required): Order ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Dispute escalated for ticket {ticketNumber}", data: { id, customer_id, status, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:munch:support:escalated`, sends notification.

## Notes

- Authentication is handled at the main route index, providing `req.user.id` for staff identification.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, using actions from `staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`.
- User-facing messages are localized using the customer’s preferred language for customer-facing notifications, defaulting to `munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE` ('en').
- The `en.json` file is updated to include support-related messages.
- Constants from `munchConstants.js` are used for support statuses, errors, audit types, and notifications, while `staffConstants.js` provides staff-related constants.
- Permission checks are simplified, assuming role-based access is enforced via authentication middleware.
- Encryption of resolution details was removed, assuming it’s handled at the database level if needed.
- Unused models (`GamificationPoints`, `Feedback`, `DriverSupportTicket`) are excluded.
- Socket rooms use `customer:${ticket.user_id}` to target customer-specific notifications.