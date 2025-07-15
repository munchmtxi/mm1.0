# OrderService Documentation

## Overview
The `OrderService` manages order processing, dietary preferences, status updates, and wallet payments for the `munch` module. Gamification points for completed orders are awarded automatically in the controller.

## Methods

### `processOrder`
- **Purpose**: Processes dine-in/takeaway/delivery orders.
- **Parameters**:
  - `orderId`: Number, order ID.
  - `items`: Array of objects with `menu_item_id`, `quantity`, `customization`.
- **Returns**: Object with `orderId`, `status`, `totalAmount`.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input, order processed, item unavailable, or insufficient stock.
  - `ERROR_CODES[0]` (404): Order not found.

### `applyDietaryPreferences`
- **Purpose**: Filters order items by customer dietary preferences.
- **Parameters**:
  - `customerId`: Number.
  - `items`: Array of objects with `menu_item_id`.
- **Returns**: Array of compliant items.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input.
  - `ERROR_CODES[0]` (404): Customer not found.

### `updateOrderStatus`
- **Purpose**: Updates order progress.
- **Parameters**:
  - `orderId`: Number.
  - `status`: String (pending, confirmed, preparing, ready, out_for_delivery, completed, cancelled).
- **Returns**: Object with `orderId`, `status`.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input or status.
  - `ERROR_CODES[0]` (404): Order not found.

### `payOrderWithWallet`
- **Purpose**: Prepares wallet payment for an order.
- **Parameters**:
  - `orderId`: Number.
  - `walletId`: Number.
- **Returns**: Object with `orderId`, `paymentStatus`, `amount`.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input or order already paid.
  - `ERROR_CODES[0]` (404): Order not found.

## Points
Points awarded via `gamificationConstants`:
- **order_completed**: 10 points, 1.1x customer (11 points).
- **Capped**: 100/action, 500/day.
- **Automated**: In `updateOrderStatusController` when status is `completed`.

**Workflow**:
1. Merchant processes order or updates status.
2. Service handles data.
3. Controller sends notifications, emits sockets, logs audits/activities, and awards points (if completed).

## Dependencies
- **Models**: `Order`, `OrderItems`, `Customer`, `MenuInventory`, `MerchantBranch`, `ProductAuditLog`, `ProductActivityLog` (controller).
- **Constants**: `munchConstants`, `gamificationConstants` (controller).
- **Utilities**: `formatMessage`, `AppError`, `logger`.
- **Services** (controller): `notificationService`, `auditService`, `socketService`, `pointService`, `walletService`.

## Integration
- **Notifications**:
  - Customer: `ORDER_CONFIRMATION`, `ORDER_STATUS_UPDATE`, `PAYMENT_CONFIRMATION`.
- **Audits**: Logs `PROCESS_ORDER`, `APPLY_DIETARY_PREFERENCES`, `UPDATE_ORDER_STATUS`, `PAY_ORDER_WITH_WALLET`.
- **Socket Events**: Namespaced (`merchant:munch:`) via `orderEvents.js`.
- **Gamification**: Points in controller for completed orders.

## Error Handling
- `AppError` with `munchConstants.ERROR_CODES[0]`.
- Localized via `formatMessage` (`en.json`).
- Transactions ensure atomicity.
- Logs via `logger.error`.

## Usage Scenarios
- **Process Order**: Merchant confirms order, updates inventory.
- **Dietary Preferences**: Filters items for customer preferences.
- **Update Status**: Merchant progresses order, awards points on completion.
- **Wallet Payment**: Customer pays via wallet.

## Security
- **Authentication**: Via `authMiddleware`.
- **Authorization**: `merchant` role with permissions.
- **Validation**: Joi schemas in `orderValidator.js`.
- **Auditing**: Logs actions with IP.

## API Endpoints
- **POST /merchant/munch/order/process**
- **POST /merchant/munch/order/dietary**
- **POST /merchant/munch/order/update**
- **POST /merchant/munch/order/pay**

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
- **Price**: Uses `MenuInventory.price` field.

## Example Workflow
1. Merchant sends `POST /merchant/munch/order/process`.
2. Middleware authenticates, validates.
3. Controller calls `processOrder`, logs audits/activities, sends notification, emits socket.
4. Response with order data.