API Documentation
File: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\mpark\api.md

markdown

Collapse

Unwrap

Copy
# Customer Mpark API Documentation

This document provides detailed information about the Customer Mpark API endpoints for managing parking bookings and parking-related operations.

## Base URL
`http://localhost:3000/customer/mpark`

## Booking Endpoints

### 1. Create a Parking Booking
Create a new parking booking for a customer.

- **Method**: POST
- **Path**: `/bookings`
- **Body**:
  ```json
  {
    "spaceId": 1,
    "bookingType": "HOURLY",
    "startTime": "2025-07-07T12:00:00Z",
    "endTime": "2025-07-07T14:00:00Z",
    "checkInMethod": "QR_CODE",
    "vehicleDetails": { "licensePlate": "ABC123", "model": "Sedan" },
    "city": "New York",
    "merchantId": 1
  }
Response:
201: Booking created
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Parking booking 1 created successfully.",
  "data": { "booking": { "id": 1, ... } }
}
400: Invalid input
Curl:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/mpark/bookings \
-H "Content-Type: application/json" \
-d '{"spaceId":1,"bookingType":"HOURLY","startTime":"2025-07-07T12:00:00Z","endTime":"2025-07-07T14:00:00Z","checkInMethod":"QR_CODE","vehicleDetails":{"licensePlate":"ABC123","model":"Sedan"},"city":"New York","merchantId":1}'
2. Cancel a Booking
Cancel an existing parking booking.

Method: PUT
Path: /bookings/:bookingId/cancel
Parameters: bookingId (integer)
Response:
200: Booking cancelled
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Parking booking 1 cancelled successfully.",
  "data": { "message": "PARKING_CANCELLED" }
}
400: Cancellation not allowed
Curl:
bash

Collapse

Unwrap

Run

Copy
curl -X PUT http://localhost:3000/customer/mpark/bookings/1/cancel
3. Extend a Booking
Extend the duration of an existing booking.

Method: PUT
Path: /bookings/:bookingId/extend
Parameters: bookingId (integer)
Body:
json

Collapse

Unwrap

Copy
{ "duration": 60 }
Response:
200: Booking extended
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Parking booking 1 extended by 60 minutes.",
  "data": { "message": "PARKING_TIME_EXTENDED" }
}
400: Extension not allowed
Curl:
bash

Collapse

Unwrap

Run

Copy
curl -X PUT http://localhost:3000/customer/mpark/bookings/1/extend \
-H "Content-Type: application/json" \
-d '{"duration":60}'
4. Get Customer Bookings
Retrieve all bookings for a customer.

Method: GET
Path: /bookings
Response:
200: Bookings retrieved
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Available parking spaces retrieved successfully.",
  "data": [{ "id": 1, ... }]
}
400: Failed to retrieve bookings
Curl:
bash

Collapse

Unwrap

Run

Copy
curl -X GET http://localhost:3000/customer/mpark/bookings
5. Check In to a Booking
Check in to an existing booking.

Method: PUT
Path: /bookings/:bookingId/check-in
Parameters: bookingId (integer)
Body:
json

Collapse

Unwrap

Copy
{
  "method": "QR_CODE",
  "location": { "lat": 40.7128, "lng": -74.0060 }
}
Response:
200: Checked in
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Checked in to parking booking 1 using QR_CODE.",
  "data": { "message": "PARKING_CHECKED_IN" }
}
400: Check-in failed
Curl:
bash

Collapse

Unwrap

Run

Copy
curl -X PUT http://localhost:3000/customer/mpark/bookings/1/check-in \
-H "Content-Type: application/json" \
-d '{"method":"QR_CODE","location":{"lat":40.7128,"lng":-74.0060}}'
6. Search Available Parking
Search for available parking spaces by city, type, and date.

Method: GET
Path: /bookings/search
Query Parameters:
city (string, required)
type (string, required, enum: ['STANDARD', 'ACCESSIBLE', 'EV'])
date (string, required, ISO date-time)
Response:
200: Available spaces retrieved
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Available parking spaces retrieved successfully.",
  "data": [{ "id": 1, ... }]
}
400: Invalid input
Curl:
bash

Collapse

Unwrap

Run

Copy
curl -X GET "http://localhost:3000/customer/mpark/bookings/search?city=New%20York&type=STANDARD&date=2025-07-07T12:00:00Z"
7. Create Subscription Booking
Create a booking using a subscription plan.

Method: POST
Path: /bookings/subscription
Body:
json

Collapse

Unwrap

Copy
{
  "subscriptionId": "premium",
  "spaceId": 1,
  "bookingType": "HOURLY",
  "startTime": "2025-07-07T12:00:00Z",
  "endTime": "2025-07-07T14:00:00Z",
  "checkInMethod": "QR_CODE",
  "vehicleDetails": { "licensePlate": "ABC123", "model": "Sedan" },
  "city": "New York",
  "merchantId": 1
}
Response:
201: Subscription booking created
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Parking booking 1 created successfully.",
  "data": { "booking": { "id": 1, ... } }
}
400: Invalid input
Curl:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/mpark/bookings/subscription \
-H "Content-Type: application/json" \
-d '{"subscriptionId":"premium","spaceId":1,"bookingType":"HOURLY","startTime":"2025-07-07T12:00:00Z","endTime":"2025-07-07T14:00:00Z","checkInMethod":"QR_CODE","vehicleDetails":{"licensePlate":"ABC123","model":"Sedan"},"city":"New York","merchantId":1}'
Parking Endpoints
1. List Nearby Parking
List parking spaces near a given location.

Method: GET
Path: /parking/nearby
Query Parameters:
latitude (number, required)
longitude (number, required)
Response:
200: Nearby spaces retrieved
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Available parking spaces retrieved successfully.",
  "data": [{ "id": 1, ... }]
}
400: Invalid location
Curl:
bash

Collapse

Unwrap

Run

Copy
curl -X GET "http://localhost:3000/customer/mpark/parking/nearby?latitude=40.7128&longitude=-74.0060"
2. Get Parking Lot Details
Retrieve details for a specific parking lot.

Method: GET
Path: /parking/:lotId
Parameters: lotId (integer)
Response:
200: Lot details retrieved
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Parking lot details retrieved successfully.",
  "data": [{ "id": 1, ... }]
}
400: Invalid lot ID
Curl:
bash

Collapse

Unwrap

Run

Copy
curl -X GET http://localhost:3000/customer/mpark/parking/1
3. Reserve Parking
Reserve a parking space.

Method: POST
Path: /parking/reserve
Body:
json

Collapse

Unwrap

Copy
{
  "lotId": 1,
  "spaceId": 1,
  "duration": 60,
  "city": "New York"
}
Response:
201: Parking reserved
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Parking booking 1 created successfully.",
  "data": { "booking": { "id": 1, ... } }
}
400: Invalid input
Curl:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/mpark/parking/reserve \
-H "Content-Type: application/json" \
-d '{"lotId":1,"spaceId":1,"duration":60,"city":"New York"}'
4. Check Parking Availability
Check availability for a parking lot on a specific date.

Method: GET
Path: /parking/availability
Query Parameters:
lotId (integer, required)
date (string, required, ISO date-time)
Response:
200: Availability retrieved
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Parking availability retrieved successfully.",
  "data": [{ "id": 1, ... }]
}
400: Invalid input
Curl:
bash

Collapse

Unwrap

Run

Copy
curl -X GET "http://localhost:3000/customer/mpark/parking/availability?lotId=1&date=2025-07-07T12:00:00Z"
5. Manage Parking Subscription
Manage a parking subscription (create, renew, cancel).

Method: PUT
Path: / parking/subscription
Body:
json

Collapse

Unwrap

Copy
{
  "action": "create",
  "plan": "premium"
}
Response:
200: Subscription managed
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Parking subscription premium created successfully.",
  "data": { "subscription": { "plan": "premium", "status": "active" } }
}
400: Invalid input
Curl:
bash

Collapse

Unwrap

Run

Copy
curl -X PUT http://localhost:3000/customer/mpark/parking/subscription \
-H "Content-Type: application/json" \
-d '{"action":"create","plan":"premium"}'
6. Get Subscription Status
Retrieve the status of a customer's parking subscription.

Method: GET
Path: /parking/subscription/status
Response:
200: Subscription status retrieved
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Parking subscription status retrieved successfully.",
  "data": { "subscription": { "plan": "premium", ... }, "status": "active" }
}
400: Failed to retrieve status
Curl:
bash

Collapse

Unwrap

Run

Copy
curl -X GET http://localhost:3000/customer/mpark/parking/subscription/status
Notes
Authentication is handled in the main route index and not included in these routes.
All endpoints use Joi for validation, with error messages mapped to mparkConstants.ERROR_TYPES or customerConstants.ERROR_CODES.
Socket events are emitted to customer:${userId} rooms for real-time updates.
Responses are localized using en.json with formatMessage from controllers.