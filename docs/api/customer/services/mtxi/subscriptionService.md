C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\subscriptionService.md

markdown

Collapse

Unwrap

Copy
# Subscription Service API Documentation

**Module**: Customer Subscription Service (mtxi, munch, mtables)  
**Version**: 1.0  
**Last Updated**: June 2, 2025  

This document outlines the API endpoints for the Subscription Service, which manages customer subscriptions for mtxi (rides), munch (food delivery), and mtables (table bookings). The service supports enrollment, management, cancellation, tier tracking, and history retrieval, with integration for payments, notifications, audits, and gamification points.

## Base URL
`/api/customer/mtxi/subscriptions`

## Authentication
All endpoints require Bearer Token authentication and are restricted to users with the `customer` role.

## Endpoints

### 1. Enroll in a Subscription
- **Method**: POST
- **Path**: `/`
- **Permissions**: `create_subscription`
- **Description**: Enrolls a customer in a subscription plan (BASIC or PREMIUM) for a specified service (mtxi, munch, mtables).
- **Request Body**:
  ```json
  {
    "planId": "BASIC",
    "serviceType": "mtxi",
    "paymentMethodId": 1
  }
planId (string, required): Subscription plan (BASIC, PREMIUM).
serviceType (string, required): Service type (mtxi, munch, mtables).
paymentMethodId (integer, required): Payment method ID.
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Subscription enrolled",
  "data": {
    "subscriptionId": 1,
    "gamificationError": null
  }
}
400 Bad Request: Invalid plan, service type, or payment method.
401 Unauthorized: Missing or invalid token.
403 Forbidden: Insufficient permissions.
Gamification: Awards points for subscription_enrollment (50 points, $1.00 credit).
2. Manage a Subscription
Method: POST
Path: /manage
Permissions: manage_subscription
Description: Upgrades or pauses an active subscription.
Request Body:
json

Collapse

Unwrap

Copy
{
  "subscriptionId": 1,
  "action": "UPGRADE",
  "newPlanId": "PREMIUM",
  "paymentMethodId": 1
}
subscriptionId (integer, required): Subscription ID.
action (string, required): Action (UPGRADE, PAUSE).
newPlanId (string, optional): New plan for upgrade (BASIC, PREMIUM).
paymentMethodId (integer, optional): Payment method ID for upgrades.
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Subscription updated",
  "data": {
    "subscriptionId": 1,
    "gamificationError": null
  }
}
400 Bad Request: Invalid subscription, action, or plan.
401 Unauthorized: Missing or invalid token.
403 Forbidden: Insufficient permissions.
Gamification: Awards points for tier_upgrade (100 points, $2.00 credit) if upgrading to PREMIUM.
3. Cancel a Subscription
Method: POST
Path: /cancel
Permissions: cancel_subscription
Description: Cancels an active or paused subscription.
Request Body:
json

Collapse

Unwrap

Copy
{
  "subscriptionId": 1
}
subscriptionId (integer, required): Subscription ID.
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Subscription cancelled",
  "data": {
    "subscriptionId": 1,
    "gamificationError": null
  }
}
400 Bad Request: Invalid or non-cancellable subscription.
401 Unauthorized: Missing or invalid token.
403 Forbidden: Insufficient permissions.
Gamification: Awards points for subscription_cancellation (10 points).
4. Track Subscription Tiers
Method: GET
Path: /tiers
Permissions: view_subscription
Description: Retrieves the customer’s subscription tier and benefits.
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Subscription tiers retrieved",
  "data": {
    "customerId": 1,
    "subscriptionId": 1,
    "serviceType": "mtxi",
    "plan": "PREMIUM",
    "tier": "GOLD",
    "benefits": ["priority_booking", "discounts"],
    "sharingEnabled": true
  }
}
400 Bad Request: Customer not found.
401 Unauthorized: Missing or invalid token.
403 Forbidden: Insufficient permissions.
5. Retrieve Subscription History
Method: GET
Path: /history
Permissions: view_subscription
Description: Retrieves the customer’s subscription history.
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Subscription history retrieved",
  "data": [
    {
      "id": 1,
      "service_type": "mtxi",
      "plan": "PREMIUM",
      "status": "active",
      "start_date": "2025-06-01T00:00:00Z",
      "end_date": "2025-07-01T00:00:00Z"
    }
  ]
}
400 Bad Request: Customer not found.
401 Unauthorized: Missing or invalid token.
403 Forbidden: Insufficient permissions.
Gamification Integration
Enrollment: 50 points, $1.00 wallet credit.
Tier Upgrade: 100 points, $2.00 wallet credit (PREMIUM only).
Cancellation: 10 points.
Loyalty: 200 points, $5.00 wallet credit daily for active subscriptions (via background process).
Error Codes
INVALID_SUBSCRIPTION: Invalid plan, service type, or action.
CUSTOMER_NOT_FOUND: Customer does not exist.
SUBSCRIPTION_LIMIT_EXCEEDED: Maximum active subscriptions reached.
SUBSCRIPTION_NOT_FOUND: Subscription does not exist or is not active.
SUBSCRIPTION_NOT_MODIFIABLE: Subscription cannot be modified (e.g., already paused).
SUBSCRIPTION_FAILED: General subscription operation failure.
Events
subscription:enrolled: Triggered on successful enrollment.
subscription:updated: Triggered on upgrade or pause.
subscription:cancelled: Triggered on cancellation.
subscription:loyalty_awarded: Triggered for daily loyalty points.
Dependencies
customerConstants.js: Subscription plans, notification types, audit types.
paymentConstants.js: Transaction types, wallet settings.
gamificationConstants.js: Customer actions, point awards.
en.json: Localization messages.