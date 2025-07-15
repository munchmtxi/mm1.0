Documentation File
File Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\driver\profile\settings.md

markdown

Collapse

Unwrap

Copy
# Driver Settings API Documentation

## Overview
The Driver Settings API manages driver profile settings, including country, language, accessibility features, and privacy preferences. It integrates with common services and automatically awards gamification points for settings updates. The API aligns with the platform's localization and constants, supporting multiple countries and languages as defined in the driver and auth constants.

## Service File
**Path**: `src/services/driver/profile/settingsService.js`

The service handles core settings management logic:
- **setCountry**: Configures the driver’s country for currency and time format, awards points for `settings_update`.
- **setLanguage**: Overrides the UI language, updates accessibility settings, and awards points for `settings_update`.
- **configureAccessibility**: Configures accessibility features (screen reader, font size), awards points for `settings_update`.
- **updatePrivacySettings**: Updates privacy preferences (location visibility, data sharing, notifications), awards points for `settings_update`.

The service uses `Driver`, `User`, `AccessibilitySettings`, and `sequelize` models, with constants from `driverConstants` and `authConstants`. Common services (`socketService`, `notificationService`, `auditService`, `pointService`) are injected from the controller.

## Controller File
**Path**: `src/controllers/driver/profile/settingsController.js`

Handles HTTP requests and responses:
- **setCountry**: Processes PUT requests to set the driver’s country.
- **setLanguage**: Handles PUT requests to set the driver’s language.
- **configureAccessibility**: Manages PUT requests to configure accessibility settings.
- **updatePrivacySettings**: Processes PUT requests to update privacy settings.

Injects common services and passes them to the service layer.

## Validation File
**Path**: `src/validators/driver/profile/settingsValidator.js`

Uses Joi to validate:
- **setCountry**: Ensures `country` is in `authConstants.AUTH_SETTINGS.SUPPORTED_COUNTRIES`.
- **setLanguage**: Validates `language` is in `driverConstants.DRIVER_SETTINGS.SUPPORTED_LANGUAGES`.
- **configureAccessibility**: Checks `screenReaderEnabled` (boolean) and `fontSize` (within `driverConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE`).
- **updatePrivacySettings**: Validates optional fields: `location_visibility`, `data_sharing` (from `driverConstants.PROFILE_CONSTANTS.PRIVACY_SETTINGS`), and `notifications` (email, sms, push, whatsapp booleans).

## Middleware File
**Path**: `src/middleware/driver/profile/settingsMiddleware.js`

- **checkDriverExists**: Verifies the driver exists before allowing settings operations.

## Route File
**Path**: `src/routes/driver/profile/settingsRoutes.js`

Defines Express routes with Swagger documentation:
- **PUT /driver/settings/country**: Sets the driver’s country.
- **PUT /driver/settings/language**: Sets the driver’s language.
- **PUT /driver/settings/accessibility**: Configures accessibility settings.
- **PUT /driver/settings/privacy**: Updates privacy settings.

Authentication is handled at the main route index.

## Events File
**Path**: `src/socket/events/driver/profile/settingsEvents.js`

Defines namespaced socket events:
- `./settings:country_updated`
- `./settings:language_updated`
- `./settings:accessibility_updated`
- `./settings:privacy_updated`

## Handler File
**Path**: `src/socket/handlers/driver/profile/settingsHandler.js`

Initializes socket event listeners to handle and broadcast settings-related events.

## Localization File
**Path**: `src/locales/driver/profile/en.json`

Contains English translations for driver-facing messages, updated with settings-specific messages:
- `settings.country_updated`: "Country updated to {{country}}"
- `settings.language_updated`: "Language updated to {{language}}"
- `settings.accessibility_updated`: "Accessibility settings updated successfully"
- `settings.privacy_updated`: "Privacy settings updated successfully"
Includes existing profile-related translations.

## Constants
Uses constants from:
- `driverConstants.js`: Driver settings, notification types, accessibility constants, privacy settings, error codes, and gamification actions (including assumed `settings_update`).
- `authConstants.js`: Supported countries for country settings.

## Endpoints

### PUT /driver/settings/country
- **Description**: Sets the driver’s country for currency and time format.
- **Request Body**:
  ```json
  {
    "country": "US"
  }
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Country updated to US"
}
Points Awarded: 5 points for settings_update (assumed action).
PUT /driver/settings/language
Description: Sets the driver’s UI language.
Request Body:
json

Collapse

Unwrap

Copy
{
  "language": "en"
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Language updated to en"
}
Points Awarded: 5 points for settings_update (assumed action).
PUT /driver/settings/accessibility
Description: Configures accessibility settings.
Request Body:
json

Collapse

Unwrap

Copy
{
  "screenReaderEnabled": true,
  "fontSize": 16
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Accessibility settings updated successfully"
}
Points Awarded: 5 points for settings_update (assumed action).
PUT /driver/settings/privacy
Description: Updates privacy preferences.
Request Body:
json

Collapse

Unwrap

Copy
{
  "location_visibility": "anonymized",
  "data_sharing": "none",
  "notifications": {
    "email": true,
    "sms": false,
    "push": true,
    "whatsapp": false
  }
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Privacy settings updated successfully"
}
Points Awarded: 5 points for settings_update (assumed action).
Gamification Integration
Points are awarded automatically:

settings_update: 5 points for updating any settings (assumed action). Points are managed by pointService and tied to driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.
Localization
All driver-facing messages use formatMessage with translations from en.json, supporting the driver’s preferred_language (or driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE as fallback) and placeholders for dynamic data (e.g., country, language).

Internationalization
The service supports multiple countries and languages:

Countries: Defined in authConstants.AUTH_SETTINGS.SUPPORTED_COUNTRIES (assumed to align with munchConstants.MUNCH_SETTINGS.SUPPORTED_COUNTRIES: US, GB, EU, CA, AU, MW, TZ, KE, MZ, NG, ZA, IN, BR).
Languages: Defined in driverConstants.DRIVER_SETTINGS.SUPPORTED_LANGUAGES (assumed to align with munchConstants.MUNCH_SETTINGS.SUPPORTED_LANGUAGES: en, es, fr, de, it, sw, ny, pt, hi, yo, zu). The preferred_language field in the User model determines the language for notifications and messages.
Dependencies
Models: Driver, User, AccessibilitySettings, sequelize
Constants: driverConstants, authConstants
Utilities: AppError, logger, formatMessage
Services: socketService, notificationService, auditService, pointService
Error Handling
Uses AppError with error codes from driverConstants:

DRIVER_NOT_FOUND: Driver not found.
INVALID_DRIVER: Invalid country, language, accessibility settings, privacy settings, or operation failure.
Notes
Assumed gamification action settings_update (5 points). Add to driverConstants.js under GAMIFICATION_CONSTANTS.DRIVER_ACTIONS:
javascript

Collapse

Unwrap

Run

Copy
{ action: 'settings_update', points: 5, walletCredit: 0.10 }
The AccessibilitySettings model is assumed to have fields user_id, language, screenReaderEnabled, and fontSize.
The User model is assumed to have fields country, preferred_language, privacy_settings, and notification_preferences.
The SCHEDULE_UPDATE notification type is reused, assuming it’s appropriate for settings changes.