# Payment Service Documentation

## Overview
The Payment Service manages payment operations for the `mtables` module, enabling merchants and customers to process payments, manage split payments, and issue refunds for in-dining orders. It ensures secure, transactional handling of financial operations, integrates with wallet and gamification systems, and supports real-time notifications and auditing. Points are automatically awarded to enhance user engagement, with notifications and socket events for seamless communication.

## Methods

### `processPayment`
- **Purpose**: Processes a single payment for an in-dining order.
- **Parameters**:
  - `bookingId`: Number, ID of the booking.
  - `amount`: Number, payment amount.
  - `walletId`: Number, ID of the customer’s wallet.
  - `options`: Object, optional parameters:
    - `staffId`: Number, ID of the staff processing the payment.
    - `paymentMethodId`: Number, ID of the payment method.
- **Returns**: Object with payment details:
  - `id`: Payment ID.
  - `in_dining_order_id`: Order ID.
  - `customer_id`: Customer ID.
  - `merchant_id`: Merchant ID.
  - `amount`: Payment amount.
  - `status`: Payment status (`completed`).
  - `transaction_id`: Unique transaction ID.
  - `currency`: Currency code (e.g., `USD`).
  - `language`: Language code (`en`).
  - `action`: Action identifier (`payment_processed`).
- **Errors**:
  - `BOOKING_NOT_FOUND` (404): Booking or pending order not found.
  - `PAYMENT_FAILED` (400): Invalid amount, insufficient balance, or invalid wallet.
  - `INVALID_BOOKING_DETAILS` (400): Staff unavailable.
- **Point Awarding**: `payment_processed` for customers.

### `manageSplitPayments`
- **Purpose**: Processes multiple payments from different customers for a single order.
- **Parameters**:
  - `bookingId`: Number, ID of the booking.
  - `payments`: Array of objects, each with:
    - `customerId`: Number, ID of the customer.
    - `amount`: Number, payment amount.
    - `walletId`: Number, ID of the customer’s wallet.
    - `paymentMethodId`: Number, optional payment method ID.
  - `options`: Object, optional parameters:
    - `staffId`: Number, ID of the staff processing the payment.
- **Returns**: Object with:
  - `payments`: Array of payment records (same structure as `processPayment` return).
  - `order`: Object with order details (`id`, `payment_status`).
  - `language`: Language code (`en`).
  - `action`: Action identifier (`split_payment_processed`).
- **Errors**:
  - `BOOKING_NOT_FOUND` (404): Booking or pending order not found.
  - `PAYMENT_FAILED` (400): Split amounts don’t match order total, insufficient balance, or invalid wallet.
  - `INVALID_CUSTOMER_ID` (404): Customer not found.
  - `INVALID_BOOKING_DETAILS` (400): Staff unavailable.
- **Point Awarding**: `split_payment_processed` for each customer.

### `issueRefund`
- **Purpose**: Issues a refund for a completed in-dining order.
- **Parameters**:
  - `bookingId`: Number, ID of the booking.
  - `walletId`: Number, ID of the customer’s wallet.
  - `options`: Object, optional parameters:
    - `amount`: Number, refund amount.
    - `staffId`: Number, ID of the staff processing the refund.
- **Returns**: Object with refund details (same structure as `processPayment` return, with negative `amount`).
  - `language`: Language code (`en`).
  - `action`: Action identifier (`refund_issued`).
- **Errors**:
  - `BOOKING_NOT_FOUND` (404): Booking or completed order not found.
  - `PAYMENT_FAILED` (400): Invalid refund amount or invalid wallet.
  - `INVALID_BOOKING_DETAILS` (400): Staff unavailable.
- **Point Awarding**: `refund_issued` for customers.

## Point System
Points are awarded for actions defined in `gamificationConstants.CUSTOMER_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.js`.
- **Metadata-Based**: No metadata multipliers for payment actions.
- **Role-Based**: Customers: 1.1x multiplier; Merchants: No points for payment actions.
- **Capped**: 200 points per action (`MAX_POINTS_PER_ACTION`).
- **Automated**: Handled in controller via `pointService`.

**Configuration** (`gamificationConstants.js`):
- `payment_processed`: 20 base points, 1.1x customer (22 points).
- `split_payment_processed`: 15 base points per customer, 1.1x customer (16.5 points).
- `refund_issued`: 10 base points, 1.1x customer (11 points).

