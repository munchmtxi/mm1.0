# Staff mTables Order API Documentation

This document outlines the Staff mTables Order API, which manages order operations for front-of-house (FOH) and kitchen staff in the Munch service, including processing extra dine-in orders, preparing orders, and logging order metrics. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/mtables/orderService.js`
- **Controller**: `src/controllers/staff/mtables/orderController.js`
- **Validator**: `src/validators/staff/mtables/orderValidator.js`
- **Middleware**: `src/middleware/staff/mtables/orderMiddleware.js`
- **Routes**: `src/routes/staff/mtables/orderRoutes.js`
- **Events**: `socket/events/staff/mtables/orderEvents.js`
- **Handler**: `socket/handlers/staff/mtables/orderHandler.js`
- **Localization**: `locales/staff/mtables/en.json`

## Service: `orderService.js`

The service layer handles core order operations, interacting with Sequelize models (`InDiningOrder`, `OrderItems`, `Booking`, `BranchMetrics`, `Staff`, `MenuItem`) and constants (`mtablesConstants.js`, `staffConstants.js`). It includes:

- **processExtraOrder(bookingId, items, staffId)**: Creates an extra dine-in order for a seated booking.
- **prepareDineInOrder(orderId, items, staffId)**: Updates order items and sets preparation status to 'in_progress'.
- **logOrderMetrics(orderId)**: Updates restaurant metrics (total orders and revenue) for gamification.

The service uses Sequelize queries and logs errors using a logger utility.

## Controller: `orderController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Process Extra Order**: 10 points (`extraOrderProcessed`).
- **Prepare Dine-In Order**: 10 points (`orderStatusUpdated`).
- **Log Order Metrics**: 10 points (`salesTracked`).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the customer’s or staff’s preferred language.

## Validator: `orderValidator.js`

Uses Joi to validate request inputs:

- **processExtraOrderSchema**: Requires `bookingId`, `staffId` (integers), and `items` (array of objects with `menu_item_id`, `quantity`, optional `customization`).
- **prepareDineInOrderSchema**: Requires `orderId`, `staffId` (integers), and `items` (same as above).
- **logOrderMetricsSchema**: Requires `orderId`, `staffId` (integers).

## Middleware: `orderMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `orderRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/mtables/extra-order**: Processes an extra dine-in order.
- **POST /staff/mtables/prepare-order**: Prepares a dine-in order.
- **POST /staff/mtables/order-metrics**: Logs order metrics.

## Events: `orderEvents.js`

Defines socket event names in a namespaced format:

- `staff:mtables:order_created`
- `staff:mtables:order_status_updated`
- `staff:mtables:metrics_logged`

## Handler: `orderHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains English translations for user-facing messages, including order-specific messages:

- `mtables.order_created`: Order creation confirmation.
- `mtables.order_preparing`: Order preparation confirmation.
- `mtables.metrics_logged`: Metrics logging confirmation.

## Endpoints

### POST /staff/mtables/extra-order
- **Summary**: Process extra dine-in order.
- **Request Body**:
  - `bookingId` (integer, required): Booking ID.
  - `items` (array, required): Array of objects with `menu_item_id` (integer), `quantity` (integer, 1-20), and `customization` (string, optional).
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Order {orderNumber} created for table {tableNumber}", data: { id, order_number, status, total_amount, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:order_created`, sends notification.

### POST /staff/mtables/prepare-order
- **Summary**: Prepare a dine-in order.
- **Request Body**:
  - `orderId` (integer, required): Order ID.
  - `items` (array, required): Array of objects with `menu_item_id`, `quantity`, and `customization`.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Order {order_number} is being prepared", data: { id, preparation_status, updated_at } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:order_status_updated`, sends notification.

### POST /staff/mtables/order-metrics
- **Summary**: Log order metrics for gamification.
- **Request Body**:
  - `orderId` (integer, required): Order ID.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Metrics logged for order {orderId}", data: null }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:metrics_logged`.

## Notes

- Authentication is handled at the main route index, providing `req.userId` for staff identification.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, using actions from `staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`.
- User-facing messages are localized using the customer’s preferred language for order-related operations and staff’s preferred language for metrics logging.
- The `en.json` file is updated to include order-related messages.
- Constants from `mtablesConstants.js` are used for order statuses, payment statuses, errors, and notifications, while `staffConstants.js` provides staff-related constants.
- Permission checks are simplified, assuming role-based access is enforced via authentication middleware.
- The `MenuItem` model replaces `MenuInventory` for consistency.