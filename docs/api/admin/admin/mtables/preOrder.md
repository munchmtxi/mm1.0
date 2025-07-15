Documentation File: preOrder.md
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\admin\mtables\preOrder.md

markdown

Collapse

Unwrap

Copy
# Pre-Order Documentation

## Overview

The `PreOrderService` for `mtables` (Admin) manages pre-order monitoring, friend invitations, and party payments within the mtables platform. The service integrates with Sequelize models, the `paymentService` for payment processing, and supports localization for user-facing messages. It ensures efficient coordination of pre-orders, group invitations, and split payments. Complementary files include a controller, validator, middleware, routes, events, socket handlers, and an updated localization file. This documentation provides a comprehensive guide to the service, its endpoints, and all related components.

## File Structure

- **Service**: `src/services/admin/mtables/preOrderService.js`
- **Controller**: `src/controllers/admin/mtables/preOrderController.js`
- **Validator**: `src/validators/admin/mtables/preOrderValidator.js`
- **Middleware**: `src/middleware/admin/mtables/preOrderMiddleware.js`
- **Routes**: `src/routes/admin/mtables/preOrderRoutes.js`
- **Events**: `socket/events/admin/mtables/preOrderEvents.js`
- **Handler**: `socket/handlers/admin/mtables/preOrderHandler.js`
- **Localization**: `locales/admin/mtables/en.json`

## Service Description

The `preOrderService.js` file contains three core functions:

1. **monitorPreOrders**:
   - **Purpose**: Retrieves and monitors pre-order details for a booking.
   - **Input**: `bookingId` (number).
   - **Output**: An object with `bookingId`, `orderId`, `customerId`, `items`, `totalAmount`, `status`, and `dietaryFilters`.
   - **Models Used**: `Booking`, `Customer`, `InDiningOrder`, `MerchantBranch`.
   - **Validation**:
     - `bookingId` is required.
     - Booking and pre-order (`InDiningOrder`) must exist.
   - **Gamification**: No points awarded, as per updated requirements.

2. **manageFriendInvitations**:
   - **Purpose**: Sends invitations to friends for a booking, updating booking metadata.
   - **Input**: `bookingId` (number), `invitation` (object with `friendIds` array and optional `message` string).
   - **Output**: An object with `bookingId`, `invitedFriends`, and `status`.
   - **Models Used**: `Booking`, `Customer`, `MerchantBranch`.
   - **Validation**:
     - `bookingId` and `friendIds` are required.
     - Booking must exist.
     - Group size must not exceed `PRE_ORDER_SETTINGS.MAX_GROUP_SIZE - 1`.
     - All `friendIds` must correspond to existing customers.
   - **Gamification**: No points awarded.

3. **processPartyPayments**:
   - **Purpose**: Processes group payments for a booking's pre-order by integrating with `paymentService`.
   - **Input**: `bookingId` (number), `paymentDetails` (object with `splits` array containing `customerId`, `amount`, `walletId`).
   - **Output**: An object with `bookingId`, `orderId`, and `payments` (array of payment details).
   - **Models Used**: `Booking`, `InDiningOrder`, `Customer`, `MerchantBranch`.
   - **Dependencies**: `paymentService.manageSplitPayments`.
   - **Validation**:
     - `bookingId` and `splits` are required.
     - Booking and `InDiningOrder` must exist.
     - Total split amount must match `inDiningOrder.total_amount`.
     - All `customerId`s must correspond to existing customers.
   - **Gamification**: No points awarded.

### Dependencies
- **Sequelize Models**: `Booking` (booking details), `Customer` (customer information), `InDiningOrder` (pre-order details), `MerchantBranch` (restaurant details).
- **Services**: `paymentService` (for payment processing in `processPartyPayments`).
- **Constants**:
  - `mtablesConstants`: Defines error codes, notification types, audit types, permissions, and pre-order settings (`MAX_GROUP_SIZE`).
  - `paymentConstants`: Defines notification and audit types for payment-related actions.
- **Utilities**:
  - `localizationService`: Formats localized messages with `formatMessage`.
  - `logger`: Logs info and error events.
  - `AppError`: Handles errors with standardized codes and messages.

### Gamification Removal
- Removed `awardGamificationPoints` function and `pointService` dependency, as per requirements.
- No gamification points are awarded in any functions, aligning with the updated service and previous `paymentService.js`.

## Endpoints

