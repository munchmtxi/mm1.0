API Documentation (paymentRequestService.md)
markdown

Collapse

Unwrap

Copy
# Payment Request Service API Documentation

## Overview
The Payment Request Service handles the creation and management of payment requests for bookings and pre-orders within the `mtables` module. It supports bill splitting among booking participants, validates wallet balances, and integrates with gamification, audit, and socket services for real-time updates.

## Base URL
`https://api.munch1.com/v1/customer/mtables`

## Authentication
All endpoints require a valid JWT token in the `Authorization` header as `Bearer <token>`. Authentication is handled in the main route index.

## Endpoints

### 1. Send Payment Request
Initiates a payment request for a booking, splitting the amount equally among participants.

#### **POST /payment-requests**
- **Description**: Creates payment requests for a booking's bill split.
- **Request Body**:
  - `bookingId` (number, required): The ID of the booking.
  - `amount` (number, required): Total amount to split (min: 1, max: 10000).
  - `billSplitType` (string, required): Type of bill split (`equal`, `custom`, `itemized`, `percentage`, `sponsor_contribution`).
- **Response**:
  - **200 OK**:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "booking_id": 123,
          "customer_id": 456,
          "amount": 25.00,
          "currency": "USD",
          "status": "pending",
          "reference": "PR-1698765432000-ABCDEF"
        }
      ],
      "message": "Payment request for 100 sent for booking 123."
    }
400 Bad Request:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "message": "Invalid input provided.",
  "errorCode": "INVALID_INPUT"
}
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X POST https://api.munch1.com/v1/customer/mtables/payment-requests \
-H "Authorization: Bearer <your_jwt_token>" \
-H "Content-Type: application/json" \
-d '{
  "bookingId": 123,
  "amount": 100,
  "billSplitType": "equal"
}'
Error Codes:
INVALID_INPUT: Missing or invalid input parameters.
INVALID_AMOUNT: Amount outside allowed range (1-10000).
INVALID_BILL_SPLIT: Invalid bill split type.
BOOKING_NOT_FOUND: Booking not found or in no-show status.
CUSTOMER_NOT_FOUND: One or more customers not found.
WALLET_NOT_FOUND: Customer wallet not found.
WALLET_INSUFFICIENT_FUNDS: Insufficient wallet balance.
MAX_SPLIT_PARTICIPANTS_EXCEEDED: Too many participants for bill split.
PERMISSION_DENIED: User not authorized (non-customer role).
2. Send Pre-Order Payment Request
Initiates a payment request for a pre-order associated with a booking.

POST /pre-order-payment-requests
Description: Creates payment requests for a pre-order's bill split.
Request Body:
bookingId (number, required): The ID of the booking.
orderId (number, required): The ID of the pre-order.
amount (number, required): Total amount to split (min: 1, max: 10000).
billSplitType (string, required): Type of bill split (equal, custom, itemized, percentage, sponsor_contribution).
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "data": {
    "paymentRequests": [
      {
        "id": 2,
        "booking_id": 123,
        "customer_id": 456,
        "amount": 25.00,
        "currency": "USD",
        "status": "pending",
        "reference": "PR-PRE-1698765432000-ABCDEF",
        "order_id": 789
      }
    ],
    "order": {
      "id": 789,
      "order_type": "pre_order",
      "currency": "USD"
    }
  },
  "message": "Pre-order payment request for 100 sent for order 789."
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "message": "Invalid input provided.",
  "errorCode": "INVALID_INPUT"
}
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X POST https://api.munch1.com/v1/customer/mtables/pre-order-payment-requests \
-H "Authorization: Bearer <your_jwt_token>" \
-H "Content-Type: application/json" \
-d '{
  "bookingId": 123,
  "orderId": 789,
  "amount": 100,
  "billSplitType": "equal"
}'
Error Codes:
INVALID_INPUT: Missing or invalid input parameters.
INVALID_AMOUNT: Amount outside allowed range (1-10000).
INVALID_BILL_SPLIT: Invalid bill split type.
BOOKING_NOT_FOUND: Booking not found or in no-show status.
ORDER_NOT_FOUND: Pre-order not found.
CUSTOMER_NOT_FOUND: One or more customers not found.
WALLET_NOT_FOUND: Customer wallet not found.
WALLET_INSUFFICIENT_FUNDS: Insufficient wallet balance.
MAX_SPLIT_PARTICIPANTS_EXCEEDED: Too many participants for bill split.
PERMISSION_DENIED: User not authorized (non-customer role).
Integration Details
Service: paymentRequestService.js handles core logic, validating inputs, customer wallets, and bill split types.
Controller: paymentRequestController.js orchestrates service calls, audit logging, gamification points, and socket emissions.
Middleware: Validates request body and sanitizes inputs.
Socket Events: Emits BILL_SPLIT_REQUEST_SENT and PRE_ORDER_BILL_SPLIT_REQUEST_SENT for real-time updates.
Localization: Uses formatMessage for localized success/error messages in en.json.
Gamification: Awards 10 points for payment requests, 15 for pre-order payment requests (bill_split_initiated action).
Audit: Logs BILL_SPLIT_PROCESSED actions for compliance.
Dependencies
Models: Booking, Customer, Wallet, BookingPartyMember, PaymentRequest, InDiningOrder.
Constants: mtablesConstants, paymentConstants, customerConstants, customerWalletConstants, socialConstants, customerGamificationConstants.
Services: socketService, pointService, auditService.
Utilities: localization.js (formatMessage), logger.js.
Notes
Only equal bill split type is currently implemented; others require additional logic.
Assumes req.user contains userId, role, and languageCode.
Socket events assume socketConstants.SOCKET_EVENT_TYPES includes BILL_SPLIT_REQUEST_SENT and PRE_ORDER_BILL_SPLIT_REQUEST_SENT.
All monetary amounts are in the default currency (e.g., USD).