**Workflow**:
1. User initiates action (e.g., process payment).
2. Service validates and processes data, returns payment/refund details.
3. Controller uses `pointService.awardPoints` with action and role.
4. Points calculated using `gamificationConstants` and awarded.
5. Notifications and socket events sent for action and points.

## Dependencies
- **Models**: `Booking`, `Customer`, `InDiningOrder`, `Staff`, `MerchantBranch`, `Wallet`, `Payment`.
- **Constants**: `mTablesConstants`, `paymentConstants`, `customerConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `walletService`, `pointService` (in controller).

## Integration
- **Notifications**: Sent for payments, refunds, and points via `notificationService`.
  - Customer: `PAYMENT_COMPLETED`, `REFUND_ISSUED`, `POINTS_AWARDED`.
  - Merchant: `PAYMENT_RECEIVED`, `REFUND_PROCESSED`.
  - Priority: Medium (`mTablesConstants.SUPPORT_SETTINGS.PRIORITIES.MEDIUM`).
- **Audits**: Logs actions with metadata (`AUDIT_TYPES.PAYMENT_PROCESSED`, `SPLIT_PAYMENT_PROCESSED`, `REFUND_ISSUED`) via `auditService`.
- **Socket Events**: Namespaced (`merchant:mtables:`) via `paymentEvents.js` (`PAYMENT_COMPLETED`, `PAYMENT_REFUNDED`).
- **Wallet**: Transactions processed via `walletService` in controller.
- **Gamification**: Points awarded automatically in controller.

## Error Handling
- Uses `AppError` with `mTablesConstants.ERROR_CODES` for standardized errors.
- Localized error messages via `formatMessage` from `en.json`.
- Transactions ensure atomicity for payment operations.
- Logs errors using `logger` for debugging.

## Usage Scenarios
- **Process Payment**: Customer pays $50, receives 22 points (20 * 1.1). Merchant notified.
- **Split Payment**: Two customers pay $25 each, each receives 16.5 points (15 * 1.1). Merchant notified.
- **Issue Refund**: Customer refunded $50, receives 11 points (10 * 1.1). Merchant notified.

## Security
- **Authentication**: Via `authMiddleware.authenticate`.
- **Authorization**: Restricted to roles (`merchant`, `customer`) with permissions (`PAYMENT_PROCESS`, `SPLIT_PAYMENT_PROCESS`, `REFUND_PROCESS`) via `paymentMiddleware`.
- **Validation**: Joi schemas in `paymentValidator.js` with localized error messages.
- **Auditing**: All actions logged with IP and metadata via `auditService`.
- **Data Sanitization**: Handled by `AppError` and Joi validation.

## API Endpoints
- **POST /merchant/mtables/payments/process**: Processes a payment.
- **POST /merchant/mtables/payments/split**: Manages split payments.
- **POST /merchant/mtables/payments/refund**: Issues a refund.

## Performance Considerations
- **Transactions**: Ensure data consistency for payment operations.
- **Caching**: No caching in service; controller uses `auditService` caching.
- **Rate Limiting**: Handled by `notificationService` for notifications.
- **Scalability**: Socket events use namespaced rooms for efficiency.

## Notes
- **Constants**: Aligned with `mTablesConstants.js` and `gamificationConstants.js`.
- **Localization**: Supports multiple languages via `en.json` and `formatMessage`.
- **Socket Events**: Namespaced (`merchant:mtables:`) for clarity.
- **Points**: Capped at 1000/day (`MAX_POINTS_PER_DAY` in `gamificationConstants`).
- **Wallet Transactions**: Processed in controller to separate concerns.
- **No Location Logic**: Assumes external service for geolocation.
- **Support Requests**: Not applicable; refunds handled as payments.

## Example Workflow
1. Customer sends `POST /merchant/mtables/payments/process` with `bookingId`, `amount`, `walletId`.
2. Middleware authenticates and validates.
3. Controller calls `processPayment`, processes wallet transaction, awards 22 points.
4. Notifications sent to customer (`PAYMENT_COMPLETED`) and merchant (`PAYMENT_RECEIVED`).
5. Socket event `merchant:mtables:paymentCompleted` emitted.
6. Audit log created for `PAYMENT_PROCESSED`.