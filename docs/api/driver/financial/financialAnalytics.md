# Driver Financial Analytics Service Documentation

This document details the Driver Financial Analytics Service and its complementary files for the `MMFinale` project, located under `C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0`. The service provides financial analytics for drivers, including earnings trends, financial summaries, goal recommendations, and peer comparisons. It integrates with models, constants, and common services, with automatic point awarding for gamification.

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
The Driver Financial Analytics Service (`financialAnalyticsService.js`) enables drivers to analyze their financial performance through earnings trends, summaries, goal recommendations, and peer comparisons. It uses Sequelize for database operations and integrates with common services for auditing, notifications, sockets, and point awarding. Points are awarded dynamically for driver-initiated actions using configurations from `driverGamificationConstants.js`.

## File Structure
- **Service**: `src\services\driver\financial\financialAnalyticsService.js`
- **Controller**: `src\controllers\driver\financial\financialAnalyticsController.js`
- **Validator**: `src\validators\driver\financial\financialAnalyticsValidator.js`
- **Middleware**: `src\middleware\driver\financial\financialAnalyticsMiddleware.js`
- **Routes**: `src\routes\driver\financial\financialAnalyticsRoutes.js`
- **Socket Events**: `socket\events\driver\financial\financialEvents.js`
- **Socket Handler**: `socket\handlers\driver\financial\financialAnalyticsHandler.js`
- **Localization**: `locales\driver\financial\en.json`
- **Constants**:
  - `src\constants\driver\driverConstants.js`
  - `src\constants\driver\driverGamificationConstants.js`
  - `src\constants\common\paymentConstants.js`

## Service Details
**File**: `financialAnalyticsService.js`

**Functionality**:
- **getEarningsTrends**: Analyzes earnings patterns for a specified period (daily, weekly, monthly, yearly). Awards 10 points for `earnings_trends_access`.
- **getFinancialSummary**: Provides a financial overview including total earnings, payouts, and taxes. Awards 5 points for `financial_summary_access` (once per day).
- **recommendFinancialGoals**: Suggests financial goals based on recent earnings, recommending a 20% increase. Awards 15 points for `financial_goals_access`.
- **compareFinancialPerformance**: Compares driver's earnings with peers (city or country). Awards 15 points for `financial_comparison_access`.

**Point Awarding**:
- Points are awarded dynamically within each function function using `pointService.awardPoints`, integrated into database transactions.
- Actions and points (from `driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS`):
  - `earnings_trends_access`: 10 points, points, 0.20 wallet credit
  - `financial_summary_access`: 5 points, points, 0.10 wallet credit (once per day)
  - `financial_goals_access`: 15 points, points, 0.30 wallet credit
- - `financial_comparison_access`: 15 points, points, 0.30 wallet credit

**Models Used**:
- `Driver`, `WalletTransaction`, `FinancialSummary`, `Wallet`

**Dependencies**:
- `sequelize`, `AppError`, `logger`, `localization`, `driverConstants`, `paymentConstants`, `driverGamificationConstants`

## Endpoints
### 1. GET / /driver/financial/earnings-trends
- **Description**: Retrieves driver earnings trends.
- **Auth**: Bearer token (handled by the main route index).
- **Parameters**:
  - `period`: `daily`, `weekly`, `monthly`, or `yearly` (query parameter).
- **Response**:
  - 200: Array of objects with `date` and `amount`.
  - 400: Invalid period.
  - 404: Driver or wallet not found.
    - 500: Server error.
- **Points**: Awards 10 points for `earnings_trends_access`.

### 2. GET / / / / /summary
- **Description**: Retrieves driver financial summary.
- **Auth**: Bearer token.
  - **Response**:
    - 200: Object with `driverId`, `totalEarnings`, `totalPayouts`, `totalTaxes`, `currency`, `period`.
  - 404: Driver or wallet not found.
    - 500: Server error.
- **Points**: Awards 5 points for `financial_summary_access` (once per day).

### 3. GET / / / / / / /
- **Description**: Retrieves recommended financial goals.
  - **Auth**: Bearer token.
    - **Response**:
      - 200: Object with `driverId`, `monthlyEarningsGoal`, `currency`, and `recommendation`.
    - 404: Driver or wallet not found.
    - 500: Server error.
  - **Points**: Awards 15 points for `financial_goals_access`.

