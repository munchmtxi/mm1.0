API Documentation: paymentSplitService.md
This Markdown file provides detailed API documentation, including curl commands.

markdown

Collapse

Unwrap

Copy
# Split Payment Service API

API endpoints for initiating and refunding split payments for customers across various services (orders, in-dining orders, bookings, rides, events).

## Base URL
`https://api.mmfinale.com/customer/payments`

## Endpoints

### 1. Initiate Split Payment
Initiates a split payment for a service among multiple customers.

- **Method**: POST
- **Path**: `/split`
- **Authentication**: Bearer token required
- **Content-Type**: `application/json`

#### Request Body
| Field          | Type   | Description                                  | Required |
|----------------|--------|----------------------------------------------|----------|
| serviceId      | String | ID of the service (e.g., order ID, ride ID)  | Yes      |
| serviceType    | String | Type of service: `order`, `in_dining_order`, `booking`, `ride`, `event` | Yes |
| billSplitType  | String | Type of bill split: `EQUAL`, `CUSTOM`, `ITEMIZED`, `PERCENTAGE`, `SPONSOR_CONTRIBUTION` | Yes |
| payments       | Array  | List of payment details                      | Yes      |
| payments[].customerId | String | ID of the customer making the payment | Yes      |
| payments[].amount | Number | Payment amount (min: 0.01, max: 10000)       | Yes      |
| payments[].paymentMethod | String | Payment method: `CREDIT_CARD`, `DEBIT_CARD`, `WALLET`, `APPLE_PAY`, `GOOGLE_PAY`, `PAYPAL` | Yes |
| location       | Object | Location data for rides or in-dining orders   | No       |
| location.lat   | Number | Latitude                                     | If location provided |
| location.lng   | Number | Longitude                                    | If location provided |

