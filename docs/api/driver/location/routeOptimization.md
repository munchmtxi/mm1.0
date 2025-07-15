Documentation File
File Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\driver\location\routeOptimization.md

markdown

Collapse

Unwrap

Copy
# Route Optimization API Documentation

## Overview
The Route Optimization API provides functionality for calculating, updating, and retrieving driver routes. It integrates with map providers, handles waypoints, and automatically awards gamification points for driver actions. The API is part of the Munch driver location services and aligns with the platform's localization and constants.

## Service File
**Path**: `src/services/driver/location/routeOptimizationService.js`

The service handles core route optimization logic:
- **calculateOptimalRoute**: Computes the optimal route between origin and destination, simulating an external API call (e.g., Google Maps). Awards points for the `route_calculate` action.
- **updateRoute**: Updates an existing route's waypoints, recalculates distance and duration, and logs audits. Awards points for the `route_update` action.
- **getRouteDetails**: Retrieves detailed route information, including associated orders and rides. Awards points for the `route_details_access` action.
- **Helper Functions**: `calculateDistance` (Haversine formula) and `calculateEstimatedTime` for distance and time estimations.

The service uses `Driver` and `Route` models, `sequelize` for transactions, and constants from `driverConstants` and `routeOptimizationConstants`. Common services (`socketService`, `notificationService`, `auditService`, `pointService`) are injected from the controller.

## Controller File
**Path**: `src/controllers/driver/location/routeOptimizationController.js`

Handles HTTP requests and responses:
- **calculateRoute**: Processes POST requests to calculate routes, sends notifications, and emits socket events.
- **updateRoute**: Handles PUT requests to update route waypoints, ensuring driver validation.
- **getRouteDetails**: Manages GET requests to fetch route details.

Imports common services and passes them to the service layer.

## Validation File
**Path**: `src/validators/driver/location/routeOptimizationValidator.js`

Uses Joi to validate:
- **calculateRoute**: Ensures `origin` and `destination` have valid `lat`/`lng` coordinates.
- **updateRoute**: Validates `driverId`, `routeId`, and optional `waypoints` (max 10).
- **getRouteDetails**: Checks `routeId` is a positive integer.

## Middleware File
**Path**: `src/middleware/driver/location/routeOptimizationMiddleware.js`

- **checkDriverStatus**: Verifies the driver exists and is in `available` status before allowing route updates.

## Route File
**Path**: `src/routes/driver/location/routeOptimizationRoutes.js`

Defines Express routes with Swagger documentation:
- **POST /driver/location/routes/calculate**: Calculates a new route.
- **PUT /driver/location/routes/:driverId/:routeId**: Updates route waypoints.
- **GET /driver/location/routes/:routeId**: Retrieves route details.

Authentication is handled at the main route index.

## Events File
**Path**: `src/socket/events/driver/location/routeOptimizationEvents.js`

Defines namespaced socket events:
- `./route:calculated`
- `./route:updated`
- `./route:details_retrieved`

## Handler File
**Path**: `src/socket/handlers/driver/location/routeOptimizationHandler.js`

Initializes socket event listeners to handle and broadcast route-related events.

## Localization File
**Path**: `src/locales/driver/location/en.json`

Contains English translations for user-facing messages:
- `route.calculated`: "Route calculated with distance {{distance}} km"
- `route.updated`: "Route {{routeId}} updated successfully"
- `route.details_retrieved`: "Route {{routeId}} details retrieved"
- Existing `location.updated` and `location.map.configured`

## Constants
Uses constants from:
- `driverConstants.js`: General driver settings and gamification actions.
- `routeOptimizationConstants.js`: Route-specific settings (e.g., efficiency weights, traffic models).
- `locationConstants.js`: Map settings and location-related constants.

## Endpoints

### POST /driver/location/routes/calculate
- **Description**: Calculates an optimal route between two points.
- **Request Body**:
  ```json
  {
    "origin": { "lat": 40.7128, "lng": -74.0060 },
    "destination": { "lat": 34.0522, "lng": -118.2437 }
  }
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "origin": { "lat": 40.7128, "lng": -74.0060 },
    "destination": { "lat": 34.0522, "lng": -118.2437 },
    "waypoints": [],
    "distance": 123.45,
    "duration": 90,
    "polyline": "encoded_polyline_string",
    "steps": [...],
    "trafficModel": "best_guess",
    "fuel_efficiency_score": 80,
    "time_efficiency_score": 90
  }
}
Points Awarded: 10 points for route_calculate.
PUT /driver/location/routes/:driverId/:routeId
Description: Updates waypoints for an existing route.
Parameters: driverId, routeId
Request Body:
json

Collapse

Unwrap

Copy
{
  "waypoints": [
    { "lat": 40.7128, "lng": -74.0060 },
    { "lat": 34.0522, "lng": -118.2437 }
  ]
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Route 123 updated successfully"
}
Points Awarded: 8 points for route_update.
GET /driver/location/routes/:routeId
Description: Retrieves details of a specific route.
Parameters: routeId
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "routeId": 123,
    "origin": { "lat": 40.7128, "lng": -74.0060 },
    "destination": { "lat": 34.0522, "lng": -118.2437 },
    "waypoints": [...],
    "distance": 123.45,
    "duration": 90,
    "polyline": "encoded_polyline_string",
    "steps": [...],
    "trafficModel": "best_guess",
    "rideId": 456,
    "orders": [{ "id": 789, "status": "delivered" }],
    "created_at": "2025-06-11T14:46:00Z",
    "updated_at": "2025-06-11T14:46:06Z"
  }
}
Points Awarded: 5 points for route_details_access.
Gamification Integration
Points are awarded automatically:

route_calculate: 10 points when a route is calculated.
route_update: 8 points when a route is updated.
route_details_access: 5 points when route details are accessed. Points are managed by pointService and tied to driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.
Localization
All user-facing messages use formatMessage with translations from en.json, supporting the default language (en) and placeholders for dynamic data (e.g., routeId, distance).

Dependencies
Models: Driver, Route, Order, Ride
Constants: socketService, notificationService, auditService, pointService
Utilities: AppError, logger, formatMessage
External: Simulated external routing API (e.g., Google Maps)
Error Handling
Uses AppError with error codes from driverConstants and routeOptimizationConstants:

INVALID_COORDINATES: Invalid or missing.
DRIVER_NOT_FOUND: Driver not found.
ROUTE_NOT_FOUND: Route not found.
PERMISSION_DENIED: Route not assigned to driver.
MAX_WAYPOINTS_EXCEEDED: Too many waypoints.
DELIVERY_FAILED: General operation failure.