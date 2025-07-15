Documentation File
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\staff\wallet\financialReporting.md

markdown

Collapse

Unwrap

Copy
# Financial Reporting Service Documentation

This document outlines the Financial Reporting Service for staff wallet operations, responsible for generating payment reports, summarizing wallet activity, exporting financial data, tracking tax compliance, and generating audit trails.

## Overview

The Financial Reporting Service provides tools for generating and managing financial reports for staff within restaurant branches, ensuring compliance and transparency. It uses models (`Report`, `Payment`, `WalletTransaction`, `TaxRecord`, `AuditLog`, `Staff`, `FinancialSummary`) and constants from `staffConstants.js` and `paymentConstants.js`.

### Key Features
- **Payment Reports**: Generates reports for salary and bonus payments.
- **Wallet Activity Summary**: Summarizes wallet transactions (deposits, withdrawals, rewards).
- **Data Export**: Exports financial data for audits.
- **Tax Compliance**: Tracks taxable income and tax amounts.
- **Audit Trails**: Generates logs for financial transactions.
- **Security**: Enforces MFA and encrypts exported data.

### File Structure
- **Service**: `src/services/staff/wallet/financialReportingService.js`
- **Controller**: `src/controllers/staff/wallet/financialReportingController.js`
- **Validator**: `src/validators/staff/wallet/financialReportingValidator.js`
- **Middleware**: `src/middleware/staff/wallet/financialReportingMiddleware.js`
- **Routes**: `src/routes/staff/wallet/financialReportingRoutes.js`
- **Events**: `socket/events/staff/wallet/financialReporting.events.js`
- **Handler**: `socket/handlers/staff/wallet/financialReportingHandler.js`
- **Localization**: `locales/staff/wallet/en.json`

## Endpoints

### 1. Generate Payment Report
- **Method**: `GET`
- **Path**: `/staff/reporting/payment/:staffId`
- **Description**: Generates a report summarizing salary and bonus payments for a staff member.
- **Permission**: Requires `view_financial_reports` permission (manager role).
- **Parameters**:
  - `staffId` (path): Integer, ID of the staff.
- **Responses**:
  - `201`: Report generated, returns report record.
  - `404`: Staff not found.
  - `500`: Server error.
- **Side Effects**:
  - Verifies MFA using `securityService`.
  - Logs audit action (`STAFF_PROFILE_UPDATE`).
  - Sends notification (`PAYMENT_CONFIRMATION`).
  - Emits socket event (`reporting:payment_report_generated`).

### 2. Summarize Wallet Activity
- **Method**: `GET`
- **Path**: `/staff/reporting/wallet/:staffId`
- **Description**: Summarizes wallet transactions for a staff member.
- **Permission**: Requires `view_financial_reports` permission (manager role).
- **Parameters**:
  - `staffId` (path): Integer, ID of the staff.
- **Responses**:
  - `200`: Summary retrieved, returns summary data.
  - `404`: Wallet not found.
  - `500`: Server error.
- **Side Effects**:
  - Emits socket event (`reporting:wallet_summary`).

### 3. Export Financial Data
- **Method**: `GET`
- **Path**: `/staff/reporting/export/:staffId`
- **Description**: Exports financial data for a staff member's wallet.
- **Permission**: Requires `view_financial_reports` permission (manager role).
- **Parameters**:
  - `staffId` (path): Integer, ID of the staff.
- **Responses**:
  - `200`: Data exported, returns encrypted data.
  - `404`: Wallet not found.
  - `500`: Server error.
- **Side Effects**:
  - Verifies MFA.
  - Encrypts data using `securityService`.
  - Emits socket event (`reporting:data_exported`).

### 4. Track Tax Compliance
- **Method**: `GET`
- **Path**: `/staff/reporting/taxes/:staffId`
- **Description**: Tracks tax compliance for a staff member's transactions.
- **Permission**: Requires `view_financial_reports` permission (manager role).
- **Parameters**:
  - `staffId` (path): Integer, ID of the staff.
