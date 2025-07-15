# Driver Location Service Documentation

This document details the Driver Location Service and its complementary files for the `MMFinale` project, located under `C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0`. The service manages driver location operations, including sharing real-time location, retrieving current location, and configuring country-specific maps. It integrates with models, constants, and common services, with automatic point awarding for gamification.

**Last Updated**: June 11, 2025

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
The Driver Location Service (`locationService.js`) enables drivers to share real-time locations, retrieve their current location, and configure country-specific map providers. It uses Sequelize for database operations and integrates with common services for auditing, notifications, sockets, and point awarding. Points are awarded dynamically for driver-initiated actions using configurations from `driverGamificationConstants.js`.

## File Structure
- **Service**: `src\services\driver\location\locationService.js`
- **Controller**: `src\controllers\driver\location\locationController.js`
- **Validator**: `src\validators\driver\location\locationValidator.js`
- **Middleware**: `src\middleware\driver\location\locationMiddleware.js`
- **Routes**: `src\routes\driver\location\locationRoutes.js`
- **Socket Events**: `socket\events\driver\location\locationEvents.js`
- **Socket Handler**: `socket\handlers\driver\location\locationHandler.js`
- **Localization**: `locales\driver\location\en.json`
- **Constants**:
  - `src\constants\driver\driverConstants.js`
  - `src\constants\driver\driverGamificationConstants.js`
  - `src\constants\locationConstants.js`

## Service Details
**File**: `locationService.js`

**Functionality**:
- **shareLocation**: Shares a driver's real-time location, updating the `Driver` model. Awards 5 points for `location_share` (once per minute).
- **getLocation**: Retrieves a driver's current location, checking for staleness. Awards 5 points for `location_access` (once per day).
- **configureMap**: Configures a country-specific map provider. Awards 8 points for `map_configure`.

**Point Awarding**:
- Points are awarded dynamically within each function using `pointService.awardPoints`, integrated into database transactions.
- Actions and points (from `driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS`):
  - `location_share`: 5 points, 0.10 wallet credit (once per minute)
  - `location_access`: 5 points, 0.10 wallet credit (once daily)
  - `map_configure`: 8 points, 0.15 wallet credit

**Models Used**:
- `Driver`

**Dependencies**:
- `sequelize`, `AppError`, `logger`, `localization`, `driverConstants`, `locationConstants`, `driverGamificationConstants`

## Endpoints
### 1. POST /driver/location/share
- **Description**: Shares a driver's real-time location.
- **Auth**: Bearer token (handled by main route index).
- **Request Body**:
  - `coordinates`: Object with `lat` and `lng` numbers (required).
- **Response**:
  - 200: Null data.
  - 400: Invalid or missing coordinates, or driver not active.
  - 404: Driver not found.
  - 500: Server error.
- **Points**: Awards 5 points for `location_share` (once per minute).

### 2. GET /driver/location
- **Description**: Retrieves a driver's current location.
- **Auth**: Bearer token.
- **Response**:
  - 200: Object with `driverId`, `coordinates` (`lat`, `lng`), and `lastUpdated`.
  - 400: Location data outdated.
  - 404: Driver or location data not found.
  - 500: Server error.
- **Points**: Awards 5 points for `location_access` (once per day).

### 3. POST /driver/location/map
- **Description**: Configures a country-specific map provider.
- **Auth**: Bearer token.
- **Request Body**:
  - `country`: Country code (e.g., `US`, `KE`) from `locationConstants.SUPPORTED_MAP_PROVIDERS` (required).
- **Response**:
  - 200: Object with `provider`, `zoomLevel`, `maxWaypoints`, and `supportedCities`.
  - 400: Unsupported country.
  - 404: Driver not found.
  - 500: Server error.
- **Points**: Awards 8 points for `map_configure`.

## Complementary Files
### Controller (`locationController.js`)
- Imports common services (`auditService`, `notificationService`, `socketService`, `pointService`).
- Handles HTTP requests, passes services to the service layer, and formats responses using `sendResponse`.
- Uses `catchAsync` for error handling.

