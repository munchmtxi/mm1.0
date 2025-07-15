# Staff Munch Coordination API Documentation

This document outlines the Staff Munch Coordination API, which manages delivery coordination for staff in the Munch service, including arranging driver pickups, verifying driver credentials, and logging pickup times. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/munch/coordinationService.js`
- **Controller**: `src/controllers/staff/munch/coordinationController.js`
- **Validator**: `src/validators/staff/munch/coordinationValidator.js`
- **Middleware**: `src/middleware/staff/munch/coordinationMiddleware.js`
- **Routes**: `src/routes/staff/munch/coordinationRoutes.js`
- **Events**: `socket/events/staff/munch/coordinationEvents.js`
- **Handler**: `socket/handlers/staff/munch/coordinationHandler.js`
- **Localization**: `locales/staff/munch/en.json`

## Service: `coordinationService.js`

The service layer handles core coordination operations, interacting with Sequelize models (`Order`, `Driver`, `Verification`, `TimeTracking`, `Staff`, `DriverAvailability`) and constants (`munchConstants.js`, `staffConstants.js`). It includes:

- **coordinateDriverPickup(orderId, staffId)**: Assigns an available driver to an order and updates statuses.
- **verifyDriverCredentials(driverId, staffId)**: Verifies a driver’s identity and creates a verification record.
- **logPickupTime(orderId, staffId)**: Logs the pickup time for an order and updates the delivery status.

The service uses Sequelize’s `Op` for querying and logs errors using a logger utility.

## Controller: `coordinationController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Coordinate Driver Pickup**: 10 points (`driverPickupCoordinated`).
- **Verify Driver Credentials**: 10 points (`driverCredentialsVerified`).
- **Log Pickup Time**: 10 points (`pickupTimeLogged`).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the customer’s or driver’s preferred language.

## Validator: `coordinationValidator.js`

Uses Joi to validate request inputs:

- **coordinateDriverPickupSchema**: Requires `orderId`, `staffId` (integers).
- **verifyDriverCredentialsSchema**: Requires `driverId`, `staffId` (integers).
- **logPickupTimeSchema**: Requires `orderId`, `staffId` (integers).

## Middleware: `coordinationMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `coordinationRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/munch/coordinate-pickup**: Arranges a driver pickup.
- **POST /staff/munch/verify-credentials**: Verifies driver credentials.
- **POST /staff/munch/log-pickup-time**: Logs a pickup time.

## Events: `coordinationEvents.js`

Defines socket event names in a namespaced format:

- `staff:munch:coordination:pickup_coordinated`
- `staff:munch:coordination:credentials_verified`
- `staff:munch:coordination:pickup_logged`

## Handler: `coordinationHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains English translations for user-facing messages, including coordination-specific messages:

- `munch.pickup_coordinated`: Pickup coordination confirmation.
- `munch.credentials_verified`: Credential verification confirmation.
- `munch.pickup_logged`: Pickup time logging confirmation.

## Endpoints

### POST /staff/munch/coordinate-pickup
- **Summary**: Arrange driver pickups.
- **Request Body**:
  - `orderId` (integer, required): Order ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Pickup coordinated for order {orderNumber} with driver {driverName}", data: { id, order_number, status, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:munch:coordination:pickup_coordinated`, sends notification.

### POST /staff/munch/verify-credentials
- **Summary**: Confirm driver identity.
- **Request Body**:
  - `driverId` (integer, required): Driver ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Credentials verified for driver {driverName}", data: { id, status, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:munch:coordination:credentials_verified`, sends notification.

### POST /staff/munch/log-pickup-time
- **Summary**: Record pickup time.
- **Request Body**:
  - `orderId` (integer, required): Order ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Pickup time logged for order {orderNumber}", data: { id, clock_in, duration, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:munch:coordination:pickup_logged`, sends notification.

## Notes

- Authentication is handled at the main route index, providing `req.user.id` for staff identification.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, using actions from `staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`.
- User-facing messages are localized using the customer’s or driver’s preferred language, defaulting to `munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE` ('en').
- The `en.json` file is created for the staff munch directory.
- Constants from `munchConstants.js` are used for order and delivery statuses, errors, audit types, and notifications, while `staffConstants.js` provides staff-related constants.
- Permission checks are simplified, assuming role-based access is enforced via authentication middleware.
- Geofence validation is removed for simplicity, assuming external validation.
- Unused models (`Geofence`, `RouteOptimization`) are excluded.