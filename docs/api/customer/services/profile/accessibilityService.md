Accessibility Documentation File
C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\services\profile\accessibility\accessibilityService.md

markdown

Collapse

Unwrap

Copy
# Accessibility Service API

## PATCH /api/customer/profile/accessibility/screen-reader

Enables or disables screen reader compatibility.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('manageProfile')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field   | Type    | Required | Description                    |
|---------|---------|----------|--------------------------------|
| enabled | Boolean | Yes      | Enable/disable screen reader   |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "data": {
      "userId": "string",
      "screenReaderEnabled": "boolean"
    }
  }
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_SCREEN_READER_SETTING	Screen reader setting must be boolean
404	CUSTOMER_NOT_FOUND	Customer not found
Socket Events
Event: accessibility:screen_reader_updated
Payload:
json

Collapse

Unwrap

Copy
{
  "userId": "string",
  "screenReaderEnabled": "boolean"
}
Notifications
Sent to customer with localized screen reader update message.
PATCH /api/customer/profile/accessibility/font-size
Adjusts font size for the UI.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('manageProfile')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
fontSize	Number	Yes	Font size in range [min, max]
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "userId": "string",
    "fontSize": "number"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_FONT_SIZE	Font size must be between [min, max]
404	CUSTOMER_NOT_FOUND	Customer not found
Socket Events
Event: accessibility:font_size_updated
Payload:
json

Collapse

Unwrap

Copy
{
  "userId": "string",
  "fontSize": "number"
}
Notifications
Sent to customer with localized font size update message.
PATCH /api/customer/profile/accessibility/language
Sets the UI language.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('manageProfile')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
language	String	Yes	Supported language code
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "userId": "string",
    "language": "string"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_LANGUAGE	Unsupported language
404	CUSTOMER_NOT_FOUND	Customer not found
Socket Events
Event: accessibility:language_updated
Payload:
json

Collapse

Unwrap

Copy
{
  "userId": "string",
  "language": "string"
}
Notifications
Sent to customer with localized language update message.