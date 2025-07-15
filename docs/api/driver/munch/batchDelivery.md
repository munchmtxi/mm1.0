Documentation File
File Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\driver\munch\batchDelivery.md

markdown

Collapse

Unwrap

Copy
# Batch Delivery API Documentation

## Overview
The Batch Delivery API manages driver-side batch food delivery operations for the munch service, including creating batches, retrieving details, updating status, and optimizing routes. It integrates with common services and automatically awards gamification points for driver actions. The API aligns with the platform's localization and constants, supporting multiple countries, currencies, and languages.

## Service File
**Path**: `src/services/driver/munch/batchDeliveryService.js`

The service handles core batch delivery management logic:
- **createBatchDelivery**: Groups deliveries into a batch, assigns them to the driver, and awards points for `batch_delivery`.
- **getBatchDeliveryDetails**: Retrieves batch delivery details, including orders and route, and awards points for `batch_details_access`.
- **updateBatchDeliveryStatus**: Updates the status of all deliveries in the batch, awards points for `batch_delivery` on completion, and notifies customers.
- **optimizeBatchDeliveryRoute**: Optimizes the route for a batch delivery using Google Maps API and awards points for `route_calculate`.

The service uses `Order`, `Customer`, `Driver`, `Route`, `RouteOptimization`, and `sequelize` models, with constants from `driverConstants` and `munchConstants`. Common services (`socketService`, `notificationService`, `auditService`, `pointService`) are injected from the controller.

## Controller File
**Path**: `src/controllers/driver/munch/batchDeliveryController.js`

Handles HTTP requests and responses:
- **createBatchDelivery**: Processes POST requests to create batch deliveries.
- **getBatchDeliveryDetails**: Handles GET requests to fetch batch delivery details.
- **updateBatchDeliveryStatus**: Manages PUT requests to update batch delivery status.
- **optimizeBatchDeliveryRoute**: Processes POST requests to optimize batch delivery routes.

Injects common services and passes them to the service layer.

## Validation File
**Path**: `src/validators/driver/munch/batchDeliveryValidator.js`

Uses Joi to validate:
- **createBatchDelivery**: Ensures `deliveryIds` is an array of positive integers with a maximum length of `munchConstants.DELIVERY_CONSTANTS.DELIVERY_SETTINGS.BATCH_DELIVERY_LIMIT` (5).
- **getBatchDeliveryDetails**: Validates `batchId` is a positive integer.
- **updateBatchDeliveryStatus**: Checks `batchId` and `status` (must be in `munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES`).
- **optimizeBatchDeliveryRoute**: Validates `batchId`.

## Middleware File
**Path**: `src/middleware/driver/munch/batchDeliveryMiddleware.js`

- **checkDriverStatus**: Verifies the driver exists and is in `available` status before allowing batch delivery operations.

## Route File
**Path**: `src/routes/driver/munch/batchDeliveryRoutes.js`

Defines Express routes with Swagger documentation:
- **POST /driver/munch/batch-deliveries**: Creates a batch delivery.
- **GET /driver/munch/batch-deliveries/:batchId**: Retrieves batch delivery details.
- **PUT /driver/munch/batch-deliveries/status**: Updates batch delivery status.
- **POST /driver/munch/batch-deliveries/:batchId/optimize**: Optimizes the batch delivery route.

Authentication is handled at the main route index.

## Events File
**Path**: `src/socket/events/driver/munch/batchDeliveryEvents.js`

Defines namespaced socket events:
- `./batch_delivery:created`
- `./batch_delivery:status_updated`
- `./batch_delivery:route_updated`
- `./batch_delivery:details_retrieved`

## Handler File
**Path**: `src/socket/handlers/driver/munch/batchDeliveryHandler.js`

Initializes socket event listeners to handle and broadcast batch delivery-related events.

## Localization File
**Path**: `src/locales/driver/munch/en.json`

Contains English translations for driver-facing messages, updated with batch delivery-specific messages:
- `batch_delivery.created`: "Batch delivery {{batchId}} created successfully"
- `batch_delivery.status_updated`: "Batch delivery {{batchId}} status updated to {{status}}"
- `batch_delivery.route_optimized`: "Batch delivery {{batchId}} route optimized"
- `batch_delivery.details_retrieved`: "Batch delivery {{batchId}} details retrieved"
Includes existing delivery-related translations.

