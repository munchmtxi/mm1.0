Documentation File
C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\services\munch\subscriptionService.md

markdown

Collapse

Unwrap

Copy
# Subscription Service API

## POST /api/customer/munch/subscription/enroll

Enrolls a customer in a subscription plan.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('enroll_subscription')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field   | Type   | Required | Description       |
|---------|--------|----------|-------------------|
| planId  | String | Yes      | Subscription plan ID |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "data": {
      "subscriptionId": "integer",
      "planId": "string",
      "status": "string"
    }
  }
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	CUSTOMER_NOT_FOUND	Customer not found
400	INVALID_SUBSCRIPTION_PLAN	Invalid subscription plan
400	SUBSCRIPTION_ALREADY_ACTIVE	Subscription already active
400	INSUFFICIENT_FUNDS	Insufficient funds
Socket Events
Event: subscription:enrolled
Payload:
json

Collapse

Unwrap

Copy
{
  "subscriptionId": "integer",
  "planId": "string",
  "customerId": "string"
}
Notifications
Sent to customer with localized message for subscription enrollment.
PUT /api/customer/munch/subscription/manage
Manages subscription actions (upgrade, downgrade, pause, cancel).

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('manage_subscription')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
action	String	Yes	Action (UPGRADE, DOWNGRADE, PAUSE, CANCEL)
newPlanId	String	Conditional	New plan ID for upgrade/downgrade
pauseDurationDays	Integer	Conditional	Pause duration in days for pause
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
    "subscriptionId": "integer",
    "status": "string",
    "newPlanId": "string",
    "amount": "number",
    "refundAmount": "number"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	CUSTOMER_NOT_FOUND	Customer not found
404	SUBSCRIPTION_NOT_FOUND	Subscription not found
400	INVALID_SUBSCRIPTION_ACTION	Invalid subscription action
400	INVALID_SUBSCRIPTION_PLAN	Invalid subscription plan
400	INVALID_UPGRADE_PLAN	Invalid upgrade plan
400	INVALID_DOWNGRADE_PLAN	Invalid downgrade plan
400	INVALID_PAUSE_DURATION	Invalid pause duration
400	INSUFFICIENT_FUNDS	Insufficient funds
404	WALLET_NOT_FOUND	Wallet not found
Socket Events
Event: subscription:{action.toLowerCase()}
Payload:
json

Collapse

Unwrap

Copy
{
  "subscriptionId": "integer",
  "status": "string",
  "customerId": "string"
}
Notifications
Sent to customer with localized message for the specific action.
GET /api/customer/munch/subscription/tiers
Tracks subscription tiers for a customer.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('track_subscription')
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
  "data": {
    "subscriptionId": "integer",
    "planId": "string",
    "tier": "string",
    "status": "string",
    "endDate": "string"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
404	CUSTOMER_NOT_FOUND	Customer not found
404	SUBSCRIPTION_NOT_FOUND	Subscription not found