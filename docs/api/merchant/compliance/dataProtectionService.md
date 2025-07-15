# Data Protection Service Documentation

## Overview
The Data Protection Service enables merchants to encrypt sensitive data, ensure GDPR/CCPA compliance, and manage data access permissions. It integrates with gamification, notification, audit, and socket services. Points are automatically awarded for compliance actions, enhancing merchant engagement through a dynamic, rule-based system.

## Methods

### encryptData
Encrypts sensitive customer, staff, or driver data.

- **Parameters**:
  - `merchantId` (string): Merchant ID.
  - `data` (object): User ID, role (customer/staff), sensitive data.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `userId`, `role`, `encrypted`, `language`, and `action`.
- **Errors**:
  - Invalid input data (400, `INVALID_INPUT`).
  - Invalid role (400, `INVALID_ROLE`).
  - Merchant or entity not found (404, `MERCHANT_NOT_FOUND`, `ROLE_NOT_FOUND`).
- **Point Awarding**: Points for `dataEncrypted` based on number of data fields.

### enforceGDPR
Ensures GDPR/CCPA compliance for a merchant.

- **Parameters**:
  - `merchantId` (string): Merchant ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `isCompliant`, `complianceChecks`, `language`, and `action`.
- **Errors**:
  - Invalid merchant ID (400, `INVALID_INPUT`).
  - Merchant not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Awards points for `gdprEnforced` based on compliance status.

### manageDataAccess
Controls data access permissions for a merchant.

- **Parameters**:
  - `merchantId` (string): Merchant ID.
  - `accessData` (object): User ID, role, resource, permissions.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `accessRecord`, `language`, and `action`.
- **Errors**:
  - Invalid input or permissions (400, `INVALID_PERMISSIONS`).
  - Merchant not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Awards points for `dataAccessManaged` based on permissions count.

## Point System
Points are automatically for actions in `merchantConstants.SECURITY_CONSTANTS.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS`.
- **Contextual**:
  - `dataEncrypted`: Multiplier based on number of data fields.
  - `gdprEnforced`: Multiplier based on compliance status (1.5x if compliant, 0.5x if not).
  - `dataAccessManaged`: Multiplier based on number of permissions granted.
- **Role-Based**: Merchants receive 1.2x multiplier.
- **Capped**: Limited to 200 points per action.
- **Automated**: Integrated into each action, no manual endpoints.

**Configuration** (`gamificationConstants.js`):
- `dataEncrypted`: 50 base points, 0.1x per data field, 1.2x for merchants.
- `gdprEnforced`: 40 base points, 1.5x if compliant, 1.2x for merchants.
- `dataAccessManaged`: 35 base points, 0.2x per permission, 1.2x for merchants.

**Workflow**:
1. Merchant performs an action (e.g., encrypts data).
2. Service returns action and metadata.
3. Controller calculates points using internal logic.
4. Points awarded via `gamificationService.awardPoints`.
5. Notifications and socket events inform the merchant.

## Dependencies
- **Models**: `Merchant`, `Customer`, `Staff`, `Driver`, `DataAccess`, `Notification`.
- **Constants**: `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `handleServiceError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration
- **Notifications**: Sent for action completion and points awarded.
- **Audits**: Logs action details and points.
- **Socket Events**: Namespaced (e.g., `merchant:compliance:dataEncrypted`).
- **Gamification**: Automatic point awarding in controller.

## Error Handling
- Uses `AppError` with localized messages and `merchantConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- Common errors:
  - `INVALID_INPUT`: Invalid merchant ID, data, or access data.
  - `INVALID_ROLE`: Invalid role specified.
  - `INVALID_PERMISSIONS`: Invalid permissions specified.
  - `MERCHANT_NOT_FOUND`, `CUSTOMER_NOT_FOUND`, `STAFF_NOT_FOUND`, `DRIVER_NOT_FOUND`: Entity not found.
  - `SYSTEM_ERROR`: Unexpected errors, logged.

## Usage Scenarios
- **Encrypt Data**: Encrypting 5 fields yields 72 points (50 * 1.2 * 1.2).
- **Enforce GDPR**: Compliant check yields 86.4 points (40 * 1.5 * 1.2 * 1.2).
- **Manage Access**: 3 permissions yields 50.4 points (35 * 1.2 * 1.2).

## Security
- **Authentication**: Via `authMiddleware.authenticate`.
- **Authorization**: Restricted to merchants with `manage_compliance`.
- **Validation**: Uses `express-validator` and `merchantConstants`.
- **Audits**: Logs all actions with IP and points.
- **Encryption**: Uses AES-256-CBC (secure key management needed in production).

## Notes
- Transactions ensure atomicity.
- Points capped at 1000/day (`MAX_POINTS_PER_DAY`).
- Localized messages in `en.json`.
- Namespaced socket events for clarity.
- No manual point endpoints, per pattern.
- Point calculations handled in controller.
- Future compliance services will automate point awarding similarly.
- **Production Note**: Implement secure key management for encryption keys.