# Driver Scheduling Service Documentation

This document details the Driver Scheduling Service and its complementary files for the `MMFinale` project, located under `C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0`. The service manages driver shift scheduling operations, including creating, retrieving, updating shifts, and sending high-demand alerts. It integrates with models, constants, and common services, with automatic point awarding for gamification.

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
The Driver Scheduling Service (`schedulingService.js`) enables drivers to create, retrieve, and update shifts, and receive notifications about high-demand areas. It uses Sequelize for database operations and integrates with common services for auditing, notifications, sockets, and point awarding. Points are awarded dynamically for driver-initiated actions using configurations from `driverGamificationConstants.js`.

## File Structure
- **Service**: `src\services\driver\scheduling\schedulingService.js`
- **Controller**: `src\controllers\driver\scheduling\schedulingController.js`
- **Validator**: `src\validators\driver\scheduling\schedulingValidator.js`
- **Middleware**: `src\middleware\driver\scheduling\schedulingMiddleware.js`
- **Routes**: `src\routes\driver\scheduling\schedulingRoutes.js`
- **Socket Events**: `socket\events\driver\scheduling\schedulingEvents.js`
- **Socket Handler**: `socket\handlers\driver\scheduling\schedulingHandler.js`
- **Localization**: `locales\driver\availability\en.json`
- **Constants**:
  - `src\constants\driver\driverConstants.js`
  - `src\constants\driver\driverGamificationConstants.js`

## Service Details
**File**: `schedulingService.js`

**Functionality**:
- **createShift**: Creates a new shift with validation for duration, shift type, and weekly shift limits. Awards 10 points for `create_shift`.
- **getShiftDetails**: Retrieves active and scheduled shifts for a driver. Awards 5 points for `shift_access` (once per day).
- **updateShift**: Updates or cancels a shift with validation for duration, type, and status. Awards 8 points for `update_shift`.
- **notifyHighDemand**: Sends notifications about high-demand areas based on `DeliveryHotspot` data. No points awarded.

**Point Awarding**:
- Points are awarded automatically within each driver-initiated function using `pointService.awardPoints`, integrated into database transactions.
- Actions and points (from `driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS`):
  - `create_shift`: 10 points, 0.20 wallet credit
  - `shift_access`: 5 points, 0.10 wallet credit (once daily)
  - `update_shift`: 8 points, 0.15 wallet credit
- No points for `notifyHighDemand`, as it’s system-driven.

**Models Used**:
- `Driver`, `Shift`, `DeliveryHotspot`

**Dependencies**:
- `sequelize`, `AppError`, `logger`, `localization`, `driverConstants`, `driverGamificationConstants`

## Endpoints
### 1. POST /driver/scheduling/create
- **Description**: Creates a new driver shift.
- **Auth**: Bearer token (handled by main route index).
- **Request Body**:
  - `start_time`: ISO date-time (e.g., `2025-06-10T09:00:00Z`).
  - `end_time`: ISO date-time (after `start_time`).
  - `shift_type`: `standard` or `batch`.
- **Response**:
  - 200: Shift object with `id`, `driver_id`, `start_time`, `end_time`, `shift_type`, `status`.
  - 400: Invalid request or limits exceeded.
  - 404: Driver not found.
  - 500: Server error.
- **Points**: Awards 10 points for `create_shift`.

### 2. GET /driver/scheduling
- **Description**: Retrieves driver shift details.
- **Auth**: Bearer token.
- **Response**:
  - 200: Array of shift objects with `shiftId`, `start_time`, `end_time`, `shift_type`, `status`.
  - 404: Driver not found.
  - 500: Server error.
- **Points**: Awards 5 points for `shift_access` (once daily).

### 3. PATCH /driver/scheduling/{shiftId}
- **Description**: Updates or cancels a driver shift.
- **Auth**: Bearer token.
- **Parameters**:
  - `shiftId`: Integer (path parameter).
- **Request Body** (optional fields):
  - `start_time`: ISO date-time.
  - `end_time`: ISO date-time.
  - `shift_type`: `standard` or `batch`.
  - `status`: `scheduled`, `active`, `completed`, or `cancelled`.
