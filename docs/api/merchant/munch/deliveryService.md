# DeliveryService Documentation

## Overview
The `DeliveryService` manages delivery tasks for the `munch` module, handling driver assignments, status tracking, and communication. Gamification points are awarded automatically in the controller for completed deliveries.

## Methods

### `assignDelivery`
- **Purpose**: Assigns a delivery to a driver.
- **Parameters**:
  - `orderId`: Number, order ID.
  - `driverId`: Number, driver ID.
- **Returns**: Object with `orderId`, `status`, `driverId`.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input.
  - `ERROR_CODES[0]` (404): Order not found.
  - `ERROR_CODES[0]` (400): Invalid order status.
  - `ERROR_CODES[0]` (400): Driver unavailable.

### `trackDeliveryStatus`
- **Purpose**: Tracks delivery progress.
- **Parameters**:
  - `orderId`: Number.
- **Returns**: Object with `orderId`, `status`, `driverId`, `driverLocation`, `estimatedDeliveryTime`, `actualDeliveryTime`, `deliveryLocation`.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input.
  - `ERROR_CODES[0]` (404): Order not found.

### `communicateWithDriver`
- **Purpose**: Facilitates merchant-driver communication.
- **Parameters**:
  - `orderId`: Number.
  - `message`: String.
- **Returns**: Object with `orderId`, `driverId`, `message`.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input or message.
  - `ERROR_CODES[0]` (404): Order or driver not found.

## Points
Points awarded via `gamificationConstants`:
- **delivery_completed**: 10 points, 1.1x driver (11 points).
- **Capped**: 200/action, 1000/day.
- **Automated**: In `assignDeliveryController` when order status is `delivered`.

**Workflow**:
1. Merchant assigns delivery.
2. Service updates order status.
3. Controller sends notifications, emits sockets, and awards points if order is completed.

## Dependencies
- **Models**: `Order`, `Driver`, `MerchantBranch`, `Customer`.
- **Constants**: `munchConstants`, `gamificationConstants` (controller).
- **Utilities**: `formatMessage`, `AppError`, `logger`.
- **Services** (controller): `notificationService`, `auditService`, `socketService`, `pointService`.

## Integration
- **Notifications**:
  - Driver: `DELIVERY_ASSIGNED`, `DRIVER_COMMUNICATION`.
  - Merchant/Customer: `DELIVERY_STATUS_UPDATED`.
- **Audits**: Logs `ASSIGN_DELIVERY`, `TRACK_DELIVERY_STATUS`, `COMMUNICATE_WITH_DRIVER`.
- **Socket Events**: Namespaced (`merchant:munch:`) via `deliveryEvents.js`.
- **Gamification**: Points in controller.

## Error Handling
- `AppError` with `munchConstants.ERROR_CODES[0]`.
- Localized via `formatMessage` (`en.json`).
- Transactions ensure atomicity.
- Logs via `logger.error`.

## Usage Scenarios
- **Assign Delivery**: Merchant assigns order to driver, points awarded if completed.
- **Track Status**: Merchant monitors delivery progress.
- **Communicate**: Merchant sends message to driver.

## Security
- **Authentication**: Via `authMiddleware`.
- **Authorization**: `merchant` role with permissions.
- **Validation**: Joi schemas in `deliveryValidator.js`.
- **Auditing**: Logs actions with IP.

## API Endpoints
- **POST /merchant/munch/delivery/assign**
- **POST /merchant/munch/delivery/track**
- **POST /merchant/munch/delivery/communicate**

## Performance
- **Transactions**: Ensures consistency.
- **Caching**: None in service.
- **Rate Limiting**: Via `notificationService`.
- **Scalability**: Socket events use namespaced rooms.

## Notes
- **Constants**: Aligned with `munchConstants.js`.
- **Localization**: Supports `en.json`.
- **Socket Events**: Namespaced.
- **Points**: Automated in controller, capped at 1000/day.
- **Models**: Unchanged.

## Example Workflow
1. Merchant sends `POST /merchant/munch/delivery/assign`.
2. Middleware authenticates, validates.
3. Controller calls `assignDelivery`, sends notification, emits socket.
4. If order is completed, points are awarded.
5. Audit logs `assign_delivery`.
6. Response with delivery data.