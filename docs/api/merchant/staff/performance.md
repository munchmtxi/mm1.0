# Staff Performance Service Documentation

## Overview
The Staff Performance Service manages staff performance metrics, reports, and training distribution for the Munch merchant service. It integrates with Socket.IO for real-time updates and includes automatic point awarding for user actions, aligned with the global operations and inclusivity features defined in `staffConstants.js`.

## File Structure
- **Service**: `src/services/merchant/staff/performanceService.js`
- **Controller**: `src/controllers/merchant/staff/performanceController.js`
- **Validator**: `src/validators/merchant/staff/performanceValidator.js`
- **Middleware**: `src/middleware/merchant/staff/performanceMiddleware.js`
- **Routes**: `src/routes/merchant/staff/performanceRoutes.js`
- **Socket Events**: `socket/events/merchant/staff/performanceEvents.js`
- **Socket Handler**: `socket/handlers/merchant/staff/performanceHandler.js`
- **Localization**: `locales/merchant/staff/en.json`

## Service Details
The service handles three main functionalities:
1. **Monitor Metrics**: Tracks staff performance metrics (e.g., task completion rate, customer satisfaction).
2. **Generate Performance Reports**: Creates reports based on performance metrics for specified periods and formats.
3. **Distribute Training**: Assigns training materials to staff members.

### Point Awarding
Points are automatically awarded using the `pointService`:
- Metric recorded: 10 points (uses `task_completion` from `STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`)
- Report generated: 10 points (uses `task_completion`)
- Training assigned: 10 points (uses `task_completion`)

## Endpoints

### 1. Monitor Metrics
- **Endpoint**: `POST /api/merchant/staff/performance/:staffId/metrics`
- **Description**: Records a performance metric for a staff member
- **Parameters**:
  - `staffId` (path): Integer ID of the staff member
- **Body**:
  - `metricType` (string): Enum [task_completion_rate, prep_time, customer_satisfaction, inventory_accuracy, checkout_speed, delivery_performance]
  - `value` (number): Metric value
- **Responses**:
  - 200: Metric recorded successfully
  - 400: Invalid request
- **Socket Event**: `staff:metricMonitored`
- **Points**: 10

### 2. Generate Performance Reports
- **Endpoint**: `POST /api/merchant/staff/performance/:staffId/reports`
- **Description**: Generates a performance report for a staff member
- **Parameters**:
  - `staffId` (path): Integer ID of the staff member
- **Body**:
  - `period` (string): Enum [weekly, monthly, yearly]
  - `format` (string): Enum [pdf, csv, json]
- **Responses**:
  - 200: Report generated successfully
  - 400: Invalid request
- **Socket Event**: `staff:performanceReport`
- **Points**: 10

### 3. Distribute Training
- **Endpoint**: `POST /api/merchant/staff/performance/:staffId/training`
- **Description**: Distributes training materials to a staff member
- **Parameters**:
  - `staffId` (path): Integer ID of the staff member
- **Body**:
  - `category` (string): Enum [customer_service, food_safety, financial, operational, driver_training]
  - `content` (string): Training content
- **Responses**:
  - 200: Training distributed successfully
  - 400: Invalid request
- **Socket Event**: `staff:trainingDistributed`
- **Points**: 10

## Dependencies
- **Models**: Staff, Merchant, User, PerformanceMetric, Training
- **Services**: auditService, socketService, notificationService, pointService
- **Utilities**: logger, localization
- **Constants**: staffConstants

## Socket Events
Defined in `performanceEvents.js`:
- `staff:metricMonitored`
- `staff:performanceReport`
- `staff:trainingDistributed`

## Error Handling
All functions include error handling with error messages from `staffConstants.STAFF_ERROR_CODES` and localized in `en.json`. Fallback error messages are used if constants are unavailable.

## Localization
All user-facing messages are localized using the `formatMessage` utility, with translations stored in `en.json`. Supported languages include those defined in `staffConstants.STAFF_SETTINGS.SUPPORTED_LANGUAGES`.

## Security
- Authentication is handled by main route middleware.
- Input validation uses express-validator with error codes from `staffConstants.STAFF_ERROR_CODES`.
- Audit logging tracks all actions using `staffConstants.STAFF_AUDIT_ACTIONS`.
- Socket events are namespaced to prevent unauthorized access.
- Permissions are aligned with `staffConstants.STAFF_PERMISSIONS` for roles like `manager`.

## Global Operations
The service supports global operations in regions defined in `staffConstants.STAFF_SETTINGS.SUPPORTED_CITIES` (e.g., Malawi, Tanzania, Kenya, India, Brazil) and uses `STAFF_SETTINGS.SUPPORTED_LANGUAGES` for localization.

## Notes
- Point awarding uses the `task_completion` action from `STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS` as a fallback (10 points) due to the absence of specific performance-related actions.
- The service is compatible with merchant types defined in `staffConstants.STAFF_ROLES` (e.g., restaurant, cafe, grocery).