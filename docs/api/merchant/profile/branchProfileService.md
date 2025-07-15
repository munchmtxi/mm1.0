# BranchProfileService Documentation

## Overview
The `BranchProfileService` manages branch-specific operations, including details, settings, media uploads, and profile synchronization for the Merchant Role System. Integrates with `merchantConstants.js` for configuration.

## Methods

### `updateBranchDetails`
- **Purpose**: Updates branch operating hours, location, or contact phone.
- **Parameters**:
  - `branchId`: Number, branch ID.
  - `details`: Object with `operatingHours`, `location`, `contactPhone`.
- **Returns**: Updated branch object.
- **Errors**:
  - `ERROR_CODES[1]` (404): Branch not found.
  - `ERROR_CODES[5]` (400): Invalid operating hours, phone, or location.

### `configureBranchSettings`
- **Purpose**: Configures branch currency and language settings.
- **Parameters**:
  - `branchId`: Number, branch ID.
  - `settings`: Object with `currency`, `language`.
- **Returns**: Updated branch object.
- **Errors**:
  - `ERROR_CODES[1]` (404): Branch not found.
  - `ERROR_CODES[5]` (400): Invalid currency or language.

### `manageBranchMedia`
- **Purpose**: Uploads branch-specific media.
- **Parameters**:
  - `branchId`: Number, branch ID.
  - `media`: Object with `file`, `type`.
- **Returns**: Media URL.
- **Errors**:
  - `ERROR_CODES[1]` (404): Branch not found.
  - `ERROR_CODES[5]` (400): Invalid media type or file.

### `syncBranchProfiles`
- **Purpose**: Synchronizes branch profiles for consistency.
- **Parameters**:
  - `merchantId`: Number, merchant ID.
- **Returns**: Array of updated branches.
- **Errors**:
  - `ERROR_CODES[1]` (404): Merchant or branches not found.

## Dependencies
- **Models**: `MerchantBranch`, `Merchant`, `Media`.
- **Constants**: `merchantConstants`.
- **Utilities**: `formatMessage`, `AppError`, `logger`, `validation`.
- **Services** (controller): `notificationService`, `auditService`, `socketService`.

## Integration
- **Notifications**:
  - `BRANCH_UPDATED`, `SETTINGS_UPDATED`, `MEDIA_UPLOADED`, `BRANCH_SYNCED`.
- **Audits**: Logs `UPDATE_BRANCH_DETAILS`, `CONFIGURE_BRANCH_SETTINGS`, `UPLOAD_BRANCH_MEDIA`, `SYNC_BRANCH_PROFILES`.
- **Socket Events**: Namespaced (`merchant:profile:`) via `branchProfileEvents.js`.

## Error Handling
- `AppError` with `merchantConstants.ERROR_CODES`.
- Localized via `formatMessage` (`en.json`).
- Transactions ensure atomicity.
- Logs via `logger.error`.

## Usage Scenarios
- Update branch hours, location, or phone.
- Configure branch currency or language.
- Upload branch media (e.g., photos).
- Sync settings across branches.

## Security
- **Authentication**: Via `authMiddleware`.
- **Authorization**: `merchant` role with permissions.
- **Validation**: Joi schemas in `branchProfileValidator.js`.
- **Auditing**: Logs actions with IP.

## API Endpoints
- **PATCH /merchant/profile/branch/:branchId/details**
- **PATCH /merchant/profile/branch/:branchId/settings**
- **POST /merchant/profile/branch/:branchId/media**
- **POST /merchant/profile/sync/:merchantId**

## Performance
- **Transactions**: Ensures consistency.
- **Validation**: Uses Joi for input.
- **Scalability**: Socket events use namespaced rooms.

## Notes
- **Constants**: Updated in `merchantConstants.js`.
- **Localization**: Supports `en.json`.
- **Socket Events**: Namespaced.
- **Models**: Unchanged.
- **No Points**: No gamification for profile updates.

## Example Workflow
1. Merchant sends `PATCH /merchant/profile/branch/123/details`.
2. Middleware authenticates, validates.
3. Service updates branch.
4. Controller sends notifications, emits socket, logs audit.
5. Response with updated branch.