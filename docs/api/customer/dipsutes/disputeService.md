Dispute Service API Documentation
markdown

Collapse

Unwrap

Copy
# Dispute Service API

## POST /api/customer/disputes

Submits a dispute for a service.

### Authentication
- **Middleware**: `restrictTo('customer')`, `checkPermissions('create_dispute')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>` (handled in main route index)

### Request Body
| Field        | Type   | Required | Description                              |
|--------------|--------|----------|------------------------------------------|
| serviceId    | Integer| Yes      | ID of the booking, order, ride, parking, or in-dining order |
| issue        | String | Yes      | Description of the issue (max 500 chars) |
| issueType    | String | Yes      | Type: `BOOKING`, `PAYMENT`, `SERVICE_QUALITY`, `PARKING`, `DINING`, `OTHER` |

### Response
- **Status**: 201 Created
- **Body**:
  ```json
  {
    "status": "success",
    "message": "Dispute created successfully",
    "data": {
      "disputeId": 123,
      "serviceType": "mtables|munch|mtxi|mpark|in_dining",
      "gamificationError": null
    }
  }
Errors

Status	Code	Message
400	INVALID_REQUEST	Invalid request parameters
400	DISPUTE_CREATION_FAILED	Specific dispute creation error
403	UNAUTHORIZED_DISPUTE	Unauthorized dispute
404	INVALID_CUSTOMER	Customer not found
404	INVALID_SERVICE	Service not found
429	MAX_DISPUTES_EXCEEDED	Max disputes per day exceeded
Socket Events
Event: dispute:created
Payload:
json

Collapse

Unwrap

Copy
{
  "disputeId": 123,
  "serviceType": "mtables|munch|mtxi|mpark|in_dining",
  "status": "pending"
}
Notifications
Sent to customer with localized message based on reference and issue.
GET /api/customer/disputes/{disputeId}/status
Tracks the status of a dispute.

Authentication
Middleware: restrictTo('customer'), checkPermissions('track_dispute')
Header: Authorization: Bearer <JWT_TOKEN> (handled in main route index)
Parameters

Field	Type	Required	Description
disputeId	Integer	Yes	ID of the dispute
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Dispute status retrieved successfully",
  "data": {
    "id": 123,
    "status": "PENDING|RESOLVED|CLOSED",
    "serviceType": "mtables|munch|mtxi|mpark|in_dining",
    "issue": "string",
    "issueType": "BOOKING|PAYMENT|SERVICE_QUALITY|PARKING|DINING|OTHER",
    "resolution": "string|null"
  }
}
Errors

Status	Code	Message
400	INVALID_REQUEST	Invalid request parameters
403	UNAUTHORIZED_DISPUTE	Unauthorized dispute
404	DISPUTE_NOT_FOUND	Dispute not found
POST /api/customer/disputes/resolve
Resolves a dispute with an outcome.

Authentication
Middleware: restrictTo('admin', 'support'), checkPermissions('resolve_dispute')
Header: Authorization: Bearer <JWT_TOKEN> (handled in main route index)
Request Body

Field	Type	Required	Description
disputeId	Integer	Yes	ID of the dispute
resolution	String	Yes	Resolution description (max 500 chars)
resolutionType	String	Yes	Type: REFUND, COMPENSATION, APOLOGY, NO_ACTION, ACCOUNT_CREDIT, REPLACEMENT
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Dispute resolved successfully",
  "data": {
    "disputeId": 123,
    "status": "resolved",
    "gamificationError": null
  }
}
Errors

Status	Code	Message
400	INVALID_REQUEST	Invalid request parameters
400	DISPUTE_RESOLUTION_FAILED	Specific resolution error
404	DISPUTE_NOT_FOUND	Dispute not found
409	DISPUTE_ALREADY_RESOLVED	Dispute already resolved
Socket Events
Event: dispute:resolved
Payload:
json

Collapse

Unwrap

Copy
{
  "disputeId": 123,
  "status": "resolved",
  "resolution": "string"
}
Notifications
Sent to customer with localized message based on resolution and resolutionType.
GET /api/customer/disputes/parking
Retrieves all parking disputes for a customer.

Authentication
Middleware: restrictTo('customer'), checkPermissions('view_parking_disputes')
Header: Authorization: Bearer <JWT_TOKEN> (handled in main route index)
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Parking disputes retrieved successfully",
  "data": [
    {
      "id": 123,
      "serviceId": 456,
      "serviceType": "mpark",
      "issue": "string",
      "issueType": "PARKING",
      "status": "PENDING|RESOLVED|CLOSED",
      "resolution": "string|null",
      "bookingDetails": {
        "bookingType": "valet|self_park",
        "status": "confirmed|completed"
      }
    }
  ]
}
Errors

Status	Code	Message
400	INVALID_REQUEST	Invalid request parameters
404	PARKING_DISPUTES_NOT_FOUND	No parking disputes found
POST /api/customer/disputes/parking/cancel
Cancels a parking dispute.

Authentication
Middleware: restrictTo('customer'), checkPermissions('cancel_parking_dispute')
Header: Authorization: Bearer <JWT_TOKEN> (handled in main route index)
Request Body

Field	Type	Required	Description
disputeId	Integer	Yes	ID of the dispute
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Dispute closed successfully",
  "data": {
    "disputeId": 123,
    "status": "CLOSED",
    "gamificationError": null
  }
}
Errors

Status	Code	Message
400	INVALID_REQUEST	Invalid request parameters
403	UNAUTHORIZED_DISPUTE	Unauthorized dispute
404	DISPUTE_NOT_FOUND	Dispute not found
409	DISPUTE_ALREADY_RESOLVED	Dispute already resolved
400	DISPUTE_CANCELLATION_FAILED	Dispute cancellation failed
Socket Events
Event: dispute:closed
Payload:
json

Collapse

Unwrap

Copy
{
  "disputeId": 123,
  "status": "CLOSED"
}
Notifications
Sent to customer with localized message based on disputeId.