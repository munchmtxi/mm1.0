Documentation File
File Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\driver\munch\delivery.md

markdown

Collapse

Unwrap

Copy
# Delivery API Documentation

## Overview
The Delivery API manages driver-side food delivery operations for the munch service, including accepting deliveries, retrieving details, updating status, and communicating with customers. It integrates with common services and automatically awards gamification points for driver actions. The API aligns with the platform's localization and constants, supporting multiple countries, currencies, and languages.

## Service File
**Path**: `src/services/driver/munch/deliveryService.js`

The service handles core delivery management logic:
- **acceptDelivery**: Accepts a ready delivery, assigns it to the driver, and awards points for `delivery_completion`.
- **getDeliveryDetails**: Retrieves delivery details, including customer and route information, and awards points for `delivery_details_access`.
- **updateDeliveryStatus**: Updates the delivery status, awards points for `delivery_completion` on completion, and notifies customers.
- **communicateWithCustomer**: Sends messages to customers and logs the action.

The service uses `Order`, `Customer`, `Driver`, and `sequelize` models, with constants from `driverConstants` and `munchConstants`. Common services (`socketService`, `notificationService`, `auditService`, `pointService`) are injected from the controller.

## Controller File
**Path**: `src/controllers/driver/munch/deliveryController.js`

Handles HTTP requests and responses:
- **acceptDelivery**: Processes POST requests to accept deliveries.
- **getDeliveryDetails**: Handles GET requests to fetch delivery details.
- **updateDeliveryStatus**: Manages PUT requests to update delivery status.
- **communicateWithCustomer**: Processes POST requests for driver-customer communication.

Injects common services and passes them to the service layer.

## Validation File
**Path**: `src/validators/driver/munch/deliveryValidator.js`

Uses Joi to validate:
- **acceptDelivery**: Ensures `deliveryId` is a positive integer.
- **getDeliveryDetails**: Validates `deliveryId`.
- **updateDeliveryStatus**: Checks `deliveryId` and `status` (must be in `munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES`).
- **communicateWithCustomer**: Validates `deliveryId` and `message` (1-500 characters).

## Middleware File
**Path**: `src/middleware/driver/munch/deliveryMiddleware.js`

- **checkDriverStatus**: Verifies the driver exists and is in `available` status before allowing delivery operations.

## Route File
**Path**: `src/routes/driver/munch/deliveryRoutes.js`

Defines Express routes with Swagger documentation:
- **POST /driver/munch/deliveries/:deliveryId/accept**: Accepts a delivery.
- **GET /driver/munch/deliveries/:deliveryId**: Retrieves delivery details.
- **PUT /driver/munch/deliveries/status**: Updates delivery status.
- **POST /driver/munch/deliveries/message**: Sends a message to the customer.

Authentication is handled at the main route index.

## Events File
**Path**: `src/socket/events/driver/munch/deliveryEvents.js`

Defines namespaced socket events:
- `./delivery:accepted`
- `./delivery:status_updated`
- `./delivery:message`
- `./delivery:details_retrieved`

## Handler File
**Path**: `src/socket/handlers/driver/munch/deliveryHandler.js`

Initializes socket event listeners to handle and broadcast delivery-related events.

## Localization File
**Path**: `src/locales/driver/munch/en.json`

Contains English translations for driver-facing messages:
- `delivery.accepted`: "Delivery {{deliveryId}} accepted successfully"
- `delivery.status_updated`: "Delivery {{deliveryId}} status updated to {{status}}"
- `delivery.message_sent`: "Message sent for delivery {{deliveryId}}"
- `delivery.details_retrieved`: "Delivery {{deliveryId}} details retrieved"

## Constants
Uses constants from:
- `driverConstants.js`: Driver settings and gamification actions (including `delivery_completion` and assumed `delivery_details_access`).
- `munchConstants.js`: Delivery-specific settings (e.g., statuses, types, configurations), currencies, languages, and supported cities.

## Endpoints

### POST /driver/munch/deliveries/:deliveryId/accept
- **Description**: Accepts a ready delivery request.
- **Parameters**: `deliveryId`
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "id": 123,
      "customer_id": 456,
      "status": "out_for_delivery",
      "driver_id": 789
    },
    "message": "Delivery 123 accepted successfully"
  }
Points Awarded: 25 points for delivery_completion.
GET /driver/munch/deliveries/:deliveryId
Description: Retrieves details of a specific delivery.
Parameters: deliveryId
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "deliveryId": 123,
    "customer": {
      "user_id": 456,
      "full_name": "John Doe",
      "phone_number": "+1234567890"
    },
    "deliveryLocation": { "lat": 40.7128, "lng": -74.0060 },
    "status": "out_for_delivery",
    "items": [{ "name": "Pizza", "quantity": 1 }],
    "totalAmount": 20.50,
    "currency": "USD",
    "route": { "distance": 5.2, "duration": 10 },
    "estimatedDeliveryTime": "2025-06-11T15:00:00Z"
  }
}
Points Awarded: 5 points for delivery_details_access (assumed action).
PUT /driver/munch/deliveries/status
Description: Updates the status of a delivery.
Request Body:
json

Collapse

Unwrap

Copy
{
  "deliveryId": 123,
  "status": "delivered"
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Delivery 123 status updated to delivered"
}
Points Awarded: 25 points for delivery_completion if status is delivered.
POST /driver/munch/deliveries/message
Description: Sends a message to the customer.
Request Body:
json

Collapse

Unwrap

Copy
{
  "deliveryId": 123,
  "message": "Your order will arrive in 10 minutes."
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Message sent for delivery 123"
}
Points Awarded: None.
Gamification Integration
Points are awarded automatically:

delivery_completion: 25 points when a delivery is accepted or completed.
delivery_details_access: 5 points when delivery details are accessed (assumed action). Points are managed by pointService and tied to driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.
Localization
All driver-facing messages use formatMessage with translations from en.json, supporting the default language (en) and placeholders for dynamic data (e.g., deliveryId, status). Customer-facing messages (e.g., delivery.assigned, delivery.status_updated, delivery.message_received) are assumed to exist in a separate customer localization file, as they use the customer namespace.

Internationalization
The service supports multiple countries, currencies, and languages as defined in munchConstants.MUNCH_SETTINGS:

Currencies: USD, EUR, GBP, CAD, AUD, MWK, TZS, KES, MZN, NGN, ZAR, INR, BRL
Languages: en, es, fr, de, it, sw, ny, pt, hi, yo, zu
Countries and Cities: Supports 13 countries with multiple cities (e.g., US: New York, Los Angeles; GB: London, Manchester).
Map Providers: Google Maps for most countries, OpenStreetMap for EU.
Dependencies
Models: Order, Customer, Driver, sequelize
Constants: driverConstants, munchConstants
Utilities: AppError, logger, formatMessage
Services: socketService, notificationService, auditService, pointService
Error Handling
Uses AppError with error codes from munchConstants and driverConstants:

ORDER_NOT_FOUND: Delivery not found.
NO_DRIVER_ASSIGNED: Delivery cannot be accepted or unauthorized driver.
TRANSACTION_FAILED: General operation failure.
Notes
Assumed delivery_details_access as a gamification action (5 points). Add to driverConstants.js under GAMIFICATION_CONSTANTS.DRIVER_ACTIONS:
javascript

Collapse

Unwrap

Run

Copy
{ action: 'delivery_details_access', points: 5, walletCredit: 0.10 }
The Route model is included in getDeliveryDetails but assumed to exist based on prior services.