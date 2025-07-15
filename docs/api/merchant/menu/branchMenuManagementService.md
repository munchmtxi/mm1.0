# Branch Menu Management Service Documentation

## Overview
The Branch Menu Management Service enables merchants to amend and view branch-specific menus, including adding, updating, or removing items, and retrieving menu details with categories and images. It integrates with notification, audit, socket, and gamification services. Points are automatically awarded for actions, enhancing engagement through a dynamic system.

## Methods

### `amendBranchMenu`
- **Purpose**: Amends a branch's menu by adding, updating, or removing items and associated images, modifiers, and attributes.
- **Parameters**:
  - `branchId`: (string): Branch ID.
    - `menuData`: Object containing `addItems`, `updateItems`, `removeItemIds`, and `images`.
    - `ipAddress`: (string): IP address of the request.
      - `transaction`: (optional): Sequelize transaction.
- **Returns**: Object with `branchId`, `merchantId`, `addedCount`, `updatedCount`, `removedCount`, `language`, and `action`.
- **Errors**:
  - Invalid input (400, `INVALID_INPUT`).
  - Branch not found (404, `BRANCH_NOT_FOUND`).
  - Merchant not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Points for `menuAmended`, based on total change count (merchant).

### `viewBranchMenu`
- **Purpose**: Retrieves a branch’s menu, including categories, items, and images.
- **Parameters**:
  - `branchId`: (string): Branch ID.
    - `ipAddress`: (string): IP address of the request.
      - `transaction`: (optional): Sequelize transaction.
- **Returns**: Object with `branchId`, `merchantId`, `categoryCount`, `itemCount`, `imageCount`, `categories`, `items`, `images`, `language`, and `action`.
- **Errors**:
  - Invalid branch ID (400, `INVALID_REQUEST`).
    - Branch not found (404, `BRANCH_NOT_FOUND`).
    - Merchant not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Points for `menuViewed`, based on item count (merchant).

## Point System
Points are automatically awarded for actions in `merchantConstants.MENU_CONSTANTS.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS`.
- **Contextual**:
  - `menuAmended`: Multiplier based on total changes (0.1x per change, added/updated/removed).
  - `menuViewed`: Multiplier based on item count (0.05x per item).
- **Role-Based**: Merchants: 1.2x multiplier.
- **Capped**: Limited to 1200 points per action.
- **Automated**: Integrated into each action, no manual endpoints.

**Configuration** (`gamificationConstants.js`):
- `menuAmended`: 35 base points, 0.1x multiplier for change count, 1.2x for merchants.
- `menuViewed`: 15 base points, 0.05x multiplier for item count, 1.2x for merchants.

**Workflow**:
1. Merchant initiates an action (e.g., amends a menu).
2. Service processes and returns details and metadata.
3. Controller calculates points based on action and metadata.
4. Points are awarded using `gamificationService.awardPoints`.
5. Notifications and socket events inform the merchant.

## Dependencies

- **Models**: `MerchantBranch`, `MenuInventory`, `ProductCategory`, `Merchant`, `ProductAudit`, `Media`, `Log`, `ProductModifier`, `ProductAttribute`.
- **Constants**: `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `handleServiceError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration

- **Notifications**: Sent for action completion and points awarded.
- **Audits**: Logs action details and points.
- **Socket Events**: Namespaced (e.g., `merchant:menu:menuAmended`).
- **Gamification**: Automatic point notifications in the controller.

## Error Handling

- Uses `AppError` with localized messages and `merchantConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- **Common Errors**:
  - `INVALID_INPUT`: Invalid branch ID or menu data.
  - `BRANCH_NOT_FOUND`, `MERCHANT_NOT_FOUND`: Entity not found.
  - `SYSTEM_ERROR`: Unexpected errors, logged for debugging.

## Usage Scenarios

- **Menu Amend**: Adding 5 items, updating 2, and removing 1 (8 changes) yields 50 points (35 * 0.8 * 1.2).
- **Menu View**: Viewing a menu with 20 items yields 18 points (15 * 1 * 1.2).

## Security

- **Authentication**: Enforced via `authMiddleware.authenticate`.
- **Authorization**: Restricted to merchants with `manage_menu` or `view_menu` permissions.
- **Validation**: Uses `express-validator` with `merchantConstants`.
- **Auditing**: Logs all actions with IP addresses and metadata.

## Notes

- Transactions ensure atomicity of operations.
- Points capped at 1000/day (`MAX_POINTS_PER_DAY`).
- Localized messages are stored in `en.json`.
- Namespaced socket events ensure clarity.
- No manual point endpoints, per pattern.
- Point calculations are managed in the controller.
