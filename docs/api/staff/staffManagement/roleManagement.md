# Staff Management API Documentation

This document outlines the Staff Management API, which manages staff roles, including assigning roles, updating permissions, and retrieving role details. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding role-related actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/staffManagement/roleManagementService.js`
- **Controller**: `src/controllers/staff/staffManagement/roleManagementController.js`
- **Validator**: `src/validators/staff/staffManagement/roleManagementValidator.js`
- **Middleware**: `src/middleware/staff/staffManagement/roleManagementMiddleware.js`
- **Routes**: `src/routes/staff/staffManagement/roleManagementRoutes.js`
- **Events**: `socket/events/staff/staffManagement/roleManagementEvents.js`
- **Handler**: `socket/handlers/staff/staffManagement/roleManagementHandler.js`
- **Localization**: `locales/staff/staffManagement/en.json`

## Service: `roleManagementService.js`

The service layer handles core role management operations, interacting with Sequelize models (`Staff`, `BranchStaffRole`, `Role`, `BranchPermission`, `Permission`) and constants (`staffConstants.js`, role-specific constants). It includes:

- **assignRole(staffId, role, assignedBy)**: Assigns a role to a staff member.
- **updateRolePermissions(staffId, permissions, grantedBy)**: Updates permissions for a staff member’s role.
- **getRoleDetails(staffId)**: Retrieves role and permission details for a staff member.

The service uses Sequelize for querying and logs errors using a logger utility.

## Controller: `roleManagementController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Assign Role**: 10 points (`task_completion`).
- **Update Role Permissions**: 10 points (`task_completion`).
- **Get Role Details**: No points awarded (passive action).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the staff’s preferred language or default language.

## Validator: `roleManagementValidator.js`

Uses Joi to validate request inputs:

- **assignRoleSchema**: Requires `staffId` (integer), `role` (valid staff type from `staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES`).
- **updateRolePermissionsSchema**: Requires `staffId` (integer), `permissions` (array of strings, min 1).
- **getRoleDetailsSchema**: Requires `staffId` (integer).

## Middleware: `roleManagementMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `roleManagementRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/staffManagement/assign-role**: Assigns a role to a staff member.
- **POST /staff/staffManagement/update-permissions**: Updates role permissions for a staff member.
- **POST /staff/staffManagement/get-role-details**: Retrieves role details for a staff member.

## Events: `roleManagementEvents.js`

Defines socket event names in a namespaced format:

- `staff:staffManagement:role_assigned`
- `staff:staffManagement:permissions_updated`
- `staff:staffManagement:details_retrieved`

## Handler: `roleManagementHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains staff management-specific messages:

- `staffManagement.role_assigned`: Role assignment confirmation.
- `staffManagement.permissions_updated`: Permissions update confirmation.
- `staffManagement.details_retrieved`: Role details retrieval confirmation.

## Endpoints

### POST /staff/staffManagement/assign-role
- **Summary**: Assign role to staff.
- **Request Body**:
  - `staffId` (integer, required): Staff ID.
  - `role` (string, required): Role to assign (e.g., `front_of_house`).
- **Responses**:
  - **200**: `{ success: true, message: "Role {role} assigned to staff", data: { id, staff_id, role_id, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:staffManagement:role_assigned`, sends notification.

### POST /staff/staffManagement/update-permissions
- **Summary**: Update role permissions for staff.
- **Request Body**:
  - `staffId` (integer, required): Staff ID.
  - `permissions` (array of strings, required): Permissions to update.
- **Responses**:
  - **200**: `{ success: true, message: "Permissions updated for staff ID {staffId}", data: { staffId, permissions } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:staffManagement:permissions_updated`, sends notification.

### POST /staff/staffManagement/get-role-details
- **Summary**: Get role details for staff.
- **Request Body**:
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Role details retrieved for staff ID {staffId}", data: { staffId, position, permissions } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Logs action, emits `staff:staffManagement:details_retrieved`.

## Notes

- Authentication is handled at the main route index, providing `req.user.id` for `assignedBy` and `grantedBy`.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, using actions from `staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`.
- User-facing messages are localized using the staff’s preferred language, defaulting to `staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE` ('en').
- Constants from `staffConstants.js` and role-specific constants (`frontOfHouseConstants.js`, etc.) are used for roles, permissions, and notifications.
- Permission validation uses role-specific `PERMISSIONS` constants.
- Socket rooms use `staff:${staffId}` to target staff-specific notifications.
- The `StaffPermissions` model was removed as it’s not used in the refactored service.