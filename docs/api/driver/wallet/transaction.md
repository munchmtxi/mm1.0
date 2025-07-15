Documentation File
File Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\driver\wallet\transaction.md

markdown

Collapse

Unwrap

Copy
# Driver Transaction API Documentation

## Overview
The Driver Transaction API manages driver wallet transaction operations, including recording transactions, retrieving history, reversing transactions, and exporting data. It integrates with the wallet service for balance updates and aligns with the platform's localization and constants, supporting multiple languages as defined in the driver constants.

## Service File
**Path**: `src/services/driver/wallet/transactionService.js`

The service handles core transaction management logic:
- **recordTransaction**: Records a wallet transaction, awards points for `transaction_${type}_recorded`.
- **getTransactionHistory**: Retrieves transaction history for a specified period, awards points for `transaction_history_view`.
- **reverseTransaction**: Reverses a transaction, awards points for `transaction_reversed`.
- **exportTransactionData**: Exports transaction data in CSV or JSON format, awards points for `transaction_export`.

The service uses `Wallet`, `WalletTransaction`, `Driver`, and `sequelize` models, with constants from `driverConstants` and `paymentConstants`. Common services (`socketService`, `notificationService`, `auditService`, `pointService`) are injected from the controller.

## Controller File
**Path**: `src/controllers/driver/wallet/transactionController.js`

Handles HTTP requests and responses:
- **recordTransaction**: Processes POST requests to record transactions.
- **getTransactionHistory**: Handles GET requests to retrieve transaction history.
- **reverseTransaction**: Manages POST requests to reverse transactions.
- **exportTransactionData**: Processes GET requests to export transaction data.

Injects common services and passes them to the service layer.

## Validation File
**Path**: `src/validators/driver/wallet/transactionValidator.js`

Uses Joi to validate:
- **recordTransaction**: Ensures `taskId` is a positive integer, `amount` is positive, `type` is in `driverConstants.WALLET_CONSTANTS.TRANSACTION_TYPES`.
- **getTransactionHistory**: Validates `period` against `paymentConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS`.
- **reverseTransaction**: Ensures `transactionId` is a positive integer.
- **exportTransactionData**: Validates `format` as 'csv' or 'json'.

## Middleware File
**Path**: `src/middleware/driver/wallet/transactionMiddleware.js`

- **checkDriverExists**: Verifies the driver exists before allowing transaction operations.

## Route File
**Path**: `src/routes/driver/wallet/transactionRoutes.js`

Defines Express routes with Swagger documentation:
- **POST /driver/wallet/transaction/record**: Records a transaction.
- **GET /driver/wallet/transaction/history**: Retrieves transaction history.
- **POST /driver/wallet/transaction/reverse**: Reverses a transaction.
- **GET /driver/wallet/transaction/export**: Exports transaction data.

Authentication is handled at the main route index.

## Events File
**Path**: `src/socket/events/driver/wallet/transactionEvents.js`

Defines namespaced socket events:
- `./transaction:recorded`
- `./transaction:history_viewed`
- `./transaction:reversed`
- `./transaction:exported`

## Handler File
**Path**: `src/socket/handlers/driver/wallet/transactionHandler.js`

Initializes socket event listeners to handle and broadcast transaction-related events.

## Localization File
**Path**: `src/locales/driver/wallet/en.json`

Contains English translations for driver-facing messages:
- `balance.earning_added`: "Earning of {{amount}} {{currency}} added to your wallet"
- `balance.tip_added`: "Tip of {{amount}} {{currency}} added to your wallet"
- `balance.locked`: "Funds of {{amount}} {{currency}} locked in your wallet"
- `balance.unlocked`: "Funds of {{amount}} {{currency}} unlocked in your wallet"
- `tip.received`: "Received a tip of {{amount}} for task {{taskId}}"
- `tip.notified`: "Tip notification sent successfully"
- `tip.points_awarded`: "Awarded {{points}} points for receiving a tip"
- `transaction.earning_recorded`: "Earning of {{amount}} {{currency}} recorded for task {{taskId}}"
- `transaction.tip_recorded`: "Tip of {{amount}} {{currency}} recorded for task {{taskId}}"
- `transaction.payout_recorded`: "Payout of {{amount}} {{currency}} recorded for task {{taskId}}"
- `transaction.refund_recorded`: "Refund of {{amount}} {{currency}} recorded for task {{taskId}}"
- `transaction.reversed`: "Transaction {{id}} of {{amount}} {{currency}} reversed"

## Constants
Uses constants from:
- `driverConstants.js`: Wallet constants (transaction types), error codes, driver settings, gamification actions (including assumed `transaction_earning_recorded`, `transaction_tip_recorded`, `transaction_payout_recorded`, `transaction_refund_recorded`, `transaction_history_view`, `transaction_reversed`, `transaction_export`).
- `paymentConstants.js`: Wallet settings, financial limits, notification constants, error codes, analytics constants, transaction statuses.

## Endpoints

