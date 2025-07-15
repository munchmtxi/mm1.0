# PromotionService Documentation

## Overview
The `PromotionService` manages promotions, loyalty programs, and point redemptions for the `munch` module. Gamification points for promotion participation are awarded automatically in the controller.

## Methods

### `createPromotion`
- **Purpose**: Designs discounts or referral promotions.
- **Parameters**:
  - `restaurantId`: Number, merchant branch ID.
  - `details`: Object with `name`, `type`, `description`, `value`, `code`, `start_date`, `end_date`, `min_purchase_amount`, `usage_limit`, `customer_eligibility`, `menuItems`, `rules`.
- **Returns**: Object with `promotionId`, `name`, `type`.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input, promotion type, or menu items.
  - `ERROR_CODES[0]` (404): Restaurant not found.

### `manageLoyaltyProgram`
- **Purpose**: Administers loyalty program tiers.
- **Parameters**:
  - `restaurantId`: Number.
  - `tiers`: Array of objects with `name`, `pointsRequired`, `rewards`, `rewardId`.
- **Returns**: Object with `promotionId`, `name`, `tiers`.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input.
  - `ERROR_CODES[0]` (404): Restaurant not found.

### `redeemPoints`
- **Purpose**: Processes point redemptions for rewards.
- **Parameters**:
  - `customerId`: Number.
  - `rewardId`: Number, promotion ID.
- **Returns**: Object with `redemptionId`, `discountAmount`, `rewardId`.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input, reward, insufficient points, or reward not found.
  - `ERROR_CODES[0]` (404): Customer not found.

## Points
Points awarded via `gamificationConstants`:
- **promotion_participation**: 5 points, 1.05x customer (5.25 points).
- **Capped**: 50/action, 250/day.
- **Automated**: In `redeemPointsController` after redemption.

**Workflow**:
1. Merchant creates promotion or redeems points.
2. Service processes data.
3. Controller sends notifications, emits sockets, logs audits, and awards points (for redemption).

## Dependencies
- **Models**: `ProductPromotion`, `PromotionRule`, `PromotionRedemption`, `PromotionMenuItem`, `Customer`, `MerchantBranch`, `MenuInventory`, `GamificationPoints` (controller).
- **Constants**: `munchConstants`, `gamificationConstants` (controller).
- **Utilities**: `formatMessage`, `AppError`, `logger`.
- **Services** (controller): `notificationService`, `auditService`, `socketService`, `pointService`.

## Integration
- **Notifications**:
  - Merchant: `PROMOTION_CREATED`, `LOYALTY_UPDATED`.
  - Customer: `REWARD_REDEMPTION`.
- **Audits**: Logs `CREATE_PROMOTION`, `MANAGE_LOYALTY_PROGRAM`, `REDEEM_POINTS`.
- **Socket Events**: Namespaced (`merchant:munch`) via `promotionEvents.js`.
- **Gamification**: Points in controller for participation.

## Error Handling
- `AppError` with `munchConstants.ERROR_CODES[0]`.
- Localized via `formatMessage` (`en.json`).
- Transactions ensure atomicity.
- Logs via `logger.error`.

## Usage Scenarios
- **Create Promotion**: Merchant sets up discount/referral.
- **Manage Loyalty**: Merchant configures loyalty tiers.
- **Redeem Points**: Customer redeems points, earns participation points.

## Security
- **Authentication**: Via `authMiddleware`.
- **Authorization**: `merchant` role with permissions.
- **Validation**: Joi schemas in `promotionValidator.js`.
- **Auditing**: Logs actions with IP.

## API Endpoints
- **POST /merchant/munch/promotion/discounts**
- **POST /merchant/munch/promotion/loyalty**
- **POST /merchant/munch/promotion/redeem**

## Performance
- **Transactions**: Ensures consistency.
- **Caching**: None in service.
- **Rate Limiting**: Via `notificationService`.
- **Scalability**: Socket events use namespaced rooms.

## Notes
- **Constants**: Aligned with `munchConstants.js`.
- **Localization**: Supports `en.json`.
- **Socket Events**: Namespaced.
- **Points**: Automated in controller, capped at 250/day.
- **Models**: Unchanged.

## Example Workflow
1. Merchant sends `POST /merchant/munch/promotion/redeem`.
2. Middleware authenticates, validates.
3. Controller calls `redeemPoints`, deducts points, awards participation points, sends notification, emits socket.
4. Audit logs `redeem_points`.
5. Response with redemption data.