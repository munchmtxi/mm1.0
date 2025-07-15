Documentation File
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\mtables\inDiningService.md

markdown

Collapse

Unwrap

Copy
# In-Dining Order Service API

This document details the In-Dining Order Service API for the `mtables` module, which allows customers to place, update, provide feedback on, and retrieve in-dining orders. The API integrates gamification, notifications, socket events, and audit logging, using localized responses.

## Base URL
`http://localhost:3000/customer/mtables`

## Authentication
All endpoints require a JWT token in the `Authorization` header with the format `Bearer <token>`. The token must have a `role` of `customer`.

## Endpoints

### 1. Create In-Dining Order
Creates a new in-dining order for a customer at a specific branch and table.

- **Method**: POST
- **Path**: `/orders`
- **Request Body**:
  ```json
  {
    "customerId": "uuid",
    "branchId": "uuid",
    "tableId": "uuid",
    "cartId": "uuid",
    "notes": "string (optional, max 500 characters)"
  }
Response:
201 Created:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Order ORD-1234567890-ABCDEF placed successfully.",
  "data": {
    "order": { "id": "uuid", "order_number": "ORD-1234567890-ABCDEF", ... },
    "branch": { "id": "uuid", "name": "Branch Name", ... },
    "table": { "id": "uuid", "status": "reserved", ... }
  }
}
400 Bad Request: Invalid input, table unavailable, max orders exceeded, etc.
403 Forbidden: Unauthorized access.
CURL Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/mtables/orders \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "123e4567-e89b-12d3-a456-426614174000",
    "branchId": "223e4567-e89b-12d3-a456-426614174001",
    "tableId": "323e4567-e89b-12d3-a456-426614174002",
    "cartId": "423e4567-e89b-12d3-a456-426614174003",
    "notes": "No onions, please."
  }'
Features:
Validates customer, branch, table, and cart.
Awards 15 gamification points for order_placed (if under 50 daily actions).
Sends a notification (order.order_placed).
Emits a customer_order_update socket event.
Logs an audit action (ORDER_CREATED).
2. Update In-Dining Order
Updates an existing in-dining order's status, preparation status, or notes.

Method: PUT
Path: /orders
Request Body:
json

Collapse

Unwrap

Copy
{
  "orderId": "uuid",
  "status": "string (optional, enum: ['pending', 'preparing', 'completed', 'cancelled'])",
  "preparationStatus": "string (optional, enum: ['pending', 'in_progress', 'completed'])",
  "notes": "string (optional, max 500 characters)"
}
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Order ORD-1234567890-ABCDEF updated successfully.",
  "data": {
    "order": { "id": "uuid", "order_number": "ORD-1234567890-ABCDEF", ... }
  }
}
400 Bad Request: Invalid input or order not found.
403 Forbidden: Unauthorized access.
CURL Example:
bash

Collapse

Unwrap

Run

Copy
curl -X PUT http://localhost:3000/customer/mtables/orders \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "523e4567-e89b-12d3-a456-426614174004",
    "status": "preparing",
    "preparationStatus": "in_progress",
    "notes": "Updated notes."
  }'
Features:
Validates order and input.
Sends a notification if status or preparation status changes (order.order_updated).
Emits a customer_order_update socket event.
Logs an audit action (ORDER_UPDATED).
3. Submit Order Feedback
Submits feedback for an in-dining order.

Method: POST
Path: /orders/feedback
Request Body:
json

Collapse

Unwrap

Copy
{
  "orderId": "uuid",
  "rating": "integer (1-5)",
  "comment": "string (optional, max 1000 characters)"
}
Response:
201 Created:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Feedback for order ORD-1234567890-ABCDEF submitted successfully.",
  "data": {
    "feedback": { "id": "uuid", "rating": 4, "comment": "Great service!", ... }
  }
}
400 Bad Request: Invalid rating or order not found.
403 Forbidden: Unauthorized access.
CURL Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/mtables/orders/feedback \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "523e4567-e89b-12d3-a456-426614174004",
    "rating": 4,
    "comment": "Great service!"
  }'
Features:
Validates order and rating (1-5).
Awards 10 gamification points for order_review_submitted (if under 50 daily actions).
Sends a notification (order.feedback_submitted).
Emits a feedback_submitted socket event.
Logs an audit action (FEEDBACK_SUBMITTED).
4. Get In-Dining Order History
Retrieves a customer's in-dining order history, optionally filtered by customer or branch.

Method: GET
Path: /orders/history
Query Parameters:
customerId: UUID (optional)
branchId: UUID (optional)
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Retrieved 5 orders successfully.",
  "data": {
    "orders": [
      { "id": "uuid", "order_number": "ORD-1234567890-ABCDEF", ... },
      ...
    ]
  }
}
400 Bad Request: Invalid input.
403 Forbidden: Unauthorized access.
CURL Example:
bash

Collapse

Unwrap

Run

Copy
curl -X GET "http://localhost:3000/customer/mtables/orders/history?customerId=123e4567-e89b-12d3-a456-426614174000&branchId=223e4567-e89b-12d3-a456-426614174001" \
  -H "Authorization: Bearer <JWT_TOKEN>"
Features:
Validates customer ID against authenticated user.
Logs an audit action (ORDER_HISTORY_VIEWED).
Gamification
Actions:
order_placed: 15 points, awarded on order creation.
order_review_submitted: 10 points, awarded on feedback submission.
Limit: Maximum 50 daily actions (MAX_DAILY_ACTIONS).
Points are awarded only if the daily action limit is not exceeded, tracked via the GamificationPoints model.
Notifications
Order Creation: Sends order.order_placed notification.
Order Update: Sends order.order_updated notification if status or preparation status changes.
Feedback Submission: Sends order.feedback_submitted notification.
All notifications use the customer/mtables module and are localized based on the user's preferred_language.
Socket Events
customer_order_update: Emitted on order creation and updates.
Payload: { userId, role, auditAction, orderId, orderNumber, status, branchId, tableId, preparationStatus }
Room: customer:${customerId}
feedback_submitted: Emitted on feedback submission.
Payload: { userId, role, auditAction, orderId, rating, comment }
Room: customer:${customerId}
Audit Logging
Logs actions (ORDER_CREATED, ORDER_UPDATED, FEEDBACK_SUBMITTED, ORDER_HISTORY_VIEWED) with user ID, role, details, and IP address.
Uses the auditService to ensure compliance tracking.
Localization
Uses locales/customer/mtables/en.json for English translations.
Keys: notifications.order.* for success messages and notifications, errors.* for error messages.
Supports user-preferred language or defaults to en.
Error Handling
Errors return a JSON response:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid input provided."
  }
}
Common errors: INVALID_INPUT, INVALID_CUSTOMER_ID, INVALID_BRANCH_ID, TABLE_NOT_AVAILABLE, MAX_BOOKINGS_EXCEEDED, INVALID_CART, INVALID_MENU_ITEM, ORDER_NOT_FOUND, INVALID_FEEDBACK_RATING, WALLET_INSUFFICIENT_FUNDS, unauthorized_access.
Dependencies
Models: InDiningOrder, MenuInventory, Cart, CartItem, Customer, MerchantBranch, Table, ProductDiscount, OrderItems, Review, GamificationPoints.
Services: inDiningOrderService, socketService, notificationService, pointService, auditService.
Utilities: formatMessage (localization), dateTimeUtils.
Constants: customerConstants, customerGamificationConstants, paymentConstants, socketConstants, localizationConstants.
Notes
The mapService and locationService are not used, as location-based validation is not required.
Ensure JWT_SECRET is set in the environment for authentication.
The GamificationPoints model must be defined to track daily actions.