docs/api/customer/services/mtables/bookingService.md
markdown

Copy
# Booking Service API

## POST /api/customer/mtables/bookings

Creates a new table reservation.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('create_booking')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field              | Type    | Required | Description                              |
|--------------------|---------|----------|------------------------------------------|
| tableId            | Integer | Yes      | Table ID                                 |
| branchId           | Integer | Yes      | Branch ID                                |
| date               | String  | Yes      | Booking date (ISO format)                |
| time               | String  | Yes      | Booking time (HH:MM)                     |
| partySize          | Integer | Yes      | Number of guests                         |
| dietaryPreferences | Array   | No       | Dietary preferences                      |
| specialRequests    | String  | No       | Special requests                         |
| paymentMethodId    | Integer | No       | Payment method ID for deposit            |
| depositAmount      | Number  | No       | Deposit amount                           |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "message": "Booking created",
    "data": { "bookingId": 123, "reference": "BK-123456-ABCDEF", "gamificationError": null }
  }
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	FORBIDDEN	Permission denied
400	BOOKING_CREATION_FAILED	Booking creation failed
Socket Events
Event: booking:created
Payload:
json

Copy
{ "userId": 456, "role": "customer", "bookingId": 123, "reference": "BK-123456-ABCDEF" }
POST /api/customer/mtables/bookings/{bookingId}/update
Updates an existing reservation.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('update_booking')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
bookingId	Integer	Booking ID
Request Body

Field	Type	Required	Description
date	String	No	Booking date (ISO format)
time	String	No	Booking time (HH:MM)
partySize	Integer	No	Number of guests
dietaryPreferences	Array	No	Dietary preferences
specialRequests	String	No	Special requests
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Booking updated",
  "data": { "bookingId": 123 }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	FORBIDDEN	Permission denied
400	BOOKING_UPDATE_FAILED	Booking update failed
Socket Events
Event: booking:updated
Payload:
json

Copy
{ "userId": 456, "role": "customer", "bookingId": 123 }
POST /api/customer/mtables/bookings/{bookingId}/cancel
Cancels a reservation.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('cancel_booking')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
bookingId	Integer	Booking ID
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Booking cancelled",
  "data": { "bookingId": 123 }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	FORBIDDEN	Permission denied
400	BOOKING_CANCELLATION_FAILED	Booking cancellation failed
Socket Events
Event: booking:cancelled
Payload:
json

Copy
{ "userId": 456, "role": "customer", "bookingId": 123 }
POST /api/customer/mtables/bookings/{bookingId}/check-in
Processes check-in for a booking.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('check_in')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
bookingId	Integer	Booking ID
Request Body

Field	Type	Required	Description
qrCode	String	No	QR code for check-in
method	String	Yes	Check-in method (e.g., QR_CODE)
coordinates	Object	No	Geolocation coordinates
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Check-in confirmed",
  "data": { "bookingId": 123, "gamificationError": null }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	FORBIDDEN	Permission denied
400	CHECK_IN_FAILED	Check-in failed
Socket Events
Event: check_in:processed
Payload:
json

Copy
{ "userId": 456, "role": "customer", "bookingId": 123 }
GET /api/customer/mtables/bookings/history
Retrieves booking history.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('view_booking')
Header: Authorization: Bearer <JWT_TOKEN>
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Booking history retrieved",
  "data": [{ "bookingId": 123, "reference": "BK-123456-ABCDEF" }]
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	FORBIDDEN	Permission denied
400	BOOKING_HISTORY_FAILED	Booking history retrieval failed
POST /api/customer/mtables/bookings/{bookingId}/feedback
Submits feedback for a booking.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('submit_feedback')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
bookingId	Integer	Booking ID
Request Body

Field	Type	Required	Description
rating	Integer	Yes	Rating (1-5)
comment	String	No	Feedback comment
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Feedback submitted",
  "data": { "feedbackId": 123, "gamificationError": null }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	FORBIDDEN	Permission denied
400	FEEDBACK_SUBMISSION_FAILED	Feedback submission failed
Socket Events
Event: feedback:submitted
Payload:
json

Copy
{ "userId": 456, "role": "customer", "bookingId": 123, "rating": 5 }
POST /api/customer/mtables/bookings/{bookingId}/party-members
Adds a friend to a booking.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('party')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
bookingId	Integer	Booking ID
Request Body

Field	Type	Required	Description
friendCustomerId	Integer	Yes	Customer ID of the friend
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Party member added",
  "data": { "bookingId": 123, "friendCustomerId": 456 }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	FORBIDDEN	Permission denied
400	PARTY_MEMBER_ADDITION_FAILED	Party member addition failed
Socket Events
Event: party_member:added
Payload:
json

Copy
{ "userId": 456, "role": "customer", "bookingId": 123, "friendCustomerId": 456 }