promotionService.md
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\promotionService.md

markdown

Collapse

Unwrap

Copy
# Promotion Service API Documentation

**Module**: Customer Promotion Service (mtxi, munch, mtables)  
**Version**: 1.0  
**Last Updated**: June 2, 2025  

This document outlines the API endpoints for the Promotion Service, which manages customer promotions for mtxi (rides), munch (deliveries), and mtables (bookings). The service supports redeeming promotions, retrieving eligible promotions, and canceling redemptions, with group-based redemption support. It integrates with wallet, notifications, audits, and gamification points.

## Base URL
`/api/customer/mtxi/promotions`

## Authentication
All endpoints require Bearer Token authentication and are restricted to users with the `customer` role.

## Endpoints

### 1. Redeem a Promotion
- **Method**: POST
- **Path**: `/`
- **Permissions**: `redeem_promotion`
- **Description**: Redeems a promotion for a specific service, with optional group redemption.
- **Request Body**:
  ```json
  {
    "promotionId": 1,
    "serviceType": "ride",
    "groupCustomerIds": [2, 3]
  }
promotionId (integer, required): Promotion ID.
serviceType (string, required): Service type (ride, order, booking, event_service, in_dining_order).
groupCustomerIds (array, optional): List of customer IDs for group redemption.
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Promotion redeemed",
  "data": {
    "promotionId": 1,
    "gamificationError": null
  }
}
400 Bad Request: Invalid promotion, service type, or group configuration.
401 Unauthorized: Missing or invalid token.
403 Forbidden: Insufficient permissions.
Gamification: Awards 15 points and $0.30 credit for promotion_redeemed.
2. Retrieve Available Promotions
Method: GET
Path: /
Permissions: view_promotion
Description: Retrieves eligible promotions for a customer and service type.
Parameters:
serviceType (query, string, required): Service type (ride, order, booking, event_service, in_dining_order).
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Available promotions retrieved",
  "data": [
    {
      "id": 1,
      "type": "CASHBACK",
      "service_type": "ride",
      "reward_amount": 5.0,
      "discount_percentage": 0,
      "is_active": true,
      "expiry_date": "2025-12-31T23:59:59Z",
      "is_reusable": false,
      "customer_id": null
    }
  ]
}
400 Bad Request: Invalid service type.
401 Unauthorized: Missing or invalid token.
Gamification: No points awarded.
3. Cancel a Promotion Redemption
Method: POST
Path: /cancel
Permissions: cancel_promotion
Description: Cancels a redeemed promotion and reverses cashback or referral transactions.
Request Body:
json

Collapse

Unwrap

Copy
{
  "promotionId": 1
}
promotionId (integer, required): Promotion ID.
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Promotion redemption cancelled",
  "data": {
    "promotionId": 1,
    "gamificationError": null
  }
}
400 Bad Request: Invalid or non-redeemed promotion.
401 Unauthorized: Missing or invalid token.
404 Not Found: Promotion not found.
Gamification: Awards 5 points for promotion_cancellation.
Gamification Integration
Promotion Redemption: 15 points, $0.30 credit for redeeming promotions.
Promotion Cancellation: 5 points for canceling redemptions.
Error Codes
CUSTOMER_NOT_FOUND: Customer or group member not found.
INVALID_PROMOTION: Invalid promotion or service type.
PROMOTION_NOT_FOUND: Promotion not found.
PROMOTION_EXPIRED: Promotion expired or inactive.
PROMOTION_ALREADY_REDEEMED: Non-reusable promotion already redeemed.
PROMOTION_FAILED: Promotion operation failed.
WALLET_NOT_FOUND: Wallet not found.
TRANSACTION_FAILED: Invalid transaction amount.
Events
promotion:redeemed: Triggered on promotion redemption.
promotion:cancelled: Triggered on redemption cancellation.
Dependencies
customerConstants.js: Notification types, audit types, error codes.
paymentConstants.js: Wallet settings, transaction types, financial limits.
tipConstants.js: Service types.
gamificationConstants.js: Customer actions, point awards.
en.json: Localization messages.