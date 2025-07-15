# Staff Profile API Documentation

This document outlines the Staff Profile API, which manages staff profile operations, including creation, updates, compliance verification, and retrieval. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a wallet service for payment methods. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/profile/staffProfileService.js`
- **Controller**: `src/controllers/staff/profile/staffProfileController.js`
- **Validator**: `src/validators/staff/profile/staffProfileValidator.js`
- **Middleware**: `src/middleware/staff/profile/staffProfileMiddleware.js`
- **Routes**: `src/routes/staff/profile/staffProfileRoutes.js`
- **Events**: `socket/events/staff/profile/staffProfileEvents.js`
- **Handler**: `socket/handlers/staff/profile/staffProfileHandler.js`
- **Localization**: `locales/staff/profile/en.json`

## Service: `staffProfileService.js`

The service layer handles core profile operations, interacting with Sequelize models (`User`, `Staff`, `Merchant`, `MerchantBranch`, `Wallet`) and constants (`staffConstants.js`). It includes:

- **createStaffProfile(userId, details)**: Creates a staff profile with merchant, branch, certifications, geofence, and bank details.
- **updateStaffDetails(staffId, details)**: Updates user and staff details, including bank information.
- **verifyCompliance(staffId)**: Checks profile completeness and required certifications.
- **getStaffProfile(staffId)**: Retrieves staff profile with associated data.

The service logs errors using a logger utility.

## Controller: `staffProfileController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `walletService`) and localization (`formatMessage`). It handles HTTP requests, manages wallet operations, emits socket events, logs actions, and sends notifications. Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the user’s preferred language or default language.

## Validator: `staffProfileValidator.js`

Uses Joi to validate request inputs:

- **createStaffProfileSchema**: Requires `userId`, `details` (with `merchantId`, `position`, optional `branchId`, `certifications`, `geofenceId`, `bankDetails`).
- **updateStaffDetailsSchema**: Requires `staffId`, `details` (with optional `userUpdates`, `staffUpdates`, `bankDetails`).
- **verifyComplianceSchema**: Requires `staffId`.
- **getStaffProfileSchema**: Requires `staffId`.

## Middleware: `staffProfileMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `staffProfileRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/profile/create**: Creates a staff profile.
- **POST /staff/profile/update**: Updates a staff profile.
- **POST /staff/profile/verify-compliance**: Verifies staff compliance.
- **POST /staff/profile/get**: Retrieves staff profile.

## Events: `staffProfileEvents.js`

Defines socket event names in a namespaced format:

- `staff:profile:created`
- `staff:profile:updated`
- `staff:profile:compliance_verified`
- `staff:profile:compliance_failed`
- `staff:profile:retrieved`

## Handler: `staffProfileHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains profile-specific messages:

- `profile.profile_created`: Profile creation confirmation.
- `profile.profile_updated`: Profile update confirmation.
- `profile.profile_verified`: Compliance verification success.
- `profile.profile_compliance_failed`: Compliance verification failure.
- `profile.profile_retrieved`: Profile retrieval confirmation.

## Endpoints

### POST /staff/profile/create
- **Summary**: Create staff profile.
- **Request Body**:
  - `userId` (integer, required): User ID.
  - `details` (object, required): `{ merchantId, position, branchId?, certifications?, geofenceId?, bankDetails? }`.
- **Responses**:
  - **200**: `{ success: true, message: "Staff profile created for ID {staffId}", data: { id, user_id, position, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Creates wallet if bank details provided, logs action, emits `staff:profile:created`, sends notification.

### POST /staff/profile/update
- **Summary**: Update staff profile.
- **Request Body**:
  - `staffId` (integer, required): Staff ID.
  - `details` (object, required): `{ userUpdates?, staffUpdates?, bankDetails? }`.
- **Responses**:
  - **200**: `{ success: true, message: "Staff profile updated for ID {staffId}", data: { user, staff } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Updates/creates wallet if bank details provided, logs action, emits `staff:profile:updated`, sends notification.

### POST /staff/profile/verify-compliance
- **Summary**: Verify staff compliance.
- **Request Body**:
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Staff profile verified successfully" | "Staff profile compliance failed: {reason}", data: { isCompliant, missingFields?, missingCertifications? } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Logs action, emits `staff:profile:compliance_verified` or `staff:profile:compliance_failed`, sends notification.

### POST /staff/profile/get
- **Summary**: Get staff profile.
- **Request Body**:
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Staff profile retrieved for ID {staffId}", data: { id, user_id, position, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Logs action, emits `staff:profile:retrieved`.

## Notes

- Authentication is handled at the main route index, providing `req.user.id` for staff identification.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- User-facing messages are localized using the user’s preferred language, defaulting to `staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE` ('en').
- Constants from `staffConstants.js` are used for statuses, errors, audit actions, notifications, and configurations.
- Geofence validation is simplified to check city against supported cities, removing `Geofence` model dependency.
- Wallet operations are deferred to the controller for consistency.
- Validation is simplified inline checks in the service, with comprehensive Joi schemas in the validator.
- Permission checks are simplified, assuming role-based access is enforced via authentication middleware.