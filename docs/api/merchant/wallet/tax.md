# Merchant Tax API Documentation

This document outlines the Merchant Tax API, which manages tax calculations, reporting, settings, and compliance for merchants in the Munch merchant service. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/merchant/wallet/taxService.js`
- **Controller**: `src/controllers/merchant/wallet/taxController.js`
- **Validator**: `src/validators/merchant/wallet/taxValidator.js`
- **Middleware**: `src/middleware/merchant/wallet/taxMiddleware.js`
- **Routes**: `src/routes/merchant/wallet/taxRoutes.js`
- **Events**: `socket/events/merchant/wallet/taxEvents.js`
- **Handler**: `socket/handlers/merchant/wallet/taxHandler.js`
- **Localization**: `locales/merchant/wallet/en.json` (shared with wallet module)

## Service: `taxService.js`

The service layer handles core tax operations, interacting with Sequelize models (`Wallet`, `WalletTransaction`, `Merchant`, `Order`, `Address`) and constants (`taxConstants`, `merchantConstants`). It includes:

- **calculateTax(merchantId, period)**: Calculates tax obligations based on paid orders within the specified period (monthly, quarterly, yearly), using country-specific tax rates.
- **generateTaxReport(merchantId, period)**: Generates a detailed tax report, including taxable income, tax obligation, and transaction/order counts.
- **updateTaxSettings(merchantId, settings)**: Updates merchant tax settings (taxId, exemptions, filingFrequency), ensuring valid filing frequencies.
- **ensureTaxCompliance(merchantId)**: Verifies compliance with country-specific tax regulations, checking for tax ID and filing frequency.

The service uses Sequelize’s `Op` for date filtering and logs errors using a logger utility.

## Controller: `taxController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Calculate Tax**: 10 points
- **Generate Tax Report**: 15 points
- **Update Tax Settings**: 5 points
- **Ensure Tax Compliance**: 10 points (if compliant)

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the merchant’s preferred language.

## Validator: `taxValidator.js`

Uses Joi to validate request inputs:

- **calculateTaxSchema**: Requires `merchantId` (integer, positive), `period` (valid: monthly, quarterly, yearly).
- **generateTaxReportSchema**: Same as `calculateTaxSchema`.
- **updateTaxSettingsSchema**: Requires `merchantId` (integer, positive), `settings` (object with optional `taxId`, `exemptions`, `filingFrequency`).
- **ensureTaxComplianceSchema**: Requires `merchantId` (integer, positive).

## Middleware: `taxMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `taxRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /merchant/wallet/tax/calculate**: Calculates tax obligations.
- **POST /merchant/wallet/tax/report**: Generates a tax report.
- **POST /merchant/wallet/tax/settings**: Updates tax settings.
- **POST /merchant/wallet/tax/compliance**: Verifies tax compliance.

## Events: `taxEvents.js`

Defines socket event names in a namespaced format:

- `merchant:tax:calculated`
- `merchant:tax:reportGenerated`
- `merchant:tax:settingsUpdated`
- `merchant:tax:complianceChecked`

## Handler: `taxHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains English translations for user-facing messages, shared with the wallet module:

- `tax.calculated`: Tax calculation confirmation.
- `tax.report_generated`: Tax report generation confirmation.
- `tax.settings_updated`: Tax settings update confirmation.
- `tax.compliance_verified`: Compliance verification confirmation.
- `tax.compliance_issue`: Compliance issue notification.

## Endpoints

### POST /merchant/wallet/tax/calculate
- **Description**: Calculates tax obligations for a merchant.
- **Request Body**:
  - `merchantId` (integer, required): Merchant ID.
  - `period` (string, required): Time period (monthly, quarterly, yearly).
- **Responses**:
  - **200**: `{ success: true, message: "Tax obligation of {amount} {currency} calculated for {period} period", data: { taxableIncome, taxObligation, taxRate, period, currency, country } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `merchant:tax:calculated`, sends notification.

### POST /merchant/wallet/tax/report
- **Description**: Generates a tax report for a merchant.
- **Request Body**:
  - `merchantId` (integer, required): Merchant ID.
  - `period` (string, required): Time period (monthly, quarterly, yearly).
- **Responses**:
  - **200**: `{ success: true, message: "Tax report generated for {period} period with obligation of {amount} {currency}", data: { merchantId, businessName, period, country, taxRate, taxableIncome, taxObligation, transactionCount, orderCount, currency, generatedAt } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 15 points, logs action, emits `merchant:tax:reportGenerated`, sends notification.

### POST /merchant/wallet/tax/settings
- **Description**: Updates tax settings for a merchant.
- **Request Body**:
  - `merchantId` (integer, required): Merchant ID.
  - `settings` (object, required): Tax settings (`taxId`, `exemptions`, `filingFrequency`).
- **Responses**:
  - **200**: `{ success: true, message: "Tax settings updated with filing frequency {filingFrequency}", data: { id, user_id, business_name, business_type_details } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 5 points, logs action, emits `merchant:tax:settingsUpdated`, sends notification.

### POST /merchant/wallet/tax/compliance
- **Description**: Verifies tax regulation compliance for a merchant.
- **Request Body**:
  - `merchantId` (integer, required): Merchant ID.
- **Responses**:
  - **200**: `{ success: true, message: "Tax compliance verified for {country}" or "Tax compliance issues detected for {country}", data: { isCompliant, complianceChecks } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points if compliant, logs action, emits `merchant:tax:complianceChecked`, sends notification if non-compliant.

## Notes

- Authentication is handled at the main route index, as specified.
- The `sequelize` instance is assumed to be globally available for database operations.
- The `io` Socket.IO instance is accessed via `req.app.get('io')` in the controller.
- Point awarding is dynamic, occurs after successful operations, and has no dedicated endpoints.
- All user-facing messages are localized using the merchant’s preferred language.
- The `en.json` file is shared with the wallet module, extended to include tax-related messages.