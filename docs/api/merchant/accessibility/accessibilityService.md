API Documentation
File: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\merchant\accessibility\accessibilityService.md

markdown

Collapse

Unwrap

Copy
# Accessibility Service API Documentation

This document details the API endpoints for the Accessibility Service, which manages accessibility settings for merchants, including screen readers, font size adjustments, and multi-language support.

## Base URL
`https://api.example.com/api/merchants`

## Endpoints

### 1. Enable Screen Readers
Enables screen reader support for a merchant and their branches.

- **Method**: POST
- **Path**: `/{merchantId}/screen-readers`
- **Parameters**:
  - `merchantId` (path, string, UUID, required): Merchant ID.
- **Responses**:
  - **200**: Success
    ```json
    {
      "success": true,
      "data": {
        "merchantId": "uuid",
        "screenReaderEnabled": true,
        "language": "en",
        "action": "screenReaderEnabled"
      },
      "message": "Screen readers enabled for merchant uuid"
    }
400: Invalid input or screen reader already enabled
403: Merchant access required
404: Merchant not found
Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST \
  https://api.example.com/api/merchants/123e4567-e89b-12d3-a456-426614174000/screen-readers \
  -H 'Content-Type: application/json'
2. Adjust Font Size
Adjusts the font size for a merchant’s accessibility settings.

Method: PATCH
Path: /{merchantId}/fonts
Parameters:
merchantId (path, string, UUID, required): Merchant ID.
Body:
json

Collapse

Unwrap

Copy
{
  "fontSize": 16
}
Responses:
200: Success
json

Collapse

Unwrap

Copy
{
  "success": true,
  "data": {
    "merchantId": "uuid",
    "fontSize": 16,
    "previousFontSize": 14,
    "language": "en",
    "action": "fontAdjusted"
  },
  "message": "Font size adjusted to 16 for merchant"
}
400: Invalid font size
403: Merchant access required
404: Merchant not found
Example:
bash

Collapse

Unwrap

Run

Copy
curl -X PATCH \
  https://api.example.com/api/merchants/123e4567-e89b-12d3-a456-426614174000/fonts \
  -H 'Content-Type: application/json' \
  -d '{"fontSize": 16}'
3. Update Language
Updates the language for a merchant and their branches.

Method: PATCH
Path: /{merchantId}/language
Parameters:
merchantId (path, string, UUID, required): Merchant ID.
Body:
json

Collapse

Unwrap

Copy
{
  "language": "es"
}
Responses:
200: Success
json

Collapse

Unwrap

Copy
{
  "success": true,
  "data": {
    "merchantId": "uuid",
    "language": "es",
    "previousLanguage": "en",
    "action": "languageSupported"
  },
  "message": "Language updated to es for merchant"
}
400: Invalid language or language already set
403: Merchant access required
404: Merchant not found
Example:
bash

Collapse

Unwrap

Run

Copy
curl -X PATCH \
  https://api.example.com/api/merchants/123e4567-e89b-12d3-a456-426614174000/language \
  -H 'Content-Type: application/json' \
  -d '{"language": "es"}'
Socket Events
JOIN_ACCESSIBILITY_ROOM: Joins a merchant-specific room (merchant:{merchantId}).
ACCESSIBILITY_UPDATED: Broadcasts accessibility updates (e.g., screen reader enabled, font adjusted).
ERROR: Emits error messages for invalid socket requests.
ROOM_JOINED: Confirms successful room join.
Notes
All endpoints require authentication (handled in main route index).
Responses are localized based on the merchant’s preferred language.
Notifications are sent via push for each action.
Audit logs are created for all actions using auditService.
Socket events are emitted to merchant:{merchantId} rooms for real-time updates.