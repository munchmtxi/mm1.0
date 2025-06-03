docs/api/customer/services/mtables/orderService.md
markdown

Copy
# Order Service API

## POST /api/customer/mtables/orders/cart
summary: Add items to cart
### Summary
Adds items to a customer's cart.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('update_cart')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field       | Type    | Required | Description                              |
|-------------|---------|----------|------------------------------------------|
| branchId    | Integer | Yes      | Branch ID                                |
| items       | Array   | Yes      | Array of items                           |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "message": "Cart updated",
    "data": { "cartId": 123 }
  }
Errors:

Status	Code	Message
401	Unauthorized	Unauthorized
403	Forbidden	Permission denied
400	CART_UPDATE_FAILED	Cart update failed
POST /api/customer/mtables/orders
Creates a new order.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('create_order')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
bookingId	Integer	Yes	Booking ID
items	Array	No	Order items (if not using cart)
isPreOrder	Boolean	No	Is pre-order
cartId	Integer	No	Cart ID (if using cart)
dietaryPreferences	Array	No	Dietary preferences
paymentMethodId	Integer	No	Payment method ID
recommendationData	Object	No	Recommendation data
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Order created",
  "data": { "orderId": 123, "orderNumber": "ORD-123456-ABCDEF", "gamificationError": null }
}
Errors:

Status	Code	Message
401	Unauthorized	Unauthorized
403	Forbidden	Permission denied
400	ORDER_CREATION_FAILED	Order creation failed
Socket Events
Event: order_status
Payload:
json

Copy
{ "userId": null, "role": "user", "orderId": 1, "status": null, "promotionStatus": null }
POST /api/customer/mtables/orders/{orderId}/update
Summary
Updates an existing order.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('update_order')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
orderId	Integer	Order ID
Request Body

Field	Description
items	Order items (optional)
metadata	DietaryPreferences (optional)
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Order updated",
  "data": { "orderId": 123, "totalAmount": 500.00 }
}
Errors:

Status	Code	Message
401	Unauthorized	Unauthorized
403	Forbidden	Permission denied
400	ORDER_UPDATE_FAILED	Order update failed
Socket Events
Event: order:updated
Payload:
json

Copy
{ "userId": 456, "role": "customer", "orderId": 123, "totalAmount": 500.00 }
POST /api/customer/mtables/orders/{orderId}/cancel
Cancels an order.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('cancel_order')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
orderId	Integer	Order ID
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Order cancelled",
  "data": { "orderId": 123 }
}
Errors:

Status	Code	Message
401	Unauthorized	Unauthorized
403	Forbidden	Permission denied
400	ORDER_CANCELLATION_FAILED	Order cancellation failed
Socket Events
Event: order:cancelled
Payload:
json

Copy
{ "userId": 456, "role": "customer", "orderId": 123 }
GET /api/customer/mtables/orders/{orderId}/status
Tracks order status.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('view_order')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
orderId	Integer	Order ID
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Order status tracked",
  "data": { "orderId": "123, "status": "pending", "preparationStatus": "pending" }
}
text

Copy
- **Errors**:
  | Status | Code                     | Message                          |
  |--------|--------------------------|----------------------------------|
| | 401    | Unauthorized            | Unauthorized                     |
  | 403    | Forbidden               | Permission denied                |
| | 400  | ORDER_STATUS_TRACKING_FAILED | Order status tracking failed     |

### Socket Events
- **Event**: `order:status`
- **Payload**:
  ```json
  { "userId": 456, "role": "customer", "orderId": 123, "status": "pending", "preparationStatus": "pending }
POST /api/customer/mtables/orders/{orderId}/feedback
Submits feedback for an order.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('submit_feedback')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
orderId	orderId	Integer
Request Body

Field	Type	Required	Description
rating	Integer	Yes	Rating (1-5)
comment	String	No	Feedback comment
staffId	Integer	Yes	Staff ID (optional)
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Feedback submitted",
  "data": { "feedback_id": "feedbackId": 123, "gamificationError": null }
}
Errors:

Status	Code	Message
401	Unauthorized	Unauthorized
| | 403    | Forbidden               | Permission denied                |
| | 400    | FEEDBACK_SUBMISSION_FAILED | Feedback submission failed      |

Socket Events
Event: feedback:submitted
Payload:
json

Copy
{ "userId": 456, "role": "customer", "orderId": "123", "rating": "5" }