# mtxi Analytics Service Documentation

## Overview
The `analyticsService` for the mtxi (ride-sharing) module provides analytics and reporting functionalities for admin users. It focuses on ride completion rates, tip distribution, ride reports, and driver performance metrics. The service integrates with models (`Driver`, `Ride`, `Tip`, `Payment`, `Route`) and leverages constants for consistent configuration. Points are awarded automatically during performance analysis to enhance gamification.

## File Structure
- **Service**: `src/services/admin/mtxi/analyticsService.js`
- **Controller**: `src/controllers/admin/mtxi/analyticsController.js`
- **Validator**: `src/validators/admin/mtxi/analyticsValidator.js`
- **Middleware**: `src/middleware/admin/mtxi/analyticsMiddleware.js`
- **Routes**: `src/routes/admin/mtxi/analyticsRoutes.js`
- **Events**: `socket/events/admin/mtxi/analyticsEvents.js`
- **Handler**: `socket/handlers/admin/mtxi/analyticsHandler.js`
- **Localization**: `locales/admin/mtxi/en.json`

## Service Details
The service file (`analyticsService.js`) contains four core functions, each responsible for a specific analytics task. Common services (`notificationService`, `socketService`, `auditService`, `pointService`) are injected via the controller to reduce coupling.

### Functions
1. **getRideAnalytics(driverId, services)**
   - **Purpose**: Retrieves ride completion analytics for a driver.
   - **Input**: `driverId` (number), `services` (object containing `notificationService`, `auditService`).
   - **Output**: Object with `driverId`, `totalRides`, `completedRides`, `completionRate`, `cancelledRides`, `cancellationRate`.
   - **Logic**:
     - Validates `driverId` and checks if the driver exists.
     - Fetches all rides for the driver and calculates completion and cancellation rates.
     - Sends a notification and logs an audit action.
   - **Error Handling**: Throws `AppError` for invalid `driverId`, driver not found, or no rides.

2. **getTipAnalytics(driverId, services)**
   - **Purpose**: Analyzes tip distribution for a driver.
   - **Input**: `driverId` (number), `services` (object containing `notificationService`, `auditService`).
   - **Output**: Object with `driverId`, `totalTips`, `totalTipAmount`, `averageTip`, `currency`.
   - **Logic**:
     - Validates `driverId` and checks if the driver exists.
     - Fetches completed tips for the driver and calculates total and average tip amounts.
     - Sends a notification and logs an audit action.
   - **Error Handling**: Throws `AppError` for invalid `driverId`, driver not found, or no tips.

3. **exportRideReports(driverId, format, period, services)**
   - **Purpose**: Generates ride reports for a driver in specified format and period.
   - **Input**: `driverId` (number), `format` (string, e.g., 'pdf', 'csv', 'json'), `period` (string, e.g., 'daily', 'weekly'), `services` (object containing `notificationService`, `socketService`, `auditService`).
   - **Output**: Object with `driverId`, `period`, `format`, `totalRides`, `totalEarnings`, `totalDistance`, and detailed `data` array.
   - **Logic**:
     - Validates inputs and checks if the driver exists.
     - Filters rides by period and includes payment and route data.
     - Generates report data and emits a socket event.
     - Sends a notification and logs an audit action.
   - **Error Handling**: Throws `AppError` for invalid inputs, driver not found, or no rides.

4. **analyzeDriverPerformance(driverId, services)**
   - **Purpose**: Tracks driver performance metrics and awards points.
   - **Input**: `driverId` (number), `services` (object containing `notificationService`, `socketService`, `auditService`, `pointService`).
   - **Output**: Object with `driverId`, `totalRides`, `totalEarnings`, `totalDistance`, `totalTips`, `totalTipAmount`, `averageRideDuration`, `rating`, `recommendations`.
   - **Logic**:
     - Validates `driverId` and checks if the driver exists.
     - Fetches completed rides and tips, calculating performance metrics.
     - Awards points using `pointService` based on `adminServiceConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.ANALYTICS_REVIEW`.
     - Sends a notification, emits a socket event, and logs an audit action.
   - **Error Handling**: Throws `AppError` for invalid `driverId` or driver not found.

### Point Awarding
- Points are awarded automatically in `analyzeDriverPerformance` using the `pointService`.
- Action: `analytics_review` from `adminServiceConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS`.
- Points: 20 (as defined in constants).
- No separate endpoints for point awarding; it occurs dynamically during performance analysis.

