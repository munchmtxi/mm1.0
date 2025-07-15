# PreOrderService Documentation

## Overview
The PreOrderService manages merchant-side pre-order operations for the `mtables` module, enabling creation of pre-orders, processing group payments, and submitting feedback or substitutions. It ensures secure, transactional operations, integrates with payment systems, and supports real-time auditing. Points are awarded automatically in the controller to enhance user engagement, with notifications and socket events.

## Methods

### `createPreOrder`
- **Purpose**: Creates a pre-order for a confirmed booking.
- **Parameters**:
  - `bookingId`: Number, ID of the booking.
  - `customerId`: Number, ID of the customer.
  - `branchId`: Number, ID of the merchant branch.
  - `items`: Array of order items, each with:
    - `menu_item_id`: Number, ID of the menu item.
    - `quantity`: Number, item quantity.
    - `customization`: Array of modifications (optional), each with:
      - `modifier_id`: Number, ID of modifier.
    - `staffId`: Number, ID of staff (optional).
    - `ipAddress`: String, request IP address.
- **Returns**: Order object with details:
  - `id`: Order ID.
  - `customer_id`: Customer ID.
  - `branch_id`: Branch ID.
  - `table_id`: Table ID.
  - `order_number`: Unique order identifier.
  - `status`: Order status (`pending`).
  - `preparation_status`: String, `pending`.
  - `total_amount`: Total order amount.
  - `currency`: Currency code (e.g., `USD`).
  - `is_pre_order`: Boolean, `true`.
  - `estimated_completion_time`: Estimated completion time.
  - `language`: Language code (`en`).
  - `action`: Action identifier (`pre_order_placed`).
- **Errors**:
  - `BOOKING_NOT_FOUND` (404): Booking or order not found.
  - `INVALID_BOOKING_DETAILS` (400): Invalid booking details, staff, items, or lead time.
  - `INVALID_CUSTOMER_ID` (404): Customer not found.
- **Point Awarding**: `pre_order_placed` for customers (controller).

### `manageGroupPayments`
- **Purpose**: Processes split payments from multiple customers for a pre-order.
- **Parameters**:
  - `orderId`: Number, ID of the order.
  - `customerIds`: Array of customer IDs.
  - `paymentSplits`: Array of payment splits, each with:
    - `customerId`: Number, ID of customer.
    - `amount`: Number, payment amount.
    - `paymentMethodId`: Number, ID of payment method (optional).
  - `staffId`: Number, ID of staff (optional).
  - `ipAddress`: String, request IP address.
- **Returns**: Object with:
  - `payments`: Array of payment records (same as `Payment` model).
  - `order`: Object with order details (`id`, `payment_status`).
  - `language`: Language code (`en`).
  - `action`: Action identifier (`split_payment`).
- **Errors**:
  - `BOOKING_NOT_FOUND` (404): Order not found or already paid.
  - `INVALID_BOOKING_DETAILS` (400): Split amounts don’t match total, invalid staff.
  - `INVALID_CUSTOMER_ID` (404): Customer not found.
  - `PAYMENT_PROCESSING_FAILED` (400): Insufficient wallet balance or invalid wallet.
- **Point Awarding**: `split_payment` for each customer (controller).

### `provideFeedback`
- **Purpose**: Submits feedback or substitutions for a pre-order.
- **Parameters**:
  - `orderId`: Number, ID of the order.
  - `merchantId`: Number, ID of the merchant.
  - `staffId`: Number, ID of the staff.
  - `comment`: String, feedback comment (optional).
  - `substitutions`: Array of substitution items (optional), each with:
    - `menu_item_id`: Number, ID of substitute item.
    - `quantity`: Number, quantity.
    - `customization`: Array of modifications (optional).
  - `ipAddress`: String, request IP address.
- **Returns**: Feedback object with:
  - `id`: Feedback ID.
  - `customer_id`: Customer ID.
  - `in_dining_order_id`: Order ID.
  - `staff_id`: Staff ID.
  - `rating`: Number (3 for substitutions, 4 otherwise).
  - `comment`: Feedback text.
  - `is_positive`: Boolean.
  - `language`: Language code (`en`).
  - `action`: Action identifier (`feedback_submitted`).
- **Errors**:
  - `BOOKING_NOT_FOUND` (404): Order not found.
  - `INVALID_BOOKING_DETAILS` (400): Invalid merchant, staff, or substitutions.
- **Point Awarding**: `feedback_submitted` for customers (controller).

## Point System
Points are awarded for actions in `gamificationConstants.CUSTOMER_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.js`.
- **Metadata-Based**: No metadata multipliers for pre-order actions.
- **Role-Based**: Customers: 1.1x multiplier; Merchants: No points for pre-order actions.
- **Capped**: 200 points per action (`MAX_POINTS_PER_ACTION`).
- **Automated**: Handled in controller via `pointService`.

