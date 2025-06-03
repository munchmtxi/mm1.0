Documentation File
C:\Users\munch\Desktop\MMFinale\System\Back\Documentation\api\customer\services\review\DocumentationService.md

markdown

Collapse

Unwrap

Copy
# Review Service API Documentation

## POST /api/customer/review

Submits a detailed review for a service.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `requires`
- **Header**: `Authorization: Bearer <token>`

### Request Body
| Field       | Type    | Required | Description                              |
|-------------|---------|----------|------------------------------------|
| serviceId   | Number  | Yes      | Service ID                             |
| serviceType | String  | Yes      | Type: order, in_dining_order, booking, ride |
| rating      | Number  | Yes      | Rating (1-5)                         |
| comment     | String | | No       | Review comment (max 1000 chars)        |
| title       | String  | Yes      | Review title (max 100 chars)          |
| photos      | Array   | | No       | Array of photo URLs (max 5)           |
| anonymous   | Boolean | | No       | Whether review is anonymous          |

### Response
- **Status**: 201 OK
- **Body**:
  ```json
  {
    "status": "success",
    "data": {
      "reviewId": "string",
      "serviceType": "string",
      "serviceId": "number",
      "rating": 5,
      "comment": "string",
      "title": "string",
      "photos": ["string"],
      "anonymous": "boolean",
      "status": "pending"
    }
  }
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
400	INVALID_CUSTOMER	Invalid customer ID
400	INVALID_SERVICE_TYPE	Invalid service type
400	INVALID_RATING	Invalid rating must be between 1 and 5
400	REVIEW_ALREADY_SUBMITTED	Review already submitted
400	INVALID_PHOTOS	Invalid photo URLs
404	ORDER_NOT_FOUND	Order not found
404	BOOKING_NOT_FOUND	Booking not found
404	RIDE_NOT_FOUND	Ride not found
Socket Events
Event: review:submitted
Payload:
json

Collapse

Unwrap

Copy
{
  "reviewId": "string",
  "serviceType": "string",
  "serviceId": "number",
  "rating": "number",
  "status": "string"
}
Notifications
Sent to customer with localized review submission message.
PATCH /api/customer/review/{reviewId}
Updates a pending review.

Authentication
Middleware: authenticate, restrictTo('customer'), requires
Header: Authorization: Bearer <token>
Request Body

Field	Type	Required	Description
rating	Number		No
comment	String		No
title	String		No
photos	Array		No
anonymous	Boolean		No
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
    "reviewId": "string",
    "serviceType": "string",
    "serviceId": "number",
    "rating": "number",
    "comment": "string",
    "title": "string",
    "photos": ["string"],
    "anonymous": "boolean",
    "status": "string"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	UNAUTHORIZED	Unauthorized to perform action
400	INVALID_RATING	Rating must be between 1 and 5
400	REVIEW_NOT_EDITABLE	Review cannot be edited
400	INVALID_PHOTOS	Invalid photo URLs
404	REVIEW_NOT_FOUND	Review not found
Socket Events
Event: review:updated
Payload:
json

Collapse

Unwrap

Copy
{
  "reviewId": "string",
  "serviceType": "string",
  "serviceId": "number",
  "rating": "number",
  "status": "string"
}
Notifications
Sent to customer with localized review update message.
DELETE /api/customer/review/{reviewId}
Soft Deletes a review.

Authentication
Middleware: authenticate, restrictTo('customer'), requires
Header: Authorization: Bearer <token>
Parameters

Field	Type	Required	Description
reviewId	Number	Yes	Review ID
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
    "reviewId": "string",
    "status": "deleted"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	UNAUTHORIZED	Unauthorized to perform action
404	Review_NOT_FOUND	Review not found
Socket Events
Event: review:deleted
Payload:
json

Collapse

Unwrap

Copy
{
  "reviewId": "string",
  "status": "string"
}
Notifications
Sent to customer with localized review deletion message.
POST /api/customer/review/{reviewId}/interaction
Manages community interactions (upvote/comment) on a review.

Authentication
Middleware: authenticate, restrictTo('customer'), requires
Header: Authorization: Bearer <token>
Parameters

Field	Type	Required	Description
reviewId	Number	Yes	Review ID
Request Body

Field	Type	Required	Description
action	String	Yes	Action: upvote, comment
comment	String	No	Comment text (required if action is comment)
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
    "interactionId": "string",
    "reviewId": "number",
    "action": "string",
    "comment": "string"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
400	INVALID_ACTION	Invalid interaction type
400	ALREADY_UPVOTED	Already upvoted
400	COMMENT_REQUIRED	Comment is required
404	Review_NOT_FOUND	Review not found
400	Review_NOT_APPROVED	Review is not approved
Socket Events
Event: review:interaction
Payload:
json

Collapse

Unwrap

Copy
{
  "reviewId": "string",
  "interactionId": "string",
  "action": "string",
  "comment": "string"
}
Notifications
Sent to review owner with localized interaction message.