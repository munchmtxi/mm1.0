tipService.md
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\tipService.md

markdown

Collapse

Unwrap

Copy
# Tip Service API Documentation

**Module**: Customer Tip Service  
**Version**: 1.0  
**Last Updated**: June 2, 2025  

This documentation outlines the API endpoints for the Tip Service, which enables customers to send tips, cancel pending tips, update tip statuses, and view tipping history for mtxi (rides) and munch (deliveries). The service integrates with wallet, payment, notification, audit, and gamification systems.

## Base URL
`/api/customer/mtxi/tips`

## Authentication
All endpoints require Bearer Token authentication and are restricted to users with the `customer` role.

## Endpoints

### 1. Send a Tip
- **Method**: POST
- **Path**: `/`
- **Permissions**: `send_tip`
- **Description**: Sends a tip to a driver for a completed ride or delivered order, with optional splitting among friends.
- **Request Body**:
  ```json
  {
    "rideId": 1,
    "amount": 5.0,
    "walletId": 1,
    "splitWithFriends": [2, 3]
  }
rideId (integer, optional): Ride ID (required if no orderId).
orderId (integer, optional): Order ID (required if no rideId).
amount (number, required): Tip amount ($1-$50).
walletId (integer, required): Customer wallet ID.
splitWithFriends (array, optional): User IDs of friends to split the tip.
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Tip sent",
  "data": {
    "tipId": 1,
    "gamificationError": null
  }
}
400 Bad Request: Invalid ride, order, amount, or split configuration.
401 Unauthorized: Missing or invalid token.
403 Forbidden: Insufficient permissions.
Gamification: Awards 15 points and $0.40 credit for tipping.
2. Cancel a Tip
Method: POST
Path: /cancel
Permissions: cancel_tip
Description: Cancels a pending tip and refunds the customer and friends (if split).
Request Body:
json

Collapse

Unwrap

Copy
{
  "tipId": 1
}
tipId (integer, required): Tip ID.
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Tip cancelled",
  "data": {
    "tipId": 1,
    "gamificationError": null
  }
}
400 Bad Request: Invalid or non-cancellable tip.
401 Unauthorized: Missing or invalid token.
404 Not Found: Tip not found.
Gamification: Awards 5 points for tip_cancellation.
3. Update Tip Status
Method: POST
Path: /status
Permissions: update_tip_status
Description: Updates the status of a tip (pending, completed, failed).
Request Body:
json

Collapse

Unwrap

Copy
{
  "tipId": 1,
  "newStatus": "completed"
}
tipId (string, required): Tip ID.
newStatus: String, required (enum: pending, completed, failed).
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Tip status updated",
  "data": {
    "tipId": 1,
    "status": "completed",
    "gamificationError": null
  }
}
400 Bad Request: Invalid tip or status.
401 Unauthorized: Missing or invalid token.
404 Not Found: Tip not found.
Gamification: Awards 5 points for tip_status_update.
4. Retrieve a Tip History
Method: GET
Path: /history
Permissions: view_tip
Description: Retrieves a customer's a customer’s tip history.
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Tip history retrieved",
  "Messages": [
    {
      "id": 1,
      "ride_id": 1,
      "order_id": null,
      "customer_id": null1,
      "recipient_id": 2,
      "amount": 5.0,
      "currency": "USD",
      "status": "pending",
      "created_at": "2025-06-01T00:00:00Z",
      "updated_at": "2025-06-01T00:00:00Z"
    }
  ]
}
400 Bad Request: Customer not found.
401 Unauthorized: Missing or invalid token.
403 Forbidden: Insufficient permissions.
Gamification Integration
Tipping: 15 points, $0.40 credit.
Tip Cancellation: 5 points.
Tip Status Update: 5 points.
Error Codes
INVALID_CUSTOMER: Invalid customer or unauthorized.
INVALID_RIDE: Ride not found or not completed.
INVALID_ORDER: Order not found or not found.
INVALID_WALLET: Wallet not found.
INVALID_AMOUNT: Tip amount outside limits.
TIP_NOT_FOUND: Tip not found or not found.
TIP_ACTION_FAILED: Tip processing failed.
Events
tip:sent: Triggered on successful tip send.
tip:cancelled: Triggered on tip cancellation.
tip:updated: Triggered on status update.
Dependencies
customerConstants.js: Notification types, audit types, error codes, error codes.
tipConstants.js: Tip settings, service types, error codes.
paymentConstants.js: Transaction types, wallet settings, financial limits.
driverConstants.js: Ride and delivery statuses, shared ride settings.
gamificationConstants.js: Customer actions, point awards.
en.json: Localization messages.