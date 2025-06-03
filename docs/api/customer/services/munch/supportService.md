Documentation File
C:\Users\munch\Desktop\MMFinale\schemas\System\Back\MM1.0\docs\api\customer\services\munch\supportService.md

markdown

Collapse

Unwrap

Copy
# Support Service API

## POST /api/customer/munch/support/ticket

Creates a support ticket for order-related issues.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('create_support_ticket')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field       | Type   | Required | Description                   |
|-------------|--------|----------|-------------------------------|
| orderId     | Integer| Yes      | Order ID                      |
| issueType   | String | Yes      | Type of issue                 |
| description | String | Yes      | Issue description (10-1000 chars) |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "data": {
      "ticketId": "integer",
      "ticketNumber": "string",
      "status": "string"
    }
  }
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	CUSTOMER_NOT_FOUND	Customer not found
400	INVALID_ISSUE_TYPE	Invalid issue type
404	ORDER_NOT_FOUND	Order not found
Socket Events
Event: support:ticket:created
Payload:
json

Collapse

Unwrap

Copy
{
  "ticketId": "integer",
  "ticketNumber": "string",
  "status": "string",
  "customerId": "string"
}
Notifications
Sent to customer with localized message for ticket creation.
GET /api/customer/munch/support/ticket/{ticketId}/status
Tracks the status of a support ticket.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('track_support_ticket')
Header: Authorization: Bearer <JWT_TOKEN>
Parameters

Field	Type	Required	Description
ticketId	Integer	Yes	Ticket ID
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
    "ticketId": "integer",
    "ticketNumber": "string",
    "status": "string",
    "priority": "string",
    "issueType": "string",
    "orderId": "integer",
    "orderNumber": "string",
    "resolutionDetails": "string",
    "createdAt": "string"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
404	CUSTOMER_NOT_FOUND	Customer not found
404	TICKET_NOT_FOUND	Ticket not found
PUT /api/customer/munch/support/ticket/escalate
Escalates an unresolved support ticket.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('escalate_support_ticket')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
ticketId	Integer	Yes	Ticket ID
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
    "ticketId": "integer",
    "ticketNumber": "string",
    "status": "string"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	CUSTOMER_NOT_FOUND	Customer not found
404	TICKET_NOT_FOUND	Ticket not found
400	TICKET_ALREADY_ESCALATED	Ticket already escalated
400	CANNOT_ESCALATE_TICKET	Cannot escalate ticket
Socket Events
Event: support:ticket:escalated
Payload:
json

Collapse

Unwrap

Copy
{
  "ticketId": "integer",
  "ticketNumber": "string",
  "status": "string",
  "customerId": "string"
}
Notifications
Sent to customer with localized message for ticket escalation.