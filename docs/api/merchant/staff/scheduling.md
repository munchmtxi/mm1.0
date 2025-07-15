# Staff Scheduling Service Documentation

## Overview

The Staff Scheduling Service manages staff scheduling, time tracking, shift notifications, and schedule adjustments for the Munch merchant service. It integrates with Socket.IO for real-time messaging and includes automatic point awarding for user actions, aligned with global operations and inclusivity features defined in `staffConstants.js`.

## File Structure

- **Service**: `src\services/merchant\staff/schedulingService.js`
- **Controller**: `src\controllers/merchant\staff/schedulingController.js`
- **Validator**: `src\validators/merchant\staff/schedulingValidator.js`
- **Middleware**: `middleware\merchant\staff\schedulingMiddleware.js`
- **Routes**: `src\routes/merchant\staff/schedulingRoutes.js`
- **Socket Events**: `socket\events/merchant\staff/schedulingEvents.js`
- **Socket Handler**: `socket\handlers/merchant\staff\schedulingHandler.js`
- **Localization**: `locales\merchant\staff\en.json`

## Service Details

The service handles four main functionalities:
1. **Create Schedule**: Creates a new shift for a staff member at a specific branch.
2. **Track Time**: Records clock-in or clock-out times and updates staff availability.
3. **Notify Schedule**: Sends shift reminders to staff members.
4. **Adjust Schedule**: Modifies existing shift details (e.g., time, type, status).

### Point Awarding

Points are automatically awarded using the `pointService`:
- Schedule creation: 10 points (uses `task_completion` from `STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`)
- Time tracking: 10 points (uses `task_completion`)
- Shift reminder: 10 points (uses `task_completion`)
- Schedule adjustment: 10 points (uses `task_completion`)

## Endpoints

### 1. Create Schedule

- **Endpoint**: `POST /api/merchant/staff/scheduling/:restaurantId/create`
- **Description**: Creates a new staff schedule
- **Parameters**:
  - `restaurantId` (path): Integer ID of the restaurant branch
- **Body**:
  - `staffId` (integer): ID of the staff member
  - `startTime` (string): ISO8601 date-time for shift start
  - `endTime`: (string): ISO8601 date-time for shift end
  - `shiftType` (string): Enum [morning, afternoon, evening, night]
- **Responses**:
  - 200: Schedule created successfully
  - 400: Invalid request
- **Socket Event**: `staff:scheduleCreated`
- **Points**: 10

### 2. Track Time

- **Endpoint**: `POST /api/merchant/staff/scheduling/:staffId/track`
- **Description**: Records clock-in or clock-out time
- **Parameters**:
  - `staffId` (path): Integer ID of the staff member
- **Body**:
  - `shiftId` (integer): ID of the shift
  - `clockIn` (string, optional): Clock-in time (ISO8601)
  - `clockOut` (string, optional): Clock-out time (ISO8601)
- **Responses**:
  - 200: Time tracked successfully
  - 400: Invalid request
- **Socket Event**: `staff:timeTracked`
- **Points**: 10

### 3. Notify Schedule

- **Endpoint**: `POST /api/merchant/staff/scheduling/:staffId/notify/:shiftId`
- **Description**: Sends a shift reminder
- **Parameters**:
  - `staffId` (path): Integer ID of the staff member
  - `shiftId` (path): Integer ID of the shift
- **Responses**:
  - 200: Shift reminder sent successfully
  - 400: Invalid request
- **Socket Event**: `staff:scheduleNotified`
- **Points**: 10

### 4. Adjust Schedule

- **Endpoint**: `PATCH /api/merchant/staff/scheduling/:scheduleId/adjust`
- **Parameters**:
  - `scheduleId` (path): Integer ID of the shift
- **Body**:
  - `startTime` (string, optional): ISO8601 date-time for shift start
  - `endTime`: (string, optional): ISO8601 date-time for shift end
    - `shiftType`: (string, optional): Enum [morning, afternoon, evening, night]
  - `status` (string, optional): Enum [scheduled, active, completed, cancelled]
- **Description**: Modifies an existing shift
- **Responses**:
  - 200: Schedule adjusted successfully
  - 400: Invalid request
- **Socket Event**: `staff:scheduleAdjusted`
- **Points**: 10

## Dependencies

- **Models**: Staff, Merchant, User, Shift, TimeTracking
- **Services**: auditService, socketService, notificationService, pointService
- **Utilities**: logger, localization
- **Constants**: staffConstants

## Socket Events

Defined in `schedulingEvents.js`:
- `staff:scheduleCreated`
- `staff:timeTracked`
- `staff:scheduleNotified`
- `staff:scheduleAdjusted`

## Error Handling

All functions include error handling with error messages from `staffConstants.STAFF_ERROR_CODES` and localized in `en.json`. Fallback error messages are used if constants are unavailable.

## Localization

All user-facing messages are localized using the `formatMessage` utility, with translations stored in `en.json`. Supported languages include those defined in `staffConstants.STAFF_SETINGS.SUPPORTED_LANGUAGES`.

## Security

- Authentication is handled by main route middleware.
- Input validation uses express-validator with error codes from `staffConstants.STAFF_ERROR_CODES`.
- Audit logging tracks all actions using `staffConstants.STAFF_AUDIT_ACTIONS`.
- Socket events are namespaced to prevent unauthorized access.
- Permissions are aligned with `staffConstants.STAFF_PERMISSIONS` for roles like `manager`.

## Global Operations

The service supports global operations in regions defined in `staffConstants.STAFF_SETTINGS.SUPPORTED_CITIES` (e.g., Malawi, Tanzania, Kenya, India, Brazil) and uses `STAFF_SETINGS.SUPPORTED_LANGUAGES` for localization.

## Notes

- Point awarding uses the `task_completion` action from `STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS` as a fallback (10 points) due to the absence of specific scheduling-specific actions.
- The service is compatible with merchant types defined in `staffConstants.STAFF_ROLES` (e.g., restaurant, cafe, grocery).
- Shift types are validated against `staffConstants.STAFF_SHIFT_TYPES.SHIFTINGS`.