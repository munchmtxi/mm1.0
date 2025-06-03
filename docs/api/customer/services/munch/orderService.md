Documentation File
C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\services\munch\orderService.md

markdown

Collapse

Unwrap

Copy
# Order Service API

## POST /api/customer/munch/merchants

Browses merchants by proximity and filters.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('browse_merchants')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field             | Type   | Required | Description                              |
|-------------------|--------|----------|------------------------------------------|
| latitude          | Number | Yes      | Customer's latitude (-90 to 90)          |
| longitude         | Number | Yes      | Customer's longitude (-180 to 180)       |
| radiusKm          | Number | Yes      | Search radius in kilometers              |
| filters           | Object | No       | Filters for merchant search              |
| filters.dietaryPreferences | Array | No  | Dietary filters (e.g., vegetarian, vegan) |
| filters.merchantType | String | No    | Merchant type (e.g., restaurant, cafe)   |
| filters.orderType | String | No       | Order type (e.g., dine_in, delivery)     |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "data": {
      "merchants": [
        {
          "branch": { "id": "integer", "name": "string", "distance": "number" },
          "menuItems": [{ "id": "integer", "name": "string", "price": "number" }]
        }
      ]
    }
  }
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	CUSTOMER_NOT_FOUND	Customer not found
POST /api/customer/munch/cart/add
Adds an item to the customer's cart.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('add_to_cart')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
itemId	Integer	Yes	Menu item ID
quantity	Integer	Yes	Quantity of item
customizations	Object	No	Customizations for the item
customizations.dietaryPreferences	Array	No	Dietary preferences
customizations.toppings	Array	No	Toppings selected
customizations.size	String	No	Size of the item
customizations.extras	Array	No	Extra options
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "cartId": "integer"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	MENU_ITEM_NOT_FOUND	Menu item not found
400	INVALID_DIETARY_FILTER	Invalid dietary filter
Socket Events
Event: cart:updated
Payload:
json

Collapse

Unwrap

Copy
{
  "cartId": "integer",
  "customerId": "string"
}
PUT /api/customer/munch/cart/update
Updates items in the customer's cart.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('update_cart'), checkCartAccess
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
cartId	Integer	Yes	Cart ID
items	Array	Yes	List of items to update
items[].itemId	Integer	Yes	Menu item ID
items[].quantity	Integer	Yes	Quantity of item (0 to remove)
items[].customizations	Object	No	Customizations for the item
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "cartId": "integer"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	CART_NOT_FOUND	Cart not found
404	MENU_ITEM_NOT_FOUND	Menu item not found
Socket Events
Event: cart:updated
Payload:
json

Collapse

Unwrap

Copy
{
  "cartId": "integer",
  "customerId": "string"
}
POST /api/customer/munch/order
Places an order from the cart.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('place_order')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
cartId	Integer	Yes	Cart ID
branchId	Integer	Yes	Merchant branch ID
deliveryLocation	Object	No	Delivery location details
deliveryLocation.latitude	Number	Yes	Latitude (-90 to 90)
deliveryLocation.longitude	Number	Yes	Longitude (-180 to 180)
deliveryLocation.address	String	Yes	Delivery address
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "orderId": "integer",
    "totalAmount": "number",
    "status": "string"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	CART_NOT_FOUND	Cart not found
404	RESTAURANT_NOT_FOUND	Restaurant not found
400	INSUFFICIENT_STOCK	Insufficient stock
400	INSUFFICIENT_FUNDS	Insufficient funds
Socket Events
Event: order:confirmed
Payload:
json

Collapse

Unwrap

Copy
{
  "orderId": "integer",
  "status": "string",
  "customerId": "string"
}
Notifications
Sent to customer with localized message for order confirmation.
PUT /api/customer/munch/order/update
Updates an existing order.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('update_order')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
orderId	Integer	Yes	Order ID
items	Array	Yes	List of items to update
items[].itemId	Integer	Yes	Menu item ID
items[].quantity	Integer	Yes	Quantity of item
items[].customizations	Object	No	Customizations for the item
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "orderId": "integer",
    "status": "string",
    "additionalAmount": "number"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	ORDER_NOT_FOUND	Order not found
400	CANNOT_UPDATE_ORDER	Cannot update order
400	INSUFFICIENT_STOCK	Insufficient stock
400	INSUFFICIENT_FUNDS	Insufficient funds
Socket Events
Event: order:updated
Payload:
json

Collapse

Unwrap

Copy
{
  "orderId": "integer",
  "status": "string",
  "customerId": "string"
}
Notifications
Sent to customer with localized message for order update.
PUT /api/customer/munch/order/cancel
Cancels an order and processes a refund.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('cancel_order')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
orderId	Integer	Yes	Order ID
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "orderId": "integer",
    "status": "string",
    "refundProcessed": "boolean"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	ORDER_NOT_FOUND	Order not found
400	ORDER_ALREADY_CANCELLED	Order already cancelled
400	CANNOT_CANCEL_ORDER	Cannot cancel order
404	WALLET_NOT_FOUND	Wallet not found
Socket Events
Event: order:cancelled
Payload:
json

Collapse

Unwrap

Copy
{
  "orderId": "integer",
  "status": "string",
  "customerId": "string"
}
Notifications
Sent to customer with localized message for order cancellation.