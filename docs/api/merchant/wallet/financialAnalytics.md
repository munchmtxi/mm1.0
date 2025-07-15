# Merchant Financial Analytics API Documentation

This document outlines the Merchant Financial Analytics API, which manages financial transaction tracking, reporting, trend analysis, and goal recommendations for merchants in the Munch merchant service. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/merchant/wallet/financialAnalyticsService.js`
- **Controller**: `src/controllers/merchant/wallet/financialAnalyticsController.js`
- **Validator**: `src/validators/merchant/wallet/financialAnalyticsValidator.js`
- **Middleware**: `src/middleware/merchant/wallet/financialAnalyticsMiddleware.js`
- **Routes**: `src/routes/merchant/wallet/financialAnalyticsRoutes.js`
- **Events**: `socket/events/merchant/wallet/financialAnalyticsEvents.js`
- **Handler**: `socket/handlers/merchant/wallet/financialAnalyticsHandler.js`
- **Localization**: `locales/merchant/wallet/en.json` (shared with wallet, tax, and payout modules)

## Service: `financialAnalyticsService.js`

The service layer handles core financial analytics operations, interacting with Sequelize models (`Wallet`, `WalletTransaction`, `Merchant`, `Order`) and constants (`merchantConstants`). It includes:

- **trackFinancialTransactions(merchantId, period)**: Tracks payments and payouts for a merchant over a specified period (daily, weekly, monthly).
- **generateFinancialReport(merchantId, period)**: Generates a financial report with revenue, payouts, and order/payout counts for a specified period.
- **analyzeFinancialTrends(merchantId)**: Analyzes six-month financial trends, providing monthly revenue and payout data.
- **recommendFinancialGoals(merchantId)**: Recommends revenue targets based on three-month average revenue, with growth suggestions.

The service uses Sequelize’s `Op` for date filtering and logs errors using a logger utility.

## Controller: `financialAnalyticsController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Track Financial Transactions**: 10 points
- **Generate Financial Report**: 15 points
- **Analyze Financial Trends**: 20 points
- **Recommend Financial Goals**: 15 points

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the merchant’s preferred language.

## Validator: `financialAnalyticsValidator.js`

Uses Joi to validate request inputs:

- **trackFinancialTransactionsSchema**: Requires `merchantId` (integer, positive), `period` (valid: daily, weekly, monthly).
- **generateFinancialReportSchema**: Same as `trackFinancialTransactionsSchema`.
- **analyzeFinancialTrendsSchema**: Requires `merchantId` (integer, positive).
- **recommendFinancialGoalsSchema**: Requires `merchantId` (integer, positive).

## Middleware: `financialAnalyticsMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `financialAnalyticsRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /merchant/wallet/analytics/track**: Tracks financial transactions.
- **POST /merchant/wallet/analytics/report**: Generates a financial report.
- **POST /merchant/wallet/analytics/trends**: Analyzes financial trends.
- **POST /merchant/wallet/analytics/goals**: Recommends financial goals.

## Events: `financialAnalyticsEvents.js`

Defines socket event names in a namespaced format:

- `merchant:analytics:transactionsTracked`
- `merchant:analytics:reportGenerated`
- `merchant:analytics:trendsAnalyzed`
- `merchant:analytics:goalsRecommended`

## Handler: `financialAnalyticsHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains English translations for user-facing messages, shared with the wallet, tax, and payout modules:

- `analytics.transactions_tracked`: Transaction tracking confirmation.
- `analytics.report_generated`: Financial report generation confirmation.
- `analytics.trends_analyzed`: Trend analysis confirmation.
- `analytics.goals_recommended`: Financial goals recommendation confirmation.

## Endpoints

### POST /merchant/wallet/analytics/track
- **Description**: Tracks financial transactions for a merchant.
- **Request Body**:
  - `merchantId` (integer, required): Merchant ID.
  - `period` (string, required): Time period (daily, weekly, monthly).
- **Responses**:
  - **200**: `{ success: true, message: "Tracked {count} transactions for {period} period", data: { payments, payouts, transactionCount } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `merchant:analytics:transactionsTracked`.

### POST /merchant/wallet/analytics/report
- **Description**: Generates a financial report for a merchant.
- **Request Body**:
  - `merchantId` (integer, required): Merchant ID.
  - `period` (string, required): Time period (daily, weekly, monthly).
- **Responses**:
  - **200**: `{ success: true, message: "Financial report generated for {period} period with revenue of {revenue} {currency}", data: { revenue, payouts, orderCount, payoutCount, period, currency } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 15 points, logs action, emits `merchant:analytics:reportGenerated`, sends notification.

### POST /merchant/wallet/analytics/trends
- **Description**: Analyzes financial trends for a merchant.
- **Request Body**:
  - `merchantId` (integer, required): Merchant ID.
- **Responses**:
  - **200**: `{ success: true, message: "Financial trends analyzed with average revenue of {averageRevenue}", data: { revenueTrend, payoutTrend, averageRevenue, averagePayouts } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 20 points, logs action, emits `merchant:analytics:trendsAnalyzed`.

### POST /merchant/wallet/analytics/goals
- **Description**: Recommends financial goals for a merchant.
- **Request Body**:
  - `merchantId` (integer, required): Merchant ID.
- **Responses**:
  - **200**: `{ success: true, message: "Financial goals recommended with monthly target of {monthlyTarget} {currency}", data: { monthlyRevenueTarget, quarterlyRevenueTarget, suggestions } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 15 points, logs action, emits `merchant:analytics:goalsRecommended`, sends notification.

## Notes

- Authentication is handled at the main route index, as specified.
- The `sequelize` instance is assumed to be globally available for database operations.
- The `io` Socket.IO instance is accessed via `req.app.get('io')` in the controller.
- Point awarding is dynamic, occurs after successful operations, and has no dedicated endpoints.
- All user-facing messages are localized using the merchant’s preferred language.
- The `en.json` file is shared with the wallet, tax, and payout modules, extended to include analytics-related messages.