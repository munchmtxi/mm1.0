# Driver Tax Service Documentation

This document details the Driver Tax Service and its complementary files for the `MMFinale` project, located under `C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0`. The service manages driver tax operations, including calculating taxes, generating reports, updating settings, and exporting data. It integrates with models, constants, and common services, with automatic point awarding for gamification.

**Last Updated**: June 11, 2025

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
The Driver Tax Service (`taxService.js`) enables drivers to calculate tax obligations, generate tax reports, update tax settings, and export tax data. It uses Sequelize for database operations and integrates with common services for auditing, notifications, sockets, and point awarding. Points are awarded dynamically for driver-initiated actions using configurations from `driverGamificationConstants.js`.

## File Structure
- **Service**: `src\services\driver\financial\taxService.js`
- **Controller**: `src\controllers\driver\financial\taxController.js`
- **Validator**: `src\validators\driver\financial\taxValidator.js`
- **Middleware**: `src\middleware\driver\financial\taxMiddleware.js`
- **Routes**: `src\routes\driver\financial\taxRoutes.js`
- **Socket Events**: `socket\events\driver\financial\taxEvents.js`
- **Socket Handler**: `socket\handlers\driver\financial\taxHandler.js`
- **Localization**: `locales\driver\financial\en.json`
- **Constants**:
  - `src\constants\driver\driverConstants.js`
  - `src\constants\driver\driverGamificationConstants.js`
  - `src\constants\common\paymentConstants.js`
  - `src\constants\taxConstants.js`

## Service Details
**File**: `taxService.js`

**Functionality**:
- **calculateTax**: Calculates tax obligations based on earnings for a specified period (monthly, quarterly, yearly). Awards 15 points for `tax_calculation_access`.
- **generateTaxReport**: Generates a tax report for a specified period, retrieving tax records. Awards 10 points for `tax_report_access` (once per day).
- **updateTaxSettings**: Updates driver tax settings, such as filing frequency and country. Awards 8 points for `tax_settings_update`.
- **exportTaxData**: Exports tax data in CSV or JSON format. Awards 5 points for `tax_data_export` (once per day).

**Point Awarding**:
- Points are awarded automatically within each driver-initiated function using `pointService.awardPoints`, integrated into database transactions.
- Actions and points (from `driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS`):
  - `tax_calculation_access`: 15 points, 0.30 wallet credit
  - `tax_report_access`: 10 points, 0.20 wallet credit (once daily)
  - `tax_settings_update`: 8 points, 0.15 wallet credit
- - `tax_data_export`: 5 points, 0.10 wallet credit (once daily)

**Models Used**:
- `Driver`, `Wallet`, `WalletTransaction`, `TaxRecord`

**Dependencies**:
- `sequelize`, `json2csv`, `AppError`, `logger`, `localization`, `driverConstants`, `paymentConstants`, `taxConstants`, `driverGamificationConstants`

## Endpoints
### 1. GET / / / / / / / / / / / / / / / **Description**: Calculates driver tax obligations.
- **Auth**: Bearer token (handled by main route index).
  - **Parameters**:
    - `period`: `monthly`, `quarterly`, or `yearly` (query parameter).
  - **Response**:
    - 200: Object with `driverId`, `period`, `taxableAmount`, `taxAmount`, `currency`.
    - 400: Invalid period.
    - 404: Driver or wallet not found.
    - 500: Server error.
  - **Points**: Awards 15 points for `tax_calculation_access`.

### 2. GET / / / / / / / / **Description**: Generates a driver tax report.
- **Auth**: Bearer token.
  - **Parameters**:
    - `- `period`: `monthly`, `quarterly`, or `yearly` (query parameter).
  - **Response**:
    - 200: Object with `driverId`, `period`, and `records` array of tax records.
    - 400: Invalid period.
    - 404: Driver not found.
    - 500: Server error.
  - **Points**: Awards 10 points for `tax_report_access` (once per day).

### 3. PATCH / / / / / / / / / / / **Description**: Updates driver tax settings.
- **Auth**: Bearer token.
  - **Request Body**:
    - `filingFrequency`: `monthly`, `quarterly`, or `none` (required).
    - `country`: Country code (e.g., `US`, `PH`, optional).
  - **Response**:
    - 200: Null data.
    - 400: Invalid filing frequency or country.
    - 404: Driver not found.
    - 500: Server error.
  - **Points**: Awards 8 points for `tax_settings_update`.

### 4. GET / / / / / / / / / / / **Description**: Exports driver tax data.
- **Auth**: Bearer token.
  - **Parameters**:
    - `- `format`: `csv` or `json` (query parameter).
  - **Response**:
    - 200: CSV or JSON data with headers for download.
    - 400: Invalid format.
      - 404: Driver not found.
      - 500: Server error.
    - **Points**: Awards 5 points for `tax_data_export` (once daily).

---

