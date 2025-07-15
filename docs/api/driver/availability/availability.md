# Driver Availability Service Documentation

This document details the Driver Availability Service and its complementary files for the `MMFinale` project, located under `C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0`. The service manages driver availability operations, including setting working hours, retrieving status, and toggling availability. It integrates with models, constants, and common services, with automatic point awarding for gamification.

**Last Updated**: June 10, 2025

## Table of Contents
1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Service Details](#service-details)
4. [Endpoints](#endpoints)
5. [Complementary Files](#complementary-files)
6. [Dependencies](#dependencies)
7. [Notes](#notes)

---

## Overview
The Driver Availability Service (`availabilityService.js`) allows drivers to set their working hours, retrieve their availability status, and toggle their availability. It uses Sequelize for database operations and integrates with common services for auditing, notifications, sockets, and point awarding. Points are awarded dynamically within functions using configurations from `driverGamificationConstants.js`.

## File Structure
- **Service**: `src\services\driver\availability\availabilityService.js`
- **Controller**: `src\controllers\driver\availability\availabilityController.js`
- **Validator**: `src\validators\driver\availability\availabilityValidator.js`
- **Middleware**: `src\middleware\driver\availability\availabilityMiddleware.js`
- **Routes**: `src\routes\driver\availability\availabilityRoutes.js`
- **Socket Events**: `socket\events\driver\availability\availabilityEvents.js`
- **Socket Handler**: `socket\handlers\driver\availability\availabilityHandler.js`
- **Localization**: `locales\driver\availability\en.json`
- **Constants**:
  - `src\constants\driver\driverConstants.js`
  - `src\constants\driver\driverGamificationConstants.js`

## Service Details
**File**: `availabilityService.js`

**Functionality**:
- **setAvailability**: Sets driver availability for a specific date and time range. Validates duration against `AVAILABILITY_CONSTANTS.SHIFT_SETTINGS`. Awards points for `set_availability` (10 points) and `shift_commitment` (50 points, once per day for today's date).
- **getAvailability**: Retrieves the driver's current availability status and details for today. Awards 5 points for `availability_access`.
- **toggleAvailability**: Toggles driver availability between available and unavailable. Awards 8 points for `toggle_availability`.

**Point Awarding**:
- Points are awarded automatically within each function using `pointService.awardPoints`, integrated into database transactions.
- Actions and points (from `driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS`):
  - `set_availability`: 10 points, 0.20 wallet credit
  - `availability_access`: 5 points, 0.10 wallet credit
  - `toggle_availability`: 8 points, 0.15 wallet credit
  - `shift_commitment`: 50 points, 1.00 wallet credit (awarded in `setAvailability` for today's date, once daily)

**Models Used**:
- `Driver`, `DriverAvailability`

**Dependencies**:
- `sequelize`, `AppError`, `logger`, `localization`, `driverConstants`, `driverGamificationConstants`

## Endpoints
### 1. POST /driver/availability/set
- **Description**: Sets driver availability hours.
- **Auth**: Bearer token (handled by main route index).
- **Request Body**:
  - `date`: ISO date string (e.g., `2025-06-10`).
  - `start_time`: Time in `HH:mm` format (e.g., `09:00`).
  - `end_time`: Time in `HH:mm` format (e.g., `17:00`).
- **Response**:
  - 200: Availability record with `driver_id`, `date`, `start_time`, `end_time`, `status`, `isOnline`, `lastUpdated`.
  - 400: Invalid request or duration.
  - 404: Driver not found.
  - 500: Server error.
- **Points**: Awards 10 points for `set_availability` and 50 points for `shift_commitment` (if for today, once daily).

### 2. GET /driver/availability
- **Description**: Retrieves driver availability status.
- **Auth**: Bearer token.
- **Response**:
  - 200: Object with `driverId`, `availabilityStatus`, and `currentAvailability` (date, times, status, isOnline).
  - 404: Driver not found.
  - 500: Server error.
- **Points**: Awards 5 points for `availability_access`.

### 3. POST /driver/availability/toggle
- **Description**: Toggles driver availability status.
- **Auth**: Bearer token.
- **Request Body**:
  - `isAvailable`: Boolean.
- **Response**:
  - 200: Object with `isAvailable`.
  - 400: Invalid request or already in requested state.
  - 404: Driver not found.
  - 500: Server error.
- **Points**: Awards 8 points for `toggle_availability`.

## Complementary Files
### Controller (`availabilityController.js`)
- Imports common services (`auditService`, `notificationService`, `socketService`, `pointService`).
- Handles HTTP requests, passes services to the service layer, and formats responses using `sendResponse`.
- Uses `catchAsync` for error handling.

### Validator (`availabilityValidator.js`)
- Uses Joi to validate request inputs.
- Ensures `driverId` is a positive integer, `date` is ISO format, times are `HH:mm`, and `isAvailable` is boolean.

### Middleware (`availabilityMiddleware.js`)
- Validates requests using schemas from the validator file.
- Throws `AppError` on validation failure.

### Routes (`availabilityRoutes.js`)
- Defines Express routes with Swagger documentation.
- Applies validation middleware before controllers.
- Assumes auth middleware is applied in the main route index.

### Socket Events (`availabilityEvents.js`)
- Defines socket event names in the `availability:` namespace:
  - `availability:updated`
  - `availability:retrieved`
  - `availability:toggled`

### Socket Handler (`availabilityHandler.js`)
- Handles socket events using `catchAsyncSocket`.
- Re-emits events to the client for real-time updates.

### Localization (`en.json`)
- Provides English translations for user-facing messages.
- Supports placeholders for `date`, `start_time`, and `end_time`.
- Covers setting, retrieving, and toggling availability.

### Constants
- **driverConstants.js**: Defines `AVAILABILITY_CONSTANTS` with `SHIFT_SETTINGS` (`MIN_SHIFT_HOURS`, `MAX_SHIFT_HOURS`) and `AVAILABILITY_STATUSES` (`AVAILABLE`, `UNAVAILABLE`).
- **driverGamificationConstants.js**: Defines `GAMIFICATION_CONSTANTS` with `DRIVER_ACTIONS` for point awarding.

## Dependencies
- **External Libraries**: `sequelize`, `joi`, `express`
- **Utilities**: `AppError`, `logger`, `localization`, `responseHandler`, `catchAsync`, `catchAsyncSocket`, `security`
- **Constants**: `driverConstants`, `driverGamificationConstants`
- **Services**: `auditService`, `notificationService`, `socketService`, `pointService`
- **Models**: `Driver`, `DriverAvailability`

## Notes
- **Authentication**: Assumed to be handled by main route index middleware.
- **Point Awarding**: Integrated dynamically within service functions, using `pointService` within transactions. `shift_commitment` points are awarded in `setAvailability` only once per day for today's date.
- **Localization**: Uses `formatMessage` with `en.json` for user-facing messages.
- **Error Handling**: Uses `AppError` with `driverConstants.ERROR_CODES`.
- **Transactions**: Sequelize transactions ensure data consistency.
- **Socket Events**: Provide real-time updates for availability changes.
- **Scalability**: Designed for multiple drivers with efficient queries.
- **Constants**:
  - `driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS`: Defines `MIN_SHIFT_HOURS` and `MAX_SHIFT_HOURS`.
  - `driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES`: Defines `AVAILABLE` and `UNAVAILABLE`.
  - `driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS`: Defines actions and points.

This documentation provides a comprehensive overview of the Driver Availability Service and its integration with the MMFinale backend system.