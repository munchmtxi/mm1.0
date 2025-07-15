Documentation File
File Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\driver\wallet\tip.md

markdown

Collapse

Unwrap

Copy
# Driver Tip API Documentation

## Overview
The Driver Tip API manages driver tip operations, including recording tips, retrieving tip history, sending notifications, and awarding gamification points. It integrates with the wallet service for balance updates and the transaction service for recording transactions. The API aligns with the platform's localization and constants, supporting multiple languages as defined in the driver constants.

## Service File
**Path**: `src/services/driver/wallet/tipService.js`

The service handles core tip management logic:
- **recordTip**: Records a tip, updates wallet balance, records transaction, awards points for `tip_received`.
- **getTipHistory**: Retrieves driver's tip history, awards points for `tip_history_view`.
- **notifyTipReceived**: Notifies driver of a received tip, awards points for `tip_notification_received`.
- **awardTipPoints**: Awards gamification points for receiving a tip, awards points for `tip_magnet`.

The service uses `Tip`, `Driver`, `Wallet`, and `sequelize` models, with constants from `driverConstants`, `paymentConstants`, and `tipConstants`. Common services (`socketService`, `notificationService`, `auditService`, `pointService`) are injected from the controller.

## Controller File
**Path**: `src/controllers/driver/wallet/tipController.js`

Handles HTTP requests and responses:
- **recordTip**: Processes POST requests to record tips.
- **getTipHistory**: Handles GET requests to retrieve tip history.
- **notifyTipReceived**: Manages POST requests to send tip notifications.
- **awardTipPoints**: Processes POST requests to award tip points.

Injects common services and passes them to the service layer.

## Validation File
**Path**: `src/validators/driver/wallet/tipValidator.js`

Uses Joi to validate:
- **recordTip**: Ensures `taskId` is a positive integer, `amount` is between `tipConstants.TIP_SETTINGS.MIN_AMOUNT` and `MAX_AMOUNT`.
- **notifyTipReceived**: Validates `taskId` as a positive integer.
- **getTipHistory** and **awardTipPoints**: No validation required.

## Middleware File
**Path**: `src/middleware/driver/wallet/tipMiddleware.js`

- **checkDriverExists**: Verifies the driver exists before allowing tip-related operations.

## Route File
**Path**: `src/routes/driver/wallet/tipRoutes.js`

Defines Express routes with Swagger documentation:
- **POST /driver/wallet/tip/record**: Records a tip.
- **GET /driver/wallet/tip/history**: Retrieves tip history.
- **POST /driver/wallet/tip/notify**: Sends tip notification.
- **POST /driver/wallet/tip/points**: Awards tip points.

Authentication is handled at the main route index.

## Events File
**Path**: `src/socket/events/driver/wallet/tipEvents.js`

Defines namespaced socket events:
- `./tip:received`
- `./tip:history_viewed`
- `./tip:notified`
- `./tip:points_awarded`

## Handler File
**Path**: `src/socket/handlers/driver/wallet/tipHandler.js`

Initializes socket event listeners to handle and broadcast tip-related events.

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

## Constants
Uses constants from:
- `driverConstants.js`: Wallet constants (transaction types), error codes, driver settings, gamification actions (including assumed `tip_received`, `tip_history_view`, `tip_notification_received`, and existing `tip_magnet`).
- `paymentConstants.js`: Wallet settings, error codes.
- `tipConstants.js`: Tip settings, notification constants, error codes.

## Endpoints

