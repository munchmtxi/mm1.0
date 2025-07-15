# Staff Munch Delivery API Documentation

This document outlines the Staff Munch Delivery API, which manages delivery operations for staff in the Munch service, including assigning drivers, preparing delivery packages, and tracking driver status. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/munch/deliveryService.js`
- **Controller**: `src/controllers/staff/munch/deliveryController.js`
- **Validator**: `src/validators/staff/munch/deliveryValidator.js`
- **Middleware**: `src/middleware/staff/munch/deliveryMiddleware.js`
- **Routes**: `src/routes/staff/munch/deliveryRoutes.js`
- **Events**: `socket/events/staff/munch/deliveryEvents.js`
- **Handler**: `socket/handlers/staff/munch/deliveryHandler.js`
- **Localization**: `locales/staff/munch/en.json`

## Service: `deliveryService.js`

The service layer handles core delivery operations, interacting with Sequelize models (`Order`, `Driver`, `Staff`, `DriverAvailability`) and constants (`munchConstants.js`, `staffConstants.js`). It includes:

- **assignDriver(orderId, staffId)**: Assigns an available driver to an order and updates statuses.
- **prepareDeliveryPackage(orderId, staffId)**: Prepares a delivery package and updates the order status.
- **trackDriverStatus(orderId)**: Retrieves the current status of a driver for an order.

The service uses Sequelize’s `Op` for querying and logs errors using a logger utility.

## Controller: `deliveryController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Assign Driver**: 10 points (`driverAssigned`).
- **Prepare Delivery Package**: 10 points (`packagePrepared`).
- **Track Driver Status**: No points (read operation).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the customer’s preferred language or default language.

## Validator: `deliveryValidator.js`

Uses Joi to validate request inputs:

- **assignDriverSchema**: Requires `orderId`, `staffId` (integers).
- **prepareDeliveryPackageSchema**: Requires `orderId`, `staffId` (integers).
- **trackDriverStatusSchema**: Requires `orderId` (integer, via path parameter).

## Middleware: `deliveryMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `deliveryRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/munch/assign-driver**: Assigns a driver to an order.
- **POST /staff/munch/prepare-package**: Prepares a delivery package.
- **GET /staff/munch/track-driver/{orderId}**: Tracks driver status.

## Events: `deliveryEvents.js`

Defines socket event names in a namespaced format:

- `staff:munch:delivery:assigned`
- `staff:munch:delivery:package_ready`
- `staff:munch:delivery:driver_status`

## Handler: `deliveryHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains English translations for user-facing messages, updated to include delivery-specific messages:

- `munch.driver_assigned`: Driver assignment confirmation.
- `munch.package_ready`: Package preparation confirmation.
- `munch.driver_status_tracked`: Driver status tracking confirmation.

## Endpoints

### POST /staff/munch/assign-driver
- **Summary**: Assign a driver to an order.
- **Request Body**:
  - `orderId` (integer, required): Order ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Driver assigned to order {orderNumber}", data: { id, order_number, status, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:munch:delivery:assigned`, sends notification.

### POST /staff/munch/prepare-package
- **Summary**: Prepare delivery package.
- **Request Body**:
  - `orderId` (integer, required): Order ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Delivery package ready for order {orderNumber}", data: { id, order_number, status, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:munch:delivery:package_ready`, sends notification.

### GET /staff/munch/track-driver/{orderId}
- **Summary**: Track driver status.
- **Parameters**:
  - `orderId` (integer, required, path): Order ID.
- **Responses**:
  - **200**: `{ success: true, message: "Driver status tracked for order {orderId}", data: { driverId, status, lastUpdated } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Emits `staff:munch:delivery:driver_status`.

## Notes

- Authentication is handled at the main route index, providing `req.user.id` for staff identification.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, using actions from `staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`.
- User-facing messages are localized using the customer’s preferred language for customer-facing notifications, defaulting to `munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE` ('en').
- The `en.json` file is updated to include delivery-related messages.
- Constants from `munchConstants.js` are used for order statuses, errors, audit types, and notifications, while `staffConstants.js` provides staff-related constants.
- Permission checks are simplified, assuming role-based access is enforced via authentication middleware.
- Geofence validation and driver location tracking are removed for simplicity, assuming external validation or static data.
- Unused models (`Ride`, `OrderItems`, `Geofence`, `DriverEarnings`) are excluded.
- The export name `coordinateDelivery` was corrected to `assignDriver`.