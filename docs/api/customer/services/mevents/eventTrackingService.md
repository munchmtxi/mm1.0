docs/api/customer/services/mevents/eventTrackingService.md
markdown

Copy
# Event Tracking Service API

## POST /api/customer/mevents/tracking/interactions

Tracks user interactions with events or services.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('track_interaction')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field           | Type   | Required | Description                              |
|-----------------|--------|----------|------------------------------------------|
| eventId         | Integer| No       | ID of the event                          |
| interactionType | String | Yes      | Type: `booking_added`, `order_added`, etc.|
| metadata        | Object | No       | Additional interaction details            |

### Response
- **Status**: 201 Created
- **Body**:
  ```json
  {
    "status": "success",
    "message": "Interaction tracked successfully",
    "data": {
      "trackingId": 123,
      "gamificationError": null
    }
  }
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	INVALID_REQUEST	Invalid request parameters
400	INTERACTION_TRACKING_FAILED	Specific tracking error
404	INVALID_CUSTOMER	Customer not found
404	INVALID_EVENT	Event not found
429	MAX_INTERACTIONS_EXCEEDED	Daily interaction limit exceeded
Socket Events
Event: tracking:interaction:<customerId>
Payload:
json

Copy
{
  "trackingId": 123,
  "interactionType": "booking_added",
  "eventId": 456
}
Notifications
Sent to the customer with localized message about awarded points.
GET /api/customer/mevents/tracking/engagement/:customerId
Analyzes customer engagement over a period.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('analyze_engagement')
Header: Authorization: Bearer <JWT_TOKEN>
Parameters

Parameter	Type	Required	Description
customerId	Integer	Yes	ID of the customer
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Engagement analyzed successfully",
  "data": {
    "metrics": {
      "totalInteractions": 25,
      "interactionTypes": {
        "booking_added": 10,
        "order_added": 5,
        "ride_added": 5,
        "in_dining_order_added": 5
      },
      "eventCount": 3,
      "occasions": {
        "birthday": 2,
        "other": 1
      },
      "services": {
        "mtables": 10,
        "munch": 5,
        "mtxi": 5,
        "in_dining": 5
      }
    },
    "gamificationError": null
  }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	INVALID_REQUEST	Invalid request parameters
400	ENGAGEMENT_ANALYSIS_FAILED	Specific analysis error
404	INVALID_CUSTOMER	Customer not found
400	INSUFFICIENT_INTERACTIONS	Insufficient interactions
Notifications
Sent to the customer if high engagement is detected, with a summary of interactions.