### POST /driver/wallet/tip/record
- **Description**: Records a tip received by a driver.
- **Request Body**:
  ```json
  {
    "taskId": 123,
    "amount": 5.00
  }
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "tipId": 1,
    "taskId": 123,
    "amount": 5.00,
    "currency": "USD",
    "status": "completed",
    "created_at": "2025-06-11T16:21:00Z"
  },
  "message": "Received a tip of 5.00 for task 123"
}
Points Awarded: 10 points for tip_received (assumed action).
GET /driver/wallet/tip/history
Description: Retrieves driver's tip history.
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": [
    {
      "tipId": 1,
      "taskId": 123,
      "serviceType": "ride",
      "amount": 5.00,
      "currency": "USD",
      "status": "completed",
      "created_at": "2025-06-11T16:21:00Z"
    }
  ]
}
Points Awarded: 5 points for tip_history_view (assumed action).
POST /driver/wallet/tip/notify
Description: Notifies driver of a received tip.
Request Body:
json

Collapse

Unwrap

Copy
{
  "taskId": 123
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "tipId": 1,
    "taskId": 123,
    "amount": 5.00
  },
  "message": "Tip notification sent successfully"
}
Points Awarded: 5 points for tip_notification_received (assumed action).
POST /driver/wallet/tip/points
Description: Awards gamification points for receiving a tip.
Response:
json

Collapse

Unwrap

Copy
{
  "status": "SUCCESS",
  "data": {
    "tipId": 1,
    "points": 15,
    "walletCredit": 0.30
  },
  "message": "Awarded 15 points for receiving a tip"
}
Points Awarded: 15 points for tip_magnet (existing action).
Gamification Integration
Points are awarded automatically:

tip_received: 10 points for recording a tip (assumed action).
tip_history_view: 5 points for viewing tip history (assumed action).
tip_notification_received: 5 points for receiving tip notification (assumed action).
tip_magnet: 15 points for earning tip points (existing action). Points are managed by pointService and tied to driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.
Localization
All driver-facing messages use formatMessage with translations from en.json, supporting the driver’s preferred_language (or driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE as fallback) and placeholders for dynamic data (e.g., amount, taskId, points).

Internationalization
The service supports multiple languages as defined in driverConstants.DRIVER_SETTINGS.SUPPORTED_LANGUAGES (assumed to align with munchConstants.MUNCH_SETTINGS.SUPPORTED_LANGUAGES: en, es, fr, de, it, sw, ny, pt, hi, yo, zu). The preferred_language field in the User model determines the language for notifications and messages.

Dependencies
Models: Tip, Driver, Wallet, sequelize, Ride, Order, Booking, EventService, InDiningOrder
Constants: driverConstants, paymentConstants, tipConstants
Utilities: AppError, logger, formatMessage, Op
Services: balanceService, transactionService, socketService, notificationService, auditService, pointService
Error Handling
Uses AppError with error codes from driverConstants, paymentConstants, and tipConstants:

DRIVER_NOT_FOUND: Driver not found.
WALLET_NOT_FOUND: Wallet not found.
INVALID_AMOUNT: Invalid tip amount.
TIP_ALREADY_EXISTS: Tip already exists for task.
TIP_NOT_FOUND: Tip or task not found.
TIP_ACTION_FAILED: Operation failure.
Notes
Assumed gamification actions tip_received, tip_history_view, and tip_notification_received. Add to driverConstants.js under GAMIFICATION_CONSTANTS.DRIVER_ACTIONS:
javascript

Collapse

Unwrap

Run

Copy
{ action: 'tip_received', points: 10, walletCredit: 0.20 },
{ action: 'tip_history_view', points: 5, walletCredit: 0.10 },
{ action: 'tip_notification_received', points: 5, walletCredit: 0.10 }
The Tip model is assumed to have fields id, recipient_id, wallet_id, amount, currency, status, ride_id, order_id, booking_id, event_service_id, in_dining_order_id, created_at.
The transactionService.recordTransaction is assumed to exist and handle transaction logging.
Currency validation uses tipConstants.TIP_SETTINGS.SUPPORTED_CURRENCIES, falling back to driverConstants.DRIVER_SETTINGS.DEFAULT_CURRENCY.
The validateTaskId function supports multiple service types (ride, order, booking, event_service, in_dining_order) as defined in tipConstants.