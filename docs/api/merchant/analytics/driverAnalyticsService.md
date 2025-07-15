# Driver Analytics Service Documentation

## Overview
The Driver Analytics Service enables merchants to monitor driver performance metrics, generate performance reports, and provide feedback to drivers. It integrates with gamification, notification, audit, and socket services. Points are automatically awarded for analytics actions, enhancing merchant and driver engagement through a dynamic, rule-based system.

## Methods

### monitorDriverMetrics
Tracks driver delivery times, ratings, and distances.

- **Parameters**:
  - `driverId` (string): Driver ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `driverId`, `metrics` (avgDeliveryTime, avgRating, totalDeliveries, totalDistance), `language`, and `action`.
- **Errors**:
  - Invalid driver ID (400, `INVALID_INPUT`).
  - Driver not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Awards points for `driverMetricsMonitored` based on total deliveries.

### generateDriverReports
Generates a performance report for a driver over three months.

- **Parameters**:
  - `driverId` (string): Driver ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `driverId`, `report` (driverName, totalDeliveries, avgRating, totalDistance, avgDeliveryTime), `language`, and `action`.
- **Errors**:
  - Invalid driver ID (400, `INVALID_INPUT`).
  - Driver not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Awards points for `driverReportGenerated` based on average rating.

### provideDriverFeedback
Sends performance feedback to a driver.

- **Parameters**:
  - `driverId` (string): Driver ID.
  - `feedback` (object): Feedback details (e.g., message).
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `driverId`, `feedback` (message), `language`, and `action`.
- **Errors**:
  - Invalid driver ID or feedback (400, `INVALID_INPUT`).
  - Driver not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Awards points for `driverFeedbackProvided` based on feedback length.

### calculateDriverAnalyticsPoints
Calculates points for a driver analytics action.

- **Parameters**:
  - `driverId` (string): Driver ID.
  - `action` (string): Analytics action (e.g., `driverMetricsMonitored`).
  - `metadata` (object, optional): Contextual data (e.g., totalDeliveries, avgRating, feedbackLength).
- **Returns**: Object with `driverId`, `points`, `language`, `action`, `metadata`, and `role`.
- **Errors**:
  - Driver not found (404, `MERCHANT_NOT_FOUND`).
  - Invalid action (400, `INVALID_INPUT`).
- **Logic**:
  - Uses `gamificationConstants.MERCHANT_ACTIONS` for configuration.
  - Applies multipliers: deliveries (metrics), rating (reports), feedback length (feedback).
  - Role-based multipliers: merchant (1.2), driver (1.1).
  - Caps points at `MAX_POINTS_PER_ACTION` (200).

## Point System
Points are automatically awarded for actions in `merchantConstants.ANALYTICS_CONSTANTS.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS`.
- **Contextual**:
  - `driverMetricsMonitored`: Multiplier based on total deliveries.
  - `driverReportGenerated`: Multiplier based on average rating.
  - `driverFeedbackProvided`: Multiplier based on feedback length.
- **Role-Based**: Merchants and drivers receive multipliers (1.2 and 1.1, respectively).
- **Capped**: Limited to 200 points per action.
- **Automated**: Integrated into each action, no manual endpoints.

**Configuration** (`gamificationConstants.js`):
- `driverMetricsMonitored`: 35 base points, 0.02x per delivery, 1.2x for merchants, 1.1x for drivers.
- `driverReportGenerated`: 45 base points, 0.2x per rating point, 1.2x for merchants, 1.1x for drivers.
- `driverFeedbackProvided`: 30 base points, 0.1x per 50 characters, 1.2x for merchants, 1.1x for drivers.

**Workflow**:
1. Merchant performs an action (e.g., monitors metrics).
2. Service returns action and metadata.
3. Controller calculates points using `calculateDriverAnalyticsPoints`.
4. Points awarded via `gamificationService.awardPoints`.
5. Notifications and socket events inform the merchant/driver.

## Dependencies
- **Models**: `Driver`, `DriverRatings`, `Order`, `Route`, `Merchant`, `Notification`.
- **Constants**: `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `handleServiceError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration
- **Notifications**: Sent for action completion and points awarded.
- **Audits**: Logs action details and points.
- **Socket Events**: Namespaced (e.g., `merchant:analytics:driverMetricsMonitored`).
- **Gamification**: Automatic point awarding.

## Error Handling
- Uses `AppError` with localized messages and `merchantConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- Common errors:
  - `INVALID_INPUT`: Invalid driver ID, feedback, or action.
  - `MERCHANT_NOT_FOUND`: Driver not found.
  - `SYSTEM_ERROR`: Unexpected errors, logged.

## Usage Scenarios
- **Monitor Metrics**: Merchant monitors driver with 100 deliveries, gets 50.4 points (35 * 2 * 1.2).
- **Generate Report**: Merchant generates report with 4.5 rating, gets 64.8 points (45 * 1.2 * 1.2).
- **Provide Feedback**: Merchant sends 100-char feedback, gets 43.2 points (30 * 1.2 * 1.2).

## Security
- **Authentication**: Via `authMiddleware.authenticate`.
- **Authorization**: Restricted to merchants with `manage_analytics`.
- **Validation**: Uses `express-validator` and `merchantConstants`.
- **Auditing**: Logs all actions with IP and points.

## Notes
- Transactions ensure atomicity.
- Points capped at 1000/day (`MAX_POINTS_PER_DAY`).
- Localized messages in `en.json`.
- Namespaced socket events for clarity.
- No manual point endpoints, per pattern.
- Future services will automate point awarding similarly.