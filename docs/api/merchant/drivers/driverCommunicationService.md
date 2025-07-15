# Driver Communication Service Documentation

## Overview
The Driver Communication Service enables merchants to send messages, broadcast delivery updates, and manage communication channels for drivers. It integrates with notification, audit, socket, and gamification services. Points are automatically awarded for actions, enhancing engagement through a dynamic system.

## Methods

### `sendDriverMessage`
- **Purpose**: Sends a message to a specific driver.
- **Parameters**:
  - `driverId` (string): Driver ID.
    - `message` (string): Message content.
    - `ipAddress`: (string): IP address of the request.
      - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `driverId`, `notificationId`, `logId`, `taskId`, `language`, and `action`.
- **Errors**:
  - Invalid driver ID or message (400, `INVALID_INPUT`).
  - Driver not found (404, `DRIVER_NOT_FOUND`).
- **Point Awarding**: Points for `driverMessageSent`, based on message length (driver).

### `broadcastDeliveryUpdates`
- **Purpose**: Broadcasts delivery updates for an order to the assigned driver.
- **Parameters**:
  - `orderId`: (string): Order ID.
    - `message`: (string): Update message.
    - `ipAddress`: (string): IP address of the request.
    - `transaction`: (optional): Sequelize transaction.
- **Returns**: Object with `orderId`, `driverId`, `notificationId`, `logId`, `orderNumber`, `taskId`, `language`, and `action`.
- **Errors**:
  - Invalid order ID or message (400, `INVALID_MESSAGE`).
    - Order or driver not found (404, `ORDER_NOT_FOUND`).
- **Point Awarding**: Points for `deliveryUpdateBroadcast`, based on order status (driver).

### `manageDriverChannels`
- **Purpose**: Updates communication channels for a merchant’s active drivers.
- **Parameters**:
  - `merchantId`: (string): Merchant ID.
    - `ipAddress`: (string): IP address of the request.
      - `transaction`: (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `driverCount`, `taskCount`, `driverIds`, `taskIds`, `language`, and `action`.
- **Errors**:
  - Invalid merchant ID (400, `INVALID_REQUEST`).
    - Merchant not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Points for `driverChannelsUpdated`, based on driver count (merchant).

## Point System
Points are automatically awarded for actions in `merchantConstants.DRIVER_CONSTANTS.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS`.
- **Contextual**:
  - `driverMessageSent`: Multiplier based on message length (0.05x per character).
  - `deliveryUpdateBroadcast`: Multiplier based on order status (2x for pending).
  - `driverChannelsUpdated`: Multiplier based on driver count (0.1x per branch).
- **Role-Based**:
  - Drivers: 1.1x multiplier for messages and updates.
  - Merchants: 1.2x multiplier for channel updates.
- **Capped**: Limited to 1200 points per action.
- **Automated**: Integrated into each action, no manual endpoints.

**Configuration** (`gamificationConstants.js`):
- `driverMessageSent`: 20 base points, 0.05x multiplier for message length, 25 multiplier for drivers.
- `deliveryUpdateBroadcast`: 25 base points multiplier for order status, 50 multiplier for drivers.
- `driverChannelsUpdated`: 40 base points, 0.1 multiplier for driver count, 1.2x for merchants.

**Workflow**:
1. Merchant initiates an action (e.g., sends a driver message).
2. Service processes and returns notification details and metadata.
3. Controller calculates points based on action and metadata.
4. Points are awarded using `gamificationService.awardPoints`.
5. Notifications and socket events inform the recipient.

## Dependencies

- **Models**: `Driver`, `Order`, `Merchant`, `Task`, `NotificationLog`.
- **Constants**: `merchantConstants`, `driverConstants`, `staffConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `handleServiceError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration

- **Notifications**: Sent for action completion and points awarded.
- **Audits**: Logs action details and points.
- **Socket Events**: Namespaced (e.g., `merchant:drivers:driverMessageSent`).
- **Gamification**: Automatic point notifications in the controller.

## Error Handling

- Uses `AppError` with localized messages and `merchantConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- **Common Errors**:
  - `INVALID_INPUT`: Invalid driver ID, order ID, or message data.
  - `DRIVER_NOT_FOUND`, `ORDER_NOT_FOUND`, `MERCHANT_NOT_FOUND`: Entity not found.
  - `SYSTEM_ERROR`: Unexpected errors, logged for debugging.

## Usage Scenarios

- **Driver Message**: 100-character message yields 22 points (20 * 5 * 0.05 * 1.1).
- **Delivery Update**: Pending order yields 55 points (25 * 2 * 0.1 * 5 * 1.1).
- **Driver Channels**: 3 drivers yield 43 points (30 * 0.3 * 0.2 * 1.2).

## Security

- **Authentication**: Enforced via `authMiddleware.authenticate`.
- **Authorization**: Restricted to merchants with `manage_driverCommunication` permission.
- **Validation**: Uses `express-validator` with `merchantConstants`.
- **Messages**: Logs all actions with IP addresses and messages.

## Notes

- Transactions ensure atomicity of operations.
- Points capped at 1000/day (`MAX_POINTS_PER_DAY`).
- Localized messages are stored in `en.json`.
- Namespaced socket events ensure clarity.
- No manual point endpoints, per pattern.
- Point calculations are managed in the controller.
