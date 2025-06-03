Documentation File
C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\services\wallet\walletDocumentation.md

markdown

Collapse

Unwrap

Copy
# Wallet Service Documentation

## Overview
The Wallet Service manages customer wallets for payments, deposits, withdrawals, and gamification rewards within MunchMtxi, integrating with `mtables`, `munch`, `mtxi`, and `mevents`.

## Features
- **Wallet Creation**: Create a wallet for a customer.
- **Fund Management**: Add or withdraw funds.
- **Payments**: Process payments for services.
- **Balance & Transactions**: Retrieve wallet balance and transaction history.
- **Gamification Rewards**: Credit wallet with rewards.
- **Real-Time**: Socket events for wallet actions.
- **Notifications**: Push notifications for wallet updates.

## File Structure
- **Constants**: `src/constants/common/paymentConstants.js`, `src/constants/customer/customerConstants.js`
- **Service**: `src/services/customer/wallet/walletService.js`
- **Controller**: `src/controllers/customer/wallet/walletController.js`
- **Validator**: `src/validators/customer/wallet/walletValidator.js`
- **Middleware**: `src/middleware/customer/wallet/walletMiddleware.js`
- **Routes**: `src/routes/customer/wallet/walletRoutes.js`
- **Events**: `socket/events/customer/wallet/walletEvents.js`
- **Handler**: `socket/handlers/customer/wallet/walletHandler.js`

## API Endpoints
### Create Wallet
- **POST /api/v1/customer/wallet**
  - Body: `{ customerId: number }`
  - Response: `{ status: "success", data: { id: number, user_id: number, type: string, currency: string, balance: number } }`

### Add Funds
- **POST /api/v1/customer/wallet/add-funds**
  - Body: `{ walletId: number, amount: number, paymentMethod: { type: string, id: number } }`
  - Response: `{ status: "success", data: { id: number, wallet_id: number, type: string, amount: number, currency: string, status: string } }`

### Withdraw Funds
- **POST /api/v1/customer/wallet/withdraw-funds**
  - Body: `{ walletId: number, amount: number, destination: { accountNumber: string, bankName: string, id: number } }`
  - Response: `{ status: "success", data: { id: number, wallet_id: number, type: string, amount: number, currency: string, status: string } }`

### Pay with Wallet
- **POST /api/v1/customer/wallet/pay**
  - Body: `{ walletId: number, serviceId: number, amount: number }`
  - Response: `{ status: "success", data: { id: number, customer_id: number, order_id: number, amount: number, payment_method: string, status: string } }`

### Get Wallet Balance
- **GET /api/v1/customer/wallet/:walletId/balance**
  - Response: `{ status: "success", data: { walletId: number, balance: number, currency: string, type: string } }`

### Get Wallet Transactions
- **GET /api/v1/customer/wallet/:walletId/transactions**
  - Response: `{ status: "success", data: [{ id: number, wallet_id: number, type: string, amount: number, currency: string, status: string }] }`

### Credit Wallet
- **POST /api/v1/customer/wallet/credit**
  - Body: `{ userId: number, amount: number, currency: string, transactionType: string, description: string }`
  - Response: `{ status: "success", data: { id: number, wallet_id: number, type: string, amount: number, currency: string, status: string } }`

## Socket Events
- `wallet:created`
- `wallet:funds_added`
- `wallet:funds_withdrawn`
- `wallet:payment_processed`
- `wallet:balance_retrieved`
- `wallet:transactions_retrieved`
- `wallet:gamification_reward`

## Models
- **Wallet**: `{ id, user_id, type, currency, balance, created_at, updated_at }`
- **WalletTransaction**: `{ id, wallet_id, type, amount, currency, status, payment_method_id, created_at, updated_at }`
- **Payment**: `{ id, customer_id, order_id, amount, payment_method, status, transaction_id }`

## Dependencies
- **Sequelize Models**: Wallet, WalletTransaction, User, Customer, Payment
- **Constants**: paymentConstants, customerConstants, gamificationConstants
- **Services**: notificationService, auditService, socketService, pointService
- **Utils**: localization, AppError, logger, catchAsync

## Error Handling
- Uses `AppError` with localized messages from `paymentConstants.ERROR_CODES`.
- Common errors: `WALLET_NOT_FOUND`, `INSUFFICIENT_FUNDS`, `INVALID_AMOUNT`, etc.

## Notes
- Transactions ensure data consistency.
- Points awarded dynamically in service.
- Assumes `Wallet`, `WalletTransaction`, and `Payment` models are defined.