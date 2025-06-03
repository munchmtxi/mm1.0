docs/api/customer/services/mtables/promotionService.md
markdown

Copy
# Promotion Service API

## POST /api/customer/mtables/promotions/redeem

Redeems a promotion for a customer order.

### Authentication
- **Middleware**: `authenticate`, `restrictTo('customer')`, `checkPermissions('redeem_promotion')`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

### Request Body
| Field       | Type    | Required | Description                              |
|-------------|---------|----------|------------------------------------------|
| promotionId | Integer | Yes      | Promotion ID                             |
| orderId     | Integer | Yes      | Order ID                                 |
| couponCode  | String  | No       | Coupon code (if applicable)              |

### Response
- **Status**: 200 OK
- **Body**:
  ```json
  {
    "status": "success",
    "message": "Promotion redeemed",
    "data": { "redemptionId": 123, "discountAmount": 10.00, "gamificationError": null }
  }
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	PROMOTION_REDEMPTION_FAILED	Promotion redemption error
Socket Events
Event: promotion:redeemed
Payload:
json

Copy
{ "userId": 456, "role": "customer", "promotionId": 123, "discountAmount": 10.00 }
GET /api/customer/mtables/promotions
Retrieves available promotions for a customer.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('view_promotions')
Header: Authorization: Bearer <JWT_TOKEN>
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Promotions retrieved",
  "data": [{ "id": 123, "type": "percentage", "value": 20, ... }, ...]
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	PROMOTIONS_RETRIEVAL_FAILED	Promotions retrieval error
GET /api/customer/mtables/promotions/engagement
Analyzes a customer's promotion engagement.

Authentication
Middleware: authenticate, restrictTo('customer'), checkPermissions('analyze_promotions')
Header: Authorization: Bearer <JWT_TOKEN>
Response
Status: 200 OK
Body:
json

Copy
{
  "status": "success",
  "message": "Promotion engagement analyzed",
  "data": {
    "totalRedemptions": 5,
    "totalDiscountAmount": 50.00,
    "promotionTypes": ["percentage", "flat"],
    "lastRedemption": "2025-06-01T12:00:00Z"
  }
}
Errors:

Status	Code	Message
401	UNAUTHORIZED	Unauthorized
403	Forbidden	Permission denied
400	PROMOTION_ENGAGEMENT_ANALYSIS_FAILED	Engagement analysis error