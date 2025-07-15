# Staff Security API Documentation

This document outlines the Staff Security API, which manages access control for staff, including enforcing permissions, auditing access attempts, and updating access rules. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding secure actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/security/accessControlService.js`
- **Controller**: `src/controllers/staff/security/accessControlController.js`
- **Validator**: `src/validators/staff/security/accessControlValidator.js`
- **Middleware**: `src/middleware/staff/security/accessControlMiddleware.js`
- **Routes**: `src/routes/staff/security/accessControlRoutes.js`
- **Events**: `socket/events/staff/security/accessControlEvents.js`
- **Handler**: `socket/handlers/staff/security/accessControlHandler.js`
- **Localization**: `locales/staff/security/en.json`

## Service: `accessControlService.js`

The service layer handles core access control operations, interacting with Sequelize models (`Staff`, `StaffPermissions`, `Permissions`, `BranchPermission`) and constants (`staffConstants.js`). It includes:

- **enforcePermissions(staffId, requiredPermission)**: Checks if a staff member has the required permission.
- **auditAccess(staffId)**: Prepares data for auditing an access attempt.
- **updateAccessRules(staffId, permissions)**: Assigns permissions to a staff member.

The service uses Sequelize for querying and logs errors using a logger utility.

## Controller: `accessControlController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Enforce Permissions**: 10 points (`securityFeatures`).
- **Update Access Rules**: 10 points (`securityFeatures`).
- **Audit Access**: No points awarded (passive action).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the staff’s preferred language or default language.

## Validator: `accessControlValidator.js`

Uses Joi to validate request inputs:

- **enforcePermissionsSchema**: Requires `staffId` (integer), `requiredPermission` (string).
- **auditAccessSchema**: Requires `staffId` (integer).
- **updateAccessRulesSchema**: Requires `staffId` (integer), `permissions` (array of strings, min 1).

## Middleware: `accessControlMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `accessControlRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/security/enforce-permissions**: Enforces permissions for a staff member.
- **POST /staff/security/audit-access**: Audits a staff access attempt.
- **POST /staff/security/update-access-rules**: Updates access rules for a staff member.

## Events: `accessControlEvents.js`

Defines socket event names in a namespaced format:

- `staff:security:access_granted`
- `staff:security:access_audited`
- `staff:security:rules_updated`

## Handler: `accessControlHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains security-specific messages:

- `security.access_granted`: Permission granted confirmation.
- `security.access_audited`: Access audit confirmation.
- `security.access_updated`: Access rules update confirmation.

## Endpoints

### POST /staff/security/enforce-permissions
- **Summary**: Enforce permissions for staff.
- **Request Body**:
  - `staffId` (integer, required): Staff ID.
  - `requiredPermission` (string, required): Required permission.
- **Responses**:
  - **200**: `{ success: true, message: "Access granted for permission {permission}", data: { accessGranted: boolean } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:security:access_granted`.

### POST /staff/security/audit-access
- **Summary**: Audit staff access attempt.
- **Request Body**:
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Access attempt audited for staff ID {staffId}", data: { id, staffId, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Logs action, emits `staff:security:access_audited`.

### POST /staff/security/update-access-rules
- **Summary**: Update access rules for staff.
- **Request Body**:
  - `staffId` (integer, required): Staff ID.
  - `permissions` (array of strings, required): Permissions to assign.
- **Responses**:
  - **200**: `{ success: true, message: "Access rules updated for staff ID {staffId}", data: { staffId, permissions } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:security:rules_updated`, sends notification.

## Notes

- Authentication is handled at the main route index, providing `req.user.id` for staff identification.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, using actions from `staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`.
- User-facing messages are localized using the staff’s preferred language, defaulting to `staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE` ('en').
- Constants from `staffConstants.js` are used for errors, permissions, audit actions, and notifications.
- MFA verification is removed, assuming it’s handled via authentication middleware.
- Unused models (`GamificationPoints`, `Roles`, `AuditLog`) are excluded.
- Socket rooms use `staff:${staffId}` to target staff-specific notifications.