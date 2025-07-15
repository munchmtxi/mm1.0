# Staff Role Management Service Documentation

## Overview
The Staff Role Management Service handles role assignments, permission updates, and compliance verification for the Munch merchant service. It integrates with Socket.IO for real-time updates and includes automatic point awarding for user actions, aligned with global operations and inclusivity features defined in `staffConstants.js`.

## File Structure
- **Service**: `src/services/merchant/staff/roleManagementService.js`
- **Controller**: `src/controllers/merchant/staff/roleManagementController.js`
- **Validator**: `src/validators/merchant/staff/roleManagementValidator.js`
- **Middleware**: `src/middleware/merchant/staff/roleManagementMiddleware.js`
- **Routes**: `src/routes/merchant/staff/roleManagementRoutes.js`
- **Socket Events**: `socket/events/merchant/staff/roleManagementEvents.js`
- **Socket Handler**: `socket/handlers/merchant/staff/roleManagementHandler.js`
- **Localization**: `locales/merchant/staff/en.json`

## Service Details
The service handles three main functionalities:
1. **Assign Role**: Assigns a role to a staff member for a specific branch.
2. **Update Permissions**: Updates permissions for a staff member based on their role.
3. **Verify Role Compliance**: Checks if a staff member meets required certifications.

### Point Awarding
Points are automatically awarded using the `pointService`:
- Role assignment: 10 points (uses `task_completion` from `STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`)
- Permission update: 10 points (uses `task_completion`)
- Compliance verification: 10 points (uses `task_completion`)

## Endpoints

### 1. Assign Role
- **Endpoint**: `POST /api/merchant/staff/roles/:staffId/assign`
- **Description**: Assigns a role to a staff member
- **Parameters**:
  - `staffId` (path): Integer ID of the staff member
- **Body**:
  - `role` (string): Enum [front_of_house, back_of_house, kitchen, manager, butcher, barista, stock_clerk, cashier, driver]
  - `branchId` (integer): Branch ID
- **Responses**:
  - 200: Role assigned successfully
  - 400: Invalid request
- **Socket Event**: `staff:roleAssigned`
- **Points**: 10

### 2. Update Permissions
- **Endpoint**: `POST /api/merchant/staff/roles/:staffId/permissions`
- **Description**: Updates permissions for a staff member
- **Parameters**:
  - `staffId` (path): Integer ID of the staff member
- **Body**:
  - `permissions` (array): Array of permission strings (validated against role-specific constants)
  - `branchId` (integer): Branch ID
- **Responses**:
  - 200: Permissions updated successfully
  - 400: Invalid request
- **Socket Event**: `staff:permissionsUpdated`
- **Points**: 10

### 3. Verify Role Compliance
- **Endpoint**: `GET /api/merchant/staff/roles/:staffId/compliance/:branchId`
- **Description**: Verifies role compliance for a staff member
- **Parameters**:
  - `staffId` (path): Integer ID of the staff member
  - `branchId` (path): Integer ID of the branch
- **Responses**:
  - 200: Compliance verified successfully
  - 400: Invalid request
- **Socket Event**: `staff:complianceVerified`
- **Points**: 10

## Dependencies
- **Models**: Staff, StaffPermissions, BranchRole, BranchStaffRole, BranchPermission, Merchant, User
- **Services**: auditService, socketService, notificationService, pointService
- **Utilities**: logger, localization
- **Constants**: staffConstants, frontOfHouseConstants, backOfHouseConstants, kitchenConstants, managerConstants, butcherConstants, baristaConstants, cashierConstants, driverConstants

## Socket Events
Defined in `roleManagementEvents.js`:
- `staff:roleAssigned`
- `staff:permissionsUpdated`
- `staff:complianceVerified`

## Error Handling
All functions include error handling with error messages from `staffConstants.STAFF_ERROR_CODES` and localized in `en.json`. Fallback error messages are used if constants are unavailable.

## Localization
All user-facing messages are localized using the `formatMessage` utility, with translations stored in `en.json`. Supported languages include those defined in `staffConstants.STAFF_SETTINGS.SUPPORTED_LANGUAGES`.

## Security
- Authentication is handled by main route middleware.
- Input validation uses express-validator with error codes from `staffConstants.STAFF_ERROR_CODES`.
- Audit logging tracks all actions using `staffConstants.STAFF_AUDIT_ACTIONS`.
- Socket events are namespaced to prevent unauthorized access.
- Permissions are validated against role-specific constants (e.g., `managerConstants.PERMISSIONS`).

## Global Operations
The service supports global operations in regions defined in `staffConstants.STAFF_SETTINGS.SUPPORTED_CITIES` (e.g., Malawi, Tanzania, Kenya, India, Brazil) and uses `STAFF_SETTINGS.SUPPORTED_LANGUAGES` for localization.

## Notes
- Point awarding uses the `task_completion` action from `STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS` as a fallback (10 points) due to the absence of specific role management actions.
- Permissions are validated against role-specific constants (e.g., `managerConstants.PERMISSIONS`) to ensure role-appropriate access.
- The service is compatible with merchant types defined in `staffConstants.STAFF_ROLES` (e.g., restaurant, cafe, grocery).