## Complementary Files
### Controller (`taxController.js`)
- Imports common services (`auditService`, `notificationService`, `socketService`, `pointService`).
- Handles HTTP requests, passes services to the service layer, and formats responses using `sendResponse` (except for `exportTaxData`, which sends raw data).
- Uses `catchAsync` for error handling.
- Sets `Content-Type` headers for `exportTaxData` to enable file downloads.

### Validator (`taxValidator.js`)
- Uses Joi to validate request inputs.
- Validates `driverId`, `period` against `taxConstants.SUPPORTED_PERIODS`, `filingFrequency` against `taxConstants.SUPPORTED_FILING_FREQUENCIES`, `country` against `taxConstants.TAX_RATES` keys, and `format` as `csv` or `json`.

### Middleware (`taxMiddleware.js`))
- Validates requests using schemas from the validator file.
- Handles query parameters (`period`, `format`) and body parameters (`filingFrequency`, `country`).
- Throws `AppError` on validation failures.

### Routes (`taxRoutes.js`)
- Defines Express routes with Swagger documentation.
- Applies validation middleware before controllers.
- Uses `patch` for `updateTaxSettings` and `get` for others, including `exportTaxData` for downloads.
- Assumes auth middleware is applied in in the main route index.

### Socket Events (`taxEvents.js`) - Defines socket event names in the `tax:` namespace:
  - `tax:calculated`
- `taxCalculator`:report_generated`
- `tax`:settings_updated`
- `tax_data_exported`

### Socket Handler (`taxHandler.js`)
- Handles socket events using `catchAsyncSocket`.
- Re-emits events to the client for real-time updates.

### Localization (`en.json`)
- Located at `locales/driver/transactions/financial/en.json`.
- Provides English translations for user-facing messages in the `financial` namespace, with a `tax` sub-namespace.
- Supports placeholders for `for`,period`, `taxAmount`, `currency`, `filingFrequency`, and `format`.
- Covers tax calculation, report generation, settings updates, and data export messages.

### Constants
- **driverConstants.js**: Defines `ERROR_CODE`S and `DRIVER_SETTINGS` for error handling and default language.
- **driverGamificationConstants.js**: Defines `GAMIFICATION_CONSTANTS` with `DRIVER_ACTIONS` for point awarding.
- **paymentConstants.js**: Includes `WALLET_CODESETTINGS` and `TRANSACTION_TYPES` for wallet and earnings types.
- **taxConstants.js**: Defines `SUPPORTED_PERIODS`, `SUPPORTED_FILING_FREQUENCIES`, `TAX_RATES`, `NOTIFICATION_TYPES`, `AUDIT_TYPES`, `EVENT_TYPES`, and `ERROR_CODES`.

---

## Dependencies
##- **External Libraries**:
  - `sequelize`, `joi`, `express`, `json`,2csv`
- **Utilities**::
  - `AppError`, `logger`, `localization`, `responseHandler`, `catchAsync`, `catchAsyncSocket`, `security`
- **Constants**:
  - `driverConstants`, `driverGamificationConstants`, `paymentConstants`, `taxConstants`
- **Services**:
  - `auditService`, `notificationService`, `socketService`, `pointService`
- **Models**:
  - `Driver`, `Wallet`, `WalletTransaction`, `TaxRecord`

## Notes
- **Authentication**: Assumed to be handled by main route index middleware.
- **Point Awarding**:
  - Integrated dynamically within each function using `pointService` within transactions.
  - `tax_report_access`, and `tax_data_export`, points are limited to once per day.
- **Localization**: Uses `formatMessage` with `locales/driver/financial/en.json` for translations in the `financial.tax` namespace.
- **Error Handling**:
  - Uses `AppError` with specific `taxConstants.ERROR_CODES` (e.g., `INVALID_PERIOD`, `TAX_CALCULATION_FAILED`).
- **Transactions**: Sequelize transactions ensure data integrity.
- **Socket Events**: Provide real-time updates for tax-related actions.
- **Scalability**: Optimized for multiple drivers with efficient queries.
- **Tax Settings**:
  - Assumes `country` is a field in the `Driver` model; no separate `TaxSettings` model was implemented.
  - Filing frequency is stored in memory for simplicity (not persisted); a real implementation might use a dedicated model.
- **Export**:
  - Uses `json2csv` for CSV formatting.
  - Returns JSON with proper indentation for readability.
- **Constants**:
  - `taxConstants.SUPPORTED_PERIODS`: Includes `monthly`, `quarterly`, `yearly`.
  - `taxConstants.TAX_RATES`: Includes `US` as default.
  - `paymentConstants.WALLET_SETTINGS.WALLET_TYPES`: Includes `DRIVER`.
  - `paymentConstants.WALLET_TYPES.EARNING`: Includes `EARNING`.
  - `driverGamificationConstants`: Defines actions and points for tax operations.

This documentation provides a comprehensive overview of the Driver Tax Service and its integration with the MMFinale backend system.