Privacy Documentation File
C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\services\profile\privacy\privacyService.md

markdown

Collapse

Unwrap

Copy
# Privacy Service API

## PATCH /api/customer/profile/privacy/settings

Updates customer privacy settings.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('manageProfile')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field             | Type    | Required | Description                           |
|-------------------|---------|----------|---------------------------------------|
| anonymizeLocation | Boolean | No       | Anonymize location data               |
| anonymizeProfile  | Boolean | No       | Anonymize profile data                |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "data": {
      "userId": "string",
      "settings": {
        "anonymizeLocation": "boolean",
        "anonymizeProfile": "boolean"
      }
    }
  }
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_PRIVACY_SETTINGS	Invalid privacy settings
400	INVALID_PRIVACY_SETTINGS_TYPE	Privacy settings must be boolean
404	CUSTOMER_NOT_FOUND	Customer not found
Socket Events
Event: privacy:settings_updated
Payload:
json

Collapse

Unwrap

Copy
{
  "userId": "string",
  "settings": {
    "anonymizeLocation": "boolean",
    "anonymizeProfile": "boolean"
  }
}
Notifications
Sent to customer with localized privacy settings update message.
PATCH /api/customer/profile/privacy/data-access
Updates customer data access permissions.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('manageProfile')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
shareWithMerchants	Boolean	No	Share data with merchants
shareWithThirdParties	Boolean	No	Share data with third parties
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
    "permissions": {
      "shareWithMerchants": "boolean",
      "shareWithThirdParties": "boolean"
    }
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_DATA_ACCESS_PERMISSIONS	Invalid data access permissions
400	INVALID_DATA_ACCESS_PERMISSIONS_TYPE	Data access permissions must be boolean
404	CUSTOMER_NOT_FOUND	Customer not found
Socket Events
Event: privacy:data_access_updated
Payload:
json

Collapse

Unwrap

Copy
{
  "userId": "string",
  "permissions": {
    "shareWithMerchants": "boolean",
    "shareWithThirdParties": "boolean"
  }
}
Notifications
Sent to customer with localized data access permissions update message.