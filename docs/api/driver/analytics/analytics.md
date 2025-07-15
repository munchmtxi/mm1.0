markdown

Collapse

Unwrap

Copy
# Driver Analytics Service Documentation

This document details the Driver Analytics Service and its complementary files for the `MMFinale` project, located under `C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0`. The service provides analytics and performance insights for drivers, including metrics, reports, recommendations, and peer comparisons. It integrates with models, constants, and common services, with automatic point awarding for gamification.

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
The Driver Analytics Service (`analyticsService.js`) provides drivers with performance metrics, analytics reports, personalized recommendations, and peer performance comparisons. It uses Sequelize for database operations, Moment.js for date handling, and Math.js for calculations. Points are awarded automatically using the `pointService` for specific actions, enhancing gamification without dedicated point endpoints.

## File Structure
- **Service**: `src\services\driver\analytics\analyticsService.js`
- **Controller**: `src\controllers\driver\analytics\analyticsController.js`
- **Validator**: `src\validators\driver\analytics\analyticsValidator.js`
- **Middleware**: `src\middleware\driver\analytics\analyticsMiddleware.js`
- **Routes**: `src\routes\driver\analytics\analyticsRoutes.js`
- **Socket Events**: `socket\events\driver\analytics\events.js`
- **Socket Handler**: `socket\handlers\driver\analytics\handler.js`
- **Localization**: `locales\driver\analytics\en.json`
- **Constants**: `src\constants\driver\driverConstants.js`

## Service Details
**File**: `analyticsService.js`

**Functionality**:
- **getPerformanceMetrics**: Retrieves metrics (ride/delivery completion rates, average rating, earnings, active hours) for the past 30 days. Stores metrics in `DriverPerformanceMetric` and awards 10 points for `analytics_access`.
- **generateAnalyticsReport**: Generates a report for a specified period (daily, weekly, monthly, yearly) with financial and operational data. Awards 20 points for `report_generation`.
- **getRecommendations**: Provides personalized recommendations based on performance metrics. Awards 15 points for `recommendations_access`.
- **comparePerformance**: Compares a driver's performance with up to 10 peers over the past 30 days. Awards 15 points for `performance_comparison`.

**Point Awarding**:
- Points are awarded automatically within each function using `pointService.awardPoints`, integrated into the database transaction for consistency.
- Actions and points:
  - `analytics_access`: 10 points
  - `report_generation`: 20 points
  - `recommendations_access`: 15 points
  - `performance_comparison`: 15 points

**Models Used**:
- `Driver`, `Ride`, `Order`, `DriverRatings`, `DriverEarnings`, `FinancialSummary`, `DriverAvailability`, `DriverPerformanceMetric`

**Dependencies**:
- `sequelize`, `moment`, `mathjs`, `AppError`, `logger`, `localization`, `driverConstants`

## Endpoints
### 1. GET /driver/analytics/performance-metrics
- **Description**: Retrieves driver performance metrics.
- **Auth**: Bearer token (handled by main route index).
- **Response**:
  - 200: Metrics object with completion rates, ratings, earnings, and active hours.
  - 400: Invalid request.
  - 404: Driver not found.
  - 500: Server error.
- **Points**: Awards 10 points for `analytics_access`.

### 2. POST /driver/analytics/report
- **Description**: Generates an analytics report for a specified period.
- **Auth**: Bearer token.
- **Request Body**:
  - `period`: String (daily, weekly, monthly, yearly).
- **Response**:
  - 200: Report with financial and operational data.
  - 400: Invalid period.
  - 404: Driver not found.
  - 500: Server error.
- **Points**: Awards 20 points for `report_generation`.

### 3. GET /driver/analytics/recommendations
- **Description**: Retrieves personalized performance recommendations.
- **Auth**: Bearer token.
- **Response**:
  - 200: Array of recommendation strings.
  - 404: Driver not found.
  - 500: Server error.
- **Points**: Awards 15 points for `recommendations_access`.

### 4. POST /driver/analytics/compare-performance
- **Description**: Compares driver performance with peers.
- **Auth**: Bearer token.
- **Request Body**:
  - `peers`: Array of driver IDs (1–10).
- **Response**:
  - 200: Comparison object with driver, peers, and average stats.
  - 400: Invalid request.
  - 404: Driver not found.
  - 500: Server error.
- **Points**: Awards 15 points for `performance_comparison`.

## Complementary Files
### Controller (`analyticsController.js`)
- Imports common services (`auditService`, `notificationService`, `socketService`, `pointService`).
- Handles HTTP requests, passes services to the service layer, and formats responses using `sendResponse`.
- Uses `catchAsync` for error handling.

### Validator (`analyticsValidator.js`)
- Uses Joi to validate request inputs.
- Ensures `driverId` is a positive integer and `period` is valid.
- Limits `peers` to 1–10 driver IDs.

### Middleware (`analyticsMiddleware.js`)
- Validates requests using schemas from the validator file.
- Throws `AppError` on validation failure.

### Routes (`analyticsRoutes.js`)
- Defines Express routes with Swagger documentation.
- Applies validation middleware before controllers.
- Assumes auth middleware is applied in the main route index.

### Socket Events (`events.js`)
- Defines socket event names in the `analytics:` namespace:
  - `analytics:metrics_updated`
  - `analytics:report_generated`
  - `analytics:recommendations_updated`
  - `analytics:performance_comparison`

### Socket Handler (`handler.js`)
- Handles socket events using `catchAsyncSocket`.
- Re-emits events to the client for real-time updates.

### Localization (`en.json`)
- Provides English translations for user-facing messages.
- Supports placeholders for `period` and `count`.
- Covers metrics retrieval, report generation, and recommendations.

## Dependencies
- **External Libraries**: `sequelize`, `moment`, `mathjs`, `joi`, `express`
- **Utilities**: `AppError`, `logger`, `localization`, `responseHandler`, `catchAsync`, `catchAsyncSocket`, `security`
- **Constants**: `driverConstants`
- **Services**: `auditService`, `notificationService`, `socketService`, `pointService`
- **Models**: `Driver`, `Ride`, `Order`, `DriverRatings`, `DriverEarnings`, `FinancialSummary`, `DriverAvailability`, `DriverPerformanceMetric`

## Notes
- **Authentication**: Assumed to be handled by main route index middleware.
- **Point Awarding**: Integrated dynamically within service functions, using `pointService` within transactions.
- **Localization**: Uses `formatMessage` with `en.json` for user-facing messages.
- **Error Handling**: Uses `AppError` for standardized errors with `driverConstants.ERROR_CODES`.
- **Transactions**: Sequelize transactions ensure data consistency.
- **Socket Events**: Provide real-time updates for metrics, reports, recommendations, and comparisons.
- **Scalability**: Designed to handle multiple drivers with caching and efficient queries.
- **Constants**: `driverConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS` and `RECOMMENDATION_THRESHOLDS` configure periods and thresholds.

This documentation provides a comprehensive overview of the Driver Analytics Service and its integration with the MMFinale backend system.
Notes:

Provides a detailed overview of the service and all complementary files.
Covers all endpoints with their functionality, request/response formats, and point awarding.
References file locations and dependencies accurately.
Explains automatic point awarding and localization usage.