`profileService.md`
**Path:** `C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\profile\profileService.md`

```markdown
# Profile Service API Documentation

Manages customer profile settings, including phone number, address, country, language, and dietary preferences.

## Base URL
`/api/v1/customer/profile`

## Authentication
Requires JWT token in the `Authorization` header (handled by main route index).

## Endpoints

### 1. Update Profile
Updates customer profile details.

- **Method**: POST
- **Path**: `/update`
- **Request Body**:
  - `phone_number` (string, optional): Customer phone number.
  - `address` (object, optional): Address object (e.g., `{ street: "123 Main St", city: "New York", countryCode: "US" }`).
  - `languageCode` (string, optional): ISO 639-1 language code (e.g., 'en', 'es'). Defaults to 'en'.
- **Response**:
  - **200 OK**:
    ```json
    {
      "success": true,
      "message": "Profile updated successfully",
      "data": { "phone_number": "1234567890", "address": { "street": "123 Main St", "city": "New York", "countryCode": "US" } }
    }
400 Bad Request:
json

Collapse

Unwrap

Copy
{ "message": "Invalid profile data", "statusCode": 400, "errorCode": "INVALID_PROFILE_DATA" }
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{ "message": "Profile update failed", "statusCode": 500, "errorCode": "PROFILE_UPDATE_FAILED" }
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/v1/customer/profile/update \
-H "Content-Type: application/json" \
-d '{"phone_number": "1234567890", "address": {"street": "123 Main St", "city": "New York", "countryCode": "US"}, "languageCode": "en"}'
2. Set Country
Sets customer's country.

Method: POST
Path: /country
Request Body:
country (string, required): ISO 3166-1 alpha-2 country code (e.g., 'US', 'ES').
languageCode (string, optional): ISO 639-1 language code. Defaults to 'en'.
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Country set successfully",
  "data": { "country": "US" }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{ "message": "Invalid country code", "statusCode": 400, "errorCode": "INVALID_COUNTRY" }
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{ "message": "Country set failed", "statusCode": 500, "errorCode": "PROFILE_UPDATE_FAILED" }
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/v1/customer/profile/country \
-H "Content-Type: application/json" \
-d '{"country": "US", "languageCode": "en"}'
3. Set Language
Sets customer's preferred language.

Method: POST
Path: /language
Request Body:
languageCode (string, required): ISO 639-1 language code (e.g., 'en', 'es').
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Language set successfully",
  "data": { "languageCode": "es" }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{ "message": "Invalid language code", "statusCode": 400, "errorCode": "INVALID_LANGUAGE" }
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{ "message": "Language set failed", "statusCode": 500, "errorCode": "PROFILE_UPDATE_FAILED" }
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/v1/customer/profile/language \
-H "Content-Type: application/json" \
-d '{"languageCode": "es"}'
4. Set Dietary Preferences
Sets customer's dietary preferences.

Method: POST
Path: /dietary-preferences
Request Body:
preferences (array, required): Array of dietary preferences (e.g., ['vegan', 'gluten_free']).
languageCode (string, optional): ISO 639-1 language code. Defaults to 'en'.
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Dietary preferences set successfully",
  "data": { "dietaryPreferences": ["vegan", "gluten_free"] }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{ "message": "Invalid dietary preferences", "statusCode": 400, "errorCode": "INVALID_DIETARY_PREFERENCES" }
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{ "message": "Dietary preferences set failed", "statusCode": 500, "errorCode": "PROFILE_UPDATE_FAILED" }
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/v1/customer/profile/dietary-preferences \
-H "Content-Type: application/json" \
-d '{"preferences": ["vegan", "gluten_free"], "languageCode": "en"}'
5. Set Default Address
Sets customer's default address.

Method: POST
Path: /default-address
Request Body:
addressId (string, required): ID of the address to set as default.
languageCode (string, optional): ISO 639-1 language code. Defaults to 'en'.
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Default address set successfully",
  "data": { "addressId": "12345" }
}
400 Bad Request:
json

Collapse

Unwrap

Copy
{ "message": "Invalid address ID", "statusCode": 400, "errorCode": "INVALID_ADDRESS_ID" }
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{ "message": "Default address set failed", "statusCode": 500, "errorCode": "PROFILE_UPDATE_FAILED" }
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/v1/customer/profile/default-address \
-H "Content-Type: application/json" \
-d '{"addressId": "12345", "languageCode": "en"}'
6. Get Profile
Retrieves customer profile details.

Method: GET
Path: /
Query Parameters:
languageCode (string, optional): ISO 639-1 language code. Defaults to 'en'.
Response:
200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "phone_number": "1234567890",
    "address": { "street": "123 Main St", "city": "New York", "countryCode": "US" },
    "country": "US",
    "languageCode": "en",
    "dietaryPreferences": ["vegan"]
  }
}
500 Internal Server Error:
json

Collapse

Unwrap

Copy
{ "message": "Get profile failed", "statusCode": 500, "errorCode": "PROFILE_RETRIEVAL_FAILED" }
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X GET http://localhost:3000/api/v1/customer/profile?languageCode=en
Error Codes
INVALID_PROFILE_DATA: Invalid or missing profile data.
INVALID_COUNTRY: Invalid country code.
INVALID_LANGUAGE: Invalid language code.
INVALID_DIETARY_PREFERENCES: Invalid dietary preferences.
INVALID_ADDRESS_ID: Invalid address ID.
PROFILE_UPDATE_FAILED: Server error during profile update.
PROFILE_RETRIEVAL_FAILED: Server error during profile retrieval.
Notes
All endpoints (except GET) award gamification points and emit socket events.
Responses are localized based on the languageCode parameter.
Audit logs are created for compliance.