### 4. GET / / / / /
/ **Description**: Compares driver financial performance with peers.
- **Auth**: Bearer token.
  - **Parameters**:
    - `- `peers`: `city` or `country` (query parameter).
  - **Response**:
    - 200: Object with `driverId`, `driverEarnings`, `peerAverageEarnings`, `peerGroup`, `currency`, `performance`.
    - 400: Invalid peer group.
      - 404: Driver or wallet not found.
      - 500: Server error.
    - **Points**: Awards 15 points for `financial_comparison_access`.

---

## Complementary Files
### Controller (`financialAnalyticsController.js`)
- Imports common services (`auditService`, `notificationService`, `socketService`, `pointService`).
- Handles HTTP requests, passes services to the service layer, and formats responses using `sendResponse`.
- Uses `catchAsync` for error handling.

### Validator (`financialAnalyticsValidator.js`)
- Uses Joi to validate request inputs.
- Validates `driverId`, `period` against `paymentConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS`, and `peers` as `city` or `country`.

### Middleware (`financialAnalyticsMiddleware.js`)
- Validates requests using schemas from the validator file.
- Throws `AppError` on validation failure.

### Routes (`financialAnalyticsRoutes.js`)
- Defines Express routes with Swagger documentation.
- Applies validation middleware before controllers.
- Handles query parameters (`period`, `peers`).
- Assumes auth middleware is applied in in the the main route index.

### Socket Events (`financialEvents.js`)
- Defines socket event names in the `financial:` namespace:
  - `financial:trends_retrieved`
  - `financial:summary_retrieved`
- - `financial:goals_recommended`
- - `financial:comparison_retrieved`

### Socket Handler (`financialAnalyticsHandler.js`)
- Handles socket events using `catchAsyncSocket`.
- Re-emits events to the client for real-time updates.

### Localization (`en.json`)
- Located at `locales\driver\financial\en.json`.
- Provides English translations for user-facing messages in the `financial` namespace.
- Supports placeholders for `period`, `goal`, and `peers`.
- Covers earnings trends, financial summary, goals, and performance comparison messages.

### Constants
- **driverConstants.js**: Defines `ERROR_CODES` and `DRIVER_SETTINGS` for error handling and default language.
- **driverGamificationConstants.js**: Defines `GAMIFICATION_CONSTANTS` with `DRIVER_ACTIONS` for point awarding.
- **paymentConstants.js**: Defines `WALLET_SETTINGS`, `TRANSACTION_TYPES`, `ANALYTICS_CONSTANTS`, `NOTIFICATION_CONSTANTS`, and `ERROR_CODES`.

## Dependencies
- **External Libraries**: `sequelize`, `joi`, `express`
- **Utilities**: `AppError`, `logger`, `localization`, `responseHandler`, `catchAsync`, `catchAsyncSocket`, `security`
- **Constants**: `driverConstants`, `driverGamificationConstants`, `paymentConstants`
- **Services**: `auditService`, `notificationService`, `socketService`, `pointService`
- **Models**: `Driver`, `Wallet`, `WalletTransaction`, `FinancialSummary`

## Notes
- **Authentication**: Assumed to be handled by main route index middleware.
- **Point Awarding**: Integrated dynamically within each function using `pointService` within transactions. `financial_summary_access` points are limited to once per day.
- **Localization**: Uses `formatMessage` with `locales/driver/financial/en.json` for translations.
- **Error Handling**: Uses `AppError` with `driverConstants.ERROR_CODES` and `paymentConstants.ERROR_CODES`.
- **Transactions**: Sequelize transactions ensure data consistency.
- **Socket Events**: Provide real-time updates for financial analytics events.
- **Scalability**: Optimized for multiple drivers with efficient queries.
- **Constants**:
  - `paymentConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS`: Defines valid periods (`daily`, `weekly`, `monthly`, `yearly`).
  - `paymentConstants.WALLET_SETTINGS.WALLET_TYPES`: Includes `DRIVER`.
  - `paymentConstants.TRANSACTION_TYPES`: Includes `EARNING`.
  - `driverGamificationConstants.DRIVER_ACTIONS`: Defines actions and points.

This documentation provides a comprehensive overview of the Driver Financial Analytics Service and its integration with the MMFinale backend system.