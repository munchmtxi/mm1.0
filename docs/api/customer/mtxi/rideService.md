docs/api/customer/mtxi/rideService.md
Detailed API documentation for ride service.

markdown

Collapse

Unwrap

Copy
# Ride Service API

Handles ride-related operations for customers.

## Endpoints

### 1. Create Ride
**POST /customer/mtxi/rides**

Creates a new ride request.

#### Request
- **Headers**: `accept-language: en`
- **Body**:
  ```json
  {
    "pickupLocation": { "lat": 40.7128, "lng": -74.0060 },
    "dropoffLocation": { "lat": 40.7484, "lng": -73.9857 },
    "rideType": "standard",
    "scheduledTime": "2025-07-04T14:00:00Z",
    "friends": [2, 3],
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
  "message": "Ride requested successfully, reference: ABC123",
  "data": { "rideId": 1, "reference": "ABC123" }
}
400 Bad Request: Invalid input.
403 Forbidden: Unauthorized.
cURL
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/mtxi/rides \
-H "accept-language: en" \
-H "Content-Type: application/json" \
-d '{"pickupLocation":{"lat":40.7128,"lng":-74.0060},"dropoffLocation":{"lat":40.7484,"lng":-73.9857},"rideType":"standard","scheduledTime":"2025-07-04T14:00:00Z","friends":[2,3],"walletId":1}'
2. Update Ride Status
PUT /customer/mtxi/rides/status

Updates the status of a ride.

Request
Headers: accept-language: en
Body:
json

Collapse

Unwrap

Copy
{
  "rideId": 1,
  "status": "COMPLETED"
}
Response
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Ride completed successfully"
}
400 Bad Request: Invalid input.
403 Forbidden: Unauthorized.
cURL
bash

Collapse

Unwrap

Run

Copy
curl -X PUT http://localhost:3000/customer/mtxi/rides/status \
-H "accept-language: en" \
-H "Content-Type: application/json" \
-d '{"rideId":1,"status":"COMPLETED"}'
3. Add Friends to Ride
POST /customer/mtxi/rides/friends

Adds friends to an existing ride.

Request
Headers: accept-language: en
Body:
json

Collapse

Unwrap

Copy
{
  "rideId": 1,
  "friends": [4, 5]
}
Response
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Friends added to ride successfully"
}
400 Bad Request: Invalid input.
403 Forbidden: Unauthorized.
cURL
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/mtxi/rides/friends \
-H "accept-language: en" \
-H "Content-Type: application/json" \
-d '{"rideId":1,"friends":[4,5]}'
4. Submit Feedback
POST /customer/mtxi/rides/feedback

Submits feedback for a ride.

Request
Headers: accept-language: en
Body:
json

Collapse

Unwrap

Copy
{
  "rideId": 1,
  "rating": 5,
  "comment": "Great driver!"
}
Response
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Feedback submitted successfully"
}
400 Bad Request: Invalid input.
403 Forbidden: Unauthorized.
cURL
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/mtxi/rides/feedback \
-H "accept-language: en" \
-H "Content-Type: application/json" \
-d '{"rideId":1,"rating":5,"comment":"Great driver!"}'
5. Get Ride History
GET /customer/mtxi/rides/history

Retrieves ride history for the customer.

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
  "message": "Ride history retrieved successfully",
  "data": [{ "rideId": 1, "reference": "ABC123", "status": "COMPLETED" }]
}
403 Forbidden: Unauthorized.
cURL
bash

Collapse

Unwrap

Run

Copy
curl -X GET http://localhost:3000/customer/mtxi/rides/history \
-H "accept-language: en"
Notes
Authentication is handled by the main route index.
Points are awarded for ride_requested (12), shared_ride_requested (15), ride_review_submitted (10), and party_member_invited (5) as per customerGamificationConstants.
Socket events (RIDE_REQUESTED, RIDE_UPDATED, etc.) are emitted for real-time updates.