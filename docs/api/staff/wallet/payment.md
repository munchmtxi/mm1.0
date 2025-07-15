Documentation File
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\staff\wallet\payment.md

markdown

Collapse

Unwrap

Copy
# Payment Service Documentation

This document outlines the Payment Service for staff wallet operations, responsible for processing salary and bonus payments, confirming withdrawals, logging audits, and handling payment errors.

## Overview

The Payment Service manages financial transactions for staff within restaurant branches, ensuring secure payment processing and error resolution. It uses models (`Payment`, `Wallet`, `WalletTransaction`, `AuditLog`, `SupportTicket`, `Staff`) and constants from `staffConstants.js` and `paymentConstants.js`.

### Key Features
- **Salary Payments**: Processes salary payments to staff wallets.
- **Bonus Payments**: Disburses bonus payments to staff wallets.
- **Withdrawal Confirmations**: Confirms and processes approved withdrawals.
- **Audit Logging**: Retrieves audit logs for payment-related actions.
- **Error Handling**: Creates support tickets for payment issues.
- **Security**: Enforces MFA and logs transactions.

### File Structure
- **Service**: `src/services/staff/wallet/paymentService.js`
- **Controller**: `src/controllers/staff/wallet/paymentController.js`
- **Validator**: `src/validators/staff/wallet/paymentValidator.js`
- **Middleware**: `src/middleware/staff/wallet/staffMiddleware.js`
- **Routes**: `src/routes/staff/wallet/paymentRoutes.js`
- **Events**: `socket/events/staff/wallet/payment.events.js`
- **Handler**: `socket/handlers/staff/wallet/paymentHandler.js`
- **Localization**: `locales/staff/wallet/en.json`

## Endpoints

