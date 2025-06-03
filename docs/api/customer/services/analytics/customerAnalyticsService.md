docs/api/customer/services/analytics/customerAnalyticsService.md
markdown

Copy
# Customer Analytics Service API

## POST /api/customer/analytics/behavior/{customerId}

Tracks customer behavior based on bookings, orders, and rides over the last 30 days.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('track_behavior')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Parameters
| Field        | Type   | Required | Description                              |
|--------------|--------|----------|------------------------------------------|
| customerId   | Integer| Yes      | ID of the customer (path or body)        |

### Request Body
| Field        | Type   | Required | Description                              |
|--------------|--------|----------|------------------------------------------|
| customer_id  | Integer| Yes      | ID of the customer (alternative to path) |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "message": "Customer behavior tracked for customer 123",
    "data": {
      "behavior": {
        "bookingFrequency": 5,
        "orderFrequency": 10,
        "rideFrequency": 3,
        "lastUpdated": "2025-05-31T14:10:00.000Z"
      },
      "gamificationError": null
    }
  }
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
400	BEHAVIOR_TRACKING_FAILED	Behavior tracking failed
404	CUSTOMER_NOT_FOUND	Customer not found
Socket Events
Event: analytics:behavior_tracked
Payload:
json

Copy
{
  "userId": 123,
  "behavior": {
    "bookingFrequency": 5,
    "orderFrequency": 10,
    "rideFrequency": 3,
    "lastUpdated": "2025-05-31T14:10:00.000Z"
  }
}
POST /api/customer/analytics/spending/{customerId}
Analyzes customer spending trends over the last 90 days.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('analyze_spending')
Header: Authorization: Bearer <JWT_TOKEN>
Parameters

Field	Type	Required	Description
customerId	Integer	Yes	ID of the customer (path or body)
Request Body

Field	Type	Required	Description
customer_id	Integer	Yes	ID of the customer (alternative to path)
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Spending trends analyzed for customer 123",
  "data": {
    "trends": {
      "totalSpent": "1500.00",
      "transactionCount": 20,
      "averageTransaction": "75.00",
      "activeSubscriptions": 2,
      "promotionRedemptions": 5,
      "currency": "USD",
      "period": "last 90 days"
    },
    "gamificationError": null
  }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
400	SPENDING_ANALYSIS_FAILED	Spending analysis failed
404	CUSTOMER_NOT_FOUND	Customer not found
Socket Events
Event: analytics:spending_trends
Payload:
json

Copy
{
  "userId": 123,
  "trends": {
    "totalSpent": "1500.00",
    "transactionCount": 20,
    "averageTransaction": "75.00",
    "activeSubscriptions": 2,
    "promotionRedemptions": 5,
    "currency": "USD",
    "period": "last 90 days"
  }
}
POST /api/customer/analytics/recommendations/{customerId}
Provides personalized product recommendations.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('get_recommendations')
Header: Authorization: Bearer <JWT_TOKEN>
Parameters

Field	Type	Required	Description
customerId	Integer	Yes	ID of the customer (path or body)
Request Body

Field	Type	Required	Description
customer_id	Integer	Yes	ID of the customer (alternative to path)
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Provided 3 recommendations for customer 123",
  "data": {
    "recommendations": {
      "items": [
        {
          "productId": 456,
          "recommendationType": "food",
          "eventType": "purchase",
          "metadata": { "dietary": ["vegan"] }
        }
      ],
      "feedbackSummary": {
        "ratingTotal": 40,
        "feedbackCount": 10
      }
    },
    "gamificationError": null
  }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
400	RECOMMENDATION_FAILED	Recommendation failed
404	CUSTOMER_NOT_FOUND	Customer not found
Socket Events
Event: analytics:recommendations
Payload:
json

Copy
{
  "userId": 123,
  "recommendations": {
    "items": [
      {
        "productId": 456,
        "recommendationType": "food",
        "eventType": "purchase",
        "metadata": { "dietary": ["vegan"] }
      }
    ],
    "feedbackSummary": {
      "ratingTotal": 40,
      "feedbackCount": 10
    }
  }
}