- **Responses**:
  - `201`: Tax compliance tracked, returns tax record.
  - `404`: Wallet not found.
  - `500`: Server error.
- **Side Effects**:
  - Logs audit action (`STAFF_PROFILE_UPDATE`).
  - Emits socket event (`reporting:tax_tracked`).

### 5. Audit Financial Transactions
- **Method**: `GET`
- **Path**: `/staff/reporting/audit/:staffId`
- **Description**: Generates an audit trail for a staff member's financial transactions.
- **Permission**: Requires `view_financial_reports` permission (manager role).
- **Parameters**:
  - `staffId` (path): Integer, ID of the staff.
- **Responses**:
  - `200`: Audit trail generated, returns audit logs.
  - `404`: Staff not found.
  - `500`: Server error.
- **Side Effects**:
  - Emits socket event (`reporting:audit_trail`).

## Service Details

### Models
- **Report**: Stores report details (id, report_type, data, generated_by).
- **Payment**: Stores payment details (staff_id, amount, type, payment_method, created_at).
- **WalletTransaction**: Stores transaction records (wallet_id, type, amount, currency, status, created_at).
- **TaxRecord**: Stores tax details (staff_id, period, taxable_amount, tax_amount, currency, country).
- **AuditLog**: Stores audit records (user_id, action, details, created_at).
- **Staff**: Stores staff details (id, user_id, position, merchant_id).
- **FinancialSummary**: Stores summary data (unused in current implementation).

### Constants
- Uses `staffConstants.js` for:
  - `STAFF_ERROR_CODES`: Error codes like `STAFF_NOT_FOUND`, `PERMISSION_DENIED`.
  - `STAFF_AUDIT_ACTIONS`: Audit actions like `STAFF_PROFILE_UPDATE`.
  - `STAFF_TYPES`: Staff roles for notification and audit roles.
- Uses `paymentConstants.js` for:
  - `PAYMENT_METHODS`: Valid methods (e.g., `bank_transfer`).
  - `TRANSACTION_TYPES`: Transaction types (e.g., `salary`, `bonus`, `gamification_reward`).
  - `TRANSACTION_STATUSES`: Statuses (e.g., `completed`).
  - `NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES`: Notification types (e.g., `PAYMENT_CONFIRMATION`).
  - `ERROR_CODES`: Error codes like `TRANSACTION_FAILED`, `WALLET_NOT_FOUND`.

### Localization
- Uses `@utils/localization` for messages in `locales/staff/wallet/en.json`:
  - `reporting.payment_report_generated`: "Payment report generated with report ID {reportId}."

## Integration
- **Socket Events**: Emits events in the `/munch/reporting` namespace.
- **Notifications**: Sends notifications (`PAYMENT_CONFIRMATION`) via `notificationService`.
- **Audit**: Logs actions using `auditService`.
- **Security**: Verifies MFA and encrypts data using `securityService`.
- **Permissions**: Enforces `view_financial_reports` permission for managers.

## Error Handling
- Uses `AppError` with standardized error codes from `staffConstants.STAFF_ERROR_CODES` and `paymentConstants.ERROR_CODES`.
- Logs errors via `logger`.

## Security
- Authentication handled by external middleware.
- MFA verification for payment reports and data exports.
- Encryption of exported financial data.
- Permission checks ensure manager-only access.

## Dependencies
- **Models**: `@models` (Report, Payment, WalletTransaction, TaxRecord, AuditLog, Staff, FinancialSummary)
- **Constants**: `@constants/staff/staffConstants`, `@constants/common/paymentConstants`
- **Utilities**: `@utils/localization`, `@utils/errors`, `@utils/logger`
- **Services**: `@services/common/socketService`, `@services/common/notificationService`, `@services/common/auditService`, `@services/common/securityService`

This service ensures comprehensive financial reporting with security and compliance, aligned with staff and payment constants.
Notes:

Comprehensive documentation covering service, endpoints, models, constants, and integrations.
Includes request/response examples and side effects.
Explains localization and security.