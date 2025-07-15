# Merchant Payout API Documentation

This document outlines the Merchant Payout API, which manages payout settings, processing, method verification, and history for merchants in the Munch merchant service. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/merchant/wallet/payoutService.js`
- **Controller**: `src/controllers/merchant/wallet/payoutController.js`
- **Validator**: `src/validators/merchant/wallet/payoutValidator.js`
- **Middleware**: `src/middleware/merchant/wallet/payoutMiddleware.js`
- **Routes**: `src/routes/merchant/wallet/payoutRoutes.js`
- **Events**: `socket/events/merchant/wallet/payoutEvents.js`
- **Handler**: `socket/handlers/merchant/wallet/payoutHandler.js`
- **Localization**: `locales/merchant/wallet/en.json` (shared with wallet and tax modules)

## Service: `payoutService.js`

The service layer handles core payout operations, interacting with Sequelize models (`Wallet`, `WalletTransaction`, `Merchant`, `Staff`) and constants (`paymentConstants`, `merchantConstants`). It includes:

- **configurePayoutSettings(merchantId, settings)**: Configures payout schedule and method for a merchant's wallet.
- **processPayout(merchantId, recipientId, amount)**: Processes a payout from a merchant wallet to a staff wallet, ensuring sufficient balance and creating transaction records.
- **verifyPayoutMethod(recipientId, method)**: Verifies a recipient’s payout method (e.g., bank transfer, mobile money) and updates wallet details.
- **getPayoutHistory(merchantId)**: Retrieves the last 100 payout transactions for a merchant's wallet, ordered by creation date.

The service uses transactions for atomicity in payout processing and logs errors using a logger utility.

## Controller: `payoutController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Configure Payout Settings**: 5 points
- **Process Payout**: 20 points
- **Verify Payout Method**: 10 points
- **Get Payout History**: 0 points

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the merchant’s or recipient’s preferred language.

## Validator: `payoutValidator.js`

Uses Joi to validate request inputs:

- **configurePayoutSettingsSchema**: Requires `merchantId` (integer, positive), `settings` (object with `schedule`, `method`, optional `account_details`).
- **processPayoutSchema**: Requires `merchantId`, `recipientId`, `amount` (all positive).
- **verifyPayoutMethodSchema**: Requires `recipientId` (integer, positive), `method` (object with `type`, `accountDetails`).
- **getPayoutHistorySchema**: Requires `merchantId` (query parameter, integer, positive).

## Middleware: `payoutMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `payoutRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /merchant/wallet/payout/settings**: Configures payout settings.
- **POST /merchant/wallet/payout/process**: Processes a payout.
- **POST /merchant/wallet/payout/verify**: Verifies a payout method.
- **GET /merchant/wallet/payout/history**: Retrieves payout history.

## Events: `payoutEvents.js`

Defines socket event names in a namespaced format:

- `merchant:payout:settingsConfigured`
- `merchant:payout:processed`
- `merchant:payout:methodVerified`

## Handler: `payoutHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains English translations for user-facing messages, shared with the wallet and tax modules:

- `payout.settings_updated`: Payout settings configuration confirmation.
- `payout.received`: Payout receipt confirmation.
- `payout.method_verified`: Payout method verification confirmation.
- `payout.history_retrieved`: Payout history retrieval confirmation.

## Endpoints

### POST /merchant/wallet/payout/settings
- **Description**: Configures payout settings for a merchant.
- **Request Body**:
  - `merchantId` (integer, required): Merchant ID.
  - `settings` (object, required): Payout settings (`schedule`, `method`, optional `account_details`).
- **Responses**:
  - **200**: `{ success: true, message: "Payout settings updated to {schedule} schedule and {method} method", data: { id, user_id, merchant_id, balance, currency, bank_details } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 5 points, logs action, emits `merchant:payout:settingsConfigured`, sends notification.

### POST /merchant/wallet/payout/process
- **Description**: Processes a payout to a recipient.
- **Request Body**:
  - `merchantId` (integer, required): Merchant ID.
  - `recipientId` (integer, required): Staff ID.
  - `amount` (number, required): Payout amount.
- **Responses**:
  - **200**: `{ success: true, message: "Received payout of {amount} {currency}", data: { id, wallet_id, type, amount, currency, status, description } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 20 points, logs action, emits `merchant:payout:processed`, sends notification to recipient.

### POST /merchant/wallet/payout/verify
- **Description**: Verifies a payout method for a recipient.
- **Request Body**:
  - `recipientId` (integer, required): Staff ID.
  - `method` (object, required): Payout method (`type`, `accountDetails`).
- **Responses**:
  - **200**: `{ success: true, message: "Payout method {method} verified successfully", data: { verified, method } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `merchant:payout:methodVerified`, sends notification to recipient.

### GET /merchant/wallet/payout/history
- **Description**: Retrieves the last 100 payout transactions for a merchant.
- **Query Parameters**:
  - `merchantId` (integer, required): Merchant ID.
- **Responses**:
  - **200**: `{ success: true, message: "Retrieved {count} payout transaction(s)", data: [{ id, wallet_id, type, amount, currency, status, description, created_at }, ...] }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Logs action.

## Notes

- Authentication is handled at the main route index, as specified.
- The `sequelize` instance is assumed to be globally available for transaction management.
- The `io` Socket.IO instance is accessed via `req.app.get('io')` in the controller.
- Point awarding is dynamic, occurs after successful operations, and has no dedicated endpoints.
- All user-facing messages are localized using the merchant’s or recipient’s preferred language.
- The `en.json` file is shared with the wallet and tax modules, extended to include payout-related messages.