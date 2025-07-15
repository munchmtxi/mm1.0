docs/api/customer/mtxi/driverService.md
Detailed API documentation for driver service.

markdown

Collapse

Unwrap

Copy
# Driver Service API

Handles driver-related operations for customers and drivers.

## Endpoints

### 1. Track Driver
**GET /customer/mtxi/drivers/{rideId}**

Retrieves driver location for a ride.

#### Request
- **Headers**: `accept-language: en`
- **Parameters**: `rideId` (integer)

#### Response
- **200 OK**:
  ```json
  {
    "success": true,
    "message": "Driver location retrieved successfully",
    "data": { "driverId": 1, "coordinates": { "lat": 40.7128, "lng": -74.0060 } }
  }
400 Bad Request: Invalid ride ID.
403 Forbidden: Unauthorized.
cURL
bash

Collapse

Unwrap

Run

Copy
curl -X GET http://localhost:3000/customer/mtxi/drivers/1 \
-H "accept-language: en"
2. Update Driver Location
PUT /customer/mtxi/drivers/location

Updates a driver's location.

Request
Headers: accept-language: en
Body:
json

Collapse

Unwrap

Copy
{
  "coordinates": { "lat": 40.7128, "lng": -74.0060 },
  "countryCode": "US"
}
Response
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Driver location updated successfully",
  "data": { "coordinates": { "lat": 40.7128, "lng": -74.0060 } }
}
400 Bad Request: Invalid input.
403 Forbidden: Unauthorized.
cURL
bash

Collapse

Unwrap

Run

Copy
curl -X PUT http://localhost:3000/customer/mtxi/drivers/location \
-H "accept-language: en" \
-H "Content-Type: application/json" \
-d '{"coordinates":{"lat":40.7128,"lng":-74.0060},"countryCode":"US"}'
3. Get Nearby Drivers
GET /customer/mtxi/drivers/nearby

Retrieves nearby drivers.

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
  "message": "Nearby drivers retrieved successfully",
  "data": [{ "driverId": 1, "coordinates": { "lat": 40.7128, "lng": -74.0060 } }]
}
403 Forbidden: Unauthorized.
cURL
bash

Collapse

Unwrap

Run

Copy
curl -X GET http://localhost:3000/customer/mtxi/drivers/nearby \
-H "accept-language: en"
Notes
Authentication is handled by the main route index.
No points are awarded for driver-related actions as per customerGamificationConstants.
Socket events (DRIVER_TRACKED, LOCATION_UPDATED) are emitted for real-time updates.