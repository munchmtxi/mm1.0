API Documentation: docs/api/customer/mtables/cartService.md
markdown

Collapse

Unwrap

Copy
# Cart Service API Documentation

**Last Updated**: July 1, 2025

## Overview
The Cart Service manages customer cart operations for the mtables platform, enabling customers to add, update, clear, and retrieve cart items for pre-orders. It integrates with gamification (`pointService`), notifications (`notificationService`), audit logging (`auditService`), and real-time updates (`socketService`). The service ensures validation of customer, branch, and menu items, handles customizations, and supports transactions for data consistency.

## Base URL
`https://api.mtables.com/api/customer/mtables/cart`

## Authentication
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Required**: All endpoints require a valid JWT token for customer authentication.
- **Role**: Customer (`role: customer` in token payload).

## Endpoints

### 1. Add Items to Cart
- **Endpoint**: `POST /`
- **Description**: Adds items to a customer's cart, creating a new cart if none exists. Awards gamification points, sends notifications, emits socket events, and logs actions.
- **Request Headers**:
  - `Authorization`: Bearer token.
  - `Content-Type`: application/json.
- **Request Body**:
  ```json
  {
    "customerId": "string",
    "branchId": "string",
    "items": [
      {
        "menuItemId": "string",
        "quantity": "number",
        "customizations": [
          {
            "modifierId": "string",
            "value": "string"
          }
        ]
      }
    ]
  }
customerId: Customer's unique ID.
branchId: Merchant branch ID.
items: Array of items to add.
menuItemId: Menu item ID.
quantity: Number of items (min: 1).
customizations: Optional array of modifier objects.
Response:
201 Created:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Items added to cart {cartId} successfully.",
  "data": {
    "cart": {
      "id": "string",
      "customer_id": "string",
      "created_at": "string",
      "updated_at": "string"
    },
    "cartItems": [
      {
        "id": "string",
        "cart_id": "string",
        "menu_item_id": "string",
        "quantity": "number",
        "unit_price": "number",
        "customizations": []
      }
    ]
  }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "error": "Invalid input provided.",
  "code": "INVALID_INPUT"
}
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X POST "https://api.mtables.com/api/customer/mtables/cart" \
-H "Authorization: Bearer <JWT_TOKEN>" \
-H "Content-Type: application/json" \
-d '{
  "customerId": "cust_123",
  "branchId": "branch_456",
  "items": [
    {
      "menuItemId": "item_789",
      "quantity": 2,
      "customizations": [
        {
          "modifierId": "mod_101",
          "value": "extra cheese"
        }
      ]
    }
  ]
}'
Error Codes:
INVALID_INPUT: Missing or invalid request data.
INVALID_CUSTOMER_ID: Customer not found.
INVALID_BRANCH_ID: Branch not found.
INVALID_MENU_ITEM: Menu item invalid or out of stock.
INVALID_CUSTOMIZATIONS: Invalid modifier IDs.
2. Update Cart
Endpoint: PUT /:cartId
Description: Updates items in an existing cart, replacing all non-saved items. Sends notifications, emits socket events, and logs actions.
Request Headers:
Authorization: Bearer token.
Content-Type: application/json.
Request Parameters:
cartId: Cart ID (path parameter).
Request Body:
json

Collapse

Unwrap

Copy
{
  "items": [
    {
      "menuItemId": "string",
      "quantity": "number",
      "customizations": [
        {
          "modifierId": "string",
          "value": "string"
        }
      ]
    }
  ]
}
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Cart {cartId} updated successfully.",
  "data": {
    "cart": {
      "id": "string",
      "customer_id": "string",
      "created_at": "string",
      "updated_at": "string"
    },
    "cartItems": [
      {
        "id": "string",
        "cart_id": "string",
        "menu_item_id": "string",
        "quantity": "number",
        "unit_price": "number",
        "customizations": []
      }
    ]
  }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "error": "Cart not found.",
  "code": "INVALID_CART_ID"
}
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X PUT "https://api.mtables.com/api/customer/mtables/cart/cart_123" \
-H "Authorization: Bearer <JWT_TOKEN>" \
-H "Content-Type: application/json" \
-d '{
  "items": [
    {
      "menuItemId": "item_789",
      "quantity": 1,
      "customizations": [
        {
          "modifierId": "mod_101",
          "value": "no onions"
        }
      ]
    }
  ]
}'
Error Codes:
INVALID_INPUT: Missing or invalid request data.
INVALID_CART_ID: Cart not found or not owned by customer.
INVALID_MENU_ITEM: Menu item invalid or out of stock.
INVALID_CUSTOMIZATIONS: Invalid modifier IDs.
3. Clear Cart
Endpoint: DELETE /:cartId
Description: Removes all items from a customer's cart. Sends notifications, emits socket events, and logs actions.
Request Headers:
Authorization: Bearer token.
Request Parameters:
cartId: Cart ID (path parameter).
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Cart {cartId} cleared successfully.",
  "data": {
    "cart": {
      "id": "string",
      "customer_id": "string",
      "created_at": "string",
      "updated_at": "string"
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
  "error": "Cart not found.",
  "code": "INVALID_CART_ID"
}
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X DELETE "https://api.mtables.com/api/customer/mtables/cart/cart_123" \
-H "Authorization: Bearer <JWT_TOKEN>"
Error Codes:
INVALID_CART_ID: Cart not found or not owned by customer.
4. Get Cart
Endpoint: GET /:cartId
Description: Retrieves details of a customer's cart, including items and menu details. Logs action for audit.
Request Headers:
Authorization: Bearer token.
Request Parameters:
cartId: Cart ID (path parameter).
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Cart {cartId} retrieved successfully.",
  "data": {
    "cart": {
      "id": "string",
      "customer_id": "string",
      "created_at": "string",
      "updated_at": "string",
      "items": [
        {
          "id": "string",
          "cart_id": "string",
          "menu_item_id": "string",
          "quantity": "number",
          "unit_price": "number",
          "customizations": [],
          "menu_item": {
            "id": "string",
            "name": "string",
            "price": "number"
          }
        }
      ]
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
  "error": "Cart not found.",
  "code": "INVALID_CART_ID"
}
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X GET "https://api.mtables.com/api/customer/mtables/cart/cart_123" \
-H "Authorization: Bearer <JWT_TOKEN>"
Error Codes:
INVALID_CART_ID: Cart not found or not owned by customer.
Models
Cart:
id: string
customer_id: string
created_at: string (ISO 8601)
updated_at: string (ISO 8601)
CartItem:
id: string
cart_id: string
menu_item_id: string
quantity: number
unit_price: number
customizations: array
menu_item: object (MenuInventory details)
Dependencies
Models: Cart, CartItem, Customer, MerchantBranch, MenuInventory, ProductDiscount, ProductModifier
Constants:
mtablesConstants: Error codes (INVALID_INPUT, INVALID_CUSTOMER_ID, INVALID_BRANCH_ID, INVALID_MENU_ITEM, INVALID_CUSTOMIZATIONS, INVALID_CART_ID).
customerConstants: Notification types, audit actions.
gamificationConstants: Point awards (pre_order_placed).
localizationConstants: Language and message formatting.
Services:
cartService: Core cart operations.
socketService: Real-time event emission.
pointService: Gamification point awards.
notificationService: Sends notifications.
auditService: Logs actions for compliance.
Utilities:
localization: Formats localized messages.
logger: Logs events and errors.
AppError: Standardized error handling.
Integration Notes
Gamification: Awards points for pre_order_placed (8 points) on cart creation.
Notifications: Sends notifications via notificationService for add, update, and clear actions.
Socket Events: Emits events (CART_ADDED, CART_UPDATED, CART_CLEARED) via socketService.
Audit Logging: Logs actions (CART_CREATED, CART_UPDATED, CART_CLEARED, CART_RETRIEVED) via auditService.
Localization: Uses formatMessage for responses based on user’s preferred_language or localizationConstants.DEFAULT_LANGUAGE.
Error Handling
All errors return a JSON response with success: false, error, and code.
Errors are logged via logger.logErrorEvent for debugging and audit trails.
Rate Limiting
Applied at the API gateway level (not implemented in service).
Recommended: 100 requests per minute per customer.
Security
JWT token validation ensures only authorized customers access their carts.
Input validation via cartValidator prevents malformed requests.
Audit logging ensures traceability of all actions.