### Validator (`locationValidator.js`)
- Uses Joi to validate request inputs.
- Validates `driverId`, `coordinates` as an object with `lat` and `lng` numbers, and `country` against `locationConstants.SUPPORTED_MAP_PROVIDERS` keys.

### Middleware (`locationMiddleware.js`)
- Validates requests using schemas from the validator file.
- Handles body parameters (`coordinates`, `country`).
- Throws `AppError` on validation failure.

### Routes (`locationRoutes.js`)
- Defines Express routes with Swagger documentation.
- Applies validation middleware before controllers.
- Uses `post` for `shareLocation` and `configureMap`; `get` for `getLocation`.
- Assumes auth middleware is applied in the main route index.

### Socket Events (`locationEvents.js`)
- Defines socket event names in the `location:` namespace:
  - `location:updated`
  - `location:retrieved`
  - `location:map_configured`

### Socket Handler (`locationHandler.js`)
- Handles socket events using `catchAsyncSocket`.
- Uses `socket.broadcast.emit` for `location:updated` to notify all clients except the sender.
- Uses `socket.emit` for `location:retrieved` and `location:map_configured` to notify the sender only.

### Localization (`en.json`)
- Located at `locales\driver\location\en.json`.
- Provides English translations for user-facing messages in the `location` namespace.
- Supports placeholders for `lat`, `lng`, `country`, and `provider`.
- Covers location updates and map configuration messages.

### Constants
- **driverConstants.js**: Defines `ERROR_CODES`, `DRIVER_STATUSES`, `DRIVER_SETTINGS`, and `NOTIFICATION_CONSTANTS` for error handling, driver statuses, and default language.
- **driverGamificationConstants.js**: Defines `GAMIFICATION_CONSTANTS` with `DRIVER_ACTIONS` for point awarding.
- **locationConstants.js**: Defines `LOCATION_UPDATE_FREQUENCY_SECONDS`, `MAP_SETTINGS`, `SUPPORTED_MAP_PROVIDERS`, `SUPPORTED_CITIES`, `NOTIFICATION_TYPES`, `AUDIT_TYPES`, `EVENT_TYPES`, and `ERROR_CODES`.

## Dependencies
- **External Libraries**: `sequelize`, `joi`, `express`
- **Utilities**: `AppError`, `logger`, `localization`, `responseHandler`, `catchAsync`, `catchAsyncSocket`, `security`
- **Constants**: `driverConstants`, `driverGamificationConstants`, `locationConstants`
- **Services**: `auditService`, `notificationService`, `socketService`, `pointService`
- **Models**: `Driver`

## Notes
- **Authentication**: Assumed to be handled by main route index middleware.
- **Point Awarding**: Integrated dynamically within each function using `pointService` within transactions. `location_share` is limited to once per minute, and `location_access` is limited to once per day.
- **Localization**: Uses `formatMessage` with `locales/driver/location/en.json` for translations in the `location` namespace.
- **Error Handling**: Uses `AppError` with `locationConstants.ERROR_CODES` and `driverConstants.ERROR_CODES`.
- **Transactions**: Sequelize transactions ensure data consistency.
- **Socket Events**: `location:updated` is broadcast to all clients for real-time tracking; others are sent to the driver only.
- **Scalability**: Optimized for frequent location updates with efficient queries.
- **Map Configuration**: Returns a configuration object; actual map integration (e.g., Google Maps, OpenStreetMap) would occur on the client side.
- **Driver Model**: Assumes `current_location` is a JSON field and `last_location_update` is a timestamp.
- **Constants**:
  - `locationConstants.LOCATION_UPDATE_FREQUENCY_SECONDS`: 300 seconds (5 minutes) for staleness check.
  - `locationConstants.SUPPORTED_MAP_PROVIDERS`: Maps country codes to providers (e.g., `google_maps`, `openstreetmap`).
  - `driverConstants.DRIVER_STATUSES`: Includes `AVAILABLE`, `ON_DELIVERY`, `ON_RIDE`.
  - `driverGamificationConstants.DRIVER_ACTIONS`: Defines actions and points for location operations.

This documentation provides a comprehensive overview of the Driver Location Service and its integration with the MMFinale backend system.