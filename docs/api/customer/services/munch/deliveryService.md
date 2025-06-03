Documentation File
C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\services\munch\deliveryService.md

markdown

Collapse

Unwrap

Copy
# Delivery Service API

## GET /api/customer/munch/delivery/{orderId}/status

Tracks the status of a delivery.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('track_delivery')`, `checkOrderAccess`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Parameters
| Field   | Type   | Required | Description       |
|---------|--------|----------|-------------------|
| orderId | Integer| Yes      | Order ID          |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "data": {
      "orderId": "integer",
      "status": "string",
      "estimatedDeliveryTime": "string",
      "driver": {
        "name": "string",
        "phone": "string",
        "location": ["number", "number"]
      },
      "deliveryLocation": "object",
      "lastUpdated": "string"
    }
  }
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	ORDER_NOT_FOUND	Order not found
400	NO_DRIVER_ASSIGNED	No driver assigned
PUT /api/customer/munch/delivery/cancel
Cancels a delivery and processes a refund if applicable.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('cancel_delivery'), checkOrderAccess
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
Event: delivery:cancelled
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
Sent to customer with localized message for delivery cancellation.
POST /api/customer/munch/delivery/communicate
Sends a message to the driver.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('communicate_driver'), checkOrderAccess
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
orderId	Integer	Yes	Order ID
message	String	Yes	Message to driver
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
    "message": "string",
    "sentAt": "string"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	ORDER_NOT_FOUND	Order not found
400	NO_DRIVER_ASSIGNED	No driver assigned
Socket Events
Event: driver:communicated
Payload:
json

Collapse

Unwrap

Copy
{
  "orderId": "integer",
  "message": "string",
  "customerId": "string"
}
Notifications
Sent to customer with localized message for driver communication.