API Documentation File
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\munch\subscriptionService.md

This file provides extensive API documentation with precise curl commands for each endpoint.

markdown

Collapse

Unwrap

Copy
# Customer Subscription Service API

This document outlines the API endpoints for managing customer subscriptions in the Munch service. All endpoints are prefixed with `/customer/munch/subscriptions`.

## Authentication
- All endpoints require authentication via a Bearer token, provided in the `Authorization` header.
- Authentication is handled by the main route index and not included in individual routes.

## Endpoints

### 1. Enroll in a Subscription Plan
Enrolls a user in a subscription plan.

- **Method**: POST
- **Path**: `/customer/munch/subscriptions/enroll`
- **Request Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
  - `Accept-Language: en` (optional, defaults to `en`)
- **Request Body**:
  ```json
  {
    "userId": 1,
    "planId": 1,
    "serviceType": "munch",
    "menuItemId": 100
  }
Response:
201 Created:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Successfully enrolled in Basic plan",
  "data": {
    "subscriptionId": 1,
    "plan": "Basic",
    "serviceType": "munch",
    "amount": 29.99,
    "currency": "USD",
    "benefits": ["Free delivery", "Exclusive discounts"],
    "menuItemId": 100
  }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "message": "Validation failed: userId is required",
  "errorCode": "VALIDATION_FAILED"
}
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "message": "An error occurred: Database error",
  "errorCode": "SUBSCRIPTION_ENROLLMENT_FAILED"
}
Curl Command:
bash

Collapse

Unwrap

Run

Copy
curl -X POST "http://localhost:3000/customer/munch/subscriptions/enroll" \
-H "Authorization: Bearer <token>" \
-H "Content-Type: application/json" \
-H "Accept-Language: en" \
-d '{"userId":1,"planId":1,"serviceType":"munch","menuItemId":100}'
2. Manage Subscription
Manages an existing subscription (upgrade, downgrade, pause, cancel).

Method: PUT
Path: /customer/munch/subscriptions/manage
Request Headers:
Authorization: Bearer <token>
Content-Type: application/json
Accept-Language: en (optional)
Request Body:
json

Collapse

Unwrap

Copy
{
  "userId": 1,
  "action": "UPGRADE",
  "newPlanId": 2,
  "menuItemId": 100
}
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Subscription upgraded to Premium",
  "data": {
    "subscriptionId": 1,
    "plan": "Premium",
    "serviceType": "munch",
    "newStatus": "ACTIVE",
    "amount": 49.99,
    "refundAmount": 0,
    "benefits": ["Free delivery", "Priority support"],
    "menuItemId": 100
  }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "message": "Validation failed: action must be one of [UPGRADE, DOWNGRADE, PAUSE, CANCEL]",
  "errorCode": "VALIDATION_FAILED"
}
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "message": "An error occurred: Database error",
  "errorCode": "SUBSCRIPTION_MANAGEMENT_FAILED"
}
Curl Command:
bash

Collapse

Unwrap

Run

Copy
curl -X PUT "http://localhost:3000/customer/munch/subscriptions/manage" \
-H "Authorization: Bearer <token>" \
-H "Content-Type: application/json" \
-H "Accept-Language: en" \
-d '{"userId":1,"action":"UPGRADE","newPlanId":2,"menuItemId":100}'
3. Track Subscription Tiers
Retrieves subscription tier details for a user.

Method: GET
Path: /customer/munch/subscriptions/track/{userId}
Request Headers:
Authorization: Bearer <token>
Accept-Language: en (optional)
Path Parameters:
userId: Integer, required
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Subscription details retrieved successfully",
  "data": {
    "subscriptionId": 1,
    "plan": "Basic",
    "serviceType": "munch",
    "status": "ACTIVE",
    "totalAmount": 29.99,
    "sharingEnabled": true,
    "endDate": "2025-08-07T00:00:00.000Z",
    "benefits": ["Free delivery", "Exclusive discounts"],
    "menuItem": { "id": 100, "name": "Premium Burger" }
  }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "message": "Validation failed: userId is required",
  "errorCode": "VALIDATION_FAILED"
}
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "message": "An error occurred: Database error",
  "errorCode": "SUBSCRIPTION_TRACKING_FAILED"
}
Curl Command:
bash

Collapse

Unwrap

Run

Copy
curl -X GET "http://localhost:3000/customer/munch/subscriptions/track/1" \
-H "Authorization: Bearer <token>" \
-H "Accept-Language: en"
4. Renew Subscription
Renews an existing subscription.

Method: PUT
Path: /customer/munch/subscriptions/renew/{subscriptionId}
Request Headers:
Authorization: Bearer <token>
Content-Type: application/json
Accept-Language: en (optional)
Path Parameters:
subscriptionId: Integer, required
Request Body:
json

Collapse

Unwrap

Copy
{
  "userId": 1
}
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Subscription Basic renewed successfully",
  "data": {
    "subscriptionId": 1,
    "plan": "Basic",
    "serviceType": "munch",
    "amount": 29.99,
    "currency": "USD",
    "benefits": ["Free delivery", "Exclusive discounts"],
    "menuItemId": 100
  }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "message": "Validation failed: subscriptionId is required",
  "errorCode": "VALIDATION_FAILED"
}
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "message": "An error occurred: Database error",
  "errorCode": "SUBSCRIPTION_RENEWAL_FAILED"
}
Curl Command:
bash

Collapse

Unwrap

Run

Copy
curl -X PUT "http://localhost:3000/customer/munch/subscriptions/renew/1" \
-H "Authorization: Bearer <token>" \
-H "Content-Type: application/json" \
-H "Accept-Language: en" \
-d '{"userId":1}'
Error Codes
VALIDATION_FAILED: Invalid request parameters.
CUSTOMER_NOT_FOUND: Customer does not exist.
INVALID_SUBSCRIPTION_PLAN: Invalid plan ID or type.
MAX_SUBSCRIPTIONS_EXCEEDED: User has reached the maximum active subscriptions.
INVALID_MENU_ITEM: Menu item is invalid or unpublished.
INVALID_DIETARY_FILTER: Menu item does not meet dietary requirements.
WALLET_NOT_FOUND: Wallet not found for the user.
WALLET_INSUFFICIENT_FUNDS: Insufficient wallet balance.
TRANSACTION_LIMIT_EXCEEDED: Wallet balance exceeds maximum limit.
SUBSCRIPTION_NOT_FOUND: Subscription does not exist.
INVALID_SUBSCRIPTION_ACTION: Invalid management action.
INVALID_UPGRADE_PLAN: Invalid plan for upgrade.
INVALID_DOWNGRADE_PLAN: Invalid plan for downgrade.
INVALID_PAUSE_DURATION: Invalid pause duration.
SUBSCRIPTION_ENROLLMENT_FAILED: General enrollment failure.
SUBSCRIPTION_MANAGEMENT_FAILED: General management failure.
SUBSCRIPTION_TRACKING_FAILED: General tracking failure.
SUBSCRIPTION_RENEWAL_FAILED: General renewal failure.
INVALID_ACTION: Invalid gamification action.
SUBSCRIPTION_CHECK_FAILED: Failed to check subscription status.
Notes
All responses include a success boolean, a localized message, and a data object (for successful requests) or errorCode (for errors).
The Accept-Language header determines the response language, defaulting to en.
Socket events (SUBSCRIPTION_ENROLLED, SUBSCRIPTION_UPDATED, SUBSCRIPTION_RENEWED) are emitted to customer:<userId> rooms for real-time updates.
text

Collapse

Unwrap

Copy
**Notes**:
- Provides detailed documentation for each endpoint, including request/response formats and curl commands.
- Lists all possible error codes from the controller, validator, and middleware.
- Notes authentication requirements and socket event integration.

---

### Integration Notes
- **Models**: The files use `Subscription`, `Customer`, `User`, `Wallet`, `MenuInventory`, etc., from `@models`, consistent with the controller and service.
- **Constants**: Leverage `customerConstants`, `munchConstants`, `paymentConstants`, `socketConstants`, `localizationConstants`, and `gamificationConstants` for validation, error handling, and configuration.
- **Localization**: The updated `en.json` integrates with `formatMessage` for consistent messaging across validators, middleware, and controller.
- **Socket Events**: The handler and events files align with `socketService.emit` calls in the controller, using `socketConstants.SOCKET_EVENT_TYPES`.
- **Middleware**: Excludes authentication, focusing on subscription-specific checks (active subscriptions, menu item validity).
- **Routes**: Use validators and middleware, with Swagger comments for API documentation.
- **API Docs**: Comprehensive, with curl commands and error codes matching the implementation.