**Configuration** (`gamificationConstants.js`):
- `pre_order_placed`: 10 base points, 1.1x customer (11 points).
- `split_payment`: 20 base points per customer, 1.1x customer (22 points).
- `feedback_submitted`: 10 base points, 1.1x customer (11 points).

**Workflow**:
1. User initiates action (e.g., create pre-order).
2. Service processes data, returns result.
3. Controller calculates points using `gamificationConstants`.
4. Points awarded via `pointService`.
5. Notifications and socket events sent.

## Dependencies
- **Models**: `Booking`, `Customer`, `InDiningOrder`, `MenuInventory`, `OrderItems`, `MerchantBranch`, `Merchant`, `Address`, `ProductDiscount`, `ProductModifier`, `Wallet`, `Payment`, `Feedback`, `Staff`, `Table`.
- **Constants**: `mTablesConstants`, `paymentConstants`, `customerConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `pointService`, `walletService` (in controller).

## Integration
- **Notifications**: Sent for pre-orders, payments, and feedback via `notificationService`.
  - Customer: `PRE_ORDER_CONFIRMATION`, `PAYMENT_COMPLETED`, `FEEDBACK_SUBMITTED`, `POINTS_AWARDED`.
  - Merchant: `PRE_ORDER_RECEIVED`, `PAYMENT_RECEIVED`.
  - Priority: Medium (`mTablesConstants.SUPPORT_SETTINGS.PRIORITIES.MEDIUM`).
- **Audits**: Logs actions with metadata (`PRE_ORDER_CREATED`, `GROUP_PAYMENT`, `FEEDBACK_SUBMITTED`) via `auditService`.
- **Socket Events**: Namespaced (`merchant:mtables:`) via `preOrderEvents.js` (`PRE_ORDER_CREATED`, `PAYMENT_COMPLETED`, `FEEDBACK_SUBMITTED`).
- **Wallet**: Transactions processed via `walletService` in controller.
- **Gamification**: Points awarded automatically in controller.

## Error Handling
- Uses `AppError` with `mTablesConstants.ERROR_CODES`.
- Localized messages via `formatMessage` from `en.json`.
- Transactions ensure atomicity.
- Logs errors using `logger`.

## Usage Scenarios
- **Create Pre-Order**: Customer places $50 pre-order, receives 11 points (10 * 1.1). Merchant notified.
- **Group Payment**: Two customers pay $25 each, each receives 22 points (20 * 1.1). Merchant notified.
- **Provide Feedback**: Customer submits feedback, receives 11 points (10 * 1.1). Merchant notified.

## Security
- **Authentication**: Via `authMiddleware.authenticate`.
- **Authorization**: Restricted to roles (`merchant`, `customer`) with permissions (`PRE_ORDER_CREATE`, `GROUP_PAYMENT_PROCESS`, `FEEDBACK_SUBMIT`) via `preOrderMiddleware`.
- **Validation**: Joi schemas in `preOrderValidator.js` with localized messages.
- **Auditing**: Logs actions with IP and metadata via `auditService`.
- **Sanitization**: Handled by `AppError` and Joi validation.

## API Endpoints
- **POST /merchant/mtables/preorders/create**: Creates a pre-order.
- **POST /merchant/mtables/preorders/payments**: Processes group payments.
- **POST /merchant/mtables/preorders/feedback**: Submits feedback.

## Performance Considerations
- **Transactions**: Ensure data consistency.
- **Caching**: No caching in service; controller uses `auditService` caching.
- **Rate Limiting**: Handled by `notificationService` for notifications.
- **Scalability**: Socket events use namespaced rooms for efficiency.

## Notes
- **Constants**: Aligned with `mTablesConstants.js` and `gamificationConstants.js`.
- **Localization**: Supports multiple languages via `en.json`.
- **Socket Events**: Namespaced (`merchant:mtables:`).
- **Points**: Capped at 1000/day (`MAX_POINTS_PER_DAY`).
- **Wallet Transactions**: Processed in controller.
- **Location Logic**: Removed, assumes external service.
- **Feedback**: Stored as audit logs due to missing `FeedbackRequest` model.

## Example Workflow
1. Customer sends `POST /merchant/mtables/preorders/create` with `bookingId`, `customerId`, `branchId`, `items`.
2. Middleware authenticates and validates.
3. Controller calls `createPreOrder`, processes wallet transaction, awards 11 points.
4. Notifications sent to customer (`PRE_ORDER_CONFIRMATION`) and merchant (`PRE_ORDER_RECEIVED`).
5. Socket event `merchant:mtables:preOrderCreated` emitted.
6. Audit log created for `PRE_ORDER_CREATED`.