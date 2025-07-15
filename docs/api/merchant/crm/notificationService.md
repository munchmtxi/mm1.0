# Notification Service Documentation

## Overview
The Notification Service enables merchants to send alerts to customers, staff, and drivers for various tasks and updates. It integrates with notification, gamification, audit, and socket services. Points are automatically awarded for notification actions, enhancing engagement through a dynamic system.

## Methods

### `sendCustomerAlerts`
- **Purpose**: Sends booking or order alerts to a customer.
- **Parameters**:
  - `customerId` (string): Customer ID.
    - `message` (object): Message details (type, content, orderId, bookingId).
    - `ipAddress`: (string): IP address of the request.
      - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `customerId`, `notificationId`, `messageType`, `language`, and `action`.
- **Errors**:
  - Invalid notification data or message type (400, `INVALID_INPUT`, `INVALID_MESSAGE_TYPE`).
  - Customer not found (404, `INVALID_CUSTOMER_NOT_FOUND`).
- **Point Awarding**: Points for `customerAlertSent`, based on message type (customer).

### `sendStaffNotifications`
- **Purpose**: Delivers task or schedule alerts to a staff member.
- **Parameters**:
  - `staffId`: (string): Staff ID.
    - `message`: (object): Message details (type, content, taskId).
    - `ipAddress`: (string): IP address of the request.
      - `transactionId (optional): Sequelize transaction ID.
- **Returns**: Object with `staffId`, `notificationId`, `messageType`, `language`, and `action`.
- **Errors**:
  - Invalid notification data or message type (400, `INVALID_INPUT`, `INVALID_MESSAGE_TYPE`).
  - Staff not found (404, `STAFF_NOT_FOUND`).
- **Point Awarding**: Points for `staffNotificationSent`, based on message type (staff).

### `sendDriverNotifications`
- **Purpose**: Sends delivery task alerts to a driver.
- **Parameters**:
  - `driverId`: (string): Driver ID.
    - `message`: (object): Message details (type, content, orderId).
    - `ipAddress`: (string): IP address of the request.
      - `transaction`: (optional): Sequelize transaction.
- **Returns**: Object with `driverId`, `notificationId`, `messageType`, `language`, and `action`.
- **Errors**:
  - Invalid notification data or message type (400, `INVALID_INPUT`, `INVALID_MESSAGE_TYPE`).
  - Driver not found (404, `DRIVER_NOT_FOUND`).
- **Point Awarding**: Points for `driverNotificationSent`, based on message type (driver).

## Point System
Points are automatically awarded for actions in `merchantConstants.CRM_CONSTANTS.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS`.
- **Contextual**:
  - `customerAlertSent`: Multiplier based on message type (2x for updates).
  - `staffNotificationsSent`: Multiplier based on message type (2x for updates).
  - `driverNotificationsSent`: Multiplier based on message type (2x for updates).
- **Role-Based**:
  - Customers: 1x multiplier for alerts.
  - Staff: 1x multiplier for notifications.
  - Drivers: 1x multiplier for notifications.
- **Capped**: Limited to 1200 points per action.
- **Automated**: Integrated into each action, no manual endpoints.

**Configuration** (`gamificationConstants.js`):
- `customerAlertSent`: 20 points base points, 0.1x multiplier for message type, 1.1x for customers.
- `staffNotificationSent`: 25 points base points, 0.1x multiplier for message type, 1.1x for staff.
- `driverNotificationSent`: 25 points base points, 0.1x multiplier for message type, 1.1x for drivers.

**Workflow**:
1. Merchant initiates an action (e.g., sends a customer alert).
2. Service processes and returns the notification details and metadata.
3. Controller calculates points based on action and metadata.
4. Points are awarded using `gamificationService.awardPoints`.
5. Notifications and socket events inform the recipient.

## Dependencies

- **Models**: `Customer`, `Staff`, `Driver`, `Merchant`.
- **Constants**: `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `handleServiceErrorHandling`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration

- **Notifications**: Sent for action completion and points awarded.
- **Audits**: Logs action details and points.
- **Socket Events**: Namespaced (e.g., `merchant:crm:customerAlertSent`).
- **Gamification**: Automatic point notifications in the controller.

## Error Handling

- Uses `AppError` with localized messages and `merchantConstants.ERROR_TYPES`.
- Transactions ensure data integrity.
- **Common Errors**:
  - `INVALID_INPUT`: Invalid customer ID, staff ID, driver ID, or message data.
  - `INVALID_MESSAGE_TYPE`: Invalid message type for the recipient.
  - `CUSTOMER_NOT_FOUND`, `STAFF_NOT_FOUND`, `DRIVER_NOT_FOUND`: Entity not found.
  - `SYSTEM_ERROR`: Unexpected errors, logged for debugging.

## Usage Scenarios

- **Customer Alert**: Sending an `order_update` yields 44 points (20 * 2 * 0.1 * 2 * 1.1).
- **Staff Notification**: Sending a `schedule_update` yields 55 points (25 * 2 * 0.1 * 2 * 1.1).
- **Driver Notification**: Sending a `delivery_update` yields 55 points (25 * 2 * 0.1 * 2 * 1.1).

## Security

- **Authentication**: Enforced via `authMiddleware.authenticate`.
- **Authorization**: Restricted to merchants with `manage_notifications` permission.
- **Validation**: Uses `express-validator` with `merchantConstants`.
- **Audits**: Logs all actions with IP addresses and points.

## Notes

- Transactions ensure atomicity of operations.
- Points capped at 1000/day (`MAX_POINTS_PER_DAY`).
- Localized messages are stored in `en.json`.
- Namespaced socket events ensure clarity.
- No manual point endpoints, per pattern.
- Point calculations are managed in the controller.
- Future CRM services will follow this pattern for automated point awarding.
