Documentation File
File Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\driver\profile\profile.md

markdown

Collapse

Unwrap

Copy
# Driver Profile API Documentation

## Overview
The Driver Profile API manages driver profile operations, including updating personal and vehicle information, uploading certifications, retrieving profile details, and verifying compliance. It integrates with common services and automatically awards gamification points for driver actions. The API aligns with the platform's localization and constants, supporting multiple languages as defined in the driver constants.

## Service File
**Path**: `src/services/driver/profile/profileService.js`

The service handles core profile management logic:
- **updateProfile**: Updates driver details (name, email, phone, vehicle type) and awards points for `profile_update`.
- **uploadCertification**: Uploads certifications (driver’s license or insurance) and awards points for `certification_upload`.
- **getProfile**: Retrieves driver profile details and awards points for `profile_access`.
- **verifyProfile**: Validates profile compliance and awards points for `profile_verification`.

The service uses the `Driver` model, with constants from `driverConstants`. Common services (`socketService`, `notificationService`, `auditService`, `imageService`, `pointService`) are injected from the controller.

## Controller File
**Path**: `src/controllers/driver/profile/profileController.js`

Handles HTTP requests and responses:
- **updateProfile**: Processes PUT requests to update driver profiles.
- **uploadCertification**: Handles POST requests to upload certifications.
- **getProfile**: Manages GET requests to fetch profile details.
- **verifyProfile**: Processes POST requests to verify profile compliance.

Injects common services and passes them to the service layer.

## Validation File
**Path**: `src/validators/driver/profile/profileValidator.js`

Uses Joi to validate:
- **updateProfile**: Validates optional fields: `name` (2-100 characters), `email` (valid email), `phone` (E.164 format), `vehicleType` (from `driverConstants.PROFILE_CONSTANTS.VEHICLE_TYPES`).
- **uploadCertification**: Ensures `type` is either `driver_license` or `insurance`. Allows unknown fields for file handling.
- **getProfile** and **verifyProfile**: No validation required.

## Middleware File
**Path**: `src/middleware/driver/profile/profileMiddleware.js`

- **uploadCertificationFile**: Uses multer to handle file uploads, restricting to JPEG, PNG, or PDF files with a 5MB limit.

## Route File
**Path**: `src/routes/driver/profile/profileRoutes.js`

Defines Express routes with Swagger documentation:
- **PUT /driver/profile**: Updates driver profile.
- **POST /driver/profile/certificate**: Uploads a certification.
- **GET /driver/profile**: Retrieves driver profile.
- **POST /driver/profile/verify**: Verifies profile compliance.

Authentication is handled at the main route index.

## Events File
**Path**: `src/socket/events/driver/profile/profileEvents.js`

Defines namespaced socket events:
- `./profile:updated`
- `./profile:certification_updated`
- `./profile:retrieved`
- `./profile:verified`

## Handler File
**Path**: `src/socket/handlers/driver/profile/profileHandler.js`

Initializes socket event listeners to handle and broadcast profile-related events.

## Localization File
**Path**: `src/locales/driver/profile/en.json`

Contains English translations for driver-facing messages:
- `profile.updated`: "Driver profile {{driverId}} updated successfully"
- `profile.certification_updated`: "{{type}} certification uploaded successfully"
- `profile.retrieved`: "Driver profile {{driverId}} retrieved successfully"
- `profile.verified`: "Driver profile verified successfully"

## Constants
Uses constants from:
- `driverConstants.js`: Driver settings, notification types, vehicle types, error codes, and gamification actions (including `certification_upload` and assumed `profile_update`, `profile_access`, `profile_verification`).

## Endpoints

### PUT /driver/profile
- **Description**: Updates driver profile details.
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "vehicleType": "car"
  }
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "id": 123,
    "user_id": 456,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "vehicle_type": "car"
  },
  "message": "Driver profile 123 updated successfully"
}
Points Awarded: 8 points for profile_update (assumed action).
POST /driver/profile/certificate
Description: Uploads a certification file.
Request Body: Multipart form-data with type (driver_license or insurance) and file.
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "imageUrl": "https://storage.example.com/driver_license_123.jpg"
  },
  "message": "driver_license certification uploaded successfully"
}
Points Awarded: 50 points for certification_upload.
GET /driver/profile
Description: Retrieves driver profile details.
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "id": 123,
    "user_id": 456,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "preferred_language": "en",
    "vehicle_type": "car",
    "license_number": "ABC123",
    "license_picture_url": "https://storage.example.com/driver_license_123.jpg",
    "insurance_picture_url": null,
    "status": "active",
    "created_at": "2025-06-11T15:00:00Z",
    "updated_at": "2025-06-11T15:00:00Z"
  }
}
Points Awarded: 5 points for profile_access (assumed action).
POST /driver/profile/verify
Description: Verifies driver profile compliance.
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "isCompliant": true,
    "details": "All required fields and certifications provided."
  },
  "message": "Driver profile verified successfully"
}
Points Awarded: 10 points for profile_verification (assumed action).
Gamification Integration
Points are awarded automatically:

profile_update: 8 points for updating profile (assumed action).
certification_upload: 50 points for uploading certifications.
profile_access: 5 points for accessing profile (assumed action).
profile_verification: 10 points for verifying profile (assumed action). Points are managed by pointService and tied to driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.
Localization
All driver-facing messages use formatMessage with translations from en.json, supporting the driver’s preferred_language and placeholders for dynamic data (e.g., driverId, type).

Internationalization
The service supports multiple languages as defined in driverConstants (assumed to align with munchConstants.MUNCH_SETTINGS.SUPPORTED_LANGUAGES: en, es, fr, de, it, sw, ny, pt, hi, yo, zu). The preferred_language field in the Driver model determines the language for notifications and messages.

Dependencies
Models: Driver
Constants: driverConstants
Utilities: AppError, logger, formatMessage, validation
Services: socketService, notificationService, auditService, imageService, pointService
Error Handling
Uses AppError with error codes from driverConstants:

DRIVER_NOT_FOUND: Driver not found.
ERR_INVALID_EMAIL: Invalid email format.
ERR_INVALID_PHONE: Invalid phone format.
INVALID_VEHICLE_TYPE: Invalid vehicle type.
INVALID_CERTIFICATION_TYPE: Invalid certification type.
INVALID_FILE_DATA: Invalid file data.
INCOMPLETE_PROFILE: Missing required profile fields.
Notes
Assumed gamification actions profile_update, profile_access, and profile_verification. Add to driverConstants.js under GAMIFICATION_CONSTANTS.DRIVER_ACTIONS:
javascript

Collapse

Unwrap

Run

Copy
{ action: 'profile_update', points: 8, walletCredit: 0.15 },
{ action: 'profile_access', points: 5, walletCredit: 0.10 },
{ action: 'profile_verification', points: 10, walletCredit: 0.20 }
The preferred_language field is used for localization, assumed to be part of the Driver model.
File uploads are handled by multer in middleware, with validation for JPEG, PNG, or PDF files up to 5MB.
The imageService.uploadImage is assumed to handle secure file storage and return a URL.