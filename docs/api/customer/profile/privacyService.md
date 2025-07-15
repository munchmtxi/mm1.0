`privacyService.md`
**Path:** `C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\profile\privacyService.md`

```markdown
# Privacy Service API Documentation

Manages customer privacy settings, including location visibility and data sharing preferences.

## Base URL
`/api/v1/customer/profile/privacy`

## Authentication
Requires JWT token in the `Authorization` header (handled by main route index).

## Endpoints

### 1. Set Privacy Settings
Updates customer privacy settings for location visibility and data sharing.

- **Method**: POST
- **Path**: `/settings`
- **Request Body**:
  - `location_visibility` (string, required): Visibility setting ('public', 'private', 'contacts').
  - `data_sharing` (boolean, required): Enable or disable data sharing.
  - `languageCode` (string, optional): ISO 639-1 language code (e.g., 'en', 'es'). Defaults to 'en'.
- **Response**:
  - **200 OK**:
    ```json
    {
      "success": true,
      "message": "Privacy settings updated successfully",
      "data": { "location_visibility": "private", "data_sharing": false }
    }
400 Bad Request:
json

Collapse

Unwrap

Copy
{ "message": "Invalid privacy settings", "statusCode": 400, "errorCode": "INVALID_PRIVACY_SETTINGS" }
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{ "message": "Privacy settings update failed", "statusCode": 500, "errorCode": "PRIVACY_UPDATE_FAILED" }
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/v1/customer/profile/privacy/settings \
-H "Content-Type: application/json" \
-d '{"location_visibility": "private", "data_sharing": false, "languageCode": "en"}'
2. Manage Data Access
Manages third-party data access permissions.

Method: POST
Path: /data-access
Request Body:
permissions (object, required): Permissions object (e.g., { analytics: true, marketing: false }).
languageCode (string, optional): ISO 639-1 language code. Defaults to 'en'.
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Data access settings updated successfully",
  "data": { "permissions": { "analytics": true, "marketing": false } }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{ "message": "Invalid permissions", "statusCode": 400, "errorCode": "INVALID_PERMISSIONS" }
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{ "message": "Data access update failed", "statusCode": 500, "errorCode": "PRIVACY_UPDATE_FAILED" }
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/v1/customer/profile/privacy/data-access \
-H "Content-Type: application/json" \
-d '{"permissions": {"analytics": true, "marketing": false}, "languageCode": "en"}'
Error Codes
INVALID_PRIVACY_SETTINGS: Invalid or missing privacy settings.
INVALID_PERMISSIONS: Invalid permissions object.
PRIVACY_UPDATE_FAILED: Server error during privacy update.
Notes
All endpoints award gamification points and emit socket events.
Responses are localized based on the languageCode parameter.
Audit logs are created for compliance.