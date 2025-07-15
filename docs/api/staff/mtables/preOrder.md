# Staff mTables Pre-Order API Documentation

This document outlines the Staff mTables Pre-Order API, which manages pre-order operations for front-of-house (FOH) and kitchen staff in the Munch service, including processing pre-orders, preparing pre-ordered food, and notifying customers of pre-order status. The API integrates with Sequelize for database operations, Socket.IO for real-time notifications, and a point system for rewarding actions. All endpoints are protected by authentication middleware at the main route index.

## File Structure

- **Service**: `src/services/staff/mtables/preOrderService.js`
- **Controller**: `src/controllers/staff/mtables/preOrderController.js`
- **Validator**: `src/validators/staff/mtables/preOrderValidator.js`
- **Middleware**: `src/middleware/staff/mtables/preOrderMiddleware.js`
- **Routes**: `src/routes/staff/mtables/preOrderRoutes.js`
- **Events**: `socket/events/staff/mtables/preOrderEvents.js`
- **Handler**: `socket/handlers/staff/mtables/preOrderHandler.js`
- **Localization**: `locales/staff/mtables/en.json`

## Service: `preOrderService.js`

The service layer handles core pre-order operations, interacting with Sequelize models (`InDiningOrder`, `OrderItems`, `Booking`, `Staff`, `Cart`, `CartItem`) and constants (`mtablesConstants.js`, `staffConstants.js`). It includes:

- **processPreOrder(bookingId, items, staffId)**: Creates a pre-order for a booking, clears the customer’s cart, and assigns an order number.
- **preparePreOrderedFood(bookingId, items, staffId)**: Updates pre-order items and sets preparation status to 'preparing'.
- **notifyPreOrderStatus(bookingId, status)**: Retrieves the pre-order for status notification (notification handled in controller).

The service logs errors using a logger utility.

## Controller: `preOrderController.js`

The controller integrates the service with common services (`socketService`, `notificationService`, `auditService`, `pointService`) and localization (`formatMessage`). It handles HTTP requests, emits socket events, logs actions, awards points, and sends notifications. Points are awarded as follows:

- **Process Pre-Order**: 10 points (`preOrderProcessed`).
- **Prepare Pre-Ordered Food**: 10 points (`preOrderPrepared`).
- **Notify Pre-Order Status**: 10 points (`preOrderStatusNotified`).

Each endpoint returns a JSON response with `success`, `message`, and `data` fields, using localized messages based on the customer’s preferred language.

## Validator: `preOrderValidator.js`

Uses Joi to validate request inputs:

- **processPreOrderSchema**: Requires `bookingId`, `staffId` (integers), and `items` (array of objects with `menu_item_id`, `quantity`, optional `customization`).
- **preparePreOrderedFoodSchema**: Requires `bookingId`, `staffId` (integers), and `items` (same as above).
- **notifyPreOrderStatusSchema**: Requires `bookingId`, `staffId` (integers), and `status` (valid order status).

## Middleware: `preOrderMiddleware.js`

Applies validation schemas to incoming requests, returning a 400 error for invalid inputs.

## Routes: `preOrderRoutes.js`

Defines Express routes with Swagger documentation:

- **POST /staff/mtables/pre-order**: Processes a pre-order.
- **POST /staff/mtables/prepare-pre-order**: Prepares pre-ordered food.
- **POST /staff/mtables/pre-order-status**: Notifies pre-order status.

## Events: `preOrderEvents.js`

Defines socket event names in a namespaced format:

- `staff:mtables:preorder_created`
- `staff:mtables:preorder_status_updated`

## Handler: `preOrderHandler.js`

Provides functions to emit socket events using `socketService`, mapping to the defined event names.

## Localization: `en.json`

Contains English translations for user-facing messages, including pre-order-specific messages:

- `mtables.pre_order_created`: Pre-order creation confirmation.
- `mtables.pre_order_preparing`: Pre-order preparation confirmation.
- `mtables.pre_order_in_progress`: Pre-order in-progress status.
- `mtables.pre_order_completed`: Pre-order completion status.

## Endpoints

### POST /staff/mtables/pre-order
- **Summary**: Process pre-order details.
- **Request Body**:
  - `bookingId` (integer, required): Booking ID.
  - `items` (array, required): Array of objects with `menu_item_id` (integer), `quantity` (integer, 1-20), and `customization` (string, optional).
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Pre-order {orderNumber} created for table {tableNumber}", data: { id, order_number, status, total_amount, ... } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:preorder_created`, sends notification.

### POST /staff/mtables/prepare-pre-order
- **Summary**: Prepare pre-ordered food.
- **Request Body**:
  - `bookingId` (integer, required): Booking ID.
  - `items` (array, required): Array of objects with `menu_item_id`, `quantity`, and `customization`.
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Pre-order {order_number} is being prepared", data: { id, preparation_status, updated_at } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:preorder_status_updated`, sends notification.

### POST /staff/mtables/pre-order-status
- **Summary**: Notify customers of pre-order status.
- **Request Body**:
  - `bookingId` (integer, required): Booking ID.
  - `status` (string, required): Pre-order status (e.g., `in_progress`, `completed`).
  - `staffId` (integer, required): Staff ID.
- **Responses**:
  - **200**: `{ success: true, message: "Pre-order {order_number} is {status}", data: { id, order_number, status } }`
  - **400**: Invalid request.
  - **500**: Server error.
- **Side Effects**: Awards 10 points, logs action, emits `staff:mtables:preorder_status_updated`, sends notification.

## Notes

- Authentication is handled at the main route index, providing `req.user.id` for staff identification.
- The `sequelize` instance is assumed to be globally available.
- The `io` Socket.IO instance is accessed via `req.app.get('io')`.
- Point awarding is dynamic, using actions from `staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`.
- User-facing messages are localized using the customer’s preferred language for all pre-order operations.
- The `en.json` file is updated to include pre-order-related messages.
- Constants from `mtablesConstants.js` are used for order statuses, payment statuses, errors, and notifications, while `staffConstants.js` provides staff-related constants.
- Permission checks are simplified, assuming role-based access is enforced via authentication middleware.
- The `MenuItem` model replaces `MenuInventory`, and price calculation is simplified by using `menuItem.price`.
- The `InDiningOrder` model includes a `booking_id` field to link pre-orders to bookings.