Documentation File
File Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\driver\wallet\wallet.md

markdown

Collapse

Unwrap

Copy
# Driver Wallet API Documentation

## Overview
The Driver Wallet API manages driver wallet balance operations, including retrieving balance, updating with earnings or tips, and locking/unlocking funds for disputes. It integrates with common services and automatically awards gamification points for wallet-related actions. The API aligns with the platform's localization and constants, supporting multiple languages as defined in the driver constants.

## Service File
**Path**: `src/services/driver/wallet/walletService.js`

The service handles core wallet management logic:
- **getWalletBalance**: Retrieves driver's wallet balance, awards points for `wallet_balance_check`.
- **updateBalance**: Updates wallet balance with earnings or tips, awards points for `wallet_${type}_received`.
- **lockBalance**: Locks funds for disputes, awards points for `wallet_balance_lock`.
- **unlockBalance**: Unlocks funds, awards points for `wallet_balance_unlock`.

The service uses `Wallet`, `Driver`, and `sequelize` models, with constants from `driverConstants` and `paymentConstants`. Common services (`socketService`, `notificationService`, `auditService`, `pointService`) are injected from the controller.

## Controller File
**Path**: `src/controllers/driver/wallet/walletController.js`

Handles HTTP requests and responses:
- **getWalletBalance**: Processes GET requests to retrieve wallet balance.
- **updateBalance**: Handles POST requests to update balance.
- **lockBalance**: Manages POST requests to lock funds.
- **unlockBalance**: Processes POST requests to unlock funds.

Injects common services and passes them to the service layer.

## Validation File
**Path**: `src/validators/driver/wallet/walletValidator.js`

Uses Joi to validate:
- **updateBalance**: Ensures `amount` is positive, `type` is in `driverConstants.WALLET_CONSTANTS.TRANSACTION_TYPES`, optional `id`.
- **lockBalance** and **unlockBalance**: Validates `amount` as positive, optional `id`.
- **getWalletBalance**: No validation required.

## Middleware File
**Path**: `src/middleware/driver/wallet/walletMiddleware.js`

- **checkDriverExists**: Verifies the driver exists using `id` from the body or `req.user.driverId`.

## Route File
**Path**: `src/routes/driver/wallet/walletRoutes.js`

Defines Express routes with Swagger documentation:
- **GET /driver/wallet/balance**: Retrieves wallet balance.
- **POST /driver/wallet/update**: Updates balance with earnings or tips.
- **POST /driver/wallet/lock**: Locks funds for disputes.
- **POST /driver/wallet/unlock**: Unlocks funds.

Authentication is handled at the main route index.

## Events File
**Path**: `src/socket/events/driver/wallet/walletEvents.js`

Defines namespaced socket events:
- `./wallet:balance_updated`
- `./wallet:balance_locked`
- `./wallet:balance_unlocked`

## Handler File
**Path**: `src/socket/handlers/driver/wallet/walletHandler.js`

Initializes socket event listeners to handle and broadcast wallet-related events.

## Localization File
**Path**: `src/locales/driver/wallet/en.json`

Contains English translations for driver-facing messages:
- `balance.earning_added`: "Earning of {{amount}} {{currency}} added to your wallet"
- `balance.tip_added`: "Tip of {{amount}} {{currency}} added to your wallet"
- `balance.locked`: "Funds of {{amount}} {{currency}} locked in your wallet"
- `balance.unlocked`: "Funds of {{amount}} {{currency}} unlocked in your wallet"

## Constants
Uses constants from:
- `driverConstants.js`: Wallet constants (transaction types), error codes, driver settings, and gamification actions (including assumed `wallet_balance_check`, `wallet_earning_received`, `wallet_tip_received`, `wallet_balance_lock`, `wallet_balance_unlock`).
- `paymentConstants.js`: Wallet settings, financial limits, notification constants, error codes.

## Endpoints

### GET /driver/wallet/balance
- **Description**: Retrieves driver's wallet balance.
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "driver_id": 123,
      "wallet_id": 456,
      "balance": 500.50,
      "currency": "USD",
      "locked_balance": 50.00
    }
  }
