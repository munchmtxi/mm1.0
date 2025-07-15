Documentation File
File Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\driver\mtxi\ride.md

markdown

Collapse

Unwrap

Copy
# Ride API Documentation

## Overview
The Ride API manages driver-side taxi ride operations for the mtxi service, including accepting rides, retrieving details, updating status, and communicating with passengers. It integrates with common services and automatically awards gamification points for driver actions. The API aligns with the platform's localization and constants.

## Service File
**Path**: `src/services/driver/mtxi/rideService.js`

The service handles core ride management logic:
- **acceptRide**: Accepts a pending ride, assigns it to the driver, and awards points for `ride_completion`.
- **getRideDetails**: Retrieves ride details, including customer information, and awards points for `ride_details_access`.
- **updateRideStatus**: Updates the ride status, awards points for `ride_completion` on completion, and notifies customers.
- **communicateWithPassenger**: Sends messages to passengers and logs the action.

The service uses `Ride`, `Customer`, `Driver`, and `sequelize` models, with constants from `driverConstants` and `rideConstants`. Common services (`socketService`, `notificationService`, `auditService`, `pointService`) are injected from the controller.

## Controller File
**Path**: `src/controllers/driver/mtxi/rideController.js`

Handles HTTP requests and responses:
- **acceptRide**: Processes POST requests to accept rides.
- **getRideDetails**: Handles GET requests to fetch ride details.
- **updateRideStatus**: Manages PUT requests to update ride status.
- **communicateWithPassenger**: Processes POST requests for driver-passenger communication.

Injects common services and passes them to the service layer.

## Validation File
**Path**: `src/validators/driver/mtxi/rideValidator.js`

Uses Joi to validate:
- **acceptRide**: Ensures `rideId` is a positive integer.
- **getRideDetails**: Validates `rideId`.
- **updateRideStatus**: Checks `rideId` and `status` (must be in `rideConstants.RIDE_STATUSES`).
- **communicateWithPassenger**: Validates `rideId` and `message` (1-500 characters).

## Middleware File
**Path**: `src/middleware/driver/mtxi/rideMiddleware.js`

- **checkDriverStatus**: Verifies the driver exists and is in `available` status before allowing ride operations.

## Route File
**Path**: `src/routes/driver/mtxi/rideRoutes.js`

Defines Express routes with Swagger documentation:
- **POST /driver/mtxi/rides/:rideId/accept**: Accepts a ride.
- **GET /driver/mtxi/rides/:rideId**: Retrieves ride details.
- **PUT /driver/mtxi/rides/status**: Updates ride status.
- **POST /driver/mtxi/rides/message**: Sends a message to the passenger.

Authentication is handled at the main route index.

## Events File
**Path**: `src/socket/events/driver/mtxi/rideEvents.js`

Defines namespaced socket events:
- `./ride:accepted`
- `./ride:status_updated`
- `./ride:message`
- `./ride:details_retrieved`

## Handler File
**Path**: `src/socket/handlers/driver/mtxi/rideHandler.js`

Initializes socket event listeners to handle and broadcast ride-related events.

## Localization File
**Path**: `src/locales/driver/mtxi/en.json`

Contains English translations for driver-facing messages:
- `ride.accepted`: "Ride {{rideId}} accepted successfully"
- `ride.status_updated`: "Ride {{rideId}} status updated to {{status}}"
- `ride.message_sent`: "Message sent for ride {{rideId}}"
- `ride.details_retrieved`: "Ride {{rideId}} details retrieved"

## Constants
Uses constants from:
- `driverConstants.js`: Driver settings and gamification actions.
- `rideConstants.js`: Ride-specific settings (e.g., statuses, types, configurations).

## Endpoints

### POST /driver/mtxi/rides/:rideId/accept
- **Description**: Accepts a pending ride request.
- **Parameters**: `rideId`
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "id": 123,
      "customerId": 456,
      "status": "accepted",
      "driverId": 789
    },
    "message": "Ride 123 accepted successfully"
  }
Points Awarded: 20 points for ride_completion.
GET /driver/mtxi/rides/:rideId
Description: Retrieves details of a specific ride.
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
    "customer": {
      "user_id": 456,
      "full_name": "John Doe",
      "phone_number": "+1234567890"
    },
    "pickupLocation": { "lat": 40.7128, "lng": -74.0060 },
    "dropoffLocation": { "lat": 34.0522, "lng": -118.2437 },
    "status": "accepted",
    "rideType": "standard",
    "scheduledTime": "2025-06-11T14:46:00Z"
  }
}
Points Awarded: 5 points for ride_details_access (assumed action in driverConstants).
PUT /driver/mtxi/rides/status
Description: Updates the status of a ride.
Request Body:
json

Collapse

Unwrap

Copy
{
  "rideId": 123,
  "status": "in_progress"
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Ride 123 status updated to in_progress"
}
Points Awarded: 20 points for ride_completion if status is completed.
POST /driver/mtxi/rides/message
Description: Sends a message to the passenger.
Request Body:
json

Collapse

Unwrap

Copy
{
  "rideId": 123,
  "message": "I'm 5 minutes away."
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Message sent for ride 123"
}
Points Awarded: None.
Gamification Integration
Points are awarded automatically:

ride_completion: 20 points when a ride is accepted or completed.
ride_details_access: 5 points when ride details are accessed (assumed action). Points are managed by pointService and tied to driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.
Localization
All driver-facing messages use formatMessage with translations from en.json, supporting the default language (en) and placeholders for dynamic data (e.g., rideId, status).

Dependencies
Models: Ride, Customer, Driver, sequelize
Constants: driverConstants, rideConstants
Utilities: AppError, logger, formatMessage
Services: socketService, notificationService, auditService, pointService
Error Handling
Uses AppError with error codes from rideConstants and driverConstants:

RIDE_NOT_FOUND: Ride not found.
RIDE_NOT_CANCELLABLE: Ride cannot be accepted.
INVALID_DRIVER: Driver unavailable.
INVALID_RIDE: Invalid status.
PERMISSION_DENIED: Unauthorized driver.
RIDE_FAILED: General operation failure.
Future Enhancements
Integrate location tracking for real-time ride updates.
Add support for group coordination (friend invites, bill splitting).
Enhance message encryption for driver-passenger communication.
Support additional languages in localization.