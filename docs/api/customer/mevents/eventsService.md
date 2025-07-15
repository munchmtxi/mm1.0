eventsService.md
Update the documentation to include the new /api/customer/mevents/{eventId} PATCH endpoint and update existing endpoints to reflect mpark, MenuInventory, and Table support.

markdown

Collapse

Unwrap

Copy
# Event Service API

## POST /api/customer/mevents

Creates a new event.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('create_event')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field            | Type   | Required | Description                              |
|------------------|--------|----------|------------------------------------------|
| title            | String | Yes      | Event title                              |
| description      | String | No       | Event description                        |
| occasion         | String | Yes      | Type: `birthday`, `anniversary`, etc.    |
| paymentType      | String | Yes      | `solo` or `split`                        |
| participantIds   | Array  | No       | List of participant user IDs             |
| selectedMenuItems| Array  | No       | List of menu item IDs                   |
| selectedTables   | Array  | No       | List of table IDs                       |

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
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	INVALID_REQUEST	Invalid request parameters
400	EVENT_CREATION_FAILED	Specific event creation error
404	INVALID_CUSTOMER	Customer not found
404	INVALID_PARTICIPANT	Invalid participant ID
404	INVALID_MENU_ITEM	Invalid or unavailable menu item
404	INVALID_TABLE	Invalid or unavailable table
429	MAX_PARTICIPANTS_EXCEEDED	Max participants exceeded
Socket Events
Event: event:created:<userId>
Payload:
json

Collapse

Unwrap

Copy
{
  "eventId": 123,
  "title": "string",
  "status": "draft",
  "userId": 123,
  "role": "customer",
  "auditAction": "EVENT_CREATED"
}
Notifications
Sent to the creator and invited participants with localized messages.

POST /api/customer/mevents/bookingservices
Manages group bookings for an event.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('manage_event'), validateEventAccess
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
eventId	Integer	Yes	ID of the event
services	Object	Yes	Services to add
services.bookings	Array	No	List of mBooking IDs
services.orders	Array	No	List of mOrder IDs
services.rides	Array	No	List of mRuta IDs
services.inDiningOrders	Array	No	List of in-dining order IDs
services.parkingBookings	Array	No	List of parking booking IDs
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

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
Errors

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

Collapse

Unwrap

Copy
{
  "eventId": 123,
  "serviceCount": 4,
  "status": "confirmed",
  "userId": 123,
  "role": "customer",
  "auditAction": "BILL_PROCESSED"
}
Notifications
Sent to participants for split payments with localized messages.

POST /api/customer/mevents/groupchat
Facilitates group chat for an event.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('manage_chat'), validateEventAccess, validateParticipantAccess
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
eventId	Integer	Yes	ID of the event
participantIds	Array	Yes	List of participant user IDs
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

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
Errors

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

Collapse

Unwrap

Copy
{
  "eventId": 123,
  "chatRoom": "event:chat:123",
  "participants": [456, 567],
  "userId": 123,
  "role": "customer",
  "auditAction": "CHAT_MESSAGE_SENT"
}
Notifications
Sent to participants with a localized message about the chat room.

PATCH /api/customer/mevents/{eventId}
Amends an existing event.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('manage_event'), validateEventAccess
Header: Authorization: Bearer <JWT_TOKEN>
Parameters

Parameter	Type	Required	Description
eventId	Integer	Yes	ID of the event to amend
Request Body

Field	Type	Required	Description
title	String	No	Updated event title
description	String	No	Updated event description
occasion	String	No	Updated type: birthday, anniversary
paymentType	String	No	Updated solo or split
participantIds	Array	No	Updated participant user IDs
selectedMenuItems	Array	No	Updated menu item IDs
selectedTables	Array	No	Updated table IDs
services	Object	No	Updated services to add
services.bookings	Array	No	List of mBooking IDs
services.orders	Array	No	List of mOrder IDs
services.rides	Array	No	List of mRuta IDs
services.inDiningOrders	Array	No	List of in-dining order IDs
services.parkingBookings	Array	No	List of parking booking IDs
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Event amended successfully",
  "data": {
    "eventId": 123,
    "gamificationError": null
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	INVALID_REQUEST	Invalid request parameters
400	EVENT_AMENDMENT_FAILED	Specific amendment error
404	EVENT_NOT_FOUND	Event not found
404	INVALID_PARTICIPANT	Invalid participant ID
404	INVALID_MENU_ITEM	Invalid or unavailable menu item
404	INVALID_TABLE	Invalid or unavailable table
404	INVALID_SERVICE	Invalid service ID
429	MAX_PARTICIPANTS_EXCEEDED	Max participants exceeded
429	MAX_SERVICES_EXCEEDED	Max services exceeded
400	INSUFFICIENT_FUNDS	Insufficient wallet balance
Socket Events
Event: event:updated:<eventId>
Payload:
json

Collapse

Unwrap

Copy
{
  "eventId": 123,
  "title": "string",
  "status": "draft",
  "userId": 123,
  "role": "customer",
  "auditAction": "EVENT_UPDATED"