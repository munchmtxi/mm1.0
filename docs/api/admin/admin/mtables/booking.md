Documentation File: booking.md
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\admin\mtables\booking.md

Booking Service Documentation
Overview
The Booking Service for mtables (Admin) provides functionality to monitor real-time booking statuses, reassign tables for bookings, and finalize completed bookings for a restaurant (merchant branch). The service integrates with Sequelize models, automatically awards gamification points, and supports localization for user-facing messages. Complementary files include a controller, validator, middleware, routes, socket events, socket handlers, and an updated localization file. This documentation provides an in-depth overview of the service, its endpoints, and all related components.

File Structure
Service: src/services/admin/mtables/bookingService.js
Controller: src/controllers/admin/mtables/bookingController.js
Validator: src/validators/admin/mtables/bookingValidator.js
Middleware: src/middleware/admin/mtables/bookingMiddleware.js
Routes: src/routes/admin/mtables/bookingRoutes.js
Events: socket/events/admin/mtables/bookingEvents.js
Handler: socket/handlers/admin/mtables/bookingHandler.js
Localization: locales/admin/mtables/en.json
Service Description
The bookingService.js file contains three core functions:

monitorBookings:
Purpose: Tracks real-time booking statuses for a restaurant, focusing on active bookings (pending, confirmed, checked-in) and upcoming blackout dates.
Input: restaurantId (number) - ID of the merchant branch.
Output: A summary object with totalActiveBookings, byStatus (count per status), and upcomingBlackouts (array of blackout dates with reasons and time ranges).
Models Used: MerchantBranch, Booking, Customer, Table, BookingBlackoutDate.
Gamification: No points awarded, as this is a read-only operation.
manageTableAdjustments:
Purpose: Reassigns a table for a booking, updates table statuses, and logs the reassignment reason.
Input: bookingId (number), reassignment (object with tableId and optional reason), pointService (injected for point awarding).
Output: An object with bookingId, tableNumber, and status.
Models Used: Booking, MerchantBranch, Table.
Gamification: Awards points to the merchant for tableStatusUpdated action (TASK_COMPLETION points).
closeBookings:
Purpose: Finalizes a booking by marking it as completed, updating table status, closing associated in-dining orders, and awarding gamification points.
Input: bookingId (number), pointService (injected for point awarding).
Output: An object with bookingId, status, and completedAt.
Models Used: Booking, MerchantBranch, Table, Customer, User, InDiningOrder.
Gamification: Awards points to the customer for CHECK_IN action and to the merchant for checkInProcessed action.
Dependencies
Sequelize Models: Booking, BookingBlackoutDate, Customer, MerchantBranch, Table, User, InDiningOrder.
Constants: mtablesConstants (error codes, table statuses, notification types, audit types, permissions, gamification actions), adminServiceConstants (booking statuses).
Utilities: localizationService (for formatMessage), logger (for logging), AppError (for error handling).
Gamification Integration
Points are awarded automatically within manageTableAdjustments and closeBookings using pointService.awardPoints.
Actions and Points (from mtablesConstants):
tableStatusUpdated: TASK_COMPLETION (10 points, merchant).
CHECK_IN: 20 points (customer).
checkInProcessed: CHECK_IN_LOG (10 points, merchant).
Points expire after GAMIFICATION_CONSTANTS.POINT_EXPIRY_DAYS (365 days).
No separate point-awarding endpoint exists; points are awarded dynamically at appropriate times (e.g., table reassignment, booking completion).
Endpoints
1. GET /admin/mtables/bookings/monitor/:restaurantId
Description: Retrieves a real-time summary of active bookings and upcoming blackout dates for a specified restaurant.
Permission: TABLE_MONITOR
Parameters:
restaurantId (path, required): Integer ID of the merchant branch.
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "totalActiveBookings": 10,
    "byStatus": { "pending": 4, "confirmed": 5, "checked_in": 1 },
    "upcomingBlackouts": [
      { "date": "2025-06-25T00:00:00Z", "reason": "Private event", "timeRange": "All Day" }
    ]
  },
  "message": "Booking statuses monitored successfully."
}
400: Invalid restaurant ID (INVALID_BOOKING_DETAILS).
403: Permission denied (PERMISSION_DENIED).
404: Restaurant not found (BOOKING_NOT_FOUND).
Socket Event: /booking:status_updated (emits summary to clients).
Notification: None (read-only operation).
Audit: Logs action with BOOKING_UPDATED type, including restaurantId and summary.
Use Case: Restaurant managers monitor current and upcoming bookings to manage operations.
2. PUT /admin/mtables/bookings/adjust/:bookingId
Description: Reassigns a table for a booking, updates table statuses, and records the reassignment reason.
Permission: TABLE_ASSIGN
Parameters:
bookingId (path, required): Integer ID of the booking.
Request Body:
json

