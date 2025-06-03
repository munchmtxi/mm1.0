C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\services\mtxi\rideService.md

markdown

Collapse

Unwrap

Copy
# Ride Service API

## POST /api/customer/mtxi/rides

Creates a new ride request.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('create_ride')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field              | Type    | Required | Description                              |
|--------------------|---------|----------|------------------------------------------|
| pickupLocation     | Object  | Yes      | Pickup coordinates or address            |
| dropoffLocation    | Object  | Yes      | Dropoff coordinates or address           |
| rideType           | String  | Yes      | Ride type (standard, shared)             |
| scheduledTime      | String  | No       | Scheduled ride time (ISO format)         |
| friends            | Array   | No       | Array of friend customer IDs             |
| billSplit          | Object  | No       | Bill split details (type, participants)  |
| paymentMethodId    | Integer | No       | Payment method ID                       |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "message": "Ride booked",
    "data": { "rideId": 123, "reference": "RD-123456-ABCDEF", "gamificationError": null }
  }
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Permission denied
400	RIDE_BOOKING_FAILED	Ride booking failed
404	NO_DRIVERS_AVAILABLE	No drivers available
400	INVALID_RIDE	Invalid ride type
Socket Events
Event: ride:booked
Payload:
json

Collapse

Unwrap

Copy
{ "userId": 456, "role": "customer", "rideId": 123, "reference": "RD-123456-ABCDEF" }
POST /api/customer/mtxi/rides/{rideId}/update
Updates an existing ride.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('update_ride')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
rideId	Integer	Ride ID
Request Body

Field	Type	Required	Description
pickupLocation	Object	No	Pickup coordinates or address
dropoffLocation	Object	No	Dropoff coordinates or address
scheduledTime	String	No	Scheduled ride time (ISO format)
friends	Array	No	Array of friend customer IDs
billSplit	Object	No	Bill split details (type, participants)
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Ride updated",
  "data": { "rideId": 123 }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Permission denied
400	RIDE_FAILED	Ride update failed
404	RIDE_NOT_FOUND	Ride not found
Socket Events
Event: ride:updated
Payload:
json

Collapse

Unwrap

Copy
{ "userId": 456, "role": "customer", "rideId": 123 }
POST /api/customer/mtxi/rides/{rideId}/cancel
Cancels a ride.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('cancel_ride')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
rideId	Integer	Ride ID
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Ride cancelled",
  "data": { "rideId": 123 }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Permission denied
400	RIDE_CANCELLATION_FAILED	Ride cancellation failed
404	RIDE_NOT_FOUND	Ride not found
Socket Events
Event: ride:cancelled
Payload:
json

Collapse

Unwrap

Copy
{ "userId": 456, "role": "customer", "rideId": 123 }
POST /api/customer/mtxi/rides/{rideId}/check-in
Processes check-in for a ride.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('check_in_ride')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
rideId	Integer	Ride ID
Request Body

Field	Type	Required	Description
coordinates	Object	Yes	Geolocation coordinates
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Ride check-in confirmed",
  "data": { "rideId": 123, "gamificationError": null }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Permission denied
400	RIDE_FAILED	Check-in failed
404	RIDE_NOT_FOUND	Ride not found
Socket Events
Event: ride:check_in
Payload:
json

Collapse

Unwrap

Copy
{ "userId": 456, "role": "customer", "rideId": 123 }
GET /api/customer/mtxi/rides/history
Retrieves ride history.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('view_ride')
Header: Authorization: Bearer <JWT_TOKEN>
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Ride history retrieved",
  "data": [{ "rideId": 123, "reference": "RD-123456-ABCDEF" }]
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Permission denied
400	RIDE_FAILED	Ride history retrieval failed
POST /api/customer/mtxi/rides/{rideId}/feedback
Submits feedback for a ride.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('submit_feedback')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
rideId	Integer	Ride ID
Request Body

Field	Type	Required	Description
rating	Integer	Yes	Rating (1-5)
comment	String	No	Feedback comment
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Feedback submitted",
  "data": { "feedbackId": 123, "gamificationError": null }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Permission denied
400	FEEDBACK_SUBMISSION_FAILED	Feedback submission failed
404	RIDE_NOT_FOUND	Ride not found
Socket Events
Event: feedback:submitted
Payload:
json

Collapse

Unwrap

Copy
{ "userId": 456, "role": "customer", "rideId": 123, "rating": 5 }
POST /api/customer/mtxi/rides/{rideId}/friends
Adds a friend to a ride.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('add_friend')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
rideId	Integer	Ride ID
Request Body

Field	Type	Required	Description
friendCustomerId	Integer	Yes	Customer ID of the friend
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Friend invited",
  "data": { "rideId": 123, "friendCustomerId": 456 }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Permission denied
400	INVALID_FRIEND_INVITE	Invalid friend invite
404	FRIEND_NOT_FOUND	Friend not found
400	MAX_FRIENDS_EXCEEDED	Maximum friends exceeded
Socket Events
Event: friend:invited
Payload:
json

Collapse

Unwrap

Copy
{ "userId": 456, "role": "customer", "rideId": 123, "friendCustomerId": 456 }
POST /api/customer/mtxi/rides/{rideId}/bill-split
Processes bill splitting for a ride.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('split_bill')
Header: Authorization: Bearer <JWT_TOKEN>
Path Parameters

Parameter	Type	Description
rideId	Integer	Ride ID
Request Body

Field	Type	Required	Description
type	String	Yes	Split type (equal, custom)
participants	Array	Yes	Array of participant details (customerId, amount for custom)
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Bill split processed",
  "data": { "rideId": 123, "gamificationError": null }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Permission denied
400	INVALID_BILL_SPLIT	Invalid bill split
404	FRIEND_NOT_FOUND	Friend not found
400	MAX_SPLIT_PARTICIPANTS_EXCEEDED	Maximum split participants exceeded
Socket Events
Event: bill_split:processed
Payload:
json

Collapse

Unwrap

Copy
{ "userId": 456, "role": "customer", "rideId": 123 }
text

Collapse

Unwrap

Copy
---

### Notes
1. **Structure Alignment**: The markdown follows the same structure as `bookingService.md`, including sections for authentication, request/response details, errors, and socket events. It uses consistent formatting for tables and JSON payloads.
2. **Constants Integration**: Error codes and success messages are sourced from `rideConstants.js` (e.g., `RIDE_BOOKING_FAILED`, `NO_DRIVERS_AVAILABLE`, `Ride booked`) and `customerConstants.js` (e.g., `UNAUTHORIZED`, `PERMISSION_DENIED`).
3. **Gamification**: The API responses include `gamificationError` fields to align with gamification integration, as seen in `bookingService.md`. Gamification points (e.g., for `booking_created`, `split_payment`) are assumed to be handled by the controller and `pointService`, triggered on actions like booking, feedback, and bill splitting.
4. **Friend Invites and Bill Splitting**: Dedicated endpoints (`/friends` and `/bill-split`) are included, supporting `rideConstants.js` settings like `MAX_FRIENDS_PER_RIDE` and `BILL_SPLIT_TYPES`.
5. **Socket Events**: Events like `ride:booked`, `friend:invited`, and `bill_split:processed` align with `customerConstants.js` notification types (e.g., `ride_update`, `friend_request`).