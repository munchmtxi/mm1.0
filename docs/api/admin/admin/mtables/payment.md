Documentation File: payment.md
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\admin\mtables\payment.md

markdown

Collapse

Unwrap

Copy
# Payment Documentation

## Overview

The `PaymentService` for `mtables` (Admin) manages booking payments, split payments, and refunds within the mtables platform. The service integrates with Sequelize models and supports localization for user-facing messages. It ensures secure payment processing with wallet transactions, notifications, and audit logging. Complementary files include a controller, validator, middleware, routes, events, socket handlers, and an updated localization file. This documentation provides a comprehensive guide to the service, its endpoints, and all related components.

## File Structure

- **Service**: `src/services/admin/mtables/paymentService.js`
- **Controller**: `src/controllers/admin/mtables/paymentController.js`
- **Validator**: `src/validators/admin/mtables/paymentValidator.js`
- **Middleware**: `src/middleware/admin/mtables/paymentMiddleware.js`
- **Routes**: `src/routes/admin/mtables/paymentRoutes.js`
- **Events**: `socket/events/admin/mtables/paymentEvents.js`
- **Handler**: `socket/handlers/admin/mtables/paymentHandler.js`
- **Localization**: `locales/admin/mtables/en.json`

## Service Description

The `paymentService.js` file contains three core functions:

1. **processPayment**:
   - **Purpose**: Processes a payment for a booking using a wallet, creating payment and transaction records.
   - **Input**: `bookingId` (number), `amount` (number), `walletId` (number).
   - **Output**: An object with `bookingId`, `paymentId`, `amount`, and `status`.
   - **Models Used**: `Booking`, `InDiningOrder`, `MerchantBranch`, `Wallet`, `Payment`, `WalletTransaction`.
   - **Validation**:
     - `bookingId`, `amount`, and `walletId` are required.
     - Booking and wallet must exist.
     - Wallet must have sufficient funds.
     - Amount must be between `FINANCIAL_LIMITS.PAYMENT.MIN_AMOUNT` and `MAX_AMOUNT`.
   - **Gamification**: No points awarded, as per updated requirements.

2. **manageSplitPayments**:
   - **Purpose**: Facilitates group split payments for a booking, ensuring the total matches the order amount.
   - **Input**: `bookingId` (number), `payments` (array of objects with `customerId`, `amount`, `walletId`).
   - **Output**: An object with `bookingId`, `orderId`, and `payments` (array of payment details).
   - **Models Used**: `Booking`, `InDiningOrder`, `MerchantBranch`, `Wallet`, `Payment`, `WalletTransaction`.
   - **Validation**:
     - `bookingId` and `payments` array are required.
     - Booking and associated order must exist.
     - Total split amount must match `inDiningOrder.total_amount`.
     - Each wallet must exist and have sufficient funds.
   - **Gamification**: No points awarded.

3. **issueRefund**:
   - **Purpose**: Processes a refund for a booking payment, updating wallet balance and payment status.
   - **Input**: `bookingId` (number), `walletId` (number).
   - **Output**: An object with `bookingId`, `paymentId`, `refundAmount`, and `status`.
   - **Models Used**: `Booking`, `InDiningOrder`, `Customer`, `Wallet`, `Payment`, `WalletTransaction`.
   - **Validation**:
     - `bookingId` and `walletId` are required.
     - Booking, order, payment, and wallet must exist.
     - Payment must have `COMPLETED` status.
   - **Gamification**: No points awarded.

### Dependencies
- **Sequelize Models**: `Booking` (booking details), `InDiningOrder` (order details), `MerchantBranch` (restaurant details), `Wallet` (customer wallet), `Payment` (payment records), `WalletTransaction` (transaction records).
- **Constants**:
  - `paymentConstants`: Defines error codes, payment methods, transaction statuses, notification types, audit types, permissions, and financial limits.
  - `mtablesConstants`: Provides error codes for booking-related issues.
- **Utilities**:
  - `localizationService`: Formats localized messages with `formatMessage`.
  - `logger`: Logs info and error events.
  - `AppError`: Handles errors with standardized codes and messages.

### Gamification Integration
- Removed `trackPaymentGamification` function and `pointService` dependency, as per requirements.
- No gamification points are awarded in any functions, aligning with the updated service.

## Endpoints

