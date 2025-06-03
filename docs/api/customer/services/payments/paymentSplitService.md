Documentation File
C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\services\payments\paymentSplitService.md

markdown

Collapse

Unwrap

Copy
# Payment Split Service API

## POST /api/customer/payments/split

Splits payment for an order, in-dining order, booking, ride, or event among customers.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('split_payment')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field       | Type     | Required | Description                                |
|-------------|----------|----------|-------------------------------------|
| serviceId   | Integer | Yes       | ID of the service (order, booking, etc.)    |
| serviceType | String  | Yes      | Type of service (order, in_dining_order, booking, ride, event) |
| payments    | Array   | Yes      | List of payment details                   |
| payments[].customerId | Integer | Yes | Customer ID                                    |
| payments[].amount | Number | Yes | Payment amount                             |
| payments[].paymentMethod | String | Yes | Payment method (e.g., debit_card)          |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "data": {
      "serviceId": "integer",
      "serviceType": "string",
      "splitPayments": [
        {
          "paymentId": "integer",
          "customerId": "integer",
          "amount": "number",
          "transactionId": "integer"
        }
      ]
    },
  }
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_PAYMENT_METHOD	Invalid payment method
400	TRANSACTION_FAILED	Total amount mismatch or duplicate customer
400	INSUFFICIENT_FUNDS	Insufficient balance
404	WALLET_NOT_FOUND	Wallet not found
404	ORDER_NOT_FOUND	Order not found
404	BOOKING_NOT_FOUND	Booking not found
404	RIDE_NOT_FOUND	Ride not found
404	EVENT_NOT_FOUND	Event not found
400	INVALID_CUSTOMER	Invalid customer ID
Socket Events
Event: payment:split
Payload::
json

Collapse

Unwrap

Copy
{
  "serviceId": "integer",
  "serviceType": "string",
  "paymentId": integer,
  "amount": "number,
  "status": "string",
  "customerId": integer
}
}
Notifications
Sent to each customer with localized payment confirmation message.
POST /api/customer/payments/split/refund
Processes refunds for split payments.

Authentication
Middleware: authentication, restrictTo('customer'), checkPermissions('refund_payment')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
serviceId	Integer	Yes	ID of service (order, booking, etc.)
serviceType	String	Yes	Type of service
refunds	Array	Yes	List of refund details
refunds[].customerId	Integer	Yes	Customer ID
refunds[].amount	Number	Yes	Refund amount
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
    "serviceId": "integer",
    "serviceType": "string",
    "refunds": [
      {
        "customerId": "integer",
        "amount": "number",
        "transactionId": integer
      }
    ],
  },
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_PAYMENT_METHOD	Invalid payment method
400	TRANSACTION_FAILED	Duplicate customer or invalid refund
404	PAYMENT_NOT_FOUND	Payment not found
400	REFUNDED_EXCEEDED	Refund exceeds payment
404	WALLET_NOT_FOUND	Wallet not found
404	ORDER_NOT_FOUND	Order not found
404	BOOKING_NOT_FOUND	Booking not found
404	RIDE_NOT_FOUND	Ride not found
404	EVENT_NOT_FOUND	Event not found
Socket Events
Event: payment:refund
Payload:
json

Collapse

Unwrap

Copy
{
  "serviceId": "integer",
  "serviceType": "string",
  "amount": integer,
  "status": "string",
  "customerId": integer
}
Notifications
Sent to each customer with a refund details message.