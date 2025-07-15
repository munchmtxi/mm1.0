# Staff mTables Supply API Documentation

This document outlines the Staff mTables Supply API, which manages supply operations for back-of-house (BOH) staff in the Munch service, including monitoring dining supplies, requesting restocks, and logging supply readiness. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/mtables/supplyService.js`
- **Controller**: `src/controllers/staff/mtables/supplyController.js`
- **Validator**: `src/validators/staff/mtables/supplyValidator.js`
- **Middleware**: `src/middleware/staff/mtables/supplyMiddleware.js`
- **Routes**: `src/routes/staff/mtables/supplyRoutes.js`
- **Events**: `socket/events/staff/mtables/supplyEvents.js`
- **Handler**: `socket/handlers/staff/mtables/supplyHandler.js`
- **Localization**: `locales/staff/mtables/en.json`

## Service: `supplyService.js`

The service layer handles core supply operations, interacting with Sequelize models (`MenuItem`, `InventoryAlert`, `InventoryAdjustmentLog`, `Staff`, `SupplyStatus`) and constants (`mtablesConstants.js`, `staffConstants.js`). It includes:

- **monitorSupplies(restaurantId)**: Retrieves low stock items for a restaurant branch.
- **requestRestock(restaurantId, staffId)**: Creates alerts for low stock items and returns the count.
- **logSupplyReadiness(restaurantId, staffId)**: Records the readiness status of supplies.

The service uses Sequelize’s `Op` for querying and logs errors using a logger utility.

## Controller: `supplyController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Request Restock**: 10 points (`restockRequested`).
- **Log Supply Readiness**: 10 points (`readinessLogged`).
- **Monitor Supplies**: No points (read-only operation).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the staff’s preferred language or 'en' for monitoring.

## Validator: `supplyValidator.js`

Uses Joi to validate request inputs:

- **monitorSuppliesSchema**: Requires `restaurantId` (integer).
- **requestRestockSchema**: Requires `restaurantId`, `staffId` (integers).
- **logSupplyReadinessSchema**: Requires `restaurantId`, `staffId` (integers).

## Middleware: `supplyMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `supplyRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/mtables/monitor-supplies**: Monitors dining supplies.
- **POST /staff/mtables/request-restock**: Sends restocking alerts.
- **POST /staff/mtables/log-readiness**: Logs supply readiness status.

## Events: `supplyEvents.js`

Defines socket event names in a namespaced format:

- `staff:mtSupplies:monitored`
- `staff:mtSupplies:restock_requested`
- `staff:mtSupplies:readiness_logged`

## Handler: `supplyHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains English translations for user-facing messages, including supply-specific messages:

- `mtables.supplies_monitored`: Supply monitoring confirmation.
- `mtables.restock_requested`: Restock request confirmation.
- `mtables.readiness_logged`: Readiness logging confirmation.

## Endpoints

### POST /staff/mtables/monitor-supplies
- **Summary**: Monitor dining supplies.
- **Request Body**:
  - `restaurantId` (integer, required): Merchant branch ID.
- **Responses**:
  - **200**: `{ success: true, message: "{itemCount} low stock items detected", data: [{ id, name, quantity, minimum_stock_level, alert }, ...] }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Emits `staff:mtSupplies:monitored`.

### POST /staff/mtables/request-restock
- **Summary**: Send restocking alerts.
- **Request Body**:
  - `restaurantId` (integer, required): Merchant branch ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Restock requested for {itemCount} items at branch {branchId}", data: { itemCount } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtSupplies:restock_requested`, sends notification.

### POST /staff/mtables/log-readiness
- **Summary**: Record supply readiness status.
- **Request Body**:
  - `restaurantId` (integer, required): Merchant branch ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Supply readiness logged for branch {restaurantId}", data: { id, branch_id, status, checked_by, checked_at } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtSupplies:readiness_logged`.

## Notes

- Authentication is handled at the main route index, providing `req.user.id` for staff identification.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, using actions from `staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`.
- User-facing messages are localized using the staff’s preferred language for `requestRestock` and `logSupplyReadiness`, and 'en' for `monitorSupplies`.
- The `en.json` file is updated to include supply-related messages.
- Constants from `mtablesConstants.js` are used for supply statuses, errors, and notifications, while `staffConstants.js` provides staff-related constants.
- Permission checks are simplified, assuming role-based access is enforced via authentication middleware.
- The `MenuItem` model replaces `MenuInventory` for consistency.