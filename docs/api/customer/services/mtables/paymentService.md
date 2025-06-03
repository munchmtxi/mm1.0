docs/api/customer/services/mtables/paymentService.md
markdown

Copy
# Payment Service API

## POST /api/customer/mtables/payments

Processes a payment for a booking or order.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('process_payment')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field           | Type    | Required | Description                              |
|-----------------|---------|----------|------------------------------------------|
| id              | Integer | Yes      | Booking or Order ID                      |
| amount          | Number  | No       | Payment amount (if not split)            |
| walletId        | Integer | Yes      | Wallet ID                                |
| paymentMethodId | Integer | No       | Payment method ID                        |
| splitPayments   | Array   | No       | Array of split payments                  |
| type            | String  | Yes      | Type: 'booking' or 'order'               |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "message": "Payment processed",
    "data": {
      "paymentId": 123,
      "amount": 50.00,
      "transactions": [{ "id": 456, "amount": 50.00 }],
      "gamificationError": null
    }
  }
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	PAYMENT_PROCESSING_FAILED	Payment processing error
Socket Events
Event: payment:processed
Payload:
json

Copy
{ "userId": 456, "role": "customer", "paymentId": 123, "amount": 50.00 }
POST /api/customer/mtables/payments/refund
Issues a refund for a payment.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('issue_refund')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
id	Integer	Yes	Booking or Order ID
walletId	Integer	Yes	Wallet ID
transactionId	Integer	Yes	Transaction ID
type	String	Yes	Type: 'booking' or 'order'
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Refund processed",
  "data": { "transactionId": 456, "amount": 50.00 }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	REFUND_PROCESSING_FAILED	Refund processing error
Socket Events
Event: payment:refunded
Payload:
json

Copy
{ "userId": 456, "role": "customer", "transactionId": 456, "amount": 50.00 }