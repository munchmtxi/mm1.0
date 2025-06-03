docs/api/customer/services/disputes/disputeService.md
markdown

Copy
# Dispute Service API

## POST /api/customer/disputes

Submits a dispute for a service.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('create_dispute')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field        | Type   | Required | Description                              |
|--------------|--------|----------|------------------------------------------|
| serviceId    | Integer| Yes      | ID of the booking, order, or ride        |
| issue        | String | Yes      | Description of the issue                 |
| issueType    | String | Yes      | Type: `service_quality`, `payment`, etc. |

### Response
- **Status**: 201 Created
- **Body**:
  ```json
  {
    "status": "success",
    "message": "Dispute created successfully",
    "data": {
      "disputeId": 123,
      "serviceType": "mtables|munch|mtxi",
      "gamificationError": null
    }
  }
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
400	DISPUTE_CREATION_FAILED	Specific dispute creation error
404	INVALID_CUSTOMER	Customer not found
404	INVALID_SERVICE	Service not found
429	MAX_DISPUTES_EXCEEDED	Max disputes per day exceeded
Socket Events
Event: dispute:created:<customerId>
Payload:
json

Copy
{
  "disputeId": 123,
  "serviceType": "mtables",
  "status": "pending"
}
Notifications
Sent to the customer with a localized message based on reference and issue.
GET /api/customer/disputes/{disputeId}/status
Tracks the status of a dispute.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('track_dispute')
Header: Authorization: Bearer <JWT_TOKEN>
Parameters

Field	Type	Required	Description
disputeId	Integer	Yes	ID of the dispute
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Dispute status retrieved successfully",
  "data": {
    "id": 123,
    "status": "pending|resolved|closed",
    "serviceType": "mtables|munch|mtxi",
    "issue": "string",
    "issueType": "service_quality|payment",
    "resolution": "string|null"
  }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	DISPUTE_NOT_FOUND	Dispute not found
POST /api/customer/disputes/resolve
Resolves a dispute with an outcome.

Authentication
Middleware: authenticate, restrictTo('admin', 'support'), checkPermissions('resolve_dispute')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
disputeId	Integer	Yes	ID of the dispute
resolution	String	Yes	Resolution description
resolutionType	String	Yes	Type: refund, compensation, etc.
Response
Status: 200 OK
Body:
json

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
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
400	DISPUTE_RESOLUTION_FAILED	Specific resolution error
404	DISPUTE_NOT_FOUND	Dispute not found
409	DISPUTE_ALREADY_RESOLVED	Dispute already resolved
Socket Events
Event: dispute:resolved:<customerId>
Payload:
json

Copy
{
  "disputeId": 123,
  "status": "resolved",
  "resolution": "string"
}
Notifications
Sent to the customer with a localized message based on resolution and resolutionType.