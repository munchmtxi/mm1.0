# InventoryService Documentation

## Overview
The `InventoryService` manages inventory tracking, updates, and restocking alerts for the `munch` module. Gamification points for inventory updates are awarded automatically in the controller for BOH staff.

## Methods

### `trackStockLevels`
- **Purpose**: Monitors ingredient/supply levels.
- **Parameters**:
  - `restaurantId`: Number, merchant branch ID.
- **Returns**: Array of objects with `itemId`, `name`, `sku`, `quantity`, `minimumStockLevel`, `status`.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input.
  - `ERROR_CODES[0]` (404): Restaurant not found.

### `updateInventory`
- **Purpose**: Adjusts inventory post-order.
- **Parameters**:
  - `orderId`: Number, order ID.
  - `items`: Array of objects with `menu_item_id`, `quantity`.
- **Returns**: Array of objects with `itemId`, `name`, `newQuantity`.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input or insufficient stock.
  - `ERROR_CODES[0]` (404): Order or inventory item not found.

### `sendRestockingAlerts`
- **Purpose**: Identifies low stock items for restocking alerts.
- **Parameters**:
  - `restaurantId`: Number.
- **Returns**: Object with `restaurantId`, `lowStockItems` (array of `id`, `name`) or `success`, `message` if no restocking needed.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input.
  - `ERROR_CODES[0]` (404): Restaurant not found.
  - `ERROR_CODES[0]` (400): No available BOH staff (controller).

## Points
Points awarded via `gamificationConstants`:
- **inventory_update**: 5 points, 1.1x BOH staff (5.5 points).
- **Capped**: 100/action, 500/day.
- **Automated**: In `updateInventoryController` for available BOH staff.

**Workflow**:
1. Merchant tracks stock or updates inventory.
2. Service processes data.
3. Controller sends notifications, emits sockets, and awards points (for inventory updates).

## Dependencies
- **Models**: `MenuInventory`, `Order`, `MerchantBranch`, `ProductAuditLog`, `ProductActivityLog`, `Staff` (controller).
- **Constants**: `munchConstants`, `staffConstants`, `gamificationConstants` (controller).
- **Utilities**: `formatMessage`, `AppError`, `logger`.
- **Services** (controller): `notificationService`, `auditService`, `socketService`, `pointService`.

## Integration
- **Notifications**:
  - BOH Staff: `RESTOCKING_ALERT` for low stock.
- **Audits**: Logs `TRACK_STOCK_LEVELS`, `UPDATE_INVENTORY`, `SEND_RESTOCKING_ALERTS`.
- **Socket Events**: Namespaced (`merchant:munch:`) via `inventoryEvents.js`.
- **Gamification**: Points in controller for BOH staff.

## Error Handling
- `AppError` with `munchConstants.ERROR_CODES[0]`.
- Localized via `formatMessage` (`en.json`).
- Transactions ensure atomicity.
- Logs via `logger.error`.

## Usage Scenarios
- **Track Stock**: Merchant monitors inventory levels.
- **Update Inventory**: Merchant adjusts stock post-order, BOH staff earn points.
- **Restocking Alerts**: Merchant notifies BOH staff of low stock.

## Security
- **Authentication**: Via `authMiddleware`.
- **Authorization**: `merchant` role with permissions.
- **Validation**: Joi schemas in `inventoryValidator.js`.
- **Auditing**: Logs actions with IP.

## API Endpoints
- **POST /merchant/munch/inventory/track**
- **POST /merchant/munch/inventory/update**
- **POST /merchant/munch/inventory/restock**

## Performance
- **Transactions**: Ensures consistency.
- **Caching**: None in service.
- **Rate Limiting**: Via `notificationService`.
- **Scalability**: Socket events use namespaced rooms.

## Notes
- **Constants**: Aligned with `munchConstants.js`.
- **Localization**: Supports `en.json`.
- **Socket Events**: Namespaced.
- **Points**: Automated in controller, capped at 500/day.
- **Models**: Unchanged.

## Example Workflow
1. Merchant sends `POST /merchant/munch/inventory/update`.
2. Middleware authenticates, validates.
3. Controller calls `updateInventory`, awards points to BOH staff, sends socket.
4. Audit logs `update_inventory`.
5. Response with updated items.