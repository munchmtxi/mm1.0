# Menu Management Service Documentation

## Overview
The Menu Management Service enables merchants to create, update, and apply dynamic pricing to menu items. It integrates with notification, audit, socket, and gamification services. Points are automatically awarded for actions, enhancing engagement through a dynamic, rule-based system.

## Methods

### `createMenu`
- **Purpose**: Creates a menu with categories for a restaurant.
- **Parameters**:
  - `restaurantId`: (string): Restaurant ID.
  - `menuData`: Object containing `items`, `categories`, `images`, `modifiers`, and `attributes`.
  - `ipAddress`: (string): IP address of the request.
  - `transaction`: (optional): Sequelize transaction ID.
- **Returns**: Object with `restaurantId`, `itemCount`, `categoryCount`, `language`, and `action`.
- **Errors**:
  - Invalid input (400, `INVALID_INPUT_ITEM`).
  - Merchant not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Points for `menuCreated`, based on item count (merchant).

### `updateMenu`
- **Purpose**: Updates a menu item’s properties.
- **Parameters**:
  - `menuId`: (string): Menu item ID.
  - `updates`: Object with `name`, `price`, `categoryId`, `description`, `availabilityStatus`, `isPublished`, `modifiers`, `attributes`.
  - `ipAddress`: (string): IP address of the request.
  - `transaction`: (optional): Sequelize transaction.
- **Returns**: Object with `menuId`, `restaurantId`, `itemName`, `language`, and `action`.
- **Errors**:
  - Invalid input or menu item not found (400, `INVALID_REQUEST_ITEM`).
  - Menu item not found (404, `INVALID_NOT_FOUND_ITEM`).
  - Merchant not found (404, `MERCHANT_NOT_FOUND_ENTITY`).
- **Point Awarding**: Points for `menu_updated`, based on update count (fixed at 1, merchant).

### `applyDynamicPricing`
- **Purpose**: Applies promotional pricing to a menu item.
- **Parameters**:
  - `menuId`: (string): Menu item ID.
  - `promotion`: Object with `type`, `value`, `name`, `startDate`, `endDate`, `minPurchaseAmount`, `customerEligibility`.
  - `ipAddress`: (string): IP address of the request.
    - `transaction`: (optional): Sequelize transaction ID.
- **Returns**: Object with `menuId`, `promotionId`, `restaurantId`, `promotionType`, `language`, and `action`.
- **Errors**:
  - Invalid input or promotion (400, `INVALID_INPUT_ITEM`).
  - Menu item not found (404, `INVALID_REQUEST_ITEM`).
  - Merchant not found (404, `MERCHANT_NOT_FOUND_ENTITY`).
  - Invalid promotion type (400, `INVALID_INPUT_ITEM`).
- **Point Awarding**: Points for `dynamicPricingApplied`, based on promotion value (merchant).

## Point System
Points are automatically awarded for actions in `merchantConstants.MENU_CONSTANTS.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS`.
- **Contextual**:
  - `menuCreated`: Multiplier based on item count (0.1x per item).
  - `menuUpdated`: Fixed multiplier for single update (1x).
  - `dynamicPricingApplied`: Multiplier based on promotion value (0.05x).
- **Role-Based**: Merchants: 1.2x multiplier.
- **Capped**: Limited to 200 points per action (`MAX_POINTS_PER_ACTION`).
- **Automated**: Integrated into each action, no manual endpoints.

**Configuration** (`gamificationConstants.js`):
- `menuCreated`: 40 base points, 0.1x multiplier for item count, 1.2x for merchants.
- `menuUpdated`: 30 base points, 1x multiplier for update, 1.2x for merchants.
- `dynamicPricingApplied`: 35 base points, 0.05x multiplier for promotion value, 1.2x for merchants.

**Workflow**:
1. Merchant initiates an action (e.g., creates a menu).
2. Service processes and returns details with metadata.
3. Controller calculates points based on action and metadata.
4. Points are awarded using `gamificationService.awardPoints`.
5. Notifications and socket events inform the merchant.

## Dependencies

- **Models**: `MenuInventory`, `ProductCategory`, `ProductDiscount`, `ProductPromotion`, `PromotionMenuItem`, `Merchant`, `ProductModifier`, `ProductAttribute`, `ProductAuditLog`, `Media`.
- **Constants**: `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `handleServiceError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration

- **Notifications**: Sent for action completion and points awarded.
- **Audits**: Logs action details and points.
- **Socket Events**: Namespaced (e.g., `merchant:menu:menuCreated`).
- **Gamification**: Automatic point notifications in the controller.

## Error Handling

- Uses `AppError` with localized messages and `merchantConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- **Common Errors**:
  - `INVALID_INPUT`: Invalid restaurant ID, menu data, or promotion details.
  - `INVALID_REQUEST`: Menu item not found.
  - `MERCHANT_NOT_FOUND`: Business entity not found.
  - `SYSTEM_ERROR`: Unexpected errors, logged for debugging.

## Usage Scenarios

- **Menu Creation**: Adding 10 items yields 48 points (40 * 1 * 1.2).
- **Menu Update**: Updating one item yields 36 points (30 * 1 * 1.2).
- **Dynamic Pricing**: Applying a 20% discount yields 42 points (35 * 1 * 1.2).

## Security

- **Authentication**: Enforced via `authMiddleware.authenticate`.
- **Authorization**: Restricted to merchants with `manage_menu` permissions.
- **Validation**: Uses `express-validator` with localized messages.
- **Auditing**: Logs all actions with IP addresses and metadata.

## Notes

- Transactions ensure atomicity of operations.
- Points capped at 1000/day (`MAX_POINTS_PER_DAY`).
- Localized messages stored in `en.json`.
- Namespaced socket events ensure clarity.
- No manual point endpoints, per pattern.
- Point calculations managed in the controller.