## Controller Details
The controller (`analyticsController.js`) handles HTTP requests, interacts with the service layer, and formats responses. It imports common services and passes them to the service functions.

### Endpoints
1. **GET /admin/mtxi/analytics/ride/:driverId**
   - **Handler**: `getRideAnalytics`
   - **Description**: Fetches ride completion analytics.
   - **Response**: JSON with status, localized message, and analytics data.

2. **GET /admin/mtxi/analytics/tip/:driverId**
   - **Handler**: `getTipAnalytics`
   - **Description**: Fetches tip distribution analytics.
   - **Response**: JSON with status, localized message, and analytics data.

3. **GET /admin/mtxi/analytics/report/:driverId**
   - **Handler**: `exportRideReports`
   - **Description**: Exports ride reports based on format and period query parameters.
   - **Response**: JSON with status, localized message, and report data.

4. **GET /admin/mtxi/analytics/performance/:driverId**
   - **Handler**: `analyzeDriverPerformance`
   - **Description**: Analyzes driver performance and awards points.
   - **Response**: JSON with status, localized message, and performance data.

## Validator Details
The validator (`analyticsValidator.js`) uses Joi to validate inputs for each endpoint.

- **Schemas**:
  - `getRideAnalyticsSchema`: Validates `driverId` (positive integer, required).
  - `getTipAnalyticsSchema`: Same as above.
  - `exportRideReportsSchema`: Validates `driverId`, `format` (enum from `rideConstants.REPORT_FORMATS`), `period` (enum from `rideConstants.REPORT_PERIODS`).
  - `analyzeDriverPerformanceSchema`: Validates `driverId`.

## Middleware Details
The middleware (`analyticsMiddleware.js`) ensures input validation and permission checks.

- **Validation Middleware**:
  - `validateGetRideAnalytics`, `validateGetTipAnalytics`, `validateExportRideReports`, `validateAnalyzeDriverPerformance`: Apply respective validator schemas.
- **Permission Middleware**:
  - `checkAnalyticsPermission`: Verifies if the user has `manageAnalytics:read` permission based on `adminCoreConstants.ADMIN_PERMISSIONS`.

## Routes Details
The routes (`analyticsRoutes.js`) define Express routes with Swagger documentation.

- **Endpoints**:
  - `GET /admin/mtxi/analytics/ride/:driverId`
  - `GET /admin/mtxi/analytics/tip/:driverId`
  - `GET /admin/mtxi/analytics/report/:driverId`
  - `GET /admin/mtxi/analytics/performance/:driverId`
- **Swagger**: Includes detailed API specs for parameters, responses, and security (`bearerAuth`).

## Events and Handlers
- **Events** (`analyticsEvents.js`): Defines socket events (`./analytics:report_generated`, `./analytics:performance_updated`) in namespaced format.
- **Handlers** (`analyticsHandler.js`): Listens for socket events and re-emits them to specific users using `socketService`.

## Localization
The `en.json` file (`locales/admin/mtxi/en.json`) provides English translations for all user-facing messages, used via `formatMessage`.

## Constants Usage
The service leverages constants from:
- `rideConstants.js`: `RIDE_STATUSES`, `NOTIFICATION_CONSTANTS`, `ANALYTICS_CONSTANTS`.
- `tipConstants.js`: `TIP_SETTINGS`, `NOTIFICATION_CONSTANTS`.
- `driverConstants.js`: `ERROR_CODES`, `ANALYTICS_CONSTANTS`.
- `adminServiceConstants.js`: `GAMIFICATION_CONSTANTS` for point awarding.

## Dependencies
- **Models**: `Driver`, `Ride`, `Tip`, `Payment`, `Route`.
- **Services**: `notificationService`, `socketService`, `auditService`, `pointService` (injected via controller).
- **Utilities**: `logger`, `AppError`, `formatMessage`, `sequelize.Op`.

## Error Handling
- Uses `AppError` for structured errors with status codes and error codes from constants.
- Logs errors using `logger.logErrorEvent`.
- Errors are propagated to the controller for HTTP response formatting.

## Security and Permissions
- Permission checks are enforced via `checkAnalyticsPermission` middleware.
- Assumes authentication is handled by a higher-level middleware (as per your note).
- Uses `adminCoreConstants.ADMIN_PERMISSIONS` to validate `manageAnalytics:read`.

## Future Enhancements
- Add support for real-time analytics updates via WebSocket.
- Implement advanced filtering options for reports (e.g., by date range).
- Enhance point awarding logic to include more actions (e.g., report generation).

## Last Updated
June 22, 2025