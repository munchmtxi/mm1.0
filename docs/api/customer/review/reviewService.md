API Documentation (C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\review\README.md)
markdown

Collapse

Unwrap

Copy
# Customer Review API

Handles review-related operations for customers, including submitting, updating, deleting, and interacting with reviews for merchants, staff, and drivers. Integrates with gamification, notifications, and socket events for real-time updates.

## Base URL
`/api/v1/customer/reviews`

## Authentication
All endpoints require a valid JWT token in the `Authorization` header: `Bearer <token>`. Handled by the main route index.

## Endpoints

### 1. Submit a Review
**POST** `/api/v1/customer/reviews`

Creates a new review for a merchant, staff, or driver.

#### Request Body
| Field        | Type   | Required | Description                                      |
|--------------|--------|----------|--------------------------------------------------|
| serviceType  | String | Yes      | Service type (e.g., mtables, munch, mtxi)        |
| serviceId    | String | Yes      | ID of the service (e.g., orderId, rideId)        |
| targetType   | String | Yes      | Target type (merchant, staff, driver)            |
| targetId     | String | Yes      | ID of the target entity                          |
| rating       | Number | Yes      | Rating (1-5)                                     |
| comment      | String | No       | Review comment (max 500 chars)                   |
| title        | String | No       | Review title (max 100 chars)                     |
| photos       | Array  | No       | Array of photo URLs                              |
| anonymous    | Boolean| No       | Whether the review is anonymous (default: false)  |

#### Response
- **201 Created**
  ```json
  {
    "status": "success",
    "message": "Review submitted successfully",
    "data": {
      "reviewId": "uuid",
      "serviceType": "mtables",
      "serviceId": "uuid",
      "targetType": "merchant",
      "targetId": "uuid",
      "rating": 4,
      "comment": "Great service!",
      "title": "Amazing Experience",
      "photos": ["url1", "url2"],
      "anonymous": false,
      "createdAt": "2025-07-08T02:38:00Z"
    }
  }
400 Bad Request
json

Collapse

Unwrap

Copy
{
  "status": "fail",
  "message": "Invalid service type",
  "errorCode": "INVALID_SERVICE_TYPE"
}
Example
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/v1/customer/reviews \
-H "Authorization: Bearer <token>" \
-H "Content-Type: application/json" \
-d '{
  "serviceType": "mtables",
  "serviceId": "123e4567-e89b-12d3-a456-426614174000",
  "targetType": "merchant",
  "targetId": "789e4567-e89b-12d3-a456-426614174000",
  "rating": 4,
  "comment": "Great service!",
  "title": "Amazing Experience",
  "photos": ["http://example.com/photo1.jpg"],
  "anonymous": false
}'
2. Update a Review
PUT /api/v1/customer/reviews/:reviewId

Updates an existing review.

Parameters

Parameter	Type	Required	Description
reviewId	String	Yes	ID of the review
Request Body

Field	Type	Required	Description
rating	Number	No	Updated rating (1-5)
comment	String	No	Updated comment (max 500 chars)
title	String	No	Updated title (max 100 chars)
photos	Array	No	Updated array of photo URLs
anonymous	Boolean	No	Updated anonymity setting
Response
200 OK
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Review updated successfully",
  "data": {
    "reviewId": "uuid",
    "rating": 5,
    "comment": "Updated: Even better service!",
    "title": "Outstanding Experience",
    "photos": ["url1"],
    "anonymous": true,
    "updatedAt": "2025-07-08T02:38:00Z"
  }
}
404 Not Found
json

Collapse

Unwrap

Copy
{
  "status": "fail",
  "message": "Review not found",
  "errorCode": "REVIEW_NOT_FOUND"
}
Example
bash

Collapse

Unwrap

Run

Copy
curl -X PUT http://localhost:3000/api/v1/customer/reviews/123e4567-e89b-12d3-a456-426614174000 \
-H "Authorization: Bearer <token>" \
-H "Content-Type: application/json" \
-d '{
  "rating": 5,
  "comment": "Updated: Even better service!",
  "title": "Outstanding Experience",
  "photos": ["http://example.com/photo1.jpg"],
  "anonymous": true
}'
3. Delete a Review
DELETE /api/v1/customer/reviews/:reviewId

Deletes a review.

Parameters

Parameter	Type	Required	Description
reviewId	String	Yes	ID of the review
Response
200 OK
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Review deleted successfully",
  "data": {}
}
404 Not Found
json

Collapse

Unwrap

Copy
{
  "status": "fail",
  "message": "Review not found",
  "errorCode": "REVIEW_NOT_FOUND"
}
Example
bash

Collapse

Unwrap

Run

Copy
curl -X DELETE http://localhost:3000/api/v1/customer/reviews/123e4567-e89b-12d3-a456-426614174000 \
-H "Authorization: Bearer <token>"
4. Manage Community Interaction
POST /api/v1/customer/reviews/:reviewId/interactions

Handles community interactions (upvote, comment) on a review.

Parameters

Parameter	Type	Required	Description
reviewId	String	Yes	ID of the review
Request Body

Field	Type	Required	Description
action	String	Yes	Interaction type (UPVOTE, COMMENT)
comment	String	No	Comment text (required if action is COMMENT, max 500 chars)
Response
201 Created
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Interaction recorded successfully",
  "data": {
    "interactionId": "uuid",
    "reviewId": "uuid",
    "action": "UPVOTE",
    "comment": null,
    "createdAt": "2025-07-08T02:38:00Z"
  }
}
400 Bad Request
json

Collapse

Unwrap

Copy
{
  "status": "fail",
  "message": "Invalid interaction type",
  "errorCode": "INVALID_INTERACTION_TYPE"
}
Example
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/v1/customer/reviews/123e4567-e89b-12d3-a456-426614174000/interactions \
-H "Authorization: Bearer <token>" \
-H "Content-Type: application/json" \
-d '{
  "action": "UPVOTE"
}'
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/v1/customer/reviews/123e4567-e89b-12d3-a456-426614174000/interactions \
-H "Authorization: Bearer <token>" \
-H "Content-Type: application/json" \
-d '{
  "action": "COMMENT",
  "comment": "Great review, thanks for sharing!"
}'
Error Codes

Code	Description
INVALID_SERVICE_TYPE	Invalid service type provided
INVALID_TARGET_TYPE	Invalid target type provided
INVALID_RATING	Rating must be between 1 and 5
REVIEW_NOT_FOUND	Review not found
INVALID_INTERACTION_TYPE	Invalid interaction type
REVIEW_SUBMISSION_FAILED	Failed to submit review
REVIEW_UPDATE_FAILED	Failed to update review
REVIEW_DELETION_FAILED	Failed to delete review
REVIEW_INTERACTION_FAILED	Failed to record interaction
Notes
All responses include localized messages based on the user's preferred language.
Gamification points are awarded for review submissions and interactions.
Socket events are emitted for real-time updates to relevant parties.
Audit logs are created for all review actions.
Photos must be valid URLs and are validated server-side.