### 1. POST /admin/mtables/payments/process
- **Description**: Processes a payment for a booking using a wallet.
- **Permission**: `MANAGE_PAYMENTS`
- **Request Body**:
  ```json
  {
    "bookingId": 123,
    "amount": 50.00,
    "walletId": 456
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
    "paymentId": 789,
    "amount": 50.00,
    "status": "completed"
  },
  "message": "Payment processed successfully."
}
400: Invalid payment details or insufficient funds (TRANSACTION_FAILED, INSUFFICIENT_FUNDS).
403: Permission denied (PERMISSION_DENIED).
404: Booking or wallet not found (BOOKING_NOT_FOUND, WALLET_NOT_FOUND).
Socket Event: /payment:completed (emits payment details to the customer).
Notification: Sent to the customer with payment.completed message, including bookingId and amount.
Audit: Logs action with PAYMENT_COMPLETED type, including bookingId, paymentId, and amount.
Use Case: A customer pays for a restaurant booking using their wallet.
2. POST /admin/mtables/payments/split
Description: Facilitates group split payments for a booking.
Permission: MANAGE_PAYMENTS
Request Body:
json

Collapse

Unwrap

Copy
{
  "bookingId": 123,
  "payments": [
    { "customerId": 1, "amount": 20.00, "walletId": 456 },
    { "customerId": 2, "amount": 30.00, "walletId": 457 }
  ]
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
      { "paymentId": 790, "amount": 20.00, "customerId": 1 },
      { "paymentId": 791, "amount": 30.00, "customerId": 2 }
    ]
  },
  "message": "Split payments processed successfully."
}
400: Invalid split payment details or amount mismatch (TRANSACTION_FAILED, INSUFFICIENT_FUNDS).
403: Permission denied (PERMISSION_DENIED).
404: Booking, order, or wallet not found (BOOKING_NOT_FOUND, WALLET_NOT_FOUND).
Socket Event: /payment:split_completed (emits payment details to each customer).
Notification: Sent to each customer with payment.split_completed message, including bookingId and amount.
Audit: Logs action with PAYMENT_COMPLETED type, including bookingId, orderId, and splitCount.
Use Case: A group splits a restaurant bill among multiple customers.
3. POST /admin/mtables/payments/refund
Description: Processes a refund for a booking payment.
Permission: MANAGE_PAYMENTS
Request Body:
json

Collapse

Unwrap

Copy
{
  "bookingId": 123,
  "walletId": 456
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
    "paymentId": 789,
    "refundAmount": 50.00,
    "status": "refunded"
  },
  "message": "Refund processed successfully."
}
400: Invalid refund details (TRANSACTION_FAILED).
403: Permission denied (PERMISSION_DENIED).
404: Booking, order, payment, or wallet not found (BOOKING_NOT_FOUND, WALLET_NOT_FOUND, TRANSACTION_FAILED).
Socket Event: /payment:refunded (emits refund details to the customer).
Notification: Sent to the customer with payment.refunded message, including bookingId and amount.
Audit: Logs action with PAYMENT_REFUNDED type, including bookingId, paymentId, and refundAmount.
Use Case: A customer receives a refund due to a canceled booking.
Complementary Files
Controller (paymentController.js)
Purpose: Handles HTTP requests, integrates notificationService, socketService, and auditService, and calls service methods.
Functions:
processPayment: Processes a payment with notification, socket event, and audit.
manageSplitPayments: Manages split payments with notifications, socket events, and audit.
issueRefund: Processes refunds with notification, socket event, and audit.
Response Format: Standardized JSON with status, data, and message (localized).
Dependencies: Service, common services, constants, localization, logger.
Error Handling: Passes errors to the Express error handler via next.
Validator (paymentValidator.js)
Purpose: Validates request body using Joi.
Schemas:
processPayment: Validates bookingId, amount, and walletId.
manageSplitPayments: Validates bookingId and payments array (customerId, amount, walletId).
issueRefund: Validates bookingId and walletId.
Error Messages: Localized using formatMessage.
Dependencies: Joi, constants, localization.
Middleware (paymentMiddleware.js)
Purpose: Validates requests and checks permissions.
Functions:
validateProcessPayment, validateManageSplitPayments, validateIssueRefund: Validate using validator schemas.
checkManagePaymentsPermission: Ensures MANAGE_PAYMENTS permission.
Error Handling: Throws AppError with localized messages and error codes.
Dependencies: Joi, constants, localization, AppError.
Routes (paymentRoutes.js)
Purpose: Defines Express routes with Swagger documentation.
Endpoints:
POST /process
POST /split
POST /refund
Middleware: Applies validation and permission checks.
Swagger: Detailed API specs with request/response schemas, error codes, and descriptions.
Dependencies: Express, controller, middleware, constants.
Events (paymentEvents.js)
Purpose: Defines socket event names with /payment: namespace.
Events:
PAYMENT_COMPLETED: /payment:completed
SPLIT_COMPLETED: /payment:split_completed
REFUNDED: /payment:refunded
Usage: Used by controller and handler for real-time updates.
Handler (paymentHandler.js)
Purpose: Processes socket events for real-time client updates.
Function: setupPaymentEvents registers handlers for each event, logging and re-emitting data.
Dependencies: Events, logger.
Behavior: Ensures reliable event delivery with logging for debugging.
Localization (en.json)
Purpose: Provides English translations for all user-facing messages.
Sections:
error: Payment, dispute, merchant, booking, configuration, and analytics errors.
success: Success messages for payment, dispute, merchant, booking, configuration, and analytics operations.
analytics, booking, configuration, dispute, merchant, payment: Notification messages for respective modules.
Dynamic Values: Supports placeholders (e.g., {bookingId}, {amount}, {min}, {max}).
Dependencies: Used by formatMessage in service, controller, validator, and middleware.
Constants Usage
paymentConstants:
ERROR_CODES: TRANSACTION_FAILED, WALLET_NOT_FOUND, INSUFFICIENT_FUNDS, INVALID_INPUT, PERMISSION_DENIED.
PAYMENT_METHODS: WALLET_TRANSFER.
TRANSACTION_STATUSES: COMPLETED, REFUNDED.
TRANSACTION_TYPES: PAYMENT, REFUND.
NOTIFICATION_TYPES: PAYMENT_CONFIRMATION.
AUDIT_TYPES: PAYMENT_COMPLETED, PAYMENT_REFUNDED.
PERMISSIONS: MANAGE_PAYMENTS.
FINANCIAL_LIMITS.PAYMENT: MIN_AMOUNT, MAX_AMOUNT.
mtablesConstants:
ERROR_CODES: BOOKING_NOT_FOUND.
Security and Compliance
Authentication: Handled by middleware in the main route index, providing req.user with id and permissions.
Permissions: Requires MANAGE_PAYMENTS for all endpoints.
Auditing: Logs actions with auditService:
processPayment: PAYMENT_COMPLETED with payment details.
manageSplitPayments: PAYMENT_COMPLETED with split payment details.
issueRefund: PAYMENT_REFUNDED with refund details.
Localization: All messages are localized using formatMessage.
Data Validation: Joi ensures valid inputs, preventing security issues.
Error Handling: Uses AppError with standardized error codes and messages.
Real-Time Updates
Socket Events:
/payment:completed: Notifies customers of payment completion.
/payment:split_completed: Notifies customers of split payment completion.
/payment:refunded: Notifies customers of refund processing.
Notifications:
payment.completed: Sent for payment completion.
payment.split_completed: Sent for each split payment.
payment.refunded: Sent for refund processing.
Reliability: Handlers log events for debugging and ensure delivery.
Error Handling
AppError: Used for all errors with:
Localized message (via formatMessage).
HTTP status code (400, 403, 404).
Error code (from paymentConstants.ERROR_CODES or mtablesConstants.ERROR_CODES).
Optional details (e.g., validation errors).
Logging: Errors are logged with logger.logErrorEvent for traceability.
Controller: Errors are passed to Express error handler.
Integration Points
Models: Interacts with Booking, InDiningOrder, MerchantBranch, Wallet, Payment, WalletTransaction.
Services: Uses notificationService, socketService, and auditService via controller.
Notifications: Sends updates to customers for payments and refunds.
Sockets: Broadcasts real-time events for immediate updates.
Auditing: Logs all actions for compliance.
Localization: Integrates with localizationService for multilingual support.
Assumptions and Notes
Authentication: Assumed to be handled by main route index middleware, providing req.user with id and permissions.
InDiningOrder: Assumed to be available in @models with total_amount and status fields.
Wallet: Assumes balance and currency fields, with user_id linking to the customer.
Payment: Assumes transaction_id is generated using Date.now() and walletId.
Constants: Relies on paymentConstants and mtablesConstants for settings.
Removed Gamification: No points awarded, and trackPaymentGamification is removed.