Dispute Service Documentation
Overview
The Dispute Service for mtables (Admin) manages the resolution, tracking, and escalation of disputes related to bookings and pre-orders within a restaurant (merchant branch). The service integrates with Sequelize models, automatically awards gamification points for dispute resolutions, and supports localization for user-facing messages. It ensures customer satisfaction and compliance through notifications, real-time updates, and audit logging. Complementary files include a controller, validator, middleware, routes, socket events, socket handlers, and an updated localization file. This documentation provides a comprehensive guide to the service, its endpoints, and all related components.

File Structure
Service: src/services/admin/mtables/disputeService.js
Controller: src/controllers/admin/mtables/disputeController.js
Validator: src/validators/admin/mtables/disputeValidator.js
Middleware: src/middleware/admin/mtables/disputeMiddleware.js
Routes: src/routes/admin/mtables/disputeRoutes.js
Events: socket/events/admin/mtables/disputeEvents.js
Handler: socket/handlers/admin/mtables/disputeHandler.js
Localization: locales/admin/mtables/en.json
Service Description
The disputeService.js file contains four core functions:

resolveBookingDisputes:
Purpose: Resolves disputes related to bookings by updating the dispute status and recording the resolution.
Input: bookingId (number), resolution (object with type and optional description), pointService (injected for point awarding).
Output: An object with disputeId, bookingId, status, resolution, and resolutionType.
Models Used: Booking, MerchantBranch, Customer, Dispute.
Validation:
bookingId and resolution.type are required.
resolution.type must be in disputeConstants.RESOLUTION_TYPES.
Dispute must be PENDING or IN_REVIEW.
Gamification: Awards points to the customer for DISPUTE_RESOLVED action if configured in disputeConstants.GAMIFICATION_ACTIONS.
resolvePreOrderDisputes:
Purpose: Resolves disputes related to pre-orders for a booking, ensuring the associated order exists.
Input: bookingId (number), resolution (object with type and optional description), pointService.
Output: An object with disputeId, bookingId, orderId, status, resolution, and resolutionType.
Models Used: Booking, MerchantBranch, Customer, InDiningOrder, Dispute.
Validation:
bookingId and resolution.type are required.
resolution.type must be in disputeConstants.RESOLUTION_TYPES.
Dispute must be PENDING or IN_REVIEW.
An InDiningOrder must exist for the booking's customer and table.
Gamification: Awards points to the customer for DISPUTE_RESOLVED action if configured.
trackDisputeStatus:
Purpose: Retrieves the current status and details of a dispute for monitoring purposes.
Input: disputeId (number).
Output: An object with disputeId, serviceId, serviceType, status, issueType, resolution, and resolutionType.
Models Used: Dispute, Booking, MerchantBranch, Customer.
Validation: disputeId is required, and the dispute must exist and be of type mtables.
Gamification: No points awarded, as this is a read-only operation.
escalateDisputes:
Purpose: Escalates a dispute to a higher authority (e.g., super_admin) by updating its status to IN_REVIEW.
Input: disputeId (number).
Output: An object with disputeId, status, serviceId, and escalatedTo.
Models Used: Dispute, Booking, MerchantBranch, Customer.
Validation:
disputeId is required.
Dispute must exist, be of type mtables, and not be RESOLVED or CLOSED.
Gamification: No points awarded, as escalation is an administrative action.
Dependencies
Sequelize Models: Dispute (stores dispute details), Booking (links to bookings), Customer (links to users), MerchantBranch (links to restaurants), InDiningOrder (links to pre-orders).
Constants:
disputeConstants: Defines error codes, dispute statuses, resolution types, notification types, audit types, permissions, and gamification actions.
mtablesConstants: Provides error codes, gamification constants, and point expiry settings.
Utilities:
localizationService: Formats localized messages with formatMessage.
logger: Logs info and error events.
AppError: Handles errors with standardized codes and messages.
Gamification Integration
Points are awarded automatically within resolveBookingDisputes and resolvePreOrderDisputes using pointService.awardPoints.
Action and Points (from disputeConstants):
DISPUTE_RESOLVED: Awards points to the customer (e.g., 10 points) if configured in GAMIFICATION_ACTIONS.DISPUTE_RESOLVED.
Points expire after mtablesConstants.GAMIFICATION_CONSTANTS.POINT_EXPIRY_DAYS (e.g., 365 days).
No separate point-awarding endpoint exists; points are awarded dynamically upon dispute resolution.
No points are awarded for trackDisputeStatus or escalateDisputes, as these are non-rewardable actions.
Endpoints
1. PUT /admin/mtables/disputes/booking/:bookingId
Description: Resolves a dispute related to a booking, updating its status and recording the resolution.
Permission: MANAGE_DISPUTES
Parameters:
bookingId (path, required): Integer ID of the booking.
Request Body:
json