### 1. Process Salary Payment
- **Method**: `POST`
- **Path**: `/staff/payment/salary`
- **Description**: Processes a salary payment to a staff member's wallet.
- **Permission**: Requires `manage_payments` permission (manager role).
- **Request Body**:
  ```json
  {
    "staffId": 1,
    "amount": 1000.00
  }
Responses:
201: Salary payment processed, returns payment record.
400: Invalid input.
403: Permission denied.
404: Wallet not found.
500: Server error.
Side Effects:
Verifies MFA using securityService.
Updates wallet balance and creates transaction record.
Logs audit action (STAFF_PROFILE_UPDATE).
Sends notification (PAYMENT_CONFIRMATION).
Emits socket event (payment:salary_processed).
2. Process Bonus Payment
Method: POST
Path: /staff/payment/bonus
Description: Processes a bonus payment to a staff member's wallet.
Permission: Requires manage_payments permission (manager role).
Request Body:
json

Collapse

Unwrap

Copy
{
  "staffId": 1,
  "amount": 200.00
}
Responses:
201: Bonus payment processed, returns payment record.
400: Invalid input.
403: Permission denied.
404: Wallet not found.
500: Server error.
Side Effects:
Verifies MFA.
Updates wallet balance and creates transaction record.
Logs audit action (STAFF_PROFILE_UPDATE).
Sends notification (PAYMENT_CONFIRMATION).
Emits socket event (payment:bonus_processed).
3. Confirm Withdrawal
Method: POST
Path: /staff/payment/withdrawal
Description: Confirms and processes a withdrawal from a staff member's wallet.
Permission: Requires manage_payments permission (manager role).
Request Body:
json

Collapse

Unwrap

Copy
{
  "staffId": 1,
  "amount": 50.00
}
Responses:
201: Withdrawal confirmed, returns payout record.
400: Insufficient balance or invalid amount.
403: Permission denied.
404: Wallet not found.
500: Server error.
Side Effects:
Verifies MFA.
Updates wallet balance and creates transaction record.
Logs audit action (STAFF_PROFILE_UPDATE).
Sends notification (WITHDRAWAL_PROCESSED).
Emits socket event (payment:withdrawal_confirmed).
4. Log Payment Audit
Method: GET
Path: /staff/payment/audit/:staffId
Description: Retrieves audit logs for a staff member's payment transactions.
Permission: Requires manage_payments permission (manager role).
Parameters:
staffId (path): Integer, ID of the staff.
Responses:
200: Logs retrieved, returns audit records.
404: Staff not found.
500: Server error.
Side Effects:
Emits socket event (payment:audit_logged).
5. Handle Payment Errors
Method: POST
Path: /staff/payment/error
Description: Reports a payment error by creating a support ticket.
Permission: Requires manage_payments permission (manager role).
Request Body:
json

Collapse

Unwrap

Copy
{
  "staffId": 1,
  "errorDetails": {
    "description": "Salary payment not credited"
  }
}
Responses:
201: Error reported, returns support ticket data.
400: Invalid input.
403: Permission denied.
404: Staff not found.
500: Server error.
Side Effects:
Logs audit action (STAFF_PROFILE_UPDATE).
Sends notification (PAYMENT_CONFIRMATION).
Emits socket event (payment:error_reported).
Service Details
Models
Payment: Stores payment details (staff_id, amount, payment_method, status, merchant_id, currency).
Wallet: Stores wallet details (id, balance, currency, user_id).
WalletTransaction: Stores transaction records (wallet_id, type, amount, currency, status).
AuditLog: Stores audit records (user_id, action, details, created_at).
SupportTicket: Stores ticket details (user_id, service_type, issue_type, description, status, priority, ticket_number).
Staff: Stores staff details (id, user_id, merchant_id, position).
Constants
Uses staffConstants.js for:
STAFF_ERROR_CODES: Error codes like STAFF_NOT_FOUND, INSUFFICIENT_BALANCE.
STAFF_AUDIT_ACTIONS: Audit actions like STAFF_PROFILE_UPDATE.
STAFF_TYPES: Staff roles for notification and audit roles.
Uses paymentConstants.js for:
PAYMENT_METHODS: Valid methods (e.g., bank_transfer).
TRANSACTION_TYPES: Transaction types (e.g., salary, bonus, withdrawal).
TRANSACTION_STATUSES: Statuses (e.g., completed).
FINANCIAL_LIMITS: Limits for payment and withdrawal amounts.
NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES: Notification types (e.g., PAYMENT_CONFIRMATION, WITHDRAWAL_PROCESSED).
NOTIFICATION_CONSTANTS.PRIORITY_LEVELS: Priority levels (e.g., HIGH).
ERROR_CODES: Error codes like TRANSACTION_FAILED, INSUFFICIENT_FUNDS.
Localization
Uses @utils/localization for messages in locales/staff/wallet/en.json:
payment.salary_processed: "Salary payment of {amount} processed successfully."
payment.bonus_processed: "Bonus payment of {amount} processed successfully."
payment.withdrawal_confirmed: "Withdrawal of {amount} confirmed successfully."
payment.error_reported: "Payment error reported with ticket ID {ticketId}."
Integration
Socket Events: Emits events in the /munch/payment namespace.
Notifications: Sends notifications (PAYMENT_CONFIRMATION, WITHDRAWAL_PROCESSED) via notificationService.
Audit: Logs actions using auditService.
Security: Verifies MFA using securityService.
Permissions: Enforces manage_payments permission for managers.
Error Handling
Uses AppError with standardized error codes from staffConstants.STAFF_ERROR_CODES and paymentConstants.ERROR_CODES.
Logs errors via logger.
Security
Authentication handled by external middleware.
MFA verification for salary, bonus, and withdrawal operations.
Permission checks ensure manager-only access.
Dependencies
Models: @models (Payment, Wallet, WalletTransaction, AuditLog, SupportTicket, Staff)
Constants: @constants/staff/staffConstants, @constants/common/paymentConstants
Utilities: @utils/localization, @utils/errors, @utils/logger
Services: @services/common/socketService, @services/common/notificationService, @services/common/auditService, @services/common/securityService