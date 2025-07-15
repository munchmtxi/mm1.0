API Documentation: src/docs/api/customer/munch/inventoryService.md
markdown

Collapse

Unwrap

Copy
# Customer Inventory Service API Documentation

This document details the customer-facing inventory service APIs for the Munch module, allowing customers to retrieve menu items, check item availability, and view featured items for a restaurant.

**Base URL**: `/api/customer/munch/inventory`

**Last Updated**: July 5, 2025

## Endpoints

### 1. Get Menu Items

**Description**: Retrieves all published and in-stock menu items for a specified restaurant, including categories, attributes, modifiers, and discounts.

**Method**: `GET`

**Path**: `/{restaurantId}`

**Parameters**:
- **Path Parameters**:
  - `restaurantId` (string, UUID, required): The UUID of the restaurant (MerchantBranch).

**Headers**:
- `Accept-Language` (string, optional): ISO 639-1 language code (e.g., `en`, `es`). Defaults to `en`.

**Response**:
- **200 OK**:
  ```json
  {
    "success": true,
    "message": "Menu items retrieved successfully",
    "data": {
      "restaurantId": "uuid",
      "branchName": "string",
      "operatingHours": {},
      "currency": "string",
      "menuItems": [
        {
          "id": "uuid",
          "name": "string",
          "description": "string",
          "sku": "string",
          "price": number,
          "finalPrice": number,
          "currency": "string",
          "category": {
            "id": "uuid",
            "name": "string",
            "parentId": "uuid|null"
          },
          "attributes": ["string"],
          "modifiers": [
            {
              "id": "uuid",
              "type": "string",
              "name": "string",
              "priceAdjustment": number,
              "isRequired": boolean
            }
          ],
          "discounts": [
            {
              "id": "uuid",
              "type": "string",
              "value": number,
              "name": "string",
              "startDate": "ISO 8601",
              "endDate": "ISO 8601|null",
              "minQuantity": number,
              "maxQuantity": number|null,
              "minOrderAmount": number|null,
              "customerType": "string"
            }
          ],
          "isAvailable": boolean,
          "preparationTime": number,
          "images": ["string"],
          "thumbnail": "string",
          "tags": ["string"],
          "isFeatured": boolean,
          "nutritionalInfo": {}
        }
      ]
    }
  }
400 Bad Request: Invalid restaurantId or request parameters.
404 Not Found: Restaurant not found.
500 Internal Server Error: Server-side error.
Example Request:

bash

Collapse

Unwrap

Run

Copy
curl -X GET "http://localhost:3000/api/customer/munch/inventory/123e4567-e89b-12d3-a456-426614174000" \
-H "Accept-Language: en"
Example Response:

json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Menu items retrieved successfully",
  "data": {
    "restaurantId": "123e4567-e89b-12d3-a456-426614174000",
    "branchName": "Downtown Cafe",
    "operatingHours": { "monday": "09:00-17:00" },
    "currency": "USD",
    "menuItems": [
      {
        "id": "987e6543-e21b-12d3-a456-426614174001",
        "name": "Margherita Pizza",
        "description": "Classic pizza with tomato and mozzarella",
        "sku": "PIZZA-MARG",
        "price": 12.99,
        "finalPrice": 11.69,
        "currency": "USD",
        "category": { "id": "uuid", "name": "Pizzas", "parentId": null },
        "attributes": ["vegetarian"],
        "modifiers": [],
        "discounts": [
          {
            "id": "uuid",
            "type": "percentage",
            "value": 10,
            "name": "Weekly Special",
            "startDate": "2025-07-01T00:00:00Z",
            "endDate": "2025-07-07T23:59:59Z",
            "minQuantity": 1,
            "maxQuantity": null,
            "minOrderAmount": null,
            "customerType": "all"
          }
        ],
        "isAvailable": true,
        "preparationTime": 15,
        "images": ["https://example.com/pizza.jpg"],
        "thumbnail": "https://example.com/pizza_thumb.jpg",
        "tags": ["popular"],
        "isFeatured": true,
        "nutritionalInfo": { "calories": 800 }
      }
    ]
  }
}
2. Check Item Availability
Description: Checks the availability of a specific menu item, including applicable discounts and dietary filters.

Method: GET

Path: /item/{itemId}

Parameters:

Path Parameters:
itemId (string, UUID, required): The UUID of the menu item.
Headers:

Accept-Language (string, optional): ISO 639-1 language code (e.g., en, es). Defaults to en.
Response:

200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Item availability checked successfully",
  "data": {
    "itemId": "uuid",
    "isAvailable": boolean,
    "quantityAvailable": number,
    "applicableDiscounts": [
      {
        "id": "uuid",
        "type": "string",
        "value": number,
        "name": "string"
      }
    ],
    "preparationTime": number,
    "branchId": "uuid",
    "merchantId": "uuid",
    "dietaryFilters": ["string"]
  }
}
400 Bad Request: Invalid itemId.
404 Not Found: Item not found.
500 Internal Server Error: Server-side error.
Example Request:

bash

Collapse

Unwrap

Run

Copy
curl -X GET "http://localhost:3000/api/customer/munch/inventory/item/987e6543-e21b-12d3-a456-426614174001" \
-H "Accept-Language: en"
Example Response:

json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Item availability checked successfully",
  "data": {
    "itemId": "987e6543-e21b-12d3-a456-426614174001",
    "isAvailable": true,
    "quantityAvailable": 10,
    "applicableDiscounts": [
      {
        "id": "uuid",
        "type": "percentage",
        "value": 10,
        "name": "Weekly Special"
      }
    ],
    "preparationTime": 15,
    "branchId": "123e4567-e89b-12d3-a456-426614174000",
    "merchantId": "456e7890-e12b-34d5-a678-426614174002",
    "dietaryFilters": ["vegetarian"]
  }
}
3. Get Featured Items
Description: Retrieves featured menu items for a restaurant, with an optional limit parameter.

Method: GET

Path: /featured/{restaurantId}

Parameters:

Path Parameters:
restaurantId (string, UUID, required): The UUID of the restaurant.
Query Parameters:
limit (integer, optional): Maximum number of featured items (1 to 10, default: 5).
Headers:

Accept-Language (string, optional): ISO 639-1 language code (e.g., en, es). Defaults to en.
Response:

200 OK:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Featured items retrieved successfully",
  "data": {
    "restaurantId": "uuid",
    "featuredItems": [
      {
        "id": "uuid",
        "name": "string",
        "price": number,
        "finalPrice": number,
        "thumbnail": "string",
        "attributes": ["string"],
        "discounts": [
          {
            "id": "uuid",
            "type": "string",
            "value": number
          }
        ]
      }
    ]
  }
}
400 Bad Request: Invalid restaurantId or limit.
404 Not Found: Restaurant not found.
500 Internal Server Error: Server-side error.
Example Request:

bash

Collapse

Unwrap

Run

Copy
curl -X GET "http://localhost:3000/api/customer/munch/inventory/featured/123e4567-e89b-12d3-a456-426614174000?limit=3" \
-H "Accept-Language: en"
Example Response:

json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Featured items retrieved successfully",
  "data": {
    "restaurantId": "123e4567-e89b-12d3-a456-426614174000",
    "featuredItems": [
      {
        "id": "987e6543-e21b-12d3-a456-426614174001",
        "name": "Margherita Pizza",
        "price": 12.99,
        "finalPrice": 11.69,
        "thumbnail": "https://example.com/pizza_thumb.jpg",
        "attributes": ["vegetarian"],
        "discounts": [
          {
            "id": "uuid",
            "type": "percentage",
            "value": 10
          }
        ]
      }
    ]
  }
}
Socket Events
1. Subscribe to Menu Updates
Event: menu_update_subscribe

Payload:

json

Collapse

Unwrap

Copy
{
  "restaurantId": "uuid",
  "userId": "string",
  "role": "string"
}
Response Event: MENU_SUBSCRIPTION_CONFIRMED

Response Payload:

json

Collapse

Unwrap

Copy
{
  "userId": "string",
  "role": "string",
  "restaurantId": "uuid",
  "message": "Subscribed to menu updates"
}
Error Event: error

Error Payload:

json

Collapse

Unwrap

Copy
{
  "code": "string",
  "message": "string"
}
2. Subscribe to Item Availability Updates
Event: item_availability_subscribe

Payload:

json

Collapse

Unwrap

Copy
{
  "itemId": "uuid",
  "userId": "string",
  "role": "string"
}
Response Event: ITEM_AVAILABILITY_UPDATED

Response Payload:

json

Collapse

Unwrap

Copy
{
  "userId": "string",
  "role": "string",
  "itemId": "uuid",
  "isAvailable": boolean,
  "quantityAvailable": number,
  "message": "Item availability updated"
}
Error Event: error

Error Payload:

json

Collapse

Unwrap

Copy
{
  "code": "string",
  "message": "string"
}
Notes
All endpoints support localization via the Accept-Language header.
Responses include localized success and error messages.
The getFeaturedItems endpoint awards gamification points (dietary_filter_applied, 5 points) for authenticated customers, triggering notifications and socket events.
Socket events allow real-time subscription to menu and item availability updates.
Errors are returned with appropriate error codes from restaurantConstants and localized messages.
text

Collapse

Unwrap

Copy
**Notes**:
- Provides detailed documentation for all endpoints and socket events.
- Includes precise `curl` commands with example URLs and headers.
- Describes request/response schemas, including all fields from `inventoryService.js` output.
- Covers gamification, localization, and socket event details.
- Assumes a base URL of `/api/customer/munch/inventory` and a local server (`http://localhost:3000`).