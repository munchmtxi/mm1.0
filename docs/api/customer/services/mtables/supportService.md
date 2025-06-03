docs/api/customer/services/mtables/supportService.md
markdown

Copy
# Support Service API

## POST /api/customer/mtables/support/tickets

Creates a support ticket for a customer issue.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('create_support_ticket')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field       | Type    | Required | Description                              |
|-------------|---------|----------|------------------------------------------|
| bookingId   | Integer | No       | Booking ID                               |
| orderId     | Integer | No       | Order ID                                 |
| issueType   | String  | Yes      | Issue type (e.g., payment_issue)         |
| description | String  | Yes      | Issue description                        |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "message": "Support ticket created",
    "data": { "ticketId": 123, "ticketNumber": "TKT-123456-ABCDEF", "gamificationError": null }
  }
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	SUPPORT_TICKET_CREATION_FAILED	Ticket creation error
Socket Events
Event: support:ticket_created
Payload:
json

Copy
{ "userId": 456, "role": "customer", "ticketId": 123, "ticketNumber": "TKT-123456-ABCDEF" }
GET /api/customer/mtables/support/tickets/{ticketId}
Tracks the status of a support ticket.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('view_support_ticket')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Required	Description
ticketId	Integer	Yes	Ticket ID
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Ticket status tracked",
  "data": { "id": 123, "status": "open", "issue_type": "payment_issue", ... }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	TICKET_STATUS_TRACKING_FAILED	Ticket status tracking error
Socket Events
Event: support:ticket_status
Payload:
json

Copy
{ "userId": 456, "role": "customer", "ticketId": 123, "status": "open" }
POST /api/customer/mtables/support/tickets/{ticketId}/escalate
Escalates an unresolved support ticket.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('escalate_support_ticket')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Required	Description
ticketId	Integer	Yes	Ticket ID
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Ticket escalated",
  "data": { "ticketId": 123, "status": "escalated" }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	TICKET_ESCALATION_FAILED	Ticket escalation error
Socket Events
Event: support:ticket_escalated
Payload:
json

Copy
{ "userId": 456, "role": "customer", "ticketId": 123, "status": "escalated" }