Documentation File
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\staff\wallet\wallet.md

markdown

Collapse

Unwrap

Copy
# Wallet Service Documentation

This document outlines the Wallet Service for staff wallet operations, responsible for managing balance retrieval, transaction history, withdrawals, merchant synchronization, and notification preferences.

## Overview

The Wallet Service handles financial operations for staff wallets within restaurant branches, ensuring secure transactions and synchronization with merchants. It uses models (`Wallet`, `WalletTransaction`, `Staff`, `Merchant`, `PrivacySettings`, `Payout`) and constants from `staffConstants.js` and `paymentConstants.js`.

### Key Features
- **Balance Retrieval**: Retrieves wallet balance and currency.
- **Transaction History**: Displays recent transaction records.
- **Withdrawal Requests**: Submits secure withdrawal requests.
- **Merchant Synchronization**: Syncs wallet data with merchant.
- **Notification Preferences**: Updates wallet notification settings.
- **Security**: Enforces MFA and encrypts sensitive data.

### File Structure
- **Service**: `src/services/staff/wallet/walletService.js`
- **Controller**: `src/controllers/staff/wallet/walletController.js`
- **Validator**: `src/validators/staff/wallet/walletValidator.js`
- **Middleware**: `src/middleware/staff/wallet/walletMiddleware.js`
- **Routes**: `src/routes/staff/wallet/walletRoutes.js`
- **Events**: `socket/events/staff/wallet/wallet.events.js`
- **Handler**: `socket/handlers/staff/wallet/walletHandler.js`
- **Localization**: `locales/staff/wallet/en.json`

## Endpoints

### 1. Get Wallet Balance
- **Method**: `GET`
- **Path**: `/staff/wallet/balance/:staffId`
- **Description**: Retrieves the wallet balance and currency for a staff member.
- **Permission**: Requires `manage_wallet` permission (staff role).
- **Parameters**:
  - `staffId` (path): Integer, ID of the staff.
- **Responses**:
  - `200`: Balance retrieved, returns balance and currency.
  - `404`: Wallet not found.
  - `500`: Server error.
- **Side Effects**:
  - Verifies MFA using `securityService`.
  - Emits socket event (`wallet:balance_retrieved`).

### 2. View Transaction History
- **Method**: `GET`
- **Path**: `/staff/wallet/history/:staffId`
- **Description**: Retrieves the transaction history for a staff member's wallet.
- **Permission**: Requires `manage_wallet` permission (staff role).
- **Parameters**:
  - `staffId` (path): Integer, ID of the staff.
- **Responses**:
  - `200`: History retrieved, returns transaction records.
  - `404`: Wallet not found.
  - `500`: Server error.
- **Side Effects**:
  - Emits socket event (`wallet:history_retrieved`).

### 3. Request Withdrawal
- **Method**: `POST`
- **Path**: `/staff/wallet/withdrawal`
- **Description**: Submits a withdrawal request for a staff member's wallet.
- **Permission**: Requires `manage_wallet` permission (staff role).
- **Request Body**:
  ```json
  {
    "staffId": 1,
    "amount": 50.00
  }
Responses:
201: Withdrawal request submitted, returns payout record.
400: Insufficient balance or invalid amount.
403: Permission denied.
404: Wallet not found.
500: Server error.
Side Effects:
Verifies MFA and encrypts bank details using securityService.
Logs audit action (STAFF_PROFILE_UPDATE).
Sends notification (WITHDRAWAL_PROCESSED).
Emits socket event (wallet:withdrawal_requested).
4. Sync with Merchant
Method: POST
Path: /staff/wallet/sync
Description: Synchronizes a staff member's wallet with a merchant.
Permission: Requires manage_wallet permission (staff role).
Request Body:
json

Collapse

Unwrap

Copy
{
  "staffId": 1,
  "merchantId": 100
}
Responses:
200: Wallet synchronized successfully.
403: Staff not associated with merchant.
404: Staff or merchant not found.
500: Server error.
Side Effects:
Emits socket event (wallet:merchant_synced).
5. Update Wallet Preferences
Method: POST
Path: /staff/wallet/preferences
Description: Updates notification preferences for a staff member's wallet.
Permission: Requires manage_wallet permission (staff role).
Request Body:
json

Collapse

Unwrap

Copy
{
  "staffId": 1,
  "preferences": {
    "push": true,
    "email": false,
    "sms": true
  }
}
Responses:
200: Preferences updated successfully.
400: Invalid preferences.
403: Permission denied.
404: Staff not found.
500: Server error.
Side Effects:
Logs audit action (STAFF_PROFILE_UPDATE).
Sends notification (WALLET_UPDATE).
Emits socket event (wallet:preferences_updated).
Service Details
Models
Wallet: Stores wallet details (id, balance, currency, bank_details, merchant_id).
WalletTransaction: Stores transaction records (wallet_id, amount, type, status, created_at).
Staff: Stores staff details (id, user_id, merchant_id, position).
Merchant: Stores merchant details (id).
PrivacySettings: Stores notification preferences (user_id, notificationPreferences).
Payout: Stores payout records (wallet_id, staff_id, amount, currency, method, status).
Constants
Uses staffConstants.js for:
STAFF_ERROR_CODES: Error codes like STAFF_NOT_FOUND, PERMISSION_DENIED.
STAFF_AUDIT_ACTIONS: Audit actions like STAFF_PROFILE_UPDATE.
STAFF_TYPES: Staff roles for notification and audit roles.
Uses paymentConstants.js for:
FINANCIAL_LIMITS: Limits for withdrawal amounts.
PAYMENT_METHODS: Valid payment methods (e.g., bank_transfer).
TRANSACTION_STATUSES: Transaction statuses (e.g., pending).
NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES: Notification types like WITHDRAWAL_PROCESSED, WALLET_UPDATE.
ERROR_CODES: Error codes like WALLET_NOT_FOUND, INSUFFICIENT_FUNDS.
Localization
Uses @utils/localization for messages in locales/staff/wallet/en.json:
wallet.withdrawal_requested: "Withdrawal of {amount} requested with payout ID {payoutId}."
wallet.preferences_updated: "Wallet preferences updated for staff {staffId}."
Integration
Socket Events: Emits events in the /munch/wallet namespace.
Notifications: Sends notifications (WITHDRAWAL_PROCESSED, WALLET_UPDATE) via notificationService.
Audit: Logs actions using auditService.
Security: Verifies MFA and encrypts data using securityService.
Permissions: Enforces manage_wallet permission for staff.
Error Handling
Uses AppError with standardized error codes from staffConstants.STAFF_ERROR_CODES and paymentConstants.ERROR_CODES.
Logs errors via logger.
Security
Authentication handled by external middleware.
MFA verification for balance retrieval and withdrawals.
Encryption of bank details for payouts.
Permission checks ensure staff-only access.
Dependencies
Models: @models (Wallet, WalletTransaction, Staff, Merchant, PrivacySettings, Payout)
Constants: @constants/staff/staffConstants, @constants/common/paymentConstants
Utilities: @utils/localization, @utils/errors, @utils/logger
Services: @services/common/socketService, @services/common/notificationService, @services/common/auditService, @services/common/securityService