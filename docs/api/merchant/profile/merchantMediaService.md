# MerchantMediaService Documentation

## Overview
The `MerchantMediaService` manages media-related operations, including menu photos, promotional media, metadata updates, and media deletion for the Merchant Role System. Integrates with `merchantConstants.js` for configuration.

## Methods

### `uploadMenuPhotos`
- **Purpose**: Uploads dish photos for a restaurant menu.
- **Parameters**:
  - `restaurantId`: Number, branch ID.
  - `photos`: Array of file objects.
- **Returns**: Array of photo URLs.
- **Errors**:
  - `ERROR_CODES[1]` (404): Branch not found.
  - `ERROR_CODES[5]` (400): Invalid file data.

### `managePromotionalMedia`
- **Purpose**: Uploads promotional media (e.g., banners, videos).
- **Parameters**:
  - `restaurantId`: Number, branch ID.
  - `media`: Object with `file`, `type`.
- **Returns**: Media URL.
- **Errors**:
  - `ERROR_CODES[1]` (404): Branch not found.
  - `ERROR_CODES[5]` (400): Invalid media type or file.

### `updateMediaMetadata`
- **Purpose**: Edits media metadata (e.g., title, description).
- **Parameters**:
  - `mediaId`: Number, media ID.
  - `metadata`: Object with `title`, `description`.
- **Returns**: Updated metadata fields.
- **Errors**:
  - `ERROR_CODES[4]` (404): Media not found.
  - `ERROR_CODES[5]` (400): Invalid metadata.

### `deleteMedia`
- **Purpose**: Removes outdated media.
- **Parameters**:
  - `mediaId`: Number, media ID.
- **Returns**: None.
- **Errors**:
  - `ERROR_CODES[4]` (404): Media not found.

## Dependencies
- **Models**: `MerchantBranch`, `Media`, `Merchant`.
- **Constants**: `merchantConstants`.
- **Utilities**: `formatMessage`, `AppError`, `logger`, `validation`.
- **Services** (controller): `notificationService`, `auditService`, `socketService`.

## Integration
- **Notifications**:
  - `MENU_UPLOADED`, `PROMO_UPLOADED`, `MEDIA_UPDATED`, `MEDIA_DELETED`.
- **Audits**: Logs `UPLOAD_MENU_PHOTOS`, `UPLOAD_PROMOTIONAL_MEDIA`, `UPDATE_MEDIA_METADATA`, `DELETE_MEDIA`.
- **Socket Events**: Namespaced (`merchant:profile:`) via `merchantMediaEvents.js`.

## Error Handling
- `AppError` with `merchantConstants.ERROR_CODES`.
- Localized via `formatMessage` (`en.json`).
- Transactions ensure atomicity.
- Logs via `logger.error`.

## Usage Scenarios
- Upload menu photos for a branch.
- Upload promotional banners or videos.
- Update media titles or descriptions.
- Delete outdated media.

## Security
- **Authentication**: Via `authMiddleware`.
- **Authorization**: `merchant` role with permissions.
- **Validation**: Joi schemas in `merchantMediaValidator.js`.
- **Auditing**: Logs actions with IP.

## API Endpoints
- **POST /merchant/profile/media/:restaurantId/menu**
- **POST /merchant/profile/media/:restaurantId/promotional**
- **PATCH /merchant/profile/media/:mediaId/metadata**
- **DELETE /merchant/profile/media/:mediaId**

## Performance
- **Transactions**: Ensures consistency.
- **Validation**: Uses Joi for input.
- **Scalability**: Socket events use namespaced rooms.

## Notes
- **Constants**: Updated in `merchantConstants.js`.
- **Localization**: Supports `en.json`.
- **Socket Events**: Namespaced.
- **Models**: Unchanged.
- **No Points**: No gamification for media operations.

## Example Workflow
1. Merchant sends `POST /merchant/profile/media/123/menu`.
2. Middleware authenticates, validates.
3. Service uploads photos.
4. Controller sends notifications, emits socket, logs audit.
5. Response with photo URLs.