Collapse

Unwrap

Copy
{
  "tableId": 5,
  "reason": "Customer preference for window seat"
}
tableId (required): Integer ID of the new table.
reason (optional): String explaining the reassignment (max 255 characters).
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "bookingId": 123,
    "tableNumber": "T5",
    "status": "confirmed"
  },
  "message": "Table reassigned successfully."
}
400: Invalid booking ID, table ID, or table not available (INVALID_BOOKING_DETAILS, TABLE_NOT_AVAILABLE).
403: Permission denied (PERMISSION_DENIED).
404: Booking not found (BOOKING_NOT_FOUND).
Socket Event: /booking:table_reassigned (emits new table details to the customer).
Notification: Sent to the customer with booking.table_reassigned message, including tableNumber and reason.
Audit: Logs action with TABLE_ASSIGNED type, including bookingId, newTableId, and reason.
Gamification: Awards 10 points to the merchant for tableStatusUpdated.
Use Case: Staff reassign tables due to customer requests or operational needs.
3. PUT /admin/mtables/bookings/close/:bookingId
Description: Finalizes a booking by marking it as completed, freeing the table, closing in-dining orders, and awarding points.
Permission: TABLE_ASSIGN
Parameters:
bookingId (path, required): Integer ID of the booking.
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "bookingId": 123,
    "status": "completed",
    "completedAt": "2025-06-22T12:00:00Z"
  },
  "message": "Booking finalized successfully."
}
400: Invalid booking ID or booking already completed (INVALID_BOOKING_DETAILS, BOOKING_UPDATE_FAILED).
403: Permission denied (PERMISSION_DENIED).
404: Booking not found (BOOKING_NOT_FOUND).
Socket Event: /booking:completed (emits completion details to the customer).
Notification: Sent to the customer with booking.completed message, including bookingId and date.
Audit: Logs action with BOOKING_UPDATED type, including bookingId and status.
Gamification: Awards 20 points to the customer for CHECK_IN and 10 points to the merchant for checkInProcessed.
Use Case: Staff finalize bookings after customers leave the restaurant.
Complementary Files
Controller (bookingController.js)
Purpose: Handles HTTP requests, integrates notificationService, socketService, auditService, and pointService, and calls service methods.
Functions:
monitorBookings: Returns booking summary with audit and socket event.
manageTableAdjustments: Processes table reassignment with notification, socket event, audit, and point awarding.
closeBookings: Finalizes bookings with notification, socket event, audit, and point awarding.
Response Format: Standardized JSON with status, data, and message (localized).
Dependencies: Service, common services, constants, localization, logger.
Error Handling: Passes errors to the Express error handler via next.
Validator (bookingValidator.js)
Purpose: Validates request parameters and body using Joi.
Schemas:
monitorBookings: Validates restaurantId (positive integer).
manageTableAdjustments: Validates bookingId (positive integer) and body (tableId required, reason optional).
closeBookings: Validates bookingId (positive integer).
Error Messages: Localized using formatMessage.
Dependencies: Joi, constants, localization.
Middleware (bookingMiddleware.js)
Purpose: Validates requests and checks permissions.
Functions:
validateMonitorBookings, validateManageTableAdjustments, validateCloseBookings: Validate using validator schemas.
checkTableMonitorPermission: Ensures TABLE_MONITOR permission for monitoring.
checkTableAssignPermission: Ensures TABLE_ASSIGN permission for adjustments and closing.
Error Handling: Throws AppError with localized messages and error codes.
Dependencies: Joi, constants, localization, AppError.
Routes (bookingRoutes.js)
Purpose: Defines Express routes with Swagger documentation.
Endpoints:
GET /monitor/:restaurantId
PUT /adjust/:bookingId
PUT /close/:bookingId
Middleware: Applies validation and permission checks.
Swagger: Detailed API specs with request/response schemas, error codes, and descriptions.
Dependencies: Express, controller, middleware, constants.
Events (bookingEvents.js)
Purpose: Defines socket event names with /booking: namespace.
Events:
STATUS_UPDATED: /booking:status_updated
TABLE_REASSIGNED: /booking:table_reassigned
COMPLETED: /booking:completed
Usage: Used by controller and handler for real-time updates.
Handler (bookingHandler.js)
Purpose: Processes socket events for real-time client updates.
Function: setupBookingHandlers registers handlers for each event, logging and re-emitting data.
Dependencies: Events, logger.
Behavior: Ensures reliable event delivery with logging for debugging.
Localization (en.json)
Purpose: Provides English translations for all user-facing messages.
Sections:
error: Booking and analytics errors (e.g., booking_not_found, table_not_available).
success: Success messages for booking and analytics operations.
analytics: Notification messages for analytics endpoints.
booking: Notification messages for booking operations (e.g., table_reassigned, completed).
Dynamic Values: Supports placeholders (e.g., {bookingId}, {tableNumber}).
Dependencies: Used by formatMessage in service, controller, validator, and middleware.
Constants Usage
mtablesConstants:
ERROR_CODES: INVALID_BOOKING_DETAILS, BOOKING_NOT_FOUND, TABLE_NOT_AVAILABLE, BOOKING_UPDATE_FAILED.
TABLE_STATUSES: AVAILABLE, RESERVED.
NOTIFICATION_TYPES: TABLE_ASSIGNED, BOOKING_UPDATED.
AUDIT_TYPES: BOOKING_UPDATED, TABLE_ASSIGNED.
PERMISSIONS: TABLE_MONITOR, TABLE_ASSIGN.
GAMIFICATION_CONSTANTS: Defines CHECK_IN, CHECK_IN_LOG, TASK_COMPLETION actions and points.
POINT_AWARD_ACTIONS: tableStatusUpdated, checkInProcessed.
adminServiceConstants:
MTABLES_CONSTANTS.BOOKING_STATUSES: PENDING, CONFIRMED, CHECKED_IN, COMPLETED.
Security and Compliance
Authentication: Handled by middleware in the main route index (not included here).
Permissions:
TABLE_MONITOR for monitoring bookings.
TABLE_ASSIGN for table adjustments and closing bookings.
Auditing: All actions are logged with auditService:
monitorBookings: BOOKING_UPDATED with summary.
manageTableAdjustments: TABLE_ASSIGNED with table details.
closeBookings: BOOKING_UPDATED with completion status.
Localization: All user-facing messages are localized using formatMessage.
Data Validation: Joi ensures valid inputs, preventing SQL injection and invalid operations.
Error Handling: Uses AppError with standardized error codes and localized messages.
Real-Time Updates
Socket Events:
/booking:status_updated: Broadcasts booking summary to merchants.
/booking:table_reassigned: Notifies customers of table changes.
/booking:completed: Informs customers of booking completion.
Notifications:
table_reassigned: Sent to customers with table number and reason.
completed: Sent to customers with booking ID and date.
Reliability: Handlers log events for debugging and ensure delivery.
Error Handling
AppError: Used for all errors with:
Localized message (via formatMessage).
HTTP status code (400, 403, 404).
Error code (from mtablesConstants.ERROR_CODES).
Logging: Errors are logged with logger.logErrorEvent for traceability.
Controller: Errors are passed to Express error handler for consistent responses.
Integration Points
Models: Interacts with Booking, MerchantBranch, Table, Customer, User, BookingBlackoutDate, InDiningOrder for data operations.
Services: Relies on pointService for gamification, injected via controller.
Notifications: Uses notificationService for customer updates.
Sockets: Uses socketService for real-time events.
Auditing: Uses auditService for compliance logging.
Localization: Integrates with localizationService for multilingual support.
Assumptions and Notes
Authentication: Assumed to be handled by main route index middleware, providing req.user with id and permissions.
getBookingDetails: Referenced in controller for notification data; assumed to exist in bookingService or another module.
InDiningOrder: Assumed to be a valid model as per original service.
Point Expiry: Uses GAMIFICATION_CONSTANTS.POINT_EXPIRY_DAYS (365 days) for point expiration.
Constants: Relies heavily on mtablesConstants and adminServiceConstants for consistency.
Future Enhancements