Collapse

Unwrap

Copy
{
  "type": "REFUNDED",
  "description": "Customer received full refund due to booking error."
}
type (required): Resolution type (e.g., REFUNDED, DISMISSED).
description (optional): Resolution details (max 500 characters).
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "disputeId": 456,
    "bookingId": 123,
    "status": "resolved",
    "resolution": "Customer received full refund due to booking error.",
    "resolutionType": "REFUNDED"
  },
  "message": "Booking dispute resolved successfully."
}
400: Invalid booking ID or resolution type (INVALID_ISSUE).
403: Permission denied (PERMISSION_DENIED).
404: Booking or dispute not found (BOOKING_NOT_FOUND, DISPUTE_NOT_FOUND).
Socket Event: /dispute:resolved (emits resolution details to the customer).
Notification: Sent to the customer with dispute.resolved message, including disputeId and resolutionType.
Audit: Logs action with DISPUTE_RESOLVED type, including disputeId, bookingId, and resolution.
Gamification: Awards points to the customer for DISPUTE_RESOLVED if configured.
Use Case: A customer disputes a double-booked table, and the merchant resolves it with a refund.
2. PUT /admin/mtables/disputes/pre-order/:bookingId
Description: Resolves a dispute related to a pre-order for a booking, ensuring the order exists.
Permission: MANAGE_DISPUTES
Parameters:
bookingId (path, required): Integer ID of the booking.
Request Body:
json

Collapse

Unwrap

