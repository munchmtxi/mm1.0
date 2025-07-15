# mtxi Driver Service Documentation

## Overview
The `driverService` for the mtxi (ride-sharing) module provides functionalities for admin users to manage driver assignments, monitor availability, review safety incidents, and administer training. It focuses exclusively on mtxi ride-related operations, integrating with models (`Driver`, `Ride`, `DriverAvailability`, `DriverSafetyIncident`) and leveraging constants for consistent configuration. Points are awarded automatically during ride assignments and training completion to enhance gamification.

## File Structure
- **Service**: `src/services/admin/mtxi/driverService.js`
- **Controller**: `src/controllers/admin/mtxi/driverController.js`
- **Validator**: `src/validators/admin/mtxi/driverValidator.js`
- **Middleware**: `src/middleware/admin/mtxi/driverMiddleware.js`
- **Routes**: `src/routes/admin/mtxi/driverRoutes.js`
- **Events**: `socket/events/admin/mtxi/driverEvents.js`
- **Handler**: `socket/handlers/admin/mtxi/driverHandler.js`
- **Localization**: `locales/admin/mtxi/en.json`

## Service Details
The service file (`driverService.js`) contains four core functions, each responsible for a specific driver management task. Common services (`notificationService`, `socketService`, `auditService`, `pointService`) are injected via the controller to reduce coupling.

### Functions
1. **manageDriverAssignment(driverId, assignment, services)**
   - **Purpose**: Assigns a ride to a driver.
   - **Input**: `driverId` (number), `assignment` (object with `rideId`), `services` (object containing `notificationService`, `socketService`, `auditService`, `pointService`).
   - **Output**: Object with `driverId`, `rideId`, `status: 'assigned'`.
   - **Logic**:
     - Validates `driverId` and `rideId`, checks if the driver and ride exist.
     - Ensures driver is available and ride is pending.
     - Updates ride status to `accepted` and driver status to `on_ride`.
     - Sends a notification, emits a socket event, logs an audit action, and awards points.
   - **Point Awarding**: Awards points using `pointService` based on `adminServiceConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.USER_ONBOARDING` (proxy for assignment).
   - **Error Handling**: Throws `AppError` for invalid inputs, driver not found, ride not found, or driver unavailability.

2. **monitorDriverAvailability(driverId, services)**
   - **Purpose**: Tracks driver schedules and availability.
   - **Input**: `driverId` (number), `services` (object containing `notificationService`, `auditService`).
   - **Output**: Object with `driverId`, `availabilityStatus`, `currentSchedule`, `upcomingSchedules`.
   - **Logic**:
     - Validates `driverId` and checks if the driver exists.
     - Fetches driver availability and determines current status based on active schedules.
     - Sends a notification and logs an audit action.
   - **Error Handling**: Throws `AppError` for invalid `driverId` or driver not found.

3. **overseeSafetyReports(driverId, services)**
   - **Purpose**: Reviews safety incidents for a driver.
   - **Input**: `driverId` (number), `services` (object containing `notificationService`, `socketService`, `auditService`).
   - **Output**: Object with `driverId`, `totalIncidents`, `incidentsByType`, `pendingIncidents`, `details`.
   - **Logic**:
     - Validates `driverId` and checks if the driver exists.
     - Fetches ride-related safety incidents and summarizes them by type and status.
     - Sends a notification, emits a socket event, and logs an audit action.
   - **Error Handling**: Throws `AppError` for invalid `driverId` or driver not found.

4. **administerTraining(driverId, trainingDetails, services)**
   - **Purpose**: Manages driver training (simulated).
   - **Input**: `driverId` (number), `trainingDetails` (object with `module`, `action: 'assign' | 'complete' | 'verify'`), `services` (object containing `notificationService`, `socketService`, `auditService`, `pointService`).
   - **Output**: Object with `driverId`, `module`, `action`, `status`.
   - **Logic**:
     - Validates inputs and checks if the driver and module are valid.
     - Updates training status based on the action.
     - Sends a notification, emits a socket event, logs an audit action, and awards points for `complete` action.
   - **Point Awarding**: Awards points for `complete` action using `pointService` based on `adminServiceConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.USER_ONBOARDING` (proxy for training).
   - **Error Handling**: Throws `AppError` for invalid inputs, driver not found, or invalid module.

### Point Awarding
- Points are awarded automatically in:
  - `manageDriverAssignment`: For successful ride assignment.
  - `administerTraining`: For `complete` action in training.
- Action: `user_onboarding` from `adminServiceConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS` (used as a proxy).
- Points: 50 (as defined in constants).
- No separate endpoints for point awarding; it occurs dynamically during relevant actions.

