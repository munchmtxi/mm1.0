# Staff Performance Service Documentation

## Overview
The Staff Performance Service enables merchants to monitor staff metrics, generate performance reports, and provide feedback to staff. It integrates with gamification, notification, audit, and socket services. Points are automatically awarded for analytics actions, enhancing merchant engagement through a dynamic, rule-based system.

## Methods

### monitorStaffMetrics
Tracks staff preparation speed and customer satisfaction.

- **Parameters**:
  - `staffId` (string): Staff ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `staffId`, `metrics` (avgPrepTime, avgRating, tasksCompleted), `language`, and `action`.
- **Errors**:
  - Invalid staff ID (400, `INVALID_INPUT`).
  - Staff not found (404, `STAFF_NOT_FOUND`).
- **Point Awarding**: Awards points for `staffMetricsMonitored` based on tasks completed.

### generatePerformanceReports
Creates staff performance evaluation reports.

- **Parameters**:
  - `staffId` (string): Staff ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `staffId`, `report` (staffName, branchName, totalTasks, avgRating, taskBreakdown), `language`, and `action`.
- **Errors**:
  - Invalid staff ID (400, `INVALID_INPUT`).
  - Staff not found (404, `STAFF_NOT_FOUND`).
- **Point Awarding**: Awards points for `staffReportGenerated` based on total tasks.

### provideFeedback
Shares performance feedback with staff.

- **Parameters**:
  - `staffId` (string): Staff ID.
  - `feedback` (object): Feedback details (message).
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `staffId`, `feedback` (message), `language`, and `action`.
- **Errors**:
  - Invalid staff ID or feedback (400, `INVALID_INPUT`).
  - Staff not found (404, `STAFF_NOT_FOUND`).
- **Point Awarding**: Awards points for `staffFeedbackProvided` based on feedback length.

## Point System
Points are automatically awarded for actions in `merchantConstants.ANALYTICS_CONSTANTS.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS`.
- **Contextual**:
  - `staffMetricsMonitored`: Multiplier based on tasks completed.
  - `staffReportGenerated`: Multiplier based on total tasks.
  - `staffFeedbackProvided`: Multiplier based on feedback message length.
- **Role-Based**: Merchants receive 1.2x multiplier; staff receive 1.1x multiplier.
- **Capped**: Limited to 400 points per action.
- **Automated**: Integrated into each action, no manual endpoints.

**Configuration** (`gamificationConstants.js`):
- `staffMetricsMonitored`: 30 base points, 0.01x per task completed, 1.2x for merchants, 1.1x for staff.
- `staffReportGenerated`: 40 base points, 0.02x per task, 1.2x for merchants, 1.1x for staff.
- `staffFeedbackProvided`: 25 base points, 0.05x per character in feedback, 1.2x for merchants, 1.1x for staff.

**Workflow**:
1. Merchant performs an action (e.g., monitors staff metrics).
2. Service returns action and metadata.
3. Controller calculates points using internal logic.
4. Points awarded via `gamificationService.awardPoints`.
5. Notifications and socket events inform the merchant.

## Dependencies
- **Models**: `Staff`, `Feedback`, `Order`, `InDiningOrder`, `Booking`, `MerchantBranch`, `Merchant`, `Notification`.
- **Constants**: `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `handleServiceError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration
- **Notifications**: Sent for action completion and points awarded.
- **Audits**: Logs action details and points.
- **Socket Events**: Namespaced (e.g., `merchant:analytics:staffMetricsMonitored`).
- **Gamification**: Automatic point awarding in controller.

## Error Handling
- Uses `AppError` with localized messages and `merchantConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- Common errors:
  - `INVALID_INPUT`: Invalid staff ID or feedback.
  - `STAFF_NOT_FOUND`: Staff not found.
  - `SYSTEM_ERROR`: Unexpected errors, logged.

## Usage Scenarios
- **Monitor Metrics**: Staff with 100 tasks gets 30 points (30 * 1.2).
- **Generate Report**: Staff with 75 tasks gets 30 points (25 * 1.2).
- **Provide Feedback**: Feedback with 100 characters gets 30 points (25 * 1.2).

## Security
- **Authentication**: Via `authMiddleware.authenticate`.
- **Authorization**: Restricted to merchants with `manage_analytics`.
- **Validation**: Uses `express-validator` and `merchantConstants`.
- **Audits**: Logs all actions with IP and points.

## Notes
- Transactions ensure atomicity.
- Points capped at 1000/day (`MAX_POINTS_PER_DAY`).
- Localized messages in `en.json`.
- Namespaced socket events for clarity.
- No manual point endpoints, per pattern.
- Point calculations handled in controller.
- Future services will automate point awarding similarly.
- **Note**: If a `User` model with a name field exists, update `generatePerformanceReports` to use it instead of `user_id` for `staffName`.