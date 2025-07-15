docs/api/customer/mtxi/subscriptionService.md
Detailed API documentation for subscription service.

markdown

Collapse

Unwrap

Copy
# Subscription Service API

Handles subscription-related operations for customers.

## Endpoints

### 1. Enroll Subscription
**POST /customer/mtxi/subscriptions**

Enrolls a customer in a subscription plan.

#### Request
- **Headers**: `accept-language: en`
- **Body**:
  ```json
  {
    "planId": "premium",
    "serviceType": "ride",
    "walletId": 1
  }
Response
201 Created:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Subscribed to premium successfully",
  "data": { "subscriptionId": 1 }
}
400 Bad Request: Invalid input.
403 Forbidden: Unauthorized.
cURL
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/mtxi/subscriptions \
-H "accept-language: en" \
-H "Content-Type: application/json" \
-d '{"planId":"premium","serviceType":"ride","walletId":1}'
2. Manage Subscription
PUT /customer/mtxi/subscriptions

Upgrades or downgrades a subscription.

Request
Headers: accept-language: en
Body:
json

Collapse

Unwrap

Copy
{
  "subscriptionId": 1,
  "action": "UPGRADE",
  "newPlanId": "elite"
}
Response
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Subscription updated to elite successfully",
  "data": { "subscriptionId": 1 }
}
400 Bad Request: Invalid input.
403 Forbidden: Unauthorized.
cURL
bash

Collapse

Unwrap

Run

Copy
curl -X PUT http://localhost:3000/customer/mtxi/subscriptions \
-H "accept-language: en" \
-H "Content-Type: application/json" \
-d '{"subscriptionId":1,"action":"UPGRADE","newPlanId":"elite"}'
3. Cancel Subscription
DELETE /customer/mtxi/subscriptions

Cancels a subscription.

Request
Headers: accept-language: en
Body:
json

Collapse

Unwrap

Copy
{
  "subscriptionId": 1
}
Response
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Subscription cancelled successfully"
}
400 Bad Request: Invalid input.
403 Forbidden: Unauthorized.
cURL
bash

Collapse

Unwrap

Run

Copy
curl -X DELETE http://localhost:3000/customer/mtxi/subscriptions \
-H "accept-language: en" \
-H "Content-Type: application/json" \
-d '{"subscriptionId":1}'
4. Track Subscription Tiers
GET /customer/mtxi/subscriptions/tiers

Retrieves subscription tier details.

Request
Headers: accept-language: en
Response
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Subscription tiers retrieved successfully",
  "data": { "tier": "premium", "benefits": ["priority rides"] }
}
403 Forbidden: Unauthorized.
cURL
bash

Collapse

Unwrap

Run

Copy
curl -X GET http://localhost:3000/customer/mtxi/subscriptions/tiers \
-H "accept-language: en"
5. Get Subscription History
GET /customer/mtxi/subscriptions/history

Retrieves subscription history.

Request
Headers: accept-language: en
Response
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Subscription history retrieved successfully",
  "data": [{ "subscriptionId": 1, "plan": "premium", "status": "active" }]
}
403 Forbidden: Unauthorized.
cURL
bash

Collapse

Unwrap

Run

Copy
curl -X GET http://localhost:3000/customer/mtxi/subscriptions/history \
-H "accept-language: en"
Notes
Authentication is handled by the main route index.
Points are awarded for subscription_enrolled (15) and subscription_managed (5) as per customerGamificationConstants.
Socket events (SUBSCRIPTION_ENROLLED, SUBSCRIPTION_UPGRADED, etc.) are emitted for real-time updates.