## Controller Details
The controller (`driverController.js`) handles HTTP requests, interacts with the service layer, and formats responses. It imports common services and passes them to the service functions.

### Endpoints
1. **POST /admin/mtxi/driver/assignment/:driverId**
   - **Handler**: `manageDriverAssignment`
   - **Description**: Assigns a ride to a driver.
   - **Request Body**: `{ rideId: number }`
   - **Response**: JSON with status, localized message, and assignment data.

2. **GET /admin/mtxi/driver/availability/:driverId**
   - **Handler**: `monitorDriverAvailability`
   - **Description**: Retrieves driver availability details.
   - **Response**: JSON with status, localized message, and schedule data.

3. **GET /admin/mtxi/driver/safety/:driverId**
   - **Handler**: `overseeSafetyReports`
   - **Description**: Retrieves safety incident summaries.
   - **Response**: JSON with status, localized message, and incident data.

4. **POST /admin/mtxi/driver/training/:driverId**
   - **Handler**: `administerTraining`
   - **Description**: Manages driver training and awards points for completion.
   - **Request Body**: `{ module: string, action: string }`
   - **Response**: JSON with status, localized message, and training data.

## Validator Details
The validator (`driverValidator.js`) uses Joi to validate inputs for each endpoint.

- **Schemas**:
  - `manageDriverAssignmentSchema`: Validates `driverId` and `rideId` (positive integers, required).
  - `monitorDriverAvailabilitySchema`: Validates `driverId`.
  - `overseeSafetyReportsSchema`: Validates `driverId`.
  - `administerTrainingSchema`: Validates `driverId`, `module` (enum from `driverConstants.TRAINING_MODULES`), `action` (enum: `assign`, `complete`, `verify`).

## Middleware Details
The middleware (`driverMiddleware.js`) ensures input validation and permission checks.

- **Validation Middleware**:
  - `validateManageDriverAssignment`, `validateMonitorDriverAvailability`, `validateOverseeSafetyReports`, `validateAdministerTraining`: Apply respective validator schemas.
- **Permission Middleware**:
  - `checkDriverManagementPermission`: Verifies if the user has `manageUsers:write` permission based on `adminCoreConstants.ADMIN_PERMISSIONS`.

## Routes Details
The routes (`driverRoutes.js`) define Express routes with Swagger documentation.

- **Endpoints**:
  - `POST /admin/mtxi/driver/assignment/:driverId`
  - `GET /admin/mtxi/driver/availability/:driverId`
  - `GET /admin/mtxi/driver/safety/:driverId`
  - `POST /admin/mtxi/driver/training/:driverId`
- **Swagger**: Includes detailed API specs for parameters, request bodies, responses, and security (`bearerAuth`).

## Events and Handlers
- **Events** (`driverEvents.js`): Defines socket events (`./driver:assignment_updated`, `./safety:incidents_reviewed`, `./training:updated`) in namespaced format.
- **Handlers** (`driverHandler.js`): Listens for socket events and re-emits them to specific users using `socketService`.

## Localization
The `en.json` file (`locales/admin/mtxi/en.json`) provides English translations for all user-facing messages, used via `formatMessage`. It includes both analytics and driver-related messages.

## Constants Usage
The service leverages constants from:
- `rideConstants.js`: `RIDE_STATUSES`, `NOTIFICATION_CONSTANTS`.
- `driverConstants.js`: `DRIVER_STATUSES`, `AVAILABILITY_CONSTANTS`, `NOTIFICATION_CONSTANTS`, `SAFETY_CONSTANTS`, `ONBOARDING_CONSTANTS`, `ERROR_CODES`.
- `adminServiceConstants.js`: `GAMIFICATION_CONSTANTS` for point awarding.

## Dependencies
- **Models**: `Driver`, `Ride`, `DriverAvailability`, `DriverSafetyIncident`.
- **Services**: `notificationService`, `socketService`, `auditService`, `pointService` (injected via controller).
- **Utilities**: `logger`, `AppError`, `formatMessage`, `sequelize.Op`.

## Error Handling
- Uses `AppError` for structured errors with status codes and error codes from constants.
- Logs errors using `logger.logErrorEvent`.
- Errors are propagated to the controller for HTTP response formatting.

## Security and Permissions
- Permission checks are enforced via `checkDriverManagementPermission` middleware.
- Assumes authentication is handled by a higher-level middleware.
- Uses `adminCoreConstants.ADMIN_PERMISSIONS` to validate `manageUsers:write`.

## Future Enhancements
- Add real-time availability updates via WebSocket.
- Implement persistent storage for training certifications.
- Enhance safety incident reporting with automated escalation workflows.

## Last Updated
June 22, 2025