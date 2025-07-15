accessibilityService.md
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\profile\accessibilityService.md

markdown

Collapse

Unwrap

Copy
# Accessibility Service API Documentation

Handles customer accessibility settings, including screen reader support, font size adjustments, and multi-language preferences.

## Base URL
`/api/v1/customer/profile/accessibility`

## Authentication
Requires JWT token in the `Authorization` header (handled by main route index).

## Endpoints

### 1. Enable Screen Readers
Enables or disables screen reader support for a customer.

- **Method**: POST
- **Path**: `/screen-readers`
- **Request Body**:
  - `enabled` (boolean, required): Enable or disable screen readers.
  - `languageCode` (string, optional): ISO 639-1 language code (e.g., 'en', 'es'). Defaults to 'en'.
- **Response**:
  - **200 OK**:
    ```json
    {
      "success": true,
      "message": "Accessibility settings updated successfully",
      "data": { "screenReaderEnabled": true }
    }
400 Bad Request:
json

Collapse

Unwrap

Copy
{ "message": "Invalid input", "statusCode": 400, "errorCode": "INVALID_INPUT" }
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{ "message": "Screen reader update failed", "statusCode": 500, "errorCode": "ACCESSIBILITY_UPDATE_FAILED" }
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/v1/customer/profile/accessibility/screen-readers \
-H "Content-Type: application/json" \
-d '{"enabled": true, "languageCode": "en"}'
2. Adjust Font Size
Adjusts font size for accessibility.

Method: POST
Path: /font-size
Request Body:
fontSize (string, required): Font size ('small', 'medium', 'large').
languageCode (string, optional): ISO 639-1 language code. Defaults to 'en'.
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Accessibility settings updated successfully",
  "data": { "fontSize": "large" }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{ "message": "Invalid font size", "statusCode": 400, "errorCode": "INVALID_FONT_SIZE" }
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{ "message": "Font size update failed", "statusCode": 500, "errorCode": "ACCESSIBILITY_UPDATE_FAILED" }
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/v1/customer/profile/accessibility/font-size \
-H "Content-Type: application/json" \
-d '{"fontSize": "large", "languageCode": "en"}'
3. Support Multi-Language
Sets accessibility language preference.

Method: POST
Path: /language
Request Body:
language (string, required): ISO 639-1 language code (e.g., 'en', 'es').
languageCode (string, optional): ISO 639-1 language code for response. Defaults to 'en'.
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Accessibility language updated successfully",
  "data": { "accessibilityLanguage": "es" }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{ "message": "Invalid language", "statusCode": 400, "errorCode": "INVALID_LANGUAGE" }
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{ "message": "Accessibility language update failed", "statusCode": 500, "errorCode": "ACCESSIBILITY_UPDATE_FAILED" }
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/v1/customer/profile/accessibility/language \
-H "Content-Type: application/json" \
-d '{"language": "es", "languageCode": "en"}'
Error Codes
INVALID_INPUT: Invalid or missing request parameters.
INVALID_FONT_SIZE: Invalid font size value.
INVALID_LANGUAGE: Unsupported language code.
ACCESSIBILITY_UPDATE_FAILED: Server error during accessibility update.
Notes
All endpoints award gamification points and emit socket events.
Responses are localized based on the languageCode parameter.
Audit logs are created for compliance.