### POST /driver/wallet/transactions/record
- **Description**: Records a wallet transaction.
- **Request Body**:
  ```json
  {
    "taskId": 123,
    "amount": 25.00,
    "type": "tip"
  }
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "transactionId": 1,
    "type": "tip",
    "amount": 25.00,
    "currency": "USD",
    "status": "completed",
    "description": "Transaction for task #123 (tip)",
    "created_at": "2025-06-11T16:21:00Z"
  },
  "message": "Tip of 25.00 USD recorded for task 123"
}
Points Awarded: 10 points for transaction_tip_recorded (assumed action).
GET /driver/wallet/transactions/history
Description: Retrieves transaction history for a specified period.
Query Parameters:
period: daily, weekly, monthly, or yearly
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": [
    {
      "transactionId": 1,
      "type": "tip",
      "amount": 25.00,
      "currency": "USD",
      "status": "completed",
      "description": "Transaction for task #123 (tip)",
      "created_at": "2025-06-11T16:21:00Z"
    }
  ]
}
Points Awarded: 5 points for transaction_history_view (assumed action).
POST /driver/wallet/transactions/reverse
Description: Reverses a transaction.
Request Body:
json

Collapse

Unwrap

Copy
{
  "transactionId": 1
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "transactionId": 1,
    "amount": 25.00,
    "newBalance": 475.00
  },
  "message": "Transaction 1 of 25.00 USD reversed"
}
Points Awarded: 5 points for transaction_reversed (assumed action).
GET /driver/wallet/transactions/export
Description: Exports transaction data in CSV or JSON format.
Query Parameters:
format: csv or json
Response (CSV example):
csv

Collapse

Unwrap

Copy
transactionId,type,amount,currency,period,description,created_at
1,tip,25.00,USD,completed,"Transaction for task #123 (tip)","2025-06-11T16:21:00Z"
Response (JSON example):
json

Collapse

Unwrap

Copy
[
  {
    "transactionId": 1,
    "type": "tip",
    "amount": 25.00,
    "currency": "USD",
    "period": "completed",
    "description": "Transaction for task #123 (tip)",
    "created_at": "2025-06-11T16:21:00Z"
  }
]
Points Awarded: 5 points for transaction_export (assumed action).
Gamification Integration
Points are awarded automatically:

transaction_earning_recorded: 10 points for recording earnings (assumed action).
transaction_tip_recorded: 10 points for recording tips (assumed action).
transaction_payout_recorded: 10 points for recording payouts (assumed action).
transaction_refund_recorded: 10 points for recording refunds (assumed action).
transaction_history_view: 5 points for viewing transaction history (assumed action).
transaction_reversed: 5 points for reversing transactions (assumed action).
transaction_export: 5 points for exporting transaction data (assumed action). Points are managed by pointService and tied to driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.
Localization
All driver-facing messages use formatMessage with translations from en.json, supporting the driver’s preferred_language (or driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE as fallback) and placeholders for dynamic data (e.g., amount, taskId, currency, id).

Internationalization
The service supports multiple languages as defined in driverConstants.DRIVER_SETTINGS.SUPPORTED_LANGUAGES (assumed to align with munchConstants.MUNCH_SETTINGS.SUPPORTED_LANGUAGES: en, es, fr, de, it, sw, ny, pt, hi, yo, zu). The preferred_language field in the User model determines the language for notifications and messages.

Dependencies
Models: Wallet, WalletTransaction, Driver, sequelize
Constants: driverConstants, paymentConstants
Utilities: AppError, logger, formatMessage, Op, json2csv
Services: socketService, notificationService, auditService, pointService
Error Handling
Uses AppError with error codes from driverConstants and paymentConstants:

DRIVER_NOT_FOUND: Driver not found.
WALLET_NOT_FOUND: Wallet not found.
INVALID_DRIVER: Invalid transaction type, period, or format.
INSUFFICIENT_FUNDS: Insufficient funds for refund.
TRANSACTION_FAILED: Invalid amount, transaction not found, or operation failure.
Notes
Assumed gamification actions transaction_earning_recorded, transaction_tip_recorded, transaction_payout_recorded, transaction_refund_recorded, transaction_history_view, transaction_reversed, and transaction_export. Add to driverConstants.js under GAMIFICATION_CONSTANTS.DRIVER_ACTIONS:
javascript

Collapse

Unwrap

Run

Copy
{ action: 'transaction_earning_recorded', points: 10, walletCredit: 0.20 },
{ action: 'transaction_tip_recorded', points: 10, walletCredit: 0.20 },
{ action: 'transaction_payout_recorded', points: 10, walletCredit: 0.20 },
{ action: 'transaction_refund_recorded', points: 10, walletCredit: 0.20 },
{ action: 'transaction_history_view', points: 5, walletCredit: 0.10 },
{ action: 'transaction_reversed', points: 5, walletCredit: 0.10 },
{ action: 'transaction_export', points: 5, walletCredit: 0.10 }
The WalletTransaction model is assumed to have fields id, wallet_id, type, amount, currency, status, description, created_at.
Used SOCIAL_BILL_SPLIT_COMPLETED as a placeholder notification type for reverseTransaction; replace with a more specific type if defined in paymentConstants.
The json2csv library is used for CSV export, as in the original service.
Added transactions to getTransactionHistory and exportTransactionData for consistency with audit and point operations.