# MerchantProfileService Documentation

## Overview
The `MerchantProfileService` manages core merchant profile operations, including business details, country settings, and localization for the Merchant Role System. Gamification points for profile completion are awarded automatically in the controller. Integrates with `merchantConstants.js` for configuration.

## Methods

### `updateBusinessDetails`
- **Purpose**: Updates merchant business details (e.g., name, phone, hours).
- **Parameters**:
  - `merchantId`: Number, merchant ID.
  - `details`: Object with `businessName`, `phone`, `businessHours`, `businessType`, `businessTypeDetails`.
- **Returns**: Updated merchant object.
- **Errors**:
  - `ERROR_CODES[1]` (404): Merchant not found.
  - `ERROR_CODES[5]` (400): Invalid phone, hours, business type, or details.

### `setCountrySettings`
- **Purpose**: Configures merchant country settings for currency.
- **Parameters**:
  - `merchantId`: Number, merchant ID.
  - `country`: String, country code.
- **Returns**: Updated merchant object.
- **Errors**:
  - `ERROR_CODES[1]` (404): Merchant not found.
  - `ERROR_CODES[5]` (400): Unsupported country.

### `manageLocalization`
- **Purpose**: Updates merchant localization settings (e.g., language).
- **Parameters**:
  - `merchantId`: Number, merchant ID.
  - `settings`: Object with `language`.
- **Returns**: Updated merchant object.
- **Errors**:
  - `ERROR_CODES[1]` (404): Merchant not found.
  - `ERROR_CODES[5]` (400): Invalid language.

## Points
Points awarded via `merchantConstants.GAMIFICATION_CONSTANTS`:
- **profile_completion**: 100 points, 2.00 wallet credit.
- **Capped**: 1000/day.
- **Automated**: In `updateBusinessDetailsController` when profile is complete.

## Dependencies
- **Models**: `Merchant`, `User`.
- **Constants**: `merchantConstants`.
- **Utilities**: `formatMessage`, `AppError`, `logger`, `validation`.
- **Services** (controller): `notificationService`, `auditService`, `socketService`, `pointService`.

## Integration
- **Notifications**:
  - `BUSINESS_UPDATED`, `COUNTRY_UPDATED`, `LOCALIZATION_UPDATED`, `PROFILE_POINTS_AWARDED`.
- **Audits**: Logs `UPDATE_BUSINESS_DETAILS`, `SET_COUNTRY_SETTINGS`, `MANAGE_LOCALIZATION`, `AWARD_PROFILE_POINTS`.
- **Socket Events**: Namespaced (`merchant:profile:`) via `merchantProfileEvents.js`.
- **Gamification**: Points in controller for complete profile updates.

## Error Handling
- `AppError` with `merchantConstants.ERROR_CODES`.
- Localized via `formatMessage` (`en.json`).
- Transactions ensure atomicity.
- Logs via `logger.error`.

## Usage Scenarios
- Update merchant business details.
- Set country for currency settings.
- Configure language for localization.
- Award points for profile completion.

## Security
- **Authentication**: Via `authMiddleware`.
- **Authorization**: `merchant` role with permissions.
- **Validation**: Joi schemas in `merchantProfileValidator.js`.
- **Auditing**: Logs actions with IP.

## API Endpoints
- **PATCH /merchant/profile/:merchantId/business**
- **PATCH /merchant/profile/:merchantId/country**
- **PATCH /merchant/profile/:merchantId/localization**

## Performance
- **Transactions**: Ensures consistency.
- **Validation**: Uses Joi for input.
- **Scalability**: Socket events use namespaced rooms.

## Notes
- **Constants**: Updated in `merchantConstants.js`.
- **Localization**: Supports `en.json`.
- **Socket Events**: Namespaced.
- **Models**: Unchanged.
- **Points**: Automated in controller, capped at 1000/day.

## Example Workflow
1. Merchant sends `PATCH /merchant/profile/123/business`.
2. Middleware authenticates, validates.
3. Service updates profile.
4. Controller sends notifications, emits socket, logs audit, awards points if complete.
5. Response with updated merchant.