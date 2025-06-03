docs/api/customer/services/mevents/eventsService.md
markdown

Copy
# Event Service API

## POST /api/customer/events

Creates a new event.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('create_event')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field        | Type   | Required | Description                              |
|--------------|--------|----------|------------------------------------------|
| title        | String | Yes      | Event title                              |
| description  | String | No       | Event description                        |
| occasion     | String | Yes      | Type: `birthday`, `anniversary`, etc.    |
| paymentType  | String | Yes      | `solo` or `split`                        |
| participantIds | Array | No      | List of participant user IDs             |

### Response
- **Status**: 201 Created
- **Body**:
  ```json
  {
    "status": "success",
    "message": "Event created successfully",
    "data": {
      "eventId": 123,
      "gamificationError": null
    }
  }
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	INVALID_REQUEST	Invalid request parameters
400	EVENT_CREATION_FAILED	Specific event creation error
404	INVALID_CUSTOMER	Customer not found
404	INVALID_PARTICIPANT	Invalid participant ID
429	MAX_PARTICIPANTS_EXCEEDED	Max participants exceeded
Socket Events
Event: event:created:<userId>
Payload:
json

Copy
{
  "eventId": 123,
  "title": "string",
  "status": "draft"
}
Notifications
Sent to the creator and invited participants with localized messages.
POST /api/customer/mevents/bookingservices
Manages group bookings for an event.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('manage_event')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
eventId	Integer	Yes	ID of the event
services	Object	Yes	Services to add
services.bookings	Array	No	List of mBooking IDs
services.orders	Array	No	List of mOrder IDs
services.rutas	Array	No	List of mRuta IDs
services.inDiningOrders	Array	No	List of in-dining order IDs
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Transaction processed successfully",
  "data": {
    "eventId": 123,
    "serviceCount": 4,
    "gamificationError": null
  }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	INVALID_REQUEST	Invalid request parameters
400	GROUP_BOOKINGS_FAILED	Specific booking error
404	EVENT_NOT_FOUND	Event not found
404	INVALID_SERVICE	Invalid service ID
429	MAX_SERVICES_EXCEEDED	Max services exceeded
400	INSUFFICIENT_FUNDS	Insufficient wallet balance
Socket Events
Event: event:services:<eventId>
Payload:
json

Copy
{
  "eventId": 123,
  "serviceCount": 4,
  "status": "completed"
}
Notifications
Sent to participants for split payments with localized messages.
POST /api/customer/mevents/groupchat
Facilitates group chat for an event.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('manage_chat')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
eventId	Integer	Yes	ID of the event
participantIds	Array	Yes	List of participant user IDs
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Group chat enabled successfully",
  "data": {
    "eventId": 123,
    "chatRoom": "event:chat:123",
    "gamificationError": null
  }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	INVALID_REQUEST	Invalid request parameters
400	CHAT_FACILITATION_FAILED	Specific chat error
404	EVENT_NOT_FOUND	Event not found
404	INVALID_PARTICIPANT	Invalid participant ID
Socket Events
Event: event:chat:<eventId>
Payload:
json

Copy
{
  "eventId": 123,
  "chatRoom": "event:chat:123",
  "participants": [456, 567]
}
Notifications
Sent to participants with a localized message about the chat room.