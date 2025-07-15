walletDocumentation.md
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\wallet\walletDocumentation.md

markdown

Collapse

Unwrap

Copy
# Customer Wallet API Documentation

This document outlines the Customer Wallet API endpoints for managing wallets, transactions, and rewards.

## Base URL
`https://api.example.com/customer/wallet`

## Endpoints

### 1. Create Wallet
**POST** `/`

Creates a new wallet for the authenticated customer.

#### Request Body
```json
{
  "languageCode": "en"
}
Response
201 Created
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Your wallet 123e4567-e89b-12d3-a456-426614174000 has been created",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "user_123",
    "type": "DIGITAL",
    "currency": "USD",
    "balance": 0
  }
}
Errors
400 Bad Request: Wallet already exists
404 Not Found: Customer not found
Curl Example
bash

Collapse

Unwrap

Run

Copy
curl -X POST https://api.example.com/customer/wallet \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{"languageCode": "en"}'
2. Add Funds
POST /add-funds

Adds funds to a wallet using a specified payment method.

Request Body
json

Collapse

Unwrap

Copy
{
  "walletId": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 50.00,
  "paymentMethod": {
    "type": "CREDIT_CARD",
    "id": "pm_123456"
  },
  "languageCode": "en"
}
Response
200 OK
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Successfully added 50.00 USD to your wallet",
  "data": {
    "id": "txn_123456",
    "wallet_id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "DEPOSIT",
    "amount": 50.00,
    "currency": "USD",
    "status": "COMPLETED"
  }
}
Errors
400 Bad Request: Invalid amount, payment method, or balance exceeds limit
404 Not Found: Wallet not found
Curl Example
bash

Collapse

Unwrap

Run

Copy
curl -X POST https://api.example.com/customer/wallet/add-funds \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{"walletId": "123e4567-e89b-12d3-a456-426614174000", "amount": 50.00, "paymentMethod": {"type": "CREDIT_CARD", "id": "pm_123456"}, "languageCode": "en"}'
3. Withdraw Funds
POST /withdraw-funds

Withdraws funds from a wallet to a bank account.

Request Body
json

Collapse

Unwrap

Copy
{
  "walletId": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 50.00,
  "destination": {
    "accountNumber": "1234567890",
    "bankName": "Bank of America",
    "id": "dest_123456"
  },
  "languageCode": "en"
}
Response
200 OK
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Successfully withdrawn 50.00 USD from your wallet",
  "data": {
    "id": "txn_123456",
    "wallet_id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "WITHDRAWAL",
    "amount": 50.00,
    "currency": "USD",
    "status": "COMPLETED"
  }
}
Errors
400 Bad Request: Invalid amount, insufficient funds, or invalid destination
404 Not Found: Wallet not found
Curl Example
bash

Collapse

Unwrap

Run

Copy
curl -X POST https://api.example.com/customer/wallet/withdraw-funds \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{"walletId": "123e4567-e89b-12d3-a456-426614174000", "amount": 50.00, "destination": {"accountNumber": "1234567890", "bankName": "Bank of America", "id": "dest_123456"}, "languageCode": "en"}'
4. Pay with Wallet
POST /pay

Processes a payment for a service using the wallet.

Request Body
json

Collapse

Unwrap

Copy
{
  "walletId": "123e4567-e89b-12d3-a456-426614174000",
  "serviceId": "svc_123456",
  "amount": 25.00,
  "languageCode": "en"
}
Response
200 OK
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Payment of 25.00 for service svc_123456 completed",
  "data": {
    "id": "pay_123456",
    "customer_id": "user_123",
    "order_id": "svc_123456",
    "amount": 25.00,
    "payment_method": "DIGITAL_WALLET",
    "status": "COMPLETED"
  }
}
Errors
400 Bad Request: Invalid amount or insufficient funds
404 Not Found: Wallet or service not found
Curl Example
bash

Collapse

Unwrap

Run

Copy
curl -X POST https://api.example.com/customer/wallet/pay \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{"walletId": "123e4567-e89b-12d3-a456-426614174000", "serviceId": "svc_123456", "amount": 25.00, "languageCode": "en"}'
5. Get Wallet Balance
GET /balance

Retrieves the current balance of a wallet.

Query Parameters
walletId (required): UUID of the wallet
languageCode: Language code (e.g., en)
Response
200 OK
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Wallet balance: 100.00 USD",
  "data": {
    "walletId": "123e4567-e89b-12d3-a456-426614174000",
    "balance": 100.00,
    "currency": "USD",
    "type": "DIGITAL"
  }
}
Errors
404 Not Found: Wallet not found
Curl Example
bash

Collapse

Unwrap

Run

Copy
curl -X GET "https://api.example.com/customer/wallet/balance?walletId=123e4567-e89b-12d3-a456-426614174000&languageCode=en" \
-H "Authorization: Bearer <token>"
6. Get Wallet Transactions
GET /transactions

Retrieves all transactions for a wallet.

Query Parameters
walletId (required): UUID of the wallet
languageCode: Language code (e.g., en)
Response
200 OK
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Retrieved 2 wallet transactions",
  "data": [
    {
      "id": "txn_123456",
      "wallet_id": "123e4567-e89b-12d3-a456-426614174000",
      "type": "DEPOSIT",
      "amount": 50.00,
      "currency": "USD",
      "status": "COMPLETED"
    },
    {
      "id": "txn_789012",
      "wallet_id": "123e4567-e89b-12d3-a456-426614174000",
      "type": "ORDER_PAYMENT",
      "amount": 25.00,
      "currency": "USD",
      "status": "COMPLETED"
    }
  ]
}
Errors
404 Not Found: Wallet not found
Curl Example
bash

Collapse

Unwrap

Run

Copy
curl -X GET "https://api.example.com/customer/wallet/transactions?walletId=123e4567-e89b-12d3-a456-426614174000&languageCode=en" \
-H "Authorization: Bearer <token>"
7. Credit Wallet for Reward
POST /reward

Credits a wallet with a gamification reward.

Request Body
json

Collapse

Unwrap

Copy
{
  "walletId": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 10.00,
  "rewardId": "reward_123456",
  "description": "Loyalty reward",
  "languageCode": "en"
}
Response
200 OK
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Successfully credited 10.00 for reward reward_123456",
  "data": {
    "id": "txn_123456",
    "wallet_id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "GAMIFICATION_REWARD",
    "amount": 10.00,
    "currency": "USD",
    "status": "COMPLETED"
  }
}
Errors
400 Bad Request: Invalid amount or currency mismatch
404 Not Found: Wallet or reward not found
Curl Example
bash

Collapse

Unwrap

Run

Copy
curl -X POST https://api.example.com/customer/wallet/reward \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{"walletId": "123e4567-e89b-12d3-a456-426614174000", "amount": 10.00, "rewardId": "reward_123456", "description": "Loyalty reward", "languageCode": "en"}'
Notes
All endpoints require authentication via Bearer token.
Amounts are validated against financial limits defined in paymentConstants.
Responses include localized messages based on languageCode.
Socket events are emitted for real-time updates (e.g., WALLET_CREATED, WALLET_FUNDED).
Audit logs and notifications are generated for all actions.
text

Collapse

Unwrap

Copy
**Notes**:
- Comprehensive Markdown documentation for all wallet endpoints.
- Includes precise curl commands with headers and payloads.
- Describes request/response formats, error codes, and notes on authentication, localization, and socket events.
- Aligns with Swagger comments in `walletRoutes.js`.