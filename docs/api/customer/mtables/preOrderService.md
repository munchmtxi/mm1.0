preOrderService.md
markdown

Collapse

Unwrap

Copy
# Pre-Order Service API Documentation

## Overview
The Pre-Order Service handles the creation of pre-orders for restaurant bookings and the distribution of payment requests among booking party members for bill splitting. It integrates with wallet, notification, gamification, and socket services to ensure seamless order processing, real-time updates, and user engagement.

## Endpoints

### 1. Create Pre-Order
- **Endpoint**: `POST /api/customer/mtables/pre-order`
- **Description**: Creates a pre-order for a specified booking with menu items, optional dietary preferences, and payment method.
- **Request Body**:
  ```json
  {
    "bookingId": 123,
    "items": [
      {
        "menuItemId": 456,
        "quantity": 2,
        "customizations": [{ "modifierId": 789 }]
      }
    ],
    "dietaryPreferences": ["VEGETARIAN"],
    "paymentMethodId": "credit_card",
    "recommendationData": {}
  }
Responses:
201 Created:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Order PRE-1234567890-ABCDEF placed successfully.",
  "data": {
    "order": {
      "id": 1,
      "order_number": "PRE-1234567890-ABCDEF",
      "total_amount": "25.00",
      "currency": "USD",
      "status": "pending",
      ...
    }
  }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "message": "Invalid input provided.",
  "errors": [...]
}
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/customer/mtables/pre-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "bookingId": 123,
    "items": [
      {
        "menuItemId": 456,
        "quantity": 2,
        "customizations": [{"modifierId": 789}]
      }
    ],
    "dietaryPreferences": ["VEGETARIAN"],
    "paymentMethodId": "credit_card",
    "recommendationData": {}
  }'
2. Send Pre-Order Payment Requests to Friends
Endpoint: POST /api/customer/mtables/pre-order/request-friends
Description: Sends payment requests to booking party members for splitting a pre-order bill.
Request Body:
json

Collapse

Unwrap

Copy
{
  "bookingId": 123,
  "orderId": 1,
  "amount": 25.00,
  "billSplitType": "EQUAL"
}
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Bill split completed for order PRE-1234567890-ABCDEF.",
  "data": {
    "paymentRequests": [
      {
        "id": 1,
        "customer_id": 456,
        "amount": "8.33",
        "currency": "USD",
        "status": "pending",
        "reference": "PR-PRE-1234567890-XYZ123",
        ...
      },
      ...
    ],
    "order": {
      "id": 1,
      "order_number": "PRE-1234567890-ABCDEF",
      ...
    }
  }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "message": "Invalid bill split type or parameters.",
  "errors": [...]
}
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/customer/mtables/pre-order/request-friends \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "bookingId": 123,
    "orderId": 1,
    "amount": 25.00,
    "billSplitType": "EQUAL"
  }'
Service Details
File: src/services/customer/mtables/preOrderService.js
Dependencies:
Sequelize models: Booking, Customer, BookingPartyMember, InDiningOrder, PaymentRequest, Wallet, MenuInventory, ProductDiscount, ProductModifier, OrderItems
Constants: mtablesConstants, customerConstants, customerWalletConstants, socialConstants, localizationConstants
Utility: dateTimeUtils
Functions:
createPreOrder: Creates a pre-order, validates booking status, menu items, wallet balance, and dietary preferences.
sendPreOrderRequestToFriends: Sends payment requests to party members for bill splitting, ensuring wallet availability and participant limits.
Validation
File: src/validators/customer/mtables/preOrderValidator.js
Validates input fields using express-validator.
Ensures bookingId, orderId, items, quantity, amount, and billSplitType meet constraints from constants.
Middleware
File: src/middleware/customer/mtables/preOrderMiddleware.js
validateBooking: Checks if the booking exists, is active, and belongs to the requesting customer.
validateOrder: Verifies the order exists, is a pre-order, and belongs to the requesting customer.
Routes
File: src/routes/customer/mtables/preOrderRoutes.js
Defines endpoints with Swagger documentation.
Applies validators and middleware before invoking controller methods.
Socket Events
Files:
src/socket/events/customer/mtables/preOrderEvents.js: Defines PRE_ORDER_CONFIRMATION and BILL_SPLIT_REQUEST events.
src/socket/handlers/customer/mtables/preOrderHandler.js: Handles socket events, emitting notifications and triggering additional notifications.
Localization
File: src/locales/customer/mtables/en.json
Updated with keys:
notifications.order.pre_order_created: "Pre-order {orderNumber} for {amount} placed successfully."
notifications.party.bill_split_request: "A bill split request for {amount} has been initiated for reservation {bookingId} by {inviterName}."
Error Handling
Uses constants for error codes (e.g., INVALID_INPUT, WALLET_INSUFFICIENT_FUNDS, INVALID_BILL_SPLIT).
Returns localized error messages via formatMessage.
Integration Points
Wallet: Validates balance and payment methods.
Notifications: Sends PRE_ORDER_CONFIRMATION and BILL_SPLIT_REQUEST notifications.
Gamification: Awards points for create_pre_order (12 points) and initiate_bill_split (15 points).
Audit: Logs PRE_ORDER_CREATED and BILL_SPLIT_PROCESSED actions.
Socket: Emits real-time updates to customer-specific rooms.
Assumptions
Authentication is handled in the main route index.
req.user provides customer_id, role, and languageCode.
req.io is the Socket.IO instance.
req.transaction ensures database consistency.
Translation files exist at locales/customer/mtables/{languageCode}.json.
Testing
Ensure Booking and InDiningOrder records exist in the database.
Test with valid and invalid inputs to verify error handling.
Verify notifications and socket events are triggered correctly.
Check audit logs for PRE_ORDER_CREATED and BILL_SPLIT_PROCESSED.
Security
Validates customer ownership of bookings and orders.
Sanitizes inputs via express-validator.
Uses Sequelize transactions for data consistency.
Logs actions for compliance via auditService.