## Constants
Uses constants from:
- `driverConstants.js`: Driver settings and gamification actions (including `batch_delivery`, `route_calculate`, and assumed `batch_details_access`).
- `munchConstants.js`: Delivery-specific settings (e.g., statuses, batch limits), currencies, languages, and supported cities.

## Endpoints

### POST /driver/munch/batch-deliveries
- **Description**: Creates a batch delivery from a list of delivery IDs.
- **Request Body**:
  ```json
  {
    "deliveryIds": [123, 124, 125]
  }
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "id": 1,
    "totalDistance": 0,
    "totalDuration": 0,
    "deliveryIds": [123, 124, 125],
    "driverLocation": { "lat": 40.7128, "lng": -74.0060 }
  },
  "message": "Batch delivery 1 created successfully"
}
Points Awarded: 15 points for batch_delivery.
GET /driver/munch/batch-deliveries/:batchId
Description: Retrieves details of a specific batch delivery.
Parameters: batchId
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "batchId": 1,
    "deliveryIds": [123, 124, 125],
    "orders": [
      {
        "deliveryId": 123,
        "customer": { "user_id": 456, "full_name": "John Doe", "phone_number": "+1234567890" },
        "deliveryLocation": { "lat": 40.7128, "lng": -74.0060 },
        "status": "out_for_delivery"
      }
    ],
    "totalDistance": 15.5,
    "totalDuration": 25,
    "route": { "distance": 15.5, "duration": 25, "polyline": "encoded_polyline" }
  }
}
Points Awarded: 5 points for batch_details_access (assumed action).
PUT /driver/munch/batch-deliveries/status
Description: Updates the status of all deliveries in a batch.
Request Body:
json

Collapse

Unwrap

Copy
{
  "batchId": 1,
  "status": "delivered"
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Batch delivery 1 status updated to delivered"
}
Points Awarded: 15 points for batch_delivery if status is delivered.
POST /driver/munch/batch-deliveries/:batchId/optimize
Description: Optimizes the route for a batch delivery.
Parameters: batchId
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "distance": 15.5,
    "duration": 25,
    "polyline": "encoded_polyline"
  },
  "message": "Batch delivery 1 route optimized"
}
Points Awarded: 10 points for route_calculate.
Gamification Integration
Points are awarded automatically:

batch_delivery: 15 points when creating or completing a batch delivery.
batch_details_access: 5 points when accessing batch delivery details (assumed action).
route_calculate: 10 points when optimizing the route. Points are managed by pointService and tied to driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.
Localization
All driver-facing messages use formatMessage with translations from en.json, supporting the default language (en) and placeholders for dynamic data (e.g., batchId, status). Customer-facing messages (e.g., delivery.batch_assigned, delivery.batch_status_updated) are assumed to exist in a separate customer localization file, as they use the customer namespace.

Internationalization
The service leverages munchConstants.MUNCH_SETTINGS for multi-country support:

Currencies: USD, EUR, GBP, CAD, AUD, MWK, TZS, KES, MZN, NGN, ZAR, INR, BRL
Languages: en, es, fr, de, it, sw, ny, pt, hi, yo, zu
Countries and Cities: Supports 13 countries with multiple cities (e.g., US: New York, Los Angeles; GB: London, Manchester).
Map Providers: Google Maps for most countries, OpenStreetMap for EU.
Dependencies
Models: Order, Customer, Driver, Route, RouteOptimization, sequelize
Constants: driverConstants, munchConstants
Utilities: AppError, logger, formatMessage
Services: socketService, notificationService, auditService, pointService
External: Google Maps API for route optimization
Error Handling
Uses AppError with error codes from munchConstants and driverConstants:

ORDER_NOT_FOUND: Batch or deliveries not found, invalid status, or batch limit exceeded.
NO_DRIVER_ASSIGNED: Driver unavailable or unauthorized.
TRANSACTION_FAILED: General operation failure.
Notes
Assumed batch_details_access as a gamification action (5 points). Add to driverConstants.js under GAMIFICATION_CONSTANTS.DRIVER_ACTIONS:
javascript

Collapse

Unwrap

Run

Copy
{ action: 'batch_details_access', points: 5, walletCredit: 0.10 }
The RouteOptimization model is used to manage batch deliveries, with a deliveryIds field storing the array of order IDs.
Google Maps API key must be set in environment variables (process.env.GOOGLE_MAPS_API_KEY).
The Route model is updated for the first order in the batch, assuming a single route for simplicity.