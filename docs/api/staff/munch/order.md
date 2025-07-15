# Staff Munch Order API Documentation

This document outlines the Staff Munch Order API, which manages order operations for staff in the Munch service, including confirming takeaway orders, preparing food for delivery, and logging order completion. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/munch/orderService.js`
- **Controller**: `src/controllers/staff/munch/orderController.js`
- **Validator**: `src/validators/staff/munch/orderValidator.js`
- **Middleware**: `src/middleware/staff/munch/orderMiddleware.js`
- **Routes**: `src/routes/staff/munch/orderRoutes.js`
- **Events**: `socket/events/staff/munch/orderEvents.js`
- **Handler**: `socket/handlers/staff/munch/orderHandler.js`
- **Localization**: `locales/staff/munch/en.json`

## Service: `orderService.js`

The service layer handles core order operations, interacting with Sequelize models (`Order`, `OrderItems`, `TimeTracking`, `Staff`) and constants (`munchConstants.js`, `staffConstants.js`). It includes:

- **confirmTakeawayOrder(orderId, staffId)**: Verifies and confirms a takeaway order.
- **prepareDeliveryFood(orderId, items, staffId)**: Prepares food for a delivery order by updating order items.
- **logOrderCompletion(orderId, staffId)**: Logs the completion of an order and records time tracking.

The service logs errors using a logger utility.

## Controller: `orderController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Confirm Takeaway Order**: 10 points (`orderConfirmed`).
- **Prepare Delivery Food**: 10 points (`foodPrepared`).
- **Log Order Completion**: 10 points (`orderCompleted`).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the customer’s preferred language or default language.

## Validator: `orderValidator.js`

Uses Joi to validate request inputs:

- **confirmTakeawayOrderSchema**: Requires `orderId`, `staffId` (integers).
- **prepareDeliveryFoodSchema**: Requires `orderId`, `staffId` (integers), and `items` (array of objects with `menu_item_id`, `quantity`, optional `customization`).
- **logOrderCompletionSchema**: Requires `orderId`, `staffId` (integers).

## Middleware: `orderMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `orderRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/munch/confirm-takeaway**: Confirms a takeaway order.
- **POST /staff/munch/prepare-food**: Prepares food for delivery.
- **POST /staff/munch/log-completion**: Logs order completion.

## Events: `orderEvents.js`

Defines socket event names in a namespaced format:

- `staff:munch:order:confirmed`
- `staff:munch:order:preparing`
- `staff:munch:order:completed`

## Handler: `orderHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Updated to include order-specific messages:

- `munch.order_confirmed`: Takeaway order confirmation.
- `munch.order_preparing`: Food preparation confirmation.
- `munch.order_completed`: Order completion confirmation.

## Endpoints

### POST /staff/munch/confirm-takeaway
- **Summary**: Confirm takeaway order.
- **Request Body**:
  - `orderId` (integer, required): Order ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Takeaway order {orderNumber} confirmed", data: { id, order_number, status, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:munch:order:confirmed`, sends notification.

### POST /staff/munch/prepare-food
- **Summary**: Prepare food for delivery.
- **Request Body**:
  - `orderId` (integer, required): Order ID.
  - `items` (array, required): Array of `{ menu_item_id: integer, quantity: integer, customization: string }`.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Order {orderNumber} is being prepared", data: { id, order_number, status, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:munch:order:preparing`, sends notification.

### POST /staff/munch/log-completion
- **Summary**: Log order completion.
- **Request Body**:
  - `orderId` (integer, required): Order ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Order {orderNumber} completed", data: { id, order_number, status, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:munch:order:completed`, sends notification.

## Notes

- Authentication is handled at the main route index, providing `req.user.id` for staff identification.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, using actions from `staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`.
- User-facing messages are localized using the customer’s preferred language for customer-facing notifications, defaulting to `munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE` ('en').
- The `en.json` file is updated to include order-related messages and fix a previous typo in `driver_assigned`.
- Constants from `munchConstants.js` are used for order statuses, errors, audit types, and notifications, while `staffConstants.js` provides staff-related constants.
- Permission checks are simplified, assuming role-based access is enforced via authentication middleware.
- Unused models (`GamificationPoints`, `ProductDiscount`, `Promotion`, `PromotionRedemption`) are excluded.
- The `logOrderCompletion` status was adjusted to 'delivered' to align with `munchConstants.ORDER_STATUSES`.
- Fixed a bug in `logOrderCompletion` controller where `pointService.awardPoints` used `orderId` instead of `staffId` for `userId`.