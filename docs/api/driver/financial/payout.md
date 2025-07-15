# Driver Payout Service Documentation

This document details the Driver Payout Service and its complementary files for the `MMFinale` project, located under `C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0`. The service manages driver payout operations, including requesting payouts, retrieving history, verifying methods, and scheduling recurring payouts. It integrates with models, constants, and common services, with automatic point awarding for gamification.

**Last Updated**: June 11, 2025

## Table of Contents
1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Service Details](#service-details)
4. [Endpoints](#endpoints)
5. [Complementary Files](#complementary-files)
6. [Dependencies](#dependencies)
7. [Notes](#notes)

---

## Overview
The Driver Payout Service (`payoutService.js`) enables drivers to request payouts, view payout history, verify payout methods, and schedule recurring payouts. It uses Sequelize for database operations and integrates with common services for auditing, notifications, sockets, and point awarding. Points are awarded dynamically for driver-initiated actions using configurations from `driverGamificationConstants.js`.

## File Structure
- **Service**: `src\services\driver\financial\payoutService.js`
- **Controller**: `src\controllers\driver\financial\payoutController.js`
- **Validator**: `src\validators\driver\financial\payoutValidator.js`
- **Middleware**: `src\middleware\driver\financial\payoutMiddleware.js`
- **Routes**: `src\routes\driver\financial\payoutRoutes.js`
- **Socket Events**: `socket\events\driver\financial\payoutEvents.js`
- **Socket Handler**: `socket\handlers\driver\financial\payoutHandler.js`
- **Localization**: `locales\driver\financial\en.json`
- **Constants**:
  - `src\constants\driver\driverConstants.js`
  - `src\constants\driver\driverGamificationConstants.js`
  - `src\constants\common\paymentConstants.js`
  - `src\constants\payoutConstants.js`

## Service Details
**File**: `payoutService.js`

**Functionality**:
- **requestPayout**: Initiates a payout request, deducting from the driver's wallet. Awards 15 points for `payout_request`.
- **getPayoutHistory**: Retrieves a driver's payout history. Awards 5 points for `payout_history_access` (once per day).
- **verifyPayoutMethod**: Verifies a payout method (simulated). Awards 10 points for `payout_method_verify`.
- **scheduleRecurringPayout**: Schedules recurring payouts (simulated storage). Awards 8 points for `payout_schedule`.

**Point Awarding**:
- Points are awarded dynamically within each function using `pointService.awardPoints`, integrated into database transactions.
- Actions and points (from `driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS`):
  - `payout_request`: 15 points, 0.30 wallet credit
  - `payout_history_access`: 5 points, 0.10 wallet credit (once daily)
  - `payout_method_verify`: 10 points, 0.20 wallet credit
  - `payout_schedule`: 8 points, 0.15 wallet credit

**Models Used**:
- `Driver`, `Wallet`, `Payout`

**Dependencies**:
- `sequelize`, `AppError`, `logger`, `localization`, `driverConstants`, `paymentConstants`, `payoutConstants`, `driverGamificationConstants`

## Endpoints
### 1. POST /driver/financial/payout/request
- **Description**: Initiates a driver payout request.
- **Auth**: Bearer token (handled by main route index).
- **Request Body**:
  - `amount`: Number between 10 and 5000 (required).
  - `method`: `bank_transfer`, `wallet_transfer`, or `mobile_money` (required).
- **Response**:
  - 200: Payout record with `id`, `driver_id`, `wallet_id`, `amount`, `currency`, `method`, `status`, `created_at`.
  - 400: Invalid payout method or amount.
  - 404: Driver or wallet not found.
  - 429: Withdrawal attempts exceeded.
  - 500: Server error.
- **Points**: Awards 15 points for `payout_request`.

### 2. GET /driver/financial/payout/history
- **Description**: Retrieves driver payout history.
- **Auth**: Bearer token.
- **Response**:
  - 200: Array of objects with `payoutId`, `amount`, `currency`, `method`, `status`, `created_at`.
  - 404: Driver not found.
  - 500: Server error.
- **Points**: Awards 5 points for `payout_history_access` (once per day).

### 3. POST /driver/financial/payout/verify
- **Description**: Verifies a driver payout method.
- **Auth**: Bearer token.
- **Request Body**:
  - `method`: `bank_transfer`, `wallet_transfer`, or `mobile_money` (required).
- **Response**:
  - 200: Object with `isVerified` boolean.
  - 400: Invalid payout method.
  - 404: Driver not found.
  - 500: Server error.
- **Points**: Awards 10 points for `payout_method_verify`.

### 4. POST /driver/financial/payout/schedule
- **Description**: Schedules recurring driver payouts.
- **Auth**: Bearer token.
- **Request Body**:
  - `frequency`: `weekly`, `biweekly`, or `monthly` (required).
  - `amount`: Number between 10 and 5000 (required).
  - `method`: `bank_transfer`, `wallet_transfer`, or `mobile_money` (required).
- **Response**:
  - 200: Null data.
  - 400: Invalid frequency, amount, or method.
  - 404: Driver not found.
  - 500: Server error.
- **Points**: Awards 8 points for `payout_schedule`.

---

## Complementary Files
### Controller (`payoutController.js`)
- Imports common services (`auditService`, `notificationService`, `socketService`, `pointService`).
- Handles HTTP requests, passes services to the service layer, and formats responses using `sendResponse`.
- Uses `catchAsync` for error handling.

### Validator (`payoutValidator.js`)
- Uses Joi to validate request inputs.
- Validates `driverId`, `amount` against `payoutConstants.WALLET_SETTINGS`, `method` against `payoutConstants.SUPPORTED_PAYOUT_METHODS`, and `frequency` against `payoutConstants.SUPPORTED_FREQUENCIES`.

### Middleware (`payoutMiddleware.js`)
- Validates requests using schemas from the validator file.
- Handles body parameters (`amount`, `method`, `frequency`).
- Throws `AppError` on validation failure.

### Routes (`payoutRoutes.js`)
- Defines Express routes with Swagger documentation.
- Applies validation middleware before controllers.
- Uses `post` for `requestPayout`, `verifyPayoutMethod`, and `scheduleRecurringPayout`; `get` for `getPayoutHistory`.
- Assumes auth middleware is applied in the main route index.

### Socket Events (`payoutEvents.js`)
- Defines socket event names in the `payout:` namespace:
  - `payout:requested`
  - `payout:history_retrieved`
  - `payout:method_verified`
  - `payout:scheduled`

### Socket Handler (`payoutHandler.js`)
- Handles socket events using `catchAsyncSocket`.
- Re-emits events to the client for real-time updates.

### Localization (`en.json`)
- Located at `locales\driver\financial\en.json`.
- Provides English translations for user-facing messages in the `financial` namespace, with a `payout` sub-namespace.
- Supports placeholders for `amount`, `currency`, `method`, `count`, and `frequency`.
- Covers payout request, history retrieval, method verification, and schedule messages.

### Constants
- **driverConstants.js**: Defines `ERROR_CODES` and `DRIVER_SETTINGS` for error handling and default language.
- **driverGamificationConstants.js**: Defines `GAMIFICATION_CONSTANTS` with `DRIVER_ACTIONS` for point awarding.
- **paymentConstants.js**: Defines `WALLET_SETTINGS`, `TRANSACTION_STATUSES`, `FINANCIAL_LIMITS`, and `NOTIFICATION_CONSTANTS`.
- **payoutConstants.js**: Defines `SUPPORTED_PAYOUT_METHODS`, `SUPPORTED_FREQUENCIES`, `WALLET_SETTINGS`, `NOTIFICATION_TYPES`, `AUDIT_TYPES`, `EVENT_TYPES`, and `ERROR_CODES`.

## Dependencies
- **External Libraries**: `sequelize`, `joi`, `express`
- **Utilities**: `AppError`, `logger`, `localization`, `responseHandler`, `catchAsync`, `catchAsyncSocket`, `security`
- **Constants**: `driverConstants`, `driverGamificationConstants`, `paymentConstants`, `payoutConstants`
- **Services**: `auditService`, `notificationService`, `socketService`, `pointService`
- **Models**: `Driver`, `Wallet`, `Payout`

## Notes
- **Authentication**: Assumed to be handled by main route index middleware.
- **Point Awarding**: Integrated dynamically within each function using `pointService` within transactions. `payout_history_access` points are limited to once per day.
- **Localization**: Uses `formatMessage` with `locales/driver/financial/en.json` for translations in the `financial.payout` namespace.
- **Error Handling**: Uses `AppError` with `payoutConstants.ERROR_CODES` and `paymentConstants.ERROR_CODES`.
- **Transactions**: Sequelize transactions ensure data consistency.
- **Socket Events**: Provide real-time updates for payout-related actions.
- **Scalability**: Optimized for multiple drivers with efficient queries.
- **Payout Verification**: Simulated; a real implementation would integrate with payment gateways (e.g., Stripe).
- **Recurring Payouts**: Simulated storage; a real implementation might use a `RecurringPayout` model or a scheduling service.
- **Constants**:
  - `payoutConstants.SUPPORTED_PAYOUT_METHODS`: Defines valid payout methods.
  - `payoutConstants.WALLET_SETTINGS`: Sets payout amount limits.
  - `paymentConstants.FINANCIAL_LIMITS.WITHDRAWAL.max_attempts_per_hour`: Limits withdrawal attempts to 3 per hour.
  - `paymentConstants.WALLET_SETTINGS.WALLET_TYPES`: Includes `DRIVER`.
  - `paymentConstants.TRANSACTION_STATUSES`: Includes `PENDING`.
  - `driverGamificationConstants.DRIVER_ACTIONS`: Defines actions and points for payout operations.

This documentation provides a comprehensive overview of the Driver Payout Service and its integration with the MMFinale backend system.