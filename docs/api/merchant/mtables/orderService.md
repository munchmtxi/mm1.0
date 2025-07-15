# Order Service Documentation

## Overview
The Order Service manages in-table orders for the `mtables` module, handling extra orders, dietary filter application, order status updates, and wallet payments. It integrates with notification, audit, socket, gamification, and wallet services. Points are awarded automatically to enhance user engagement.

## Methods

### `processExtraOrder`
- **Purpose**: Processes extra table orders.
- **Parameters**:
  - `bookingId`: String, booking ID.
  - `items`: Array of objects with `menu_item_id`, `quantity`, `customizations`.
  - `ipAddress`: String, request IP.
  - `transaction`: Optional, Sequelize transaction.
- **Returns**: Object with `orderId`, `bookingId`, `tableId`, `branchId`, `totalAmount`, `language`, `action`.
- **Errors**:
  - `INVALID_BOOKING_DETAILS` (400): Invalid input or items.
  - `BOOKING_NOT_FOUND` (400): Booking not found or not checked in.
  - `INVALID_MODIFIER` (400): Invalid customizations.
- **Point Awarding**: `extraOrderProcessed` for customers.

### `applyDietaryFilters`
- **Purpose**: Filters order items by customer dietary preferences.
- **Parameters**:
  - `customerId`: String, customer ID.
  - `items`: Array of objects with `menu_item_id`, `quantity`.
  - `ipAddress`: String, request IP.
  - `transaction`: Optional, Sequelize transaction.
- **Returns**: Object with `items`, `filteredItemCount`, `language`, `action`.
- **Errors**:
  - `INVALID_BOOKING_DETAILS` (400): Invalid input or no matching items.
  - `INVALID_CUSTOMER_ID` (404): Customer not found.
- **Point Awarding**: `dietaryFiltersApplied` for customers.

### `updateOrderStatus`
- **Purpose**: Updates order status.
- **Parameters**:
  - `orderId`: String, order ID.
  - `status`: String, new status (e.g., `pending`, `preparing`).
  - `ipAddress`: String, request IP.
  - `transaction`: Optional, Sequelize transaction.
- **Returns**: Object with `orderId`, `status`, `tableId`, `branchId`, `language`, `action`.
- **Errors**:
  - `INVALID_BOOKING_DETAILS` (400): Invalid order ID or status.
  - `BOOKING_NOT_FOUND` (404): Order not found.
- **Point Awarding**: `orderStatusUpdated` for merchants.

### `payOrderWithWallet`
- **Purpose**: Processes wallet payments for orders.
- **Parameters**:
  - `orderId`: String, order ID.
  - `walletId`: String, wallet ID.
  - `ipAddress`: String, request IP.
  - `transaction`: Optional, Sequelize transaction.
- **Returns**: Object with `orderId`, `paymentId`, `amount`, `branchId`, `language`, `action`.
- **Errors**:
  - `INVALID_BOOKING_DETAILS` (400): Invalid input.
  - `BOOKING_NOT_FOUND` (400): Order not found or already paid.
  - `PAYMENT_PROCESSING_FAILED` (400): Invalid wallet or amount.
- **Point Awarding**: `orderPaidWithWallet` for customers.

## Point System
Points are awarded for actions in `mtablesConstants.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.js`.
- **Metadata-Based**: No metadata multipliers for order actions.
- **Role-Based**: Merchants: 1.2x; Customers: 1.1x.
- **Capped**: 200 points per action (`MAX_POINTS_PER_ACTION`).
- **Automated**: Handled in controller.

**Configuration** (`gamificationConstants.js`):
- `extraOrderProcessed`: 25 base points, 1.1x customer (27.5 points).
- `dietaryFiltersApplied`: 10 base points, 1.1x customer (11 points).
- `orderStatusUpdated`: 30 base points, 1.2x merchant (36 points).
- `orderPaidWithWallet`: 20 base points, 1.1x customer (22 points).

**Workflow**:
1. User initiates action (e.g., process extra order).
2. Service processes data, returns metadata.
3. Controller calculates points using `gamificationConstants`.
4. Points awarded via `gamificationService`.
5. Notifications and socket events sent.

## Dependencies
- **Models**: `InDiningOrder`, `MenuInventory`, `Customer`, `Booking`, `Table`, `Merchant`, `MerchantBranch`, `Address`, `ProductDiscount`, `ProductModifier`, `OrderItems`, `Staff`, `Wallet`, `Payment`.
- **Constants**: `mtablesConstants`, `customerConstants`, `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`, `walletService` (in controller).

## Integration
- **Notifications**: Sent for actions and points using `SUPPORT_SETTINGS.PRIORITIES`. Merchants notified for new orders.
- **Audits**: Logs actions with metadata and points.
- **Socket Events**: Namespaced (`merchant:mtables:`).
- **Gamification**: Automated points in controller.
- **Wallet**: Transactions processed in controller for payments.

## Error Handling
- Uses `AppError` with `mtablesConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- Localized messages from `en.json`.

## Usage Scenarios
- **Process Extra Order**: Yields 27.5 points (25 * 1.1).
- **Apply Dietary Filters**: Yields 11 points (10 * 1.1).
- **Update Order Status**: Yields 36 points (30 * 1.2).
- **Pay Order With Wallet**: Yields 22 points (20 * 1.1).

## Security
- **Authentication**: Via `authMiddleware.authenticate`.
- **Authorization**: Restricted to customers (`manage_orders`, `manage_payments`) or merchants (`manage_orders`) with permissions.
- **Validation**: Uses `express-validator` with localized messages.
- **Auditing**: Logs actions with IP and metadata.

## Notes
- **Constants**: Aligned with `mtablesConstants.js`.
- **Transactions**: Ensure atomicity.
- **Points**: Capped at 1000/day (`MAX_POINTS_PER_DAY`).
- **Localization**: Supports multiple languages via `language` return value.
- **Socket Events**: Namespaced for clarity.
- **Location Logic**: Removed, assumes external service.
- **Payment Records**: Created in controller for `payOrderWithWallet`.