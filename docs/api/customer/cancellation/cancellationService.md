3. docs/api/customer/services/cancellation/cancellationService.md
markdown

Copy
# Cancellation Service API

## POST /api/customer/cancellation

Cancels a booking, order, ride, or in-dining order for a customer.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('cancel_service')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field        | Type   | Required | Description                              |
|--------------|--------|----------|------------------------------------------|
| serviceId    | Integer| Yes      | ID of the service to cancel              |
| serviceType  | String | Yes      | Type: `mtables`, `munch`, `mtxi`, `in_dining` |
| reason       | String | Yes      | Reason for cancellation                  |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "data": {
      "serviceType": "mtables|munch|mtxi|in_dining",
      "reference": "string",
      "gamificationError": null | { "message": "string" }
    }
  }
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
400	CANCELLATION_FAILED	Specific cancellation error
404	SERVICE_NOT_FOUND	Service not found
409	SERVICE_ALREADY_CANCELLED	Service already cancelled
Socket Events
Event: cancellation:<serviceType>:<serviceId>
Payload:
json

Copy
{
  "status": "cancelled",
  "reason": "string"
}
Notifications
Sent to the customer with a localized message based on serviceType and reference.
POST /api/customer/cancellation/refund
Issues a refund for a cancelled service.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('issue_refund')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
serviceId	Integer	Yes	ID of the cancelled service
walletId	Integer	Yes	ID of the wallet to receive the refund
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "data": {
    "refundId": "integer",
    "amount": "number",
    "currency": "string"
  }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
400	REFUND_FAILED	Specific refund error
404	SERVICE_NOT_FOUND	Service not found