### 1. POST /admin/mtables/preorders/monitor
- **Description**: Retrieves and monitors pre-order details for a booking.
- **Permission**: `MANAGE_PRE_ORDERS`
- **Request Body**:
  ```json
  { "bookingId": 123 }
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
    "orderId": 789,
    "customerId": 1,
    "items": [],
    "totalAmount": 50.00,
    "status": "pending",
    "dietaryFilters": ["vegan"]
  },
  "message": "Pre-order details retrieved successfully."
}
400: Invalid booking ID (INVALID_BOOKING_DETAILS).
403: Permission denied (PERMISSION_DENIED).
404: Booking or pre-order not found (BOOKING_NOT_FOUND).
Socket Event: /preorder:status_updated (emits pre-order details to the customer).
Notification: Sent to the customer with preorder.status_updated message, including bookingId and status.
Audit: Logged with ORDER_STATUS_UPDATED action, including bookingId and orderId.
Use Case: An admin monitors a booking to track pre-order status.
2. POST /admin/mtables/preorders/invitations
Description: Sends invitations to friends for a booking.
Permission: MANAGE_PRE_ORDERS
Request Body:
json

Collapse

Unwrap

Copy
{
  "bookingId": 123,
  "invitation": {
    "friendIds": [2, 3],
    "message": "Join us for dinner!"
  }
}
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
    "invitedFriends": [2, 3],
    "status": "sent"
  },
  "message": "Friend invitations sent successfully."
}
400: Invalid booking ID, friend IDs, or group size exceeded (INVALID_BOOKING_DETAILS, INVALID_CUSTOMER_ID, INVALID_PARTY_SIZE).
403: Permission denied (PERMISSION_DENIED).
404: Booking not found (BOOKING_NOT_FOUND).
Socket Event: /preorder:friend_invited (emits invitation details to each friend).
Notification: Sent to each friend with preorder.friend_invitation message, including bookingId and message.
Audit: Logged with BOOKING_UPDATED action, including bookingId and invitedFriends.
Use Case: A customer invites friends to join a reservation.
3. POST /admin/mtables/preorders/payments
Description: Processes group payments for a booking's pre-order.
Permission: MANAGE_PRE_ORDERS
Request Body:
json

Collapse

Unwrap

Copy
{
  "bookingId": 123,
  "paymentDetails": {
    "splits": [
      { "customerId": 1, "amount": 20.00, "walletId": 456 },
      { "customerId": 2, "amount": 30.00, "walletId": 457 }
    ]
  }
}
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
    "orderId": 789,
    "payments": [
      { "paymentId": 101, "amount": 20.00, "customerId": "1" },
      { "paymentId": 102, "amount": 30.00, "customerId": "2" }
    ]
  },
  "message": "Party payments processed successfully."
}
400: Invalid payment details or amount mismatch (INVALID_BOOKING_DETAILS, PAYMENT_FAILED, INVALID_CUSTOMER_ID).
403: Permission denied (PERMISSION_DENIED).
404: Booking, order, or customer not found (BOOKING_NOT_FOUND).
Socket Event: /preorder:payment_processed (emits payment details to each customer).
Notification: Sent to each customer with preorder.payment_processed message, including amount and bookingId.
Audit: Logged with PAYMENT_COMPLETED action, including bookingId, orderId, and splitCount.
Use Case: A group splits payment for a pre-order.
Complementary Files
Controller (preOrderController.js)
Purpose: Handles HTTP requests, integrates notificationService, socketService, and auditService, and calls service methods.
Functions:
monitorPreOrders: Retrieves pre-order details with notification, socket event, and audit.
manageFriendInvitations: Sends friend invitations with notifications, socket events, and audit.
processPartyPayments: Processes party payments with notifications, socket events, and audit.
Response Format: Standardized JSON with status, data, and message (localized).
Dependencies: Service, common services, constants, localization, logger.
Error Handling: Passes errors to the Express error handler via next.
Validator (preOrderValidator.js)
Purpose: Validates request body using Joi.
Schemas:
monitorPreOrders: Validates bookingId.
manageFriendInvitations: Validates bookingId and invitation (friendIds, optional message).
processPartyPayments: Validates bookingId and paymentDetails (splits with customerId, amount, walletId).
Error Messages: Localized using formatMessage.
Dependencies: Joi, constants, localization.
Middleware (preOrderMiddleware.js)
Purpose: Validates requests and checks permissions.
Functions:
validateMonitorPreOrders, validateManageFriendInvitations, validateProcessPartyPayments: Validate using validator schemas.
checkManagePreOrdersPermission: Ensures MANAGE_PRE_ORDERS permission.
Error Handling: Throws AppError with localized messages and error codes.
Dependencies: Joi, constants, localization, AppError.
Routes (preOrderRoutes.js)
Purpose: Defines Express routes with Swagger documentation.
Endpoints:
POST /monitor
POST /invitations
POST /payments
Middleware: Applies validation and permission checks.
Swagger: Detailed API specs with request/response schemas, error codes, and descriptions.
Dependencies: Express, controller, middleware, constants.
Events (preOrderEvents.js)
Purpose: Defines socket event names with /preorder: namespace.
Events:
STATUS_UPDATED: /preorder:status_updated
FRIEND_INVITED: /preorder:friend_invited
PAYMENT_PROCESSED: /preorder:payment_processed
Usage: Used by controller and handler for real-time updates.
Handler (preOrderHandler.js)
Purpose: Processes socket events for real-time client updates.
Function: setupPreOrderEvents registers handlers for each event, logging and re-emitting data.
Dependencies: Events, logger.
Behavior: Ensures reliable event delivery with logging for debugging.
Localization (en.json)
Purpose: Provides English translations for all user-facing messages.
Sections:
error: Pre-order, payment, dispute, merchant, booking, configuration, and analytics errors.
success: Success messages for pre-order, payment, dispute, merchant, booking, configuration, and analytics operations.
analytics, booking, configuration, dispute, merchant, payment, preorder: Notification messages for respective modules.
Dynamic Values: Supports placeholders (e.g., {bookingId}, {limit}, {amount}, {message}).
Dependencies: Used by formatMessage in service, controller, validator, and middleware.
Constants Usage
mtablesConstants:
ERROR_CODES: INVALID_BOOKING_DETAILS, BOOKING_NOT_FOUND, INVALID_CUSTOMER_ID, INVALID_PARTY_SIZE, PAYMENT_FAILED, INVALID_INPUT, PERMISSION_DENIED.
NOTIFICATION_TYPES: ORDER_STATUS, BOOKING_INVITATION.
AUDIT_TYPES: ORDER_STATUS_UPDATED, BOOKING_UPDATED.
PERMISSIONS: MANAGE_PRE_ORDERS.
PRE_ORDER_SETTINGS: MAX_GROUP_SIZE.
paymentConstants:
NOTIFICATION_TYPES: PAYMENT_CONFIRMATION.
AUDIT_TYPES: PAYMENT_COMPLETED.
Security and Compliance
Authentication: Handled by middleware in the main route index, providing req.user with id and permissions.
Permissions: Requires MANAGE_PRE_ORDERS for all endpoints.
Auditing: Logs actions with auditService:
monitorPreOrders: ORDER_STATUS_UPDATED with pre-order details.
manageFriendInvitations: BOOKING_UPDATED with invitation details.
processPartyPayments: PAYMENT_COMPLETED with payment details.
Localization: All messages are localized using formatMessage.
Data Validation: Joi ensures valid inputs, preventing security issues.
Error Handling: Uses AppError with standardized error codes and messages.
Real-Time Updates
Socket Events:
/preorder:status_updated: Notifies customers of pre-order status changes.
/preorder:friend_invited: Notifies friends of booking invitations.
/preorder:payment_processed: Notifies customers of payment completion.
Notifications:
preorder.status_updated: Sent for pre-order status updates.
preorder.friend_invitation: Sent for friend invitations.
preorder.payment_processed: Sent for party payment completion.
Reliability: Handlers log events for debugging and ensure delivery.
Error Handling
AppError: Used for all errors with:
Localized message (via formatMessage).
HTTP status code (400, 403, 404).
Error code (from mtablesConstants.ERROR_CODES or paymentConstants.ERROR_CODES).
Optional details (e.g., validation errors).
Logging: Errors are logged with logger.logErrorEvent for traceability.
Controller: Errors are passed to Express error handler.
Integration Points
Models: Interacts with Booking, Customer, InDiningOrder, MerchantBranch.
Services: Uses paymentService for payment processing and notificationService, socketService, auditService via controller.
Notifications: Sends updates to customers and friends for pre-orders, invitations, and payments.
Sockets: Broadcasts real-time events for immediate updates.
Auditing: Logs all actions for compliance.
Localization: Integrates with localizationService for multilingual support.
Assumptions and Notes
Authentication: Assumed to be handled by main route index middleware, providing req.user with id and permissions.
InDiningOrder: Assumed to be available in @models with items, total_amount, status, and dietary_filters fields.
PaymentService: Assumed to handle payment processing with manageSplitPayments.
Constants: Relies on mtablesConstants and paymentConstants for settings.
Removed Gamification: No points awarded, and awardGamificationPoints is removed.
PaymentConstants: Corrected import to @constants/paymentConstants.
Future Enhancements