Documentation File
C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\services\munch\promotionService.md

markdown

Collapse

Unwrap

Copy
# Promotion Service API

## POST /api/customer/munch/promotion/redeem

Redeems a promotion for a customer.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('redeem_promotion')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field       | Type   | Required | Description                   |
|-------------|--------|----------|-------------------------------|
| promotionId | Integer| Yes      | Promotion ID                  |
| orderId     | Integer| No       | Order ID for order-specific promotions |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "data": {
      "promotionId": "integer",
      "discountAmount": "number",
      "status": "string",
      "redemptionId": "integer"
    }
  }
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
400	INVALID_REQUEST	Invalid request parameters
404	CUSTOMER_NOT_FOUND	Customer not found
404	PROMOTION_NOT_FOUND	Promotion not found
400	INVALID_PROMOTION	Invalid or expired promotion
400	PROMOTION_ALREADY_REDEEMED	Promotion already redeemed
404	ORDER_NOT_FOUND	Order not found
404	WALLET_NOT_FOUND	Wallet not found
Socket Events
Event: promotion:redeemed
Payload:
json

Collapse

Unwrap

Copy
{
  "promotionId": "integer",
  "discountAmount": "number",
  "redemptionId": "integer",
  "customerId": "string"
}
Notifications
Sent to customer with localized message for promotion redemption.
GET /api/customer/munch/promotion/available
Retrieves available promotions for a customer.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('view_promotions')
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
    "customerId": "string",
    "promotions": [
      {
        "id": "integer",
        "type": "string",
        "reward_amount": "number",
        "discount_percentage": "number",
        "expiry_date": "string",
        "is_reusable": "boolean"
      },
      {
        "id": "integer",
        "type": "string",
        "value": "number",
        "code": "string",
        "name": "string",
        "items": [
          {
            "id": "integer",
            "name": "string"
          }
        ],
        "merchant": "string",
        "start_date": "string",
        "end_date": "string"
      }
    ]
  }
}
Errors

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	PERMISSION_DENIED	Forbidden
404	CUSTOMER_NOT_FOUND	Customer not found