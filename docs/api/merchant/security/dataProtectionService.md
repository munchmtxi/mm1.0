# DataProtectionService Documentation

## Overview
The `DataProtectionService` manages merchant data protection operations, including data encryption, regulatory compliance, data access restriction, and security auditing. Integrates with `merchantConstants.js` for configuration and supports global data protection standards.

## Methods

### `encryptSensitiveData`
- **Purpose**: Encrypts sensitive merchant data.
- **Parameters**:
  - `merchantId`: Number, merchant ID.
  - `data`: Object with `type` and `content`.
- **Returns**: Object with `merchantId` and `encryptedData`.
- **Errors**:
  - `ERROR_CODES[1]` (404): Merchant not found.
  - `ERROR_CODES[5]` (400): Invalid input.

### `complyWithRegulations`
- **Purpose**: Verifies compliance with data protection standards (e.g., GDPR, CCPA).
- **Parameters**:
  - `merchantId`: Number, merchant ID.
- **Returns**: Object with `merchantId`, `standards`, and `compliant`.
- **Errors**:
  - `ERROR_CODES[1]` (404): Merchant not found.
  - `ERROR_CODES[8]` (400): Invalid standards.

### `restrictDataAccess`
- **Purpose**: Restricts data access for a user with a specific permission.
- **Parameters**:
  - `merchantId`: Number, merchant ID.
  - `accessRequest`: Object with `userId` and `permission`.
- **Returns**: Object with `merchantId`, `userId`, and `permission`.
- **Errors**:
  - `ERROR_CODES[1]` (404): Merchant not found.
  - `ERROR_CODES[3]` (400): Invalid permission.
  - `ERROR_CODES[13]` (404): Invalid user.

### `auditDataSecurity`
- **Purpose**: Retrieves security audit logs for the merchant.
- **Parameters**:
  - `merchantId`: Number, merchant ID.
- **Returns**: Object with `merchantId`, `auditCount`, and `lastAudit`.
- **Errors**:
  - `ERROR_CODES[1]` (404): Merchant not found.

## Points
Points awarded via `COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS`:
- `dataEncrypted`: 10 points.
- `gdprEnforced`: 20 points.
- `dataAccessManaged`: 15 points.
- `complianceAudited`: 25 points.
- **Capped**: 1000/day.
- **Automated**: In controller for each operation.

## Dependencies
- **Models**: `User`, `Customer`, `AuditLog`.
- **Constants**: `merchantConstants`.
- **Utilities**: `formatMessage`, `AppError`, `logger`.
- **Services** (controller): `notificationService`, `auditService`, `socketService`, `pointService`.

## Integration
- **Notifications**:
  - `dataEncrypted`, `gdprEnforced`, `dataAccessManaged`, `complianceAudited`.
- **Audits**: Logs actions with same action names.
- **Socket Events**: Namespaced (`merchant:security:`) via `dataProtectionEvents.js`.
- **Gamification**: Points awarded in controller for each operation.

## Error Handling
- `AppError` with `merchantConstants.ERROR_CODES`.
- Localized via `formatMessage` (`en.json`).
- Transactions ensure atomicity (except for audit, which is read-only).
- Logs via `logger.error`.

## Usage Scenarios
- Encrypt sensitive customer data.
- Verify GDPR/CCPA compliance.
- Restrict staff data access.
- Audit security logs.

## Security
- **Authentication**: Via `authMiddleware`.
- **Authorization**: `merchant` role with permissions tied to `COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS`.
- **Validation**: Joi schemas in `dataProtectionValidator.js`.
- **Auditing**: Logs actions with IP.

## API Endpoints
- **POST /merchant/security/:merchantId/encrypt**
- **POST /merchant/security/:merchantId/compliance**
- **POST /merchant/security/:merchantId/restrict**
- **GET /merchant/security/:merchantId/audit**

## Performance
- **Transactions**: Ensures consistency for write operations.
- **Validation**: Uses Joi for input.
- **Scalability**: Socket events use namespaced rooms.

## Notes
- **Constants**: Uses `COMPLIANCE_CONSTANTS` and `SECURITY_CONSTANTS`.
- **Localization**: Supports `en.json` in `security` directory.
- **Socket Events**: Namespaced.
- **Models**: Unchanged (`User`, `Customer`, `AuditLog`).
- **Encryption**: Placeholder base64 encoding (assumes external service).

## Example Workflow
1. Merchant sends `POST /merchant/security/123/encrypt`.
2. Middleware authenticates, validates.
3. Service encrypts data.
4. Controller sends notifications, emits socket, logs audit, awards points.
5. Response with encrypted data.