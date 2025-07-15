# Regulatory Service Documentation

## Overview
The Regulatory Service enables merchants to manage certifications, verify staff and driver compliance, and conduct regulatory audits. It integrates with gamification, notification, audit, and socket services. Points are automatically awarded for compliance actions, enhancing merchant engagement through a dynamic, rule-based system.

## Methods

### manageCertifications
Tracks or updates merchant certifications.

- **Parameters**:
  - `merchantId` (string): Merchant ID.
  - `certData` (object): Certification type, issue date, expiry date.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `certType`, `language`, and `action`.
- **Errors**:
  - Invalid certification data or type (400, `INVALID_INPUT`, `INVALID_CERT_TYPE`).
  - Merchant not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Awards points for `certificationsManaged` based on certification count.

### verifyStaffCompliance
Verifies staff certification compliance.

- **Parameters**:
  - `staffId` (string): Staff ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `staffId`, `isCompliant`, `complianceChecks`, `language`, and `action`.
- **Errors**:
  - Invalid staff ID (400, `INVALID_INPUT`).
  - Staff not found (404, `STAFF_NOT_FOUND`).
- **Point Awarding**: Awards points for `staffComplianceVerified` based on compliance status.

### verifyDriverCompliance
Verifies driver certification compliance.

- **Parameters**:
  - `driverId` (string): Driver ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `driverId`, `isCompliant`, `complianceChecks`, `language`, and `action`.
- **Errors**:
  - Invalid driver ID (400, `INVALID_INPUT`).
  - Driver not found (404, `DRIVER_NOT_FOUND`).
- **Point Awarding**: Awards points for `driverComplianceVerified` based on compliance status.

### auditCompliance
Conducts regulatory compliance audits for a merchant.

- **Parameters**:
  - `merchantId` (string): Merchant ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `isCompliant`, `complianceChecks`, `language`, and `action`.
- **Errors**:
  - Invalid merchant ID (400, `INVALID_INPUT`).
  - Merchant not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Awards points for `complianceAudited` based on compliance status.

## Point System
Points are automatically awarded for actions in `merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS`.
- **Contextual**:
  - `certificationsManaged`: Multiplier based on certification count.
  - `staffComplianceVerified`, `driverComplianceVerified`, `complianceAudited`: Multiplier based on compliance status (1x if compliant, 0.5x if not).
- **Role-Based**: Merchants receive 1.2x multiplier; staff and drivers receive 1.1x for respective actions.
- **Capped**: Limited to 200 points per action.
- **Automated**: Integrated into each action, no manual endpoints.

**Configuration** (`gamificationConstants.js`):
- `certificationsManaged`: 45 base points, 0.2x per certification, 1.2x for merchants.
- `staffComplianceVerified`: 30 base points, 1.3x if compliant, 1.2x for merchants, 1.1x for staff.
- `driverComplianceVerified`: 30 base points, 1.3x if compliant, 1.2x for merchants, 1.1x for drivers.
- `complianceAudited`: 40 base points, 1.5x if compliant, 1.2x for merchants.

**Workflow**:
1. Merchant performs an action (e.g., manages a certification).
2. Service returns action and metadata.
3. Controller calculates points using internal logic.
4. Points awarded via `gamificationService.awardPoints`.
5. Notifications and socket events inform the merchant/staff/driver.

## Dependencies
- **Models**: `Merchant`, `Staff`, `Driver`.
- **Constants**: `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `handleServiceError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration
- **Notifications**: Sent for action completion and points awarded.
- **Audits**: Logs action details and points.
- **Socket Events**: Namespaced (e.g., `merchant:compliance:certificationsManaged`).
- **Gamification**: Automatic point awarding in controller.

## Error Handling
- Uses `AppError` with localized messages and `merchantConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- Common errors:
  - `INVALID_INPUT`: Invalid merchant ID, staff ID, driver ID, or certification data.
  - `INVALID_CERT_TYPE`: Invalid certification type.
  - `MERCHANT_NOT_FOUND`, `STAFF_NOT_FOUND`, `DRIVER_NOT_FOUND`: Entity not found.
  - `SYSTEM_ERROR`: Unexpected errors, logged.

## Usage Scenarios
- **Manage Certification**: Adding one certification yields 64.8 points (45 * 1.2 * 1.2).
- **Verify Staff Compliance**: Compliant staff yields 56.16 points (30 * 1.3 * 1.2 * 1.2).
- **Verify Driver Compliance**: Compliant driver yields 56.16 points (30 * 1.3 * 1.2 * 1.2).
- **Audit Compliance**: Compliant audit yields 86.4 points (40 * 1.5 * 1.2 * 1.2).

## Security
- **Authentication**: Via `authMiddleware.authenticate`.
- **Authorization**: Restricted to merchants with `manage_compliance`.
- **Validation**: Uses `express-validator` and `merchantConstants`.
- **Audits**: Logs all actions with IP and points.

## Notes
- Transactions ensure atomicity.
- Points capped at 1000/day (`MAX_POINTS_PER_DAY`).
- Localized messages in `en.json`.
- Namespaced socket events for clarity.
- No manual point endpoints, per pattern.
- Point calculations handled in controller.
- Future compliance services will automate point awarding similarly.
- **Note**: Ensure `Staff` and `Driver` models have a `user` relation or update language fallback logic if not present.