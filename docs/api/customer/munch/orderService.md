orderService.md
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\munch\orderService.md

markdown

Collapse

Unwrap

Copy
# Customer Munch Order Service API

This document details the API endpoints for the Customer Munch Order Service, which allows customers to browse merchants, manage cart items, place orders, update orders, and cancel orders. The service integrates with gamification, notifications, location validation, audit logging, and real-time socket updates.

## Base URL
`https://api.munch.com/v1/customer/munch/orders`

## Endpoints

### 1. Browse Merchants
- **Method**: POST
- **Path**: `/browse`
- **Description**: Retrieves a list of merchants based on the customer's location and optional filters.
- **Request Body**:
  - `latitude` (number, required): Latitude of the customer's location (-90 to 90).
  - `longitude` (number, required): Longitude of the customer's location (-180 to 180).
  - `radiusKm` (number, required): Search radius in kilometers (0.1 to 100).
  - `filters` (object, optional): Additional filters (e.g., cuisine, rating).
- **Response**:
  - **200 OK**:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "name": "Example Merchant",
          "location": { "latitude": 40.7128, "longitude": -74.0060 },
          "cuisine": "Italian"
        }
      ],
      "message": "Merchants retrieved successfully"
    }
400 Bad Request: Invalid input.
500 Internal Server Error: Server error.
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X POST https://api.munch.com/v1/customer/munch/orders/browse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "radiusKm": 5,
    "filters": { "cuisine": "Italian" }
  }'
Notes:
Logs audit action BROWSE_MERCHANTS.
Uses locationService for geofencing.
2. Add Item to Cart
Method: POST
Path: /cart
Description: Adds an item to the customer's cart with optional customizations.
Request Body:
itemId (integer, required): ID of the menu item (min: 1).
quantity (integer, required): Quantity of the item (min: 1).
customizations (object, optional): Customizations for the item (e.g., toppings).
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "data": {
    "cartId": 1,
    "items": [{ "itemId": 1, "quantity": 2, "customizations": {} }]
  },
  "message": "Item added to cart successfully"
}
400 Bad Request: Invalid input.
500 Internal Server Error: Server error.
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X POST https://api.munch.com/v1/customer/munch/orders/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "itemId": 1,
    "quantity": 2,
    "customizations": { "toppings": ["cheese", "pepperoni"] }
  }'
Notes:
Awards gamification points for add_to_cart action.
Logs audit action ADD_TO_CART.
3. Update Cart
Method: PUT
Path: /cart
Description: Updates items in the customer's cart.
Request Body:
cartId (integer, required): ID of the cart (min: 1).
items (array, required): Array of items with itemId, quantity, and optional customizations.
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "data": {
    "cartId": 1,
    "items": [{ "itemId": 1, "quantity": 1, "customizations": {} }]
  },
  "message": "Cart updated successfully"
}
400 Bad Request: Invalid input.
500 Internal Server Error: Server error.
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X PUT https://api.munch.com/v1/customer/munch/orders/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "cartId": 1,
    "items": [
      { "itemId": 1, "quantity": 1, "customizations": {} },
      { "itemId": 2, "quantity": 0 }
    ]
  }'
Notes:
Logs audit action UPDATE_CART.
Supports partial updates (e.g., removing items by setting quantity to 0).
4. Place Order
Method: POST
Path: /
Description: Places an order from the cart with a specified delivery location.
Request Body:
cartId (integer, required): ID of the cart (min: 1).
branchId (integer, required): ID of the merchant branch (min: 1).
deliveryLocation (object, required): Delivery coordinates with latitude (-90 to 90) and longitude (-180 to 180).
Response:
201 Created:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "data": {
    "order": {
      "id": 1,
      "order_number": "ORD123",
      "total_amount": 25.50
    },
    "walletBalance": 100.00
  },
  "message": "Order ORD123 placed successfully"
}
400 Bad Request: Invalid input.
500 Internal Server Error: Server error.
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X POST https://api.munch.com/v1/customer/munch/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "cartId": 1,
    "branchId": 1,
    "deliveryLocation": { "latitude": 40.7128, "longitude": -74.0060 }
  }'
Notes:
Validates delivery location with locationService.
Awards gamification points for order_placed action.
Sends notification (order_placed) and socket event (CUSTOMER_ORDER_UPDATE).
Logs audit action ORDER_PLACED.
5. Update Order
Method: PUT
Path: /
Description: Updates an existing order with new details (e.g., items, delivery location).
Request Body:
orderId (integer, required): ID of the order (min: 1).
updates (object, required): Updates to apply (e.g., new items, delivery location).
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "data": {
    "order": {
      "id": 1,
      "order_number": "ORD123",
      "total_amount": 30.00
    },
    "walletBalance": 95.00,
    "additionalAmount": 4.50
  },
  "message": "Order ORD123 updated successfully"
}
400 Bad Request: Invalid input.
500 Internal Server Error: Server error.
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X PUT https://api.munch.com/v1/customer/munch/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "orderId": 1,
    "updates": { "items": [{ "itemId": 1, "quantity": 3 }] }
  }'
Notes:
Sends notification (order_updated) and socket event (CUSTOMER_ORDER_UPDATE).
Logs audit action ORDER_UPDATED.
Updates wallet balance if additional payment is required.
6. Cancel Order
Method: DELETE
Path: /:orderId
Description: Cancels an existing order and processes any applicable refunds.
Parameters:
orderId (path, integer, required): ID of the order to cancel (min: 1).
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "data": {
    "order": {
      "id": 1,
      "order_number": "ORD123",
      "status": "cancelled"
    },
    "walletBalance": 105.00,
    "refundAmount": 25.50,
    "refundProcessed": true
  },
  "message": "Order ORD123 cancelled successfully"
}
400 Bad Request: Invalid order ID.
500 Internal Server Error: Server error.
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X DELETE https://api.munch.com/v1/customer/munch/orders/1 \
  -H "Authorization: Bearer <your-token>"
Notes:
Sends notification (order_cancelled) if refund is processed.
Emits socket event (CUSTOMER_ORDER_UPDATE).
Logs audit action ORDER_CANCELLED.
Integration Details
Authentication: Handled at the main route index (Bearer token required).
Gamification: Awards points for add_to_cart (5 points) and order_placed (15 points) via pointService.
Notifications: Sends notifications via notificationService for order placement, updates, and cancellations.
Location Validation: Uses locationService to validate and resolve delivery locations.
Audit Logging: Logs all actions (BROWSE_MERCHANTS, ADD_TO_CART, UPDATE_CART, ORDER_PLACED, ORDER_UPDATED, ORDER_CANCELLED) via auditService.
Real-Time Updates: Emits CUSTOMER_ORDER_UPDATE events via socketService to merchant rooms.
Localization: Uses formatMessage with customer/munch/en.json for localized messages based on user’s preferred_language.
Error Handling
All endpoints use AppError for consistent error responses.
Errors are logged via logger.logErrorEvent.
Localized error messages are returned using formatMessage.
Dependencies
Models: Order, Customer, Wallet, MerchantBranch, Merchant.
Services: orderService, pointService, notificationService, locationService, auditService, socketService.
Constants: customerConstants, customerGamificationConstants, customerWalletConstants, paymentConstants, localizationConstants, socketConstants.
Utilities: formatMessage, AppError, logger.
Notes
All endpoints use Sequelize transactions for database consistency.
Socket.IO instance (req.io) is injected via middleware for real-time updates.
Responses include localized messages and relevant data (e.g., order details, wallet balance).
The API assumes a secure HTTPS connection and proper authentication at the main route level.