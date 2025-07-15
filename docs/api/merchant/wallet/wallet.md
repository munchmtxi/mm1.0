# Merchant Wallet API Documentation

This document outlines the Merchant Wallet API, which manages wallet creation, payments, payouts, balance retrieval, and transaction history for merchants in the Munch merchant service. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/merchant/wallet/walletService.js`
- **Controller**: `src/controllers/merchant/wallet/walletController.js`
- **Validator**: `src/validators/merchant/wallet/walletValidator.js`
- **Middleware**: `src/middleware/merchant/wallet/walletMiddleware.js`
- **Routes**: `src/routes/merchant/wallet/walletRoutes.js`
- **Events**: `socket/events/merchant/wallet/walletEvents.js`
- **Handler**: `socket/handlers/merchant/wallet/walletHandler.js`
- **Localization**: `locales/merchant/wallet/en.json`

## Service: `walletService.js`

The service layer handles core wallet operations, interacting with Sequelize models (`Wallet`, `WalletTransaction`, `Merchant`, `Staff`, `Customer`) and constants (`paymentConstants`, `merchantConstants`). It includes:

- **createMerchantWallet(merchantId)**: Creates a wallet for a merchant, ensuring no duplicate wallets exist.
- **receivePayment(merchantId, amount, walletId)**: Processes a payment from a customer wallet to a merchant wallet, updating balances and creating transaction records.
- **disbursePayout(merchantId, recipientId, amount)**: Disburses a payout from a merchant wallet to a staff wallet, ensuring sufficient balance.
- **getWalletBalance(merchantId)**: Retrieves the current balance and currency of a merchant's wallet.
- **getTransactionHistory(merchantId)**: Fetches the last 100 transactions for a merchant's wallet, ordered by creation date.

The service uses transactions for atomicity in payment and payout operations and logs errors using a logger utility.

## Controller: `walletController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Wallet Creation**: 50 points
- **Payment Received**: 1 point per 10 units of amount
- **Payout Disbursed**: 20 points

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the merchant's preferred language.

## Validator: `walletValidator.js`

Uses Joi to validate request inputs:

- **createWalletSchema**: Requires `merchantId` (integer, positive).
- **processPaymentSchema**: Requires `merchantId`, `amount` (positive number), `walletId` (integer, positive).
- **processPayoutSchema**: Requires `merchantId`, `recipientId`, `amount` (all positive).
- **getBalanceSchema**: Requires `merchantId` (query parameter, integer, positive).
- **getHistorySchema**: Requires `merchantId` (query parameter, integer, positive).

## Middleware: `walletMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `walletRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /merchant/wallet/create**: Creates a merchant wallet.
- **POST /merchant/wallet/payment**: Processes a customer payment.
- **POST /merchant/wallet/payout**: Disburses a payout to staff.
- **GET /merchant/wallet/balance**: Retrieves wallet balance.
- **GET /merchant/wallet/history**: Retrieves transaction history.

## Events: `walletEvents.js`

Defines socket event names in a namespaced format:

- `merchant:wallet:created`
- `merchant:wallet:paymentReceived`
- `merchant:wallet:payoutDisbursed`

## Handler: `walletHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains English translations for user-facing messages, used with the `formatMessage` utility:

- `wallet.created`: Wallet creation confirmation.
- `wallet.payment_received`: Payment receipt confirmation.
- `wallet.payout_disbursed`: Payout disbursement confirmation.
- `wallet.balance_retrieved`: Balance retrieval confirmation.
- `wallet.history_retrieved`: Transaction history retrieval confirmation.

## Endpoints

### POST /merchant/wallet/create
- **Description**: Creates a wallet for a merchant.
- **Request Body**:
  - `merchantId` (integer, required): Merchant ID.
- **Responses**:
  - **201**: `{ success: true, message: "Wallet {walletId} created successfully", data: { id, user_id, merchant_id, balance, currency, type } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 50 points, logs action, emits `merchant:wallet:created`, sends notification.

### POST /merchant/wallet/payment
- **Description**: Processes a payment from a customer wallet to a merchant wallet.
- **Request Body**:
  - `merchantId` (integer, required): Merchant ID.
  - `amount` (number, required): Payment amount.
  - `walletId` (integer, required): Customer wallet ID.
- **Responses**:
  - **200**: `{ success: true, message: "Received payment of {amount} {currency}", data: { id, wallet_id, type, amount, currency, status, description } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards points (1 per 10 units), logs action, emits `merchant:wallet:paymentReceived`, sends notification.

### POST /merchant/wallet/payout
- **Description**: Disburses a payout from a merchant wallet to a staff wallet.
- **Request Body**:
  - `merchantId` (integer, required): Merchant ID.
  - `recipientId` (integer, required): Staff ID.
  - `amount` (number, required): Payout amount.
- **Responses**:
  - **200**: `{ success: true, message: "Payout of {amount} {currency} disbursed successfully", data: { id, wallet_id, type, amount, currency, status, description } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 20 points, logs action, emits `merchant:wallet:payoutDisbursed`, sends notification to recipient.

### GET /merchant/wallet/balance
- **Description**: Retrieves the merchant wallet balance.
- **Query Parameters**:
  - `merchantId` (integer, required): Merchant ID.
- **Responses**:
  - **200**: `{ success: true, message: "Wallet balance: {balance} {currency}", data: { balance, currency } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Logs action.

### GET /merchant/wallet/history
- **Description**: Retrieves the last 100 transactions for a merchant wallet.
- **Query Parameters**:
  - `merchantId` (integer, required): Merchant ID.
- **Responses**:
  - **200**: `{ success: true, message: "Retrieved {count} transaction(s)", data: [{ id, wallet_id, type, amount, currency, status, description, created_at }, ...] }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Logs action.

## Notes

- Authentication is handled at the main route index, so no auth middleware is included in `walletMiddleware.js`.
- The `sequelize` instance is assumed to be globally available for transaction management.
- The `io` Socket.IO instance is accessed via `req.app.get('io')` in the controller.
- Point awarding is dynamic and occurs after successful operations, with no dedicated endpoints.
- All user-facing messages are localized using the merchant's or recipient's preferred language.