Copy
{
  "type": "DISMISSED",
  "description": "Pre-order issue was due to customer error."
}
type (required): Resolution type (e.g., REFUNDED, DISMISSED).
description (optional): Resolution details (max 500 characters).
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "disputeId": 456,
    "bookingId": 123,
    "orderId": 789,
    "status": "resolved",
    "resolution": "Pre-order issue was due to customer error.",
    "resolutionType": "DISMISSED"
  },
  "message": "Pre-order dispute resolved successfully."
}
400: Invalid booking ID or resolution type (INVALID_ISSUE).
403: Permission denied (PERMISSION_DENIED).
404: Booking, pre-order, or dispute not found (BOOKING_NOT_FOUND, INVALID_SERVICE, DISPUTE_NOT_FOUND).
Socket Event: /dispute:pre_order_resolved (emits resolution details to the customer).
Notification: Sent to the customer with dispute.pre_order_resolved message, including disputeId and resolutionType.
Audit: Logs action with DISPUTE_RESOLVED type, including disputeId, bookingId, orderId, and resolution.
Gamification: Awards points to the customer for DISPUTE_RESOLVED if configured.
Use Case: A customer disputes a wrong pre-order item, and the merchant dismisses it after investigation.
3. GET /admin/mtables/disputes/status/:disputeId
Description: Retrieves the current status and details of a dispute for monitoring.
Permission: MANAGE_DISPUTES
Parameters:
disputeId (path, required): Integer ID of the dispute.
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "disputeId": 456,
    "serviceId": 123,
    "serviceType": "mtables",
    "status": "pending",
    "issueType": "booking_error",
    "resolution": null,
    "resolutionType": null
  },
  "message": "Dispute status retrieved successfully."
}
400: Invalid dispute ID (DISPUTE_NOT_FOUND).
403: Permission denied (PERMISSION_DENIED).
404: Dispute not found (DISPUTE_NOT_FOUND).
Socket Event: /dispute:status_updated (emits status details to the customer).
Notification: Sent to the customer with dispute.status_updated message, including disputeId and status.
Audit: Logs action with DISPUTE_UPDATED type, including disputeId and status.
Gamification: No points awarded (read-only operation).
Use Case: A merchant or customer checks the progress of a dispute.
4. PUT /admin/mtables/disputes/escalate/:disputeId
Description: Escalates a dispute to a higher authority (e.g., super_admin) by marking it as IN_REVIEW.
Permission: MANAGE_DISPUTES
Parameters:
disputeId (path, required): Integer ID of the dispute.
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "disputeId": 456,
    "status": "in_review",
    "serviceId": 123,
    "escalatedTo": "super_admin"
  },
  "message": "Dispute escalated successfully."
}
400: Invalid dispute ID or dispute already resolved (DISPUTE_NOT_FOUND, DISPUTE_ALREADY_RESOLVED).
403: Permission denied (PERMISSION_DENIED).
404: Dispute not found (DISPUTE_NOT_FOUND).
Socket Event: /dispute:escalated (emits escalation details to the customer).
Notification:
Sent to the customer with dispute.escalated message, including disputeId.
Sent to admins with dispute.escalated_admin message, including disputeId and serviceId.
Audit: Logs action with DISPUTE_UPDATED type, including disputeId and status.
Gamification: No points awarded (administrative action).
Use Case: A merchant escalates a complex dispute to platform admins for further review.
Complementary Files
Controller (disputeController.js)
Purpose: Handles HTTP requests, integrates notificationService, socketService, auditService, and pointService, and calls service methods.
Functions:
resolveBookingDisputes: Resolves booking disputes with notification, socket event, audit, and point awarding.
resolvePreOrderDisputes: Resolves pre-order disputes with notification, socket event, audit, and point awarding.
trackDisputeStatus: Retrieves dispute status with notification, socket event, and audit.
escalateDisputes: Escalates disputes with notifications (customer and admin), socket event, and audit.
Response Format: Standardized JSON with status, data, and message (localized).
Dependencies: Service, common services, constants, localization, logger.
Error Handling: Passes errors to the Express error handler via next.
Validator (disputeValidator.js)
Purpose: Validates request parameters and body using Joi.
Schemas:
resolveBookingDisputes: Validates bookingId and body (type, description).
resolvePreOrderDisputes: Same as above.
trackDisputeStatus: Validates disputeId.
escalateDisputes: Validates disputeId.
Error Messages: Localized using formatMessage.
Dependencies: Joi, constants, localization.
Middleware (disputeMiddleware.js)
Purpose: Validates requests and checks permissions.
Functions:
validateResolveBookingDisputes, validateResolvePreOrderDisputes, validateTrackDisputeStatus, validateEscalateDisputes: Validate using validator schemas.
checkManageDisputesPermission: Ensures MANAGE_DISPUTES permission.
Error Handling: Throws AppError with localized messages and error codes.
Dependencies: Joi, constants, localization, AppError.
Routes (disputeRoutes.js)
Purpose: Defines Express routes with Swagger documentation.
Endpoints:
PUT /booking/:bookingId
PUT /pre-order/:bookingId
GET /status/:disputeId
PUT /escalate/:disputeId
Middleware: Applies validation and permission checks.
Swagger: Detailed API specs with request/response schemas, error codes, and descriptions.
Dependencies: Express, controller, middleware, constants.
Events (disputeEvents.js)
Purpose: Defines socket event names with /dispute: namespace.
Events:
RESOLVED: /dispute:resolved
PRE_ORDER_RESOLVED: /dispute:pre_order_resolved
STATUS_UPDATED: /dispute:status_updated
ESCALATED: /dispute:escalated
Usage: Used by controller and handler for real-time updates.
Handler (disputeHandler.js)
Purpose: Processes socket events for real-time client updates.
Function: setupDisputeHandlers registers handlers for each event, logging and re-emitting data.
Dependencies: Events, logger.
Behavior: Ensures reliable event delivery with logging for debugging.
Localization (en.json)
Purpose: Provides English translations for all user-facing messages.
Sections:
error: Dispute, booking, configuration, and analytics errors (e.g., dispute_not_found, invalid_resolution_type).
success: Success messages for dispute, booking, configuration, and analytics operations.
analytics: Notification messages for analytics endpoints.
booking: Notification messages for booking operations.
configuration: Notification messages for configuration operations.
dispute: Notification messages for dispute operations (e.g., resolved, escalated).
Dynamic Values: Supports placeholders (e.g., {disputeId}, {resolutionType}).
Dependencies: Used by formatMessage in service, controller, validator, and middleware.
Constants Usage
disputeConstants:
ERROR_CODES: INVALID_ISSUE, DISPUTE_NOT_FOUND, INVALID_SERVICE, DISPUTE_ALREADY_RESOLVED, INVALID_INPUT, PERMISSION_DENIED.
DISPUTE_STATUSES: PENDING, IN_REVIEW, RESOLVED, CLOSED.
RESOLUTION_TYPES: e.g., REFUNDED, DISMISSED.
NOTIFICATION_TYPES: DISPUTE_RESOLVED, DISPUTE_UPDATED.
AUDIT_TYPES: DISPUTE_RESOLVED, DISPUTE_UPDATED.
PERMISSIONS: MANAGE_DISPUTES.
GAMIFICATION_ACTIONS: DISPUTE_RESOLVED (with action, points, and roles).
mtablesConstants:
ERROR_CODES: BOOKING_NOT_FOUND.
GAMIFICATION_CONSTANTS: POINT_EXPIRY_DAYS.
Security and Compliance
Authentication: Handled by middleware in the main route index (not included here), providing req.user with id and permissions.
Permissions: Requires MANAGE_DISPUTES for all endpoints, ensuring only authorized users can manage disputes.
Auditing: All actions are logged with auditService:
resolveBookingDisputes, resolvePreOrderDisputes: DISPUTE_RESOLVED with dispute and resolution details.
trackDisputeStatus, escalateDisputes: DISPUTE_UPDATED with status details.
Localization: All user-facing messages are localized using formatMessage with dynamic parameters.
Data Validation: Joi ensures valid inputs, preventing invalid operations or security issues like SQL injection.
Error Handling: Uses AppError with standardized error codes and localized messages.
Real-Time Updates
Socket Events:
/dispute:resolved: Notifies customers of booking dispute resolution.
/dispute:pre_order_resolved: Notifies customers of pre-order dispute resolution.
/dispute:status_updated: Updates customers on dispute status changes.
/dispute:escalated: Informs customers and admins of dispute escalation.
Notifications:
resolved: Sent to customers with dispute resolution details.
pre_order_resolved: Sent to customers for pre-order dispute resolution.
status_updated: Sent to customers for status updates.
escalated: Sent to customers and admins for escalation.
Reliability: Handlers log events for debugging and ensure delivery to connected clients.
Error Handling
AppError: Used for all errors with:
Localized message (via formatMessage).
HTTP status code (400, 403, 404).
Error code (from disputeConstants.ERROR_CODES or mtablesConstants.ERROR_CODES).
Optional details (e.g., validation errors).
Logging: Errors are logged with logger.logErrorEvent for traceability, including bookingId or disputeId.
Controller: Errors are passed to Express error handler for consistent API responses.
Integration Points
Models: Interacts with Dispute (core entity), Booking (links disputes to bookings), Customer (user details), MerchantBranch (restaurant details), InDiningOrder (pre-order details).
Services: Relies on pointService for gamification, injected via controller.
Notifications: Uses notificationService for customer and admin updates.
Sockets: Uses socketService for real-time event broadcasting.
Auditing: Uses auditService for compliance logging of dispute actions.
Localization: Integrates with localizationService for multilingual support.
Assumptions and Notes
Authentication: Assumed to be handled by main route index middleware, providing req.user with id and permissions.
Customer ID: Uses booking.customer.user_id or dispute.customer_id for notifications and sockets, with fallback to req.user.id.
InDiningOrder: Assumed to link to bookings via customer_id and table_id.
Gamification: Assumes DISPUTE_RESOLVED action is defined in disputeConstants.GAMIFICATION_ACTIONS with points and roles.
Point Expiry: Uses mtablesConstants.GAMIFICATION_CONSTANTS.POINT_EXPIRY_DAYS (e.g., 365 days) for consistency.
Constants: Relies on disputeConstants for dispute-specific settings and mtablesConstants for shared settings.
Super Admin: Assumes super_admin role for escalation notifications, broadcast to null user ID for admins.