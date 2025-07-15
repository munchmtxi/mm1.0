# Staff Performance Analytics API Documentation

This document outlines the Staff Performance Analytics API, which manages performance metrics tracking, report generation, and training impact evaluation for staff in the Munch service. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/analytics/performanceService.js`
- **Controller**: `src/controllers/staff/analytics/performanceController.js`
- **Validator**: `src/validators/staff/analytics/performanceValidator.js`
- **Middleware**: `src/middleware/staff/analytics/performanceMiddleware.js`
- **Routes**: `src/routes/staff/analytics/performanceRoutes.js`
- **Events**: `socket/events/staff/analytics/performanceEvents.js`
- **Handler**: `socket/handlers/staff/analytics/performanceHandler.js`
- **Localization**: `locales/staff/analytics/en.json`

## Service: `performanceService.js`

The service layer handles core performance analytics operations, interacting with Sequelize models (`PerformanceMetric`, `Staff`, `Training`, `Report`) and constants (`staffConstants`). It includes:

- **trackPerformanceMetrics(staffId)**: Tracks prep time and customer satisfaction metrics for a staff member.
- **generatePerformanceReport(staffId)**: Generates a performance report based on recent metrics.
- **evaluateTrainingImpact(staffId)**: Evaluates the impact of completed trainings on performance metrics.

The service uses Sequelize’s `Op` for date filtering and logs errors using a logger utility.

## Controller: `performanceController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Track Performance Metrics**: 20 points (`performance_improvement`).
- **Generate Performance Report**: 10 points (`task_completion`).
- **Evaluate Training Impact**: 10 points (`task_completion`).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the staff’s preferred language.

## Validator: `performanceValidator.js`

Uses Joi to validate request inputs:

- **trackPerformanceMetricsSchema**: Requires `staffId` (integer, positive).
- **generatePerformanceReportSchema**: Requires `staffId` (integer, positive).
- **evaluateTrainingImpactSchema**: Requires `staffId` (integer, positive).

## Middleware: `performanceMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `performanceRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/analytics/track**: Tracks performance metrics.
- **POST /staff/analytics/report**: Generates a performance report.
- **POST /staff/analytics/training**: Evaluates training impact.

## Events: `performanceEvents.js`

Defines socket event names in a namespaced format:

- `staff:analytics:metrics_updated`
- `staff:analytics:report_generated`
- `staff:analytics:training_evaluated`

## Handler: `performanceHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains English translations for user-facing messages:

- `analytics.metrics_tracked`: Metrics tracking confirmation.
- `analytics.report_generated`: Report generation confirmation.
- `analytics.training_evaluated`: Training evaluation confirmation.

## Endpoints

### POST /staff/analytics/track
- **Description**: Tracks performance metrics for a staff member.
- **Request Body**:
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Tracked {count} performance metrics", data: [{ type, value, recorded_at }, ...] }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 20 points, logs action, emits `staff:analytics:metrics_updated`.

### POST /staff/analytics/report
- **Description**: Generates a performance report for a staff member.
- **Request Body**:
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Performance report {reportId} generated successfully", data: { id, report_type, data, generated_by } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:analytics:report_generated`, sends notification.

### POST /staff/analytics/training
- **Description**: Evaluates training impact for a staff member.
- **Request Body**:
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Evaluated impact of {count} completed trainings", data: { staffId, trainingsCompleted, performanceChange } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:analytics:training_evaluated`.

## Notes

- Authentication is handled at the main route index.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, occurs after successful operations, and has no dedicated endpoints.
- All user-facing messages are localized using the staff’s preferred language.
- The `en.json` file is dedicated to analytics-related messages.
- Constants from `staffConstants.js` are used for metrics, errors, gamification, and notifications.