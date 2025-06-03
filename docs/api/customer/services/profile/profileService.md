Documentation File
C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\services\profile\profileService.md

markdown

Collapse

Unwrap

Copy
# Profile Service API

## PATCH /api/customer/profile

Updates customer profile information.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('manageProfile')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field  | Type   | Required | Description                     |
|--------|--------|----------|---------------------------------|
| name   | String | No       | Customer name                   |
| email  | String | No       | Customer email                  |
| phone  | String | No       | Customer phone number           |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "data": {
      "customerId": "integer",
      "updatedFields": {
        "name": "string",
        "email": "string",
        "phone": "string"
      }
    }
  }
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_EMAIL	Invalid email format
400	INVALID_PHONE	Invalid phone format
404	CUSTOMER_NOT_FOUND	Customer not found
Socket Events
Event: profile:updated
Payload:
json

Collapse

Unwrap

Copy
{
  "userId": "string",
  "customerId": "integer",
  "updatedFields": {
    "name": "string",
    "email": "string",
    "phone": "string"
  }
}
Notifications
Sent to customer with localized profile update message.
PATCH /api/customer/profile/country
Sets the customer's country.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('manageProfile')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
countryCode	String	Yes	Country code (e.g., US, GB)
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
    "customerId": "integer",
    "countryCode": "string",
    "currency": "string"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	UNSUPPORTED_COUNTRY	Unsupported country
404	CUSTOMER_NOT_FOUND	Customer not found
Socket Events
Event: profile:country_updated
Payload:
json

Collapse

Unwrap

Copy
{
  "userId": "string",
  "customerId": "integer",
  "countryCode": "string"
}
Notifications
Sent to customer with localized country update message.
PATCH /api/customer/profile/language
Sets the customer's UI language.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('manageProfile')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
languageCode	String	Yes	Language code (e.g., en, es)
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
    "customerId": "integer",
    "languageCode": "string"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_LANGUAGE	Unsupported language
404	CUSTOMER_NOT_FOUND	Customer not found
Socket Events
Event: profile:language_updated
Payload:
json

Collapse

Unwrap

Copy
{
  "userId": "string",
  "customerId": "integer",
  "languageCode": "string"
}
Notifications
Sent to customer with localized language update message.
PATCH /api/customer/profile/dietary
Sets the customer's dietary preferences.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('manageProfile')
Header: Authorization: Bearer <JWT_TOKEN>
Request Body

Field	Type	Required	Description
preferences	Array	Yes	List of dietary preferences (e.g., halal, vegan)
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
    "customerId": "integer",
    "preferences": ["string"]
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_DIETARY_FILTER	Invalid dietary preferences
404	CUSTOMER_NOT_FOUND	Customer not found
Socket Events
Event: profile:dietary_updated
Payload:
json

Collapse

Unwrap

Copy
{
  "userId": "string",
  "customerId": "integer",
  "preferences": ["string"]
}
Notifications
Sent to customer with localized dietary preferences update message.
GET /api/customer/profile
Retrieves the customer's profile.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('manageProfile')
Header: Authorization: Bearer <JWT_TOKEN>
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
    "id": "integer",
    "user_id": "string",
    "name": "string",
    "email": "string",
    "phone": "string",
    "preferred_language": "string",
    "country_code": "string",
    "currency": "string",
    "dietary_preferences": ["string"],
    "created_at": "string",
    "updated_at": "string"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
404	CUSTOMER_NOT_FOUND	Customer not found