Points Awarded: 5 points for wallet_balance_check (assumed action).
POST /driver/wallet/update
Description: Updates wallet balance with earnings or tips.
Request Body:
json

Collapse

Unwrap

Copy
{
  "id": 123,
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
    "driver_id": 123,
    "wallet_id": 456,
    "balance": 525.50,
    "currency": "USD"
  },
  "message": "Tip of 25.00 USD added to your wallet"
}
Points Awarded: 10 points for wallet_tip_received or wallet_earning_received (assumed actions).
POST /driver/wallet/lock
Description: Locks funds in the wallet.
Request Body:
json

Collapse

Unwrap

Copy
{
  "id": 123,
  "amount": 20.00
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "driver_id": 123,
    "amount": 20.00,
    "locked_balance": 70.00
  },
  "message": "Funds of 20.00 USD locked in your wallet"
}
Points Awarded: 5 points for wallet_balance_lock (assumed action).
POST /driver/wallet/unlock
Description: Unlocks funds in the wallet.
Request Body:
json

Collapse

Unwrap

Copy
{
  "id": 123,
  "amount": 20.00
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "driver_id": 123,
    "amount": 20.00,
    "locked_balance": 50.00
  },
  "message": "Funds of 20.00 USD unlocked in your wallet"
}
Points Awarded: 5 points for wallet_balance_unlock (assumed action).
Gamification Integration
Points are awarded automatically:

wallet_balance_check: 5 points for checking balance (assumed action).
wallet_earning_received: 10 points for receiving earnings (assumed action).
wallet_tip_received: 10 points for receiving tips (assumed action).
wallet_balance_lock: 5 points for locking funds (assumed action).
wallet_balance_unlock: 5 points for unlocking funds (assumed action). Points are managed by pointService and tied to driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.
Localization
All driver-facing messages use formatMessage with translations from en.json, supporting the driver’s preferred_language (or driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE as fallback) and placeholders for dynamic data (e.g., amount, currency).

Internationalization
The service supports multiple languages as defined in driverConstants.DRIVER_SETTINGS.SUPPORTED_LANGUAGES (assumed to align with munchConstants.MUNCH_SETTINGS.SUPPORTED_LANGUAGES: en, es, fr, de, it, sw, ny, pt, hi, yo, zu). The preferred_language field in the User model determines the language for notifications and messages.

Dependencies
Models: Wallet, Driver, sequelize
Constants: driverConstants, paymentConstants
Utilities: AppError, logger, formatMessage
Services: socketService, notificationService, auditService, pointService
Error Handling
Uses AppError with error codes from driverConstants and paymentConstants:

DRIVER_NOT_FOUND: Driver not found.
WALLET_NOT_FOUND: Wallet not found.
INSUFFICIENT_FUNDS: Insufficient funds or locked funds.
INVALID_DRIVER: Invalid transaction type.
TRANSACTION_FAILED: Invalid amount, balance out of bounds, or operation failure.
Notes
Assumed gamification actions wallet_balance_check, wallet_earning_received, wallet_tip_received, wallet_balance_lock, and wallet_balance_unlock. Add to driverConstants.js under GAMIFICATION_CONSTANTS.DRIVER_ACTIONS:
javascript

Collapse

Unwrap

Run

Copy
{ action: 'wallet_balance_check', points: 5, walletCredit: 0.10 },
{ action: 'wallet_earning_received', points: 10, walletCredit: 0.20 },
{ action: 'wallet_tip_received', points: 10, walletCredit: 0.20 },
{ action: 'wallet_balance_lock', points: 5, walletCredit: 0.10 },
{ action: 'wallet_balance_unlock', points: 5, walletCredit: 0.10 }
The Wallet model is assumed to have fields user_id, type, balance, currency, locked_balance.
Used paymentConstants.WALLET_SETTINGS.WALLET_TYPES[2] for 'driver' and array indexing for error codes to match the provided structure.
Added socket emissions and audit logging to getWalletBalance for consistency with other services.
The updateBalance endpoint is restricted to earning and tip types, as per the original service.