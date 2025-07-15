Documentation File
File Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\driver\mtxi\sharedRide.md

markdown

Collapse

Unwrap

Copy
# Shared Ride API Documentation

## Overview
The Shared Ride API manages driver-side shared ride operations for the mtxi service, including adding/removing passengers, retrieving details, and optimizing routes. It integrates with common services and automatically awards gamification points for driver actions. The API aligns with the platform's localization and constants.

## Service File
**Path**: `src/services/driver/mtxi/sharedRideService.js`

The service handles core shared ride management logic:
- **addPassengerToSharedRide**: Adds a passenger to a shared ride, updates the junction table, and awards points for `shared_ride_completion`.
- **removePassengerFromSharedRide**: Removes a passenger from a shared ride and awards points for `shared_ride_completion`.
- **getSharedRideDetails**: Retrieves shared ride details, including passengers and route, and awards points for `shared_ride_details_access`.
- **optimizeSharedRideRoute**: Optimizes the route for a shared ride using Google Maps API and awards points for `route_calculate`.

The service uses `Ride`, `Customer`, `Driver`, `Route`, and `sequelize` models, with constants from `driverConstants` and `rideConstants`. Common services (`socketService`, `notificationService`, `auditService`, `pointService`) are injected from the controller.

## Controller File
**Path**: `src/controllers/driver/mtxi/sharedRideController.js`

Handles HTTP requests and responses:
- **addPassenger**: Processes POST requests to add passengers to shared rides.
- **removePassenger**: Handles POST requests to remove passengers from shared rides.
- **getSharedRideDetails**: Manages GET requests to fetch shared ride details.
- **optimizeSharedRideRoute**: Processes POST requests to optimize shared ride routes.

Injects common services and passes them to the service layer.

## Validation File
**Path**: `src/validators/driver/mtxi/sharedRideValidator.js`

Uses Joi to validate:
- **addPassenger**: Ensures `rideId` and `passengerId` are positive integers.
- **removePassenger**: Validates `rideId` and `passengerId`.
- **getSharedRideDetails**: Checks `rideId` is a positive integer.
- **optimizeSharedRideRoute**: Validates `rideId`.

## Middleware File
**Path**: `src/middleware/driver/mtxi/sharedRideMiddleware.js`

- **checkDriverStatus**: Verifies the driver exists and is in `available` status before allowing shared ride operations.

## Route File
**Path**: `src/routes/driver/mtxi/sharedRideRoutes.js`

Defines Express routes with Swagger documentation:
- **POST /driver/mtxi/shared-rides/passenger/add**: Adds a passenger to a shared ride.
- **POST /driver/mtxi/shared-rides/passenger/remove**: Removes a passenger from a shared ride.
- **GET /driver/mtxi/shared-rides/:rideId**: Retrieves shared ride details.
- **POST /driver/mtxi/shared-rides/:rideId/optimize**: Optimizes the shared ride route.

Authentication is handled at the main route index.

## Events File
**Path**: `src/socket/events/driver/mtxi/sharedRideEvents.js`

Defines namespaced socket events:
- `./shared_ride:passenger_added`
- `./shared_ride:passenger_removed`
- `./shared_ride:route_updated`
- `./shared_ride:details_retrieved`

## Handler File
**Path**: `src/socket/handlers/driver/mtxi/sharedRideHandler.js`

Initializes socket event listeners to handle and broadcast shared ride-related events.

## Localization File
**Path**: `src/locales/driver/mtxi/en.json`

Contains English translations for driver-facing messages, updated with shared ride-specific messages:
- `shared_ride.passenger_added`: "Passenger {{passengerId}} added to shared ride {{rideId}}"
- `shared_ride.passenger_removed`: "Passenger {{passengerId}} removed from shared ride {{rideId}}"
- `shared_ride.details_retrieved`: "Shared ride {{rideId}} details retrieved"
- `shared_ride.route_optimized`: "Shared ride {{rideId}} route optimized"
Includes existing ride-related translations.

## Constants
Uses constants from:
- `driverConstants.js`: Driver settings and gamification actions.
- `rideConstants.js`: Ride-specific settings (e.g., statuses, types, shared ride configurations).

## Endpoints

### POST /driver/mtxi/shared-rides/passenger/add
- **Description**: Adds a passenger to a shared ride.
- **Request Body**:
  ```json
  {
    "rideId": 123,
    "passengerId": 456
  }
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "id": 123,
    "rideType": "shared",
    "driverId": 789
  },
  "message": "Passenger 456 added to shared ride 123"
}
Points Awarded: 10 points for shared_ride_completion.
POST /driver/mtxi/shared-rides/passenger/remove
Description: Removes a passenger from a shared ride.
Request Body:
json

Collapse

Unwrap

Copy
{
  "rideId": 123,
  "passengerId": 456
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Passenger 456 removed from shared ride 123"
}
Points Awarded: 10 points for shared_ride_completion.
GET /driver/mtxi/shared-rides/:rideId
Description: Retrieves details of a specific shared ride.
Parameters: rideId
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "rideId": 123,
    "passengers": [
      { "user_id": 456, "full_name": "John Doe", "phone_number": "+1234567890" }
    ],
    "pickupLocation": { "lat": 40.7128, "lng": -74.0060 },
    "dropoffLocation": { "lat": 34.0522, "lng": -118.2437 },
    "route": { "distance": 10.5, "duration": 15, "polyline": "encoded_polyline" },
    "status": "in_progress"
  }
}
Points Awarded: 5 points for shared_ride_details_access.
POST /driver/mtxi/shared-rides/:rideId/optimize
Description: Optimizes the route for a shared ride.
Parameters: rideId
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "distance": 10.5,
    "duration": 15,
    "polyline": "encoded_polyline"
  },
  "message": "Shared ride 123 route optimized"
}
Points Awarded: 10 points for route_calculate.
Gamification Integration
Points are awarded automatically:

shared_ride_completion: 10 points when adding or removing passengers.
shared_ride_details_access: 5 points when accessing shared ride details (assumed action).
route_calculate: 10 points when optimizing the route. Points are managed by pointService and tied to driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.
Localization
All driver-facing messages use formatMessage with translations from en.json, supporting the default language (en) and placeholders for dynamic data (e.g., rideId, passengerId). Customer-facing messages (e.g., ride.passenger_added, ride.passenger_removed) are assumed to exist in a separate customer localization file.

Dependencies
Models: Ride, Customer, Driver, Route, sequelize
Constants: driverConstants, rideConstants
Utilities: AppError, logger, formatMessage
Services: socketService, notificationService, auditService, pointService
External: Google Maps API for route optimization
Error Handling
Uses AppError with error codes from rideConstants and driverConstants:

INVALID_RIDE: Not a shared ride.
CUSTOMER_NOT_FOUND: Passenger not found or not in ride.
PERMISSION_DENIED: Unauthorized driver.
RIDE_FAILED: General operation failure.
Notes
Assumed shared_ride_details_access as a gamification action (5 points). Add to driverConstants.js:
javascript

Collapse

Unwrap

Run

Copy
{ action: 'shared_ride_details_access', points: 5, walletCredit: 0.10 }
The RideCustomer junction table is assumed for managing shared ride passengers.
Google Maps API key must be set in environment variables (process.env.GOOGLE_MAPS_API_KEY).