- **Response**:
  - 200: Object with `shiftId`.
  - 400: Invalid request.
  - 404: Shift or driver not found.
  - 500: Server error.
- **Points**: Awards 8 points for `update_shift`.

### 4. POST /driver/scheduling/high-demand
- **Description**: Notifies driver of high-demand areas.
- **Auth**: Bearer token.
- **Response**:
  - 200: Null data.
  - 404: Driver or high-demand areas not found.
  - 500: Server error.
- **Points**: None.

## Complementary Files
### Controller (`schedulingController.js`)
- Imports common services (`auditService`, `notificationService`, `socketService`, `pointService`).
- Handles HTTP requests, passes services to the service layer, and formats responses using `sendResponse`.
- Uses `catchAsync` for error handling.

### Validator (`schedulingValidator.js`)
- Uses Joi to validate request inputs.
- Ensures `driverId` and `shiftId` are positive integers, `start_time` and `end_time` are valid ISO dates, and `shift_type` and `status` are within allowed values.

### Middleware (`schedulingMiddleware.js`)
- Validates requests using schemas from the validator file.
- Throws `AppError` on validation failure.

### Routes (`schedulingRoutes.js`)
- Defines Express routes with Swagger documentation.
- Applies validation middleware before controllers.
- Assumes auth middleware is applied in the main route index.

### Socket Events (`schedulingEvents.js`)
- Defines socket event names in the `shift:` namespace:
  - `shift:created`
  - `shift:retrieved`
  - `shift:updated`
  - `shift:high_demand`

### Socket Handler (`schedulingHandler.js`)
- Handles socket events using `catchAsyncSocket`.
- Re-emits events to the client for real-time updates.

#### Localization (`en.json`)
- Located at `locales\driver\availability\en.json`.
- Provides English translations for user-facing messages in both `availability` and `shift` namespaces.
- Supports placeholders for `shiftId`, `start_time`, `end_time`, `count`, `areas`, and `date`.
- Covers scheduling messages for shift creation, retrieval, updates, cancellation, completion, and high-demand alerts, as well as availability messages.

### Constants
- **driverConstants.js**: Defines `AVAILABILITY_CONSTANTS`, `MUNCH_CONSTANTS`, and `ERROR_CODES` for shift settings, delivery types, statuses, and errors.
- **driverGamificationConstants.js**: Defines `GAMIFICATION_CONSTANTS` with `DRIVER_ACTIONS` for point awarding.

## Dependencies
- **External Libraries**: `sequelize`, `joi`, `express`
- **Utilities**: `AppError`, `logger`, `localization`, `responseHandler`, `catchAsync`, `catchAsyncSocket`, `security`
- **Constants**: `driverConstants`, `driverGamificationConstants`
- **Services**: `auditService`, `notificationService`, `socketService`, `pointService`
- **Models**: `Driver`, `Shift`, `DeliveryHotspot`

## Notes
- **Authentication**: Assumed to be handled by main route index middleware.
- **Point Awarding**: Integrated dynamically within driver-initiated functions using `pointService` within transactions. `shift_access` points are limited to once per day.
- **Localization**: Uses `formatMessage` with `shift/en.json` for user-facing messages.
- **Error Handling**: Uses `AppError` with specific `ERROR_CODES` (e.g., `SHIFT_INVALID_TYPE`, `SHIFT_NOT_FOUND`).
- **Transactions**: Sequelize transactions ensure data consistency.
- **Socket Events**: Provide real-time updates for shift changes and high-demand alerts.
- **Scalability**: Designed for multiple drivers with efficient queries.
- **Constants**:
  - `driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS`: Defines `MIN_SHIFT_HOURS`, `MAX_SHIFT_HOURS`, `MAX_SHIFTS_PER_WEEK`.
  - `driverConstants.MUNCH_CONSTANTS.DELIVERY_TYPES`: Defines `STANDARD` and `BATCH`.
  - `driverConstants.MUNCH_CONSTANTS.DELIVERY_STATUSES`: Includes `CANCELLED`.
  - `driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS`: Defines actions and points.

This documentation provides a comprehensive overview of the Driver Scheduling Service and its integration with the MMFinale backend system.