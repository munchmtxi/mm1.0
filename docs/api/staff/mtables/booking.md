# Staff mTables API Documentation

This document outlines the Staff mTables API, which manages booking operations for front-of-house (FOH) staff in the Munch service, including retrieving active bookings, updating booking statuses, and managing waitlists. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/mtables/bookingService.js`
- **Controller**: `src/controllers/staff/mtables/bookingController.js`
- **Validator**: `src/validators/staff/mtables/bookingValidator.js`
- **Middleware**: `src/middleware/staff/mtables/bookingMiddleware.js`
- **Routes**: `src/routes/staff/mtables/bookingRoutes.js`
- **Events**: `socket/events/staff/mtables/bookingEvents.js`
- **Handler**: `socket/handlers/staff/mtables/bookingHandler.js`
- **Localization**: `locales/staff/mtables/en.json`

## Service: `bookingService.js`

The service layer handles core booking operations, interacting with Sequelize models (`Booking`, `MerchantBranch`, `Customer`, `Staff`, `Waitlist`, `BookingTimeSlot`) and constants (`mtablesConstants.js`, `staffConstants.js`). It includes:

- **getActiveBookings(restaurantId)**: Retrieves active bookings for a restaurant branch.
- **updateBookingStatus(bookingId, status, staffId)**: Updates the status of a booking.
- **manageWaitlist(restaurantId, customerId, action, staffId)**: Adds or removes a customer from a waitlist based on restaurant capacity.

The service uses Sequelize’s `Op` for querying and logs errors using a logger utility.

## Controller: `bookingController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Get Active Bookings**: 10 points (`task_completion`).
- **Update Booking Status**: 10 points (`bookingUpdated`).
- **Manage Waitlist**: 10 points (`waitlistAdded`).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the customer’s or branch’s preferred language.

## Validator: `bookingValidator.js`

Uses Joi to validate request inputs:

- **getActiveBookingsSchema**: Requires `restaurantId` (integer).
- **updateBookingStatusSchema**: Requires `bookingId`, `staffId` (integers), and `status` (valid booking status).
- **manageWaitlistSchema**: Requires `restaurantId`, `customerId`, `staffId` (integers), and `action` (‘add’ or ‘remove’).

## Middleware: `bookingMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `bookingRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/mtables/bookings**: Retrieves active bookings.
- **POST /staff/mtables/status**: Updates a booking status.
- **POST /staff/mtables/waitlist**: Manages a waitlist.

## Events: `bookingEvents.js`

Defines socket event names in a namespaced format:

- `staff:mtables:status_updated`
- `staff:mtables:waitlisted`
- `staff:mtables:waitlist_removed`
- `staff:mtables:logs_retrieved`

## Handler: `bookingHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains English translations for user-facing messages:

- `mtables.get_active_bookings`: Booking retrieval confirmation.
- `mtables.<status>`: Status update messages (e.g., `pending`, `confirmed`).
- `mtables.waitlisted`: Waitlist addition confirmation.
- `mtables.removed_from_waitlist`: Waitlist removal confirmation.

## Endpoints

### POST /staff/mtables/bookings
- **Summary**: Retrieve active bookings for a restaurant.
- **Request Body**:
  - `restaurantId` (integer, required): Merchant branch ID.
- **Responses**:
  - **200**: `{ success: true, message: "Retrieved {count} active bookings", data: [{ id, branch_id, status, booking_date, booking_time, ... }, ...] }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:logs_retrieved`.

### POST /staff/mtables/status
- **Summary**: Update booking status.
- **Request Body**:
  - `bookingId` (integer, required): Booking ID.
  - `status` (string, required): New status (e.g., `pending`, `confirmed`).
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Booking {reference} <status>", data: { id, status, booking_modified_at, booking_modified_by } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:status_updated`, sends notification.

### POST /staff/mtables/waitlist
- **Summary**: Manage waitlist for a restaurant.
- **Request Body**:
  - `restaurantId` (integer, required): Merchant branch ID.
  - `customerId` (integer, required): Customer ID.
  - `action` (string, required): `add` or `remove`.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Booking {reference} added to waitlist at position {position}" or "removed from waitlist", data: { id, waitlist_position, waitlisted_at } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:waitlisted` or `staff:mtables:waitlist_removed`, sends notification.

## Notes

- Authentication is handled at the main route index, providing `req.user.id` for staff identification.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, occurs after successful operations, and uses actions from `staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`.
- All user-facing messages are localized using the customer’s preferred language or defaulting to English for branch-level operations.
- The `en.json` file is dedicated to mtables-related messages.
- Constants from `mtablesConstants.js` are used for booking statuses, errors, and notifications, while `staffConstants.js` provides staff-related constants.
- Permission checks are simplified, assuming role-based access is enforced via authentication middleware.