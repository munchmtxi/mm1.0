Cancellation Service Documentation File
markdown

Collapse

Unwrap

Copy
# Cancellation Service API

## POST /api/customer/cancellation
Cancels a customer service (booking, order, ride, in-dining order, or parking booking).

### Parameters
| Field        | Type   | Required | Description                              |
|--------------|--------|----------|------------------------------------------|
| serviceId    | Integer| Yes      | ID of the service to cancel              |
| serviceType  | String | Yes      | Type of service (mtables, munch, mtxi, in_dining, mpark) |
| reason       | String | Yes      | Reason for cancellation                   |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "data": {
      "serviceType": "mpark",
      "reference": "123",
      "gamificationError": null
    }
  }
Errors

Status	Code	Message
400	INVALID_REQUEST	Invalid request parameters
400	CANCELLATION_FAILED	Cancellation failed
403	PERMISSION_DENIED	Forbidden
404	SERVICE_NOT_FOUND	Service not found
409	SERVICE_ALREADY_CANCELLED	Service already cancelled
Socket Events
Event: cancellation:{serviceType}:{serviceId}
Payload:
json

Collapse

Unwrap

Copy
{
  "userId": 123,
  "role": "customer",
  "status": "cancelled",
  "reason": "Change of plans",
  "timestamp": "2025-06-27T14:30:00.000Z"
}
POST /api/customer/cancellation/refund
Issues a refund for a cancelled service.

Parameters

Field	Type	Required	Description
serviceId	Integer	Yes	ID of the cancelled service
walletId	Integer	Yes	ID of the wallet to receive the refund
serviceType	String	Yes	Type of service (mtables, munch, mtxi, in_dining, mpark)
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
    "refundId": 789,
    "amount": 50.00,
    "currency": "USD"
  }
}
Errors

Status	Code	Message
400	INVALID_REQUEST	Invalid request parameters
400	REFUND_FAILED	Failed to process refund
403	PERMISSION_DENIED	Forbidden
404	SERVICE_NOT_FOUND	Service not found
404	INVALID_WALLET	Invalid wallet
404	NO_PAYMENT_FOUND	No completed payment found for service
Socket Events
None (no socket event emitted for refunds)