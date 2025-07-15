eventTrackingService.md
Update the documentation to include new interaction types, their metadata, and the new engagement socket event.

markdown

Collapse

Unwrap

Copy
# Event Tracking Service API

## POST /api/customer/mevents/tracking/interactions

Tracks user interactions with events or services.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('track_interaction')`, `validateEventAccess`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field           | Type   | Required | Description                              |
|-----------------|--------|----------|------------------------------------------|
| eventId         | Integer| No       | ID of the event                          |
| interactionType | String | Yes      | Type: `booking_added`, `order_added`, `ride_added`, `in_dining_order_added`, `parking_booking_added`, `menu_item_selected`, `table_selected`, `event_updated` |
| metadata        | Object | No       | Additional interaction details            |
| metadata.inDiningOrderId | Integer | Yes (if `in_dining_order_added`) | In-dining order ID |
| metadata.parkingBookingId | Integer | Yes (if `parking_booking_added`) | Parking booking ID |
| metadata.menuItemId | Integer | Yes (if `menu_item_selected`) | Menu item ID |
| metadata.tableId | Integer | Yes (if `table_selected`) | Table ID |
| metadata.eventId | Integer | Yes (if `event_updated`) | Event ID for amendment |

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
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	INVALID_REQUEST	Invalid request parameters
400	INTERACTION_TRACKING_FAILED	Specific tracking error
404	INVALID_CUSTOMER	Customer not found
404	INVALID_EVENT	Event not found
404	INVALID_SERVICE	Invalid service ID
404	INVALID_MENU_ITEM	Invalid menu item ID
404	INVALID_TABLE	Invalid table ID
429	MAX_INTERACTIONS_EXCEEDED	Daily interaction limit exceeded
Socket Events
Event: tracking:interaction:<customerId>
Payload:
json

Collapse

Unwrap

Copy
{
  "trackingId": 123,
  "interactionType": "booking_added",
  "eventId": 456,
  "userId": 789,
  "role": "customer",
  "auditAction": "INTERACTION_TRACKED"
}
Notifications
Sent to the customer with a localized message about awarded points.

GET /api/customer/mevents/tracking/engagement/{customerId}
Analyzes customer engagement over a period.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('analyze_engagement'), validateCustomerAccess
Header: Authorization: Bearer <JWT_TOKEN>
Parameters

Parameter	Type	Required	Description
customerId	Integer	Yes	ID of the customer
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

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
        "in_dining_order_added": 5,
        "parking_booking_added": 3,
        "menu_item_selected": 4,
        "table_selected": 2,
        "event_updated": 1
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
        "in_dining": 5,
        "mpark": 3
      }
    },
    "gamificationError": null
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	INVALID_REQUEST	Invalid request parameters
400	ENGAGEMENT_ANALYSIS_FAILED	Specific analysis error
404	INVALID_CUSTOMER	Customer not found
400	INSUFFICIENT_INTERACTIONS	Insufficient interactions
Socket Events
Event: tracking:engagement:<customerId>
Payload:
json

Collapse

Unwrap

Copy
{
  "customerId": 456,
  "metrics": {
    "totalInteractions": 25,
    "eventCount": 3
  },
  "userId": 456,
  "role": "customer",
  "auditAction": "ENGAGEMENT_ANALYZED"
}
Notifications
Sent to the customer if high engagement is detected, with a summary of interactions.