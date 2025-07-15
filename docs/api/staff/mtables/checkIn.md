# Staff mTables Check-In API Documentation

This document outlines the Staff mTables Check-In API, which manages check-in operations for front-of-house (FOH) staff in the Munch service, including processing customer check-ins, logging check-in times, and updating table statuses. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/mtables/checkInService.js`
- **Controller**: `src/controllers/staff/mtables/checkInController.js`
- **Validator**: `src/validators/staff/mtables/checkInValidator.js`
- **Middleware**: `src/middleware/staff/mtables/checkInMiddleware.js`
- **Routes**: `src/routes/staff/mtables/checkInRoutes.js`
- **Events**: `socket/events/staff/mtables/checkInEvents.js`
- **Handler**: `socket/handlers/staff/mtables/checkInHandler.js`
- **Localization**: `locales/staff/mtables/en.json`

## Service: `checkInService.js`

The service layer handles core check-in operations, interacting with Sequelize models (`Booking`, `Verification`, `TimeTracking`, `Table`, `Staff`, `TableLayoutSection`) and constants (`mtablesConstants.js`, `staffConstants.js`). It includes:

- **processCheckIn(bookingId, staffId)**: Processes a customer check-in, assigns a table if needed, and updates booking status.
- **logCheckInTime(bookingId, staffId)**: Logs check-in time for gamification tracking.
- **updateTableStatus(tableId, status)**: Updates the availability status of a table.

The service uses Sequelize’s `Op` for querying and logs errors using a logger utility.

## Controller: `checkInController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Process Check-In**: 10 points (`checkInProcessed`).
- **Log Check-In Time**: 10 points (`checkInLogged`).
- **Update Table Status**: 10 points (`tableStatusUpdated`).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the customer’s or staff’s preferred language.

## Validator: `checkInValidator.js`

Uses Joi to validate request inputs:

- **processCheckInSchema**: Requires `bookingId`, `staffId` (integers).
- **logCheckInTimeSchema**: Requires `bookingId`, `staffId` (integers).
- **updateTableStatusSchema**: Requires `tableId`, `staffId` (integers), and `status` (valid table status).

## Middleware: `checkInMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `checkInRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/mtables/checkin**: Processes a customer check-in.
- **POST /staff/mtables/checkin-time**: Logs check-in time.
- **POST /staff/mtables/table-status**: Updates table status.

## Events: `checkInEvents.js`

Defines socket event names in a namespaced format:

- `staff:mtables:checkin_confirmed`
- `staff:mtables:time_logged`
- `staff:mtables:table_status_updated`

## Handler: `checkInHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains English translations for user-facing messages, including check-in-specific messages:

- `mtables.check_in_confirmed`: Check-in confirmation.
- `mtables.time_logged`: Time logging confirmation.
- `mtables.table_status_updated`: Table status update confirmation.

## Endpoints

### POST /staff/mtables/checkin
- **Summary**: Process customer check-in.
- **Request Body**:
  - `bookingId` (integer, required): Booking ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Check-in confirmed for booking {reference} at table {tableNumber}", data: { id, status, table_id, arrived_at, seated_at } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:checkin_confirmed`, sends notification.

### POST /staff/mtables/checkin-time
- **Summary**: Log check-in time for gamification.
- **Request Body**:
  - `bookingId` (integer, required): Booking ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Check-in time logged for booking {bookingId}", data: null }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:time_logged`.

### POST /staff/mtables/table-status
- **Summary**: Update table availability status.
- **Request Body**:
  - `tableId` (integer, required): Table ID.
  - `status` (string, required): New status (e.g., `available`, `rejected`).
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Table {tableId} status updated to {status}", data: { tableId, status } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:table_status_updated`.

## Notes

- Authentication is handled at the main route index, providing `req.user.id` for staff identification.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, occurs after successful operations, and uses actions from `staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`.
- User-facing messages are localized using the customer’s preferred language for check-ins and staff’s preferred language for time logging and table status updates.
- The `en.json` file is updated to include check-in-related messages.
- Constants from `mtablesConstants.js` are used for booking statuses, table statuses, errors, and notifications, while `staffConstants.js` provides staff-related constants.
- Permission checks are simplified, assuming role-based access is enforced via authentication middleware.
- QR code verification and geofence validation are removed due to the exclusion of `securityService` and `locationService`.