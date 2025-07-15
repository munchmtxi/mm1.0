# Staff Munch Inventory API Documentation

This document outlines the Staff Munch Inventory API, which manages inventory operations for staff in the Munch service, including tracking supplies, processing restock alerts, and updating inventory after orders. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/munch/inventoryService.js`
- **Controller**: `src/controllers/staff/munch/inventoryController.js`
- **Validator**: `src/validators/staff/munch/inventoryValidator.js`
- **Middleware**: `src/middleware/staff/munch/inventoryMiddleware.js`
- **Routes**: `src/routes/staff/munch/inventoryRoutes.js`
- **Events**: `socket/events/staff/munch/inventoryEvents.js`
- **Handler**: `socket/handlers/staff/munch/inventoryHandler.js`
- **Localization**: `locales/staff/munch/en.json`

## Service: `inventoryService.js`

The service layer handles core inventory operations, interacting with Sequelize models (`MenuInventory`, `InventoryAdjustmentLog`, `InventoryAlert`, `Staff`, `Order`) and constants (`munchConstants.js`, `staffConstants.js`). It includes:

- **trackInventory(restaurantId)**: Monitors ingredient/supply levels and returns low stock items.
- **processRestockAlert(restaurantId, staffId)**: Generates restock alerts for low stock items.
- **updateInventory(orderId, items, staffId)**: Adjusts inventory after an order is fulfilled.

The service uses Sequelize’s `Op` for querying and logs errors using a logger utility.

## Controller: `inventoryController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Track Inventory**: No points (read operation).
- **Process Restock Alert**: 10 points (`restockAlertProcessed`).
- **Update Inventory**: 10 points (`inventoryUpdated`).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the staff’s preferred language or default language.

## Validator: `inventoryValidator.js`

Uses Joi to validate request inputs:

- **trackInventorySchema**: Requires `restaurantId` (integer, via path parameter).
- **processRestockAlertSchema**: Requires `restaurantId`, `staffId` (integers).
- **updateInventorySchema**: Requires `orderId`, `staffId` (integers), and `items` (array of objects with `menu_item_id`, `quantity`).

## Middleware: `inventoryMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `inventoryRoutes.js`

Defines Express routes with Swagger documentation:

- **GET /staff/munch/track-inventory/:restaurantId**: Tracks inventory levels.
- **POST /staff/munch/process-restock**: Processes restock alerts.
- **POST /staff/munch/update-inventory**: Updates inventory after an order.

## Events: `inventoryEvents.js`

Defines socket event names in a namespaced format:

- `staff:munch:inventory:tracked`
- `staff:munch:inventory:restock_alert`
- `staff:munch:inventory:updated`

## Handler: `inventoryHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Updated to include inventory-specific messages:

- `munch.inventory_tracked`: Inventory tracking confirmation.
- `munch.restock_alert`: Restock alert processing confirmation.
- `munch.inventory_updated`: Inventory update confirmation.

## Endpoints

### GET /staff/munch/track-inventory/{restaurantId}
- **Summary**: Track inventory levels.
- **Parameters**:
  - `restaurantId` (integer, required, path): Merchant branch ID.
- **Responses**:
  - **200**: `{ success: true, message: "Inventory tracked with {itemCount} low stock items", data: [{ id, name, quantity, minimum_stock_level, alert }, ...] }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Emits `staff:munch:inventory:tracked`.

### POST /staff/munch/process-restock
- **Summary**: Process restock alerts.
- **Request Body**:
  - `restaurantId` (integer, required): Merchant branch ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Restock alert processed for {itemCount} items at branch {branchId}", data: { itemCount } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:munch:inventory:restock_alert`, sends notification.

### POST /staff/munch/update-inventory
- **Summary**: Update inventory after order.
- **Request Body**:
  - `orderId` (integer, required): Order ID.
  - `items` (array, required): Array of `{ menu_item_id: integer, quantity: integer }`.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Inventory updated for order {orderId} with {itemCount} items", data: { itemCount } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:munch:inventory:updated`.

## Notes

- Authentication is handled at the main route index, providing `req.user.id` for staff identification.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, using actions from `staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`.
- User-facing messages are localized using the staff’s preferred language for notifications, defaulting to `munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE` ('en').
- The `en.json` file is updated to include inventory-related messages.
- Constants from `munchConstants.js` are used for errors and audit types, while `staffConstants.js` provides staff-related constants.
- Permission checks are simplified, assuming role-based access is enforced via authentication middleware.
- Unused models (`GamificationPoints`, `OrderItems`, `InventoryBulkUpdate`, `ProductCategory`) are excluded.