#### Example Request
```bash
curl -X POST https://api.mmfinale.com/customer/payments/split \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "12345",
    "serviceType": "order",
    "billSplitType": "EQUAL",
    "payments": [
      {
        "customerId": "67890",
        "amount": 25.50,
        "paymentMethod": "WALLET"
      },
      {
        "customerId": "67891",
        "amount": 25.50,
        "paymentMethod": "CREDIT_CARD"
      }
    ],
    "location": {
      "lat": 37.7749,
      "lng": -122.4194
    }
  }'
Responses
200 OK: Split payment initiated successfully
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Payment initiated for service order #12345",
  "data": {
    "serviceId": "12345",
    "serviceType": "order",
    "billSplitType": "EQUAL",
    "splitPayments": [
      {
        "paymentId": "pay_001",
        "customerId": "67890",
        "amount": 25.50,
        "transactionId": "txn_001"
      },
      {
        "paymentId": "pay_002",
        "customerId": "67891",
        "amount": 25.50,
        "transactionId": "txn_002"
      }
    ]
  }
}
400 Bad Request: Invalid request data
json

Collapse

Unwrap

Copy
{
  "message": "Invalid payment details",
  "statusCode": 400,
  "status": "fail",
  "errorCode": "INVALID_PAYMENT_METHOD",
  "details": {
    "validationErrors": [
      {
        "message": "Invalid payment details",
        "path": ["payments", 0, "customerId"]
      }
    ]
  },
  "timestamp": "2025-07-07T10:13:00.000Z"
}
403 Forbidden: Unauthorized
json

Collapse

Unwrap

Copy
{
  "message": "Unauthorized access",
  "statusCode": 403,
  "status": "fail",
  "errorCode": "PERMISSION_DENIED",
  "timestamp": "2025-07-07T10:13:00.000Z"
}
2. Process Split Payment Refund
Processes refunds for a split payment of a service.

Method: POST
Path: /split/refund
Authentication: Bearer token required
Content-Type: application/json
Request Body

Field	Type	Description	Required
serviceId	String	ID of the service	Yes
serviceType	String	Type of service: order, in_dining_order, booking, ride, event	Yes
refunds	Array	List of refund details	Yes
refunds[].customerId	String	ID of the customer receiving the refund	Yes
refunds[].amount	Number	Refund amount (min: 0.01, max: 10000)	Yes
Example Request
bash

Collapse

Unwrap

Run

Copy
curl -X POST https://api.mmfinale.com/customer/payments/split/refund \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "12345",
    "serviceType": "order",
    "refunds": [
      {
        "customerId": "67890",
        "amount": 25.50
      },
      {
        "customerId": "67891",
        "amount": 25.50
      }
    ]
  }'
Responses
200 OK: Refund processed successfully
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Refund processed for service order #12345",
  "data": {
    "serviceId": "12345",
    "serviceType": "order",
    "refunds": [
      {
        "customerId": "67890",
        "amount": 25.50,
        "transactionId": "txn_ref_001"
      },
      {
        "customerId": "67891",
        "amount": 25.50,
        "transactionId": "txn_ref_002"
      }
    ]
  }
}
400 Bad Request: Invalid request data
json

Collapse

Unwrap

Copy
{
  "message": "Invalid refund details",
  "statusCode": 400,
  "status": "fail",
  "errorCode": "INVALID_AMOUNT",
  "details": {
    "validationErrors": [
      {
        "message": "Invalid refund details",
        "path": ["refunds", 0, "customerId"]
      }
    ]
  },
  "timestamp": "2025-07-07T10:13:00.000Z"
}
403 Forbidden: Unauthorized
json

Collapse

Unwrap

Copy
{
  "message": "Unauthorized access",
  "statusCode": 403,
  "status": "fail",
  "errorCode": "PERMISSION_DENIED",
  "timestamp": "2025-07-07T10:13:00.000Z"
}
Error Codes

Code	Description
INVALID_PAYMENT_METHOD	Invalid payment method or service
INVALID_AMOUNT	Invalid payment or refund amount
MAX_SPLIT_PARTICIPANTS_EXCEEDED	Too many split participants
INVALID_BILL_SPLIT	Invalid bill split type
PERMISSION_DENIED	Unauthorized access
TRANSACTION_FAILED	Payment or refund processing failed
Socket Events
Clients can listen for real-time updates via WebSocket:

customer_payment_confirmed: Emitted when a split payment is confirmed.
json

Collapse

Unwrap

Copy
{
  "userId": "67890",
  "role": "customer",
  "serviceId": "12345",
  "serviceType": "order",
  "billSplitType": "EQUAL",
  "splitPayments": [
    {
      "paymentId": "pay_001",
      "customerId": "67890",
      "amount": 25.50,
      "transactionId": "txn_001"
    }
  ],
  "message": "Payment initiated for service order #12345"
}
customer_payment_refunded: Emitted when a refund is processed.
json

Collapse

Unwrap

Copy
{
  "userId": "67890",
  "role": "customer",
  "serviceId": "12345",
  "serviceType": "order",
  "refunds": [
    {
      "customerId": "67890",
      "amount": 25.50,
      "transactionId": "txn_ref_001"
    }
  ],
  "message": "Refund processed for service order #12345"
}
Notes
Location data is required for ride and in_dining_order services to enforce geofencing.
Maximum 50 participants per split payment.
Notifications are sent to all participants via their preferred method (push, email, SMS, WhatsApp).
All actions are audited for compliance.
text

Collapse

Unwrap

Copy
**Notes**:
- Provides detailed documentation for both endpoints, including request/response schemas, curl commands, and error codes.
- Includes socket event details for real-time updates.
- Specifies financial limits (0.01 to 10000) and max split participants (50) from `paymentConstants` and `socialConstants`.

---

### Integration with Controller and Service
- **Validator**: The Joi schemas in `paymentSplitValidator.js` ensure request bodies match the controller's expectations, with localized error messages.
- **Middleware**: `paymentSplitMiddleware.js` verifies service and customer existence, complementing the controller's validation.
- **Routes**: `paymentSplitRoutes.js` maps to the controller methods and uses the Joi validators.
- **Socket Handler/Events**: `paymentSplitHandler.js` and `paymentSplitEvents.js` handle real-time updates, aligning with the controller's `socketService.emit` calls.
- **Localization**: `en.json` provides translations for all messages used in the controller and validator.
- **API Docs**: `paymentSplitService.md` documents the full API, including curl examples and socket events.