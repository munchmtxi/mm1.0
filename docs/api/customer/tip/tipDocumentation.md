API Documentation (tipDocumentation.md)
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\tip\tipDocumentation.md

markdown

Collapse

Unwrap

Copy
# Tip API Documentation

API endpoints for managing tips by customers, including creating, updating, and retrieving tip history for services (Ride, Order, Booking, EventService, InDiningOrder, ParkingBooking). Integrates with gamification, notifications, and real-time socket events.

**Base URL**: `/api/v1/customer/tips`

## Endpoints

### 1. Create a Tip
Creates a tip for a recipient associated with a specific service.

- **URL**: `/`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept-Language: en` (optional, defaults to `en`)
- **Body**:
  ```json
  {
    "customerId": "string",
    "recipientId": "string",
    "amount": "number",
    "currency": "string",
    "rideId": "string" (optional, one of rideId, orderId, bookingId, eventServiceId, inDiningOrderId, parkingBookingId),
    "orderId": "string" (optional),
    "bookingId": "string" (optional),
    "eventServiceId": "string" (optional),
    "inDiningOrderId": "string" (optional),
    "parkingBookingId": "string" (optional)
  }
Success Response:
Code: 201
Content:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Tip created successfully for $10.00 USD",
  "data": {
    "tipId": "string",
    "amount": "number",
    "currency": "string",
    "status": "PENDING",
    "rideId": "string" (or other service ID),
    "walletId": "string",
    "recipientWalletId": "string"
  }
}
Error Response:
Code: 400 (Invalid input), 401 (Unauthorized), 500 (Server error)
Content:
json

Collapse

Unwrap

Copy
{
  "status": "fail",
  "message": "Invalid customer",
  "errorCode": "INVALID_CUSTOMER",
  "timestamp": "2025-07-08T07:12:00.000Z"
}
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/v1/customer/tips \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{
    "customerId": "cust_123",
    "recipientId": "driver_456",
    "amount": 10.00,
    "currency": "USD",
    "rideId": "ride_789"
  }'
2. Update a Tip
Updates an existing tip's amount or status.

URL: /:tipId
Method: PATCH
Headers:
Content-Type: application/json
Accept-Language: en (optional, defaults to en)
Params:
tipId: Tip ID (string)
Body:
json

Collapse

Unwrap

Copy
{
  "customerId": "string",
  "amount": "number" (optional),
  "status": "string" (optional, e.g., "PENDING", "COMPLETED")
}
Success Response:
Code: 200
Content:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Tip updated successfully",
  "data": {
    "tipId": "string",
    "amount": "number",
    "currency": "string",
    "status": "string",
    "rideId": "string" (or other service ID)
  }
}
Error Response:
Code: 400 (Invalid input), 401 (Unauthorized), 404 (Tip not found), 500 (Server error)
Content:
json

Collapse

Unwrap

Copy
{
  "status": "fail",
  "message": "Tip not found or unauthorized",
  "errorCode": "TIP_NOT_FOUND",
  "timestamp": "2025-07-08T07:12:00.000Z"
}
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X PATCH http://localhost:3000/api/v1/customer/tips/tip_123 \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{
    "customerId": "cust_123",
    "amount": 15.00,
    "status": "COMPLETED"
  }'
3. Get Customer Tips
Retrieves the tip history for a customer.

URL: /:customerId
Method: GET
Headers:
Accept-Language: en (optional, defaults to en)
Params:
customerId: Customer ID (string)
Success Response:
Code: 200
Content:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Tips retrieved successfully",
  "data": [
    {
      "tipId": "string",
      "amount": "number",
      "currency": "string",
      "status": "string",
      "rideId": "string" (or other service ID),
      "recipientName": "string",
      "createdAt": "string"
    }
  ]
}
Error Response:
Code: 400 (Invalid input), 401 (Unauthorized), 500 (Server error)
Content:
json

Collapse

Unwrap

Copy
{
  "status": "fail",
  "message": "Invalid customer",
  "errorCode": "INVALID_CUSTOMER",
  "timestamp": "2025-07-08T07:12:00.000Z"
}
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X GET http://localhost:3000/api/v1/customer/tips/cust_123 \
  -H "Accept-Language: en"
Notes
Authentication is required via JWT in the Authorization header (handled by main route middleware).
Only one service ID (e.g., rideId, orderId) should be provided in the create tip request.
Responses are localized based on the Accept-Language header or user's preferred language.
Socket events (TIP_RECEIVED, TIP_UPDATED) are emitted for real-time updates.
Gamification points are awarded for tipping actions, and notifications are sent to recipients.