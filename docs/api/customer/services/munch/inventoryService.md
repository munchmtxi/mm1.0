Documentation File
C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\services\munch\inventoryService.md

markdown

Collapse

Unwrap

Copy
# Inventory Service API

## GET /api/customer/munch/inventory/{restaurantId}/menu

Retrieves menu items for a restaurant with availability status.

### Authentication
- **Middleware**: `authenticate.optional`, `restrictTo('customer').optional`, `checkPermissions('browse_menu').optional`
- **Header**: `Authorization: Bearer <JWT_TOKEN>` (optional)

### Parameters
| Field         | Type   | Required | Description           |
|---------------|--------|----------|-----------------------|
| restaurantId  | Integer| Yes      | Restaurant branch ID  |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "data": {
      "restaurantId": "integer",
      "menuItems": [
        {
          "id": "integer",
          "name": "string",
          "description": "string",
          "price": "number",
          "currency": "string",
          "dietaryFilters": ["string"],
          "isAvailable": "boolean",
          "category": "string",
          "discount": "number",
          "promotion": "string"
        }
      ]
    }
  }
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	RESTAURANT_NOT_FOUND	Restaurant not found
Socket Events
Event: menu:viewed
Payload:
json

Collapse

Unwrap

Copy
{
  "restaurantId": "integer",
  "customerId": "string"
}
GET /api/customer/munch/inventory/{itemId}/availability
Checks the availability of a specific menu item.

Authentication
Middleware: authenticate.optional, restrictTo('customer').optional, checkPermissions('check_availability').optional
Header: Authorization: Bearer <JWT_TOKEN> (optional)
Parameters

Field	Type	Required	Description
itemId	Integer	Yes	Menu item ID
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
    "itemId": "integer",
    "isAvailable": "boolean",
    "quantityAvailable": "integer"
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	MENU_ITEM_NOT_FOUND	Menu item not found
Socket Events
Event: availability:checked
Payload:
json

Collapse

Unwrap

Copy
{
  "itemId": "integer",
  "customerId": "string"
}