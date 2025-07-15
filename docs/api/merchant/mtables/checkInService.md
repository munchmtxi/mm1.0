# Check-In Service Documentation

## Overview
The Check-In Service manages check-in operations, table status updates, check-in logging for gamification, and support requests for the `mtables` module. It integrates with notification, audit, socket, and gamification services. Points are automatically awarded for actions to enhance user engagement.

## Methods

### `processCheckIn`
- **Purpose**: Processes QR code or manual check-ins.
- **Parameters**:
  - `bookingId`: String, booking ID.
  - `checkInDetails`: Object with `qrCode`, `method`, `coordinates`.
  - `ipAddress`: String, request IP.
  - `transaction`: Optional, Sequelize transaction.
- **Returns**: Object with `bookingId`, `tableId`, `branchId`, `language`, `action`.
- **Errors**:
  - `INVALID_BOOKING_DETAILS` (400): Invalid input or method.
  - `BOOKING_NOT_FOUND` (400): Booking not found or not confirmed.
- **Point Awarding**: `checkInProcessed` for customers.

### `updateTableStatus`
- **Purpose**: Updates table availability status.
- **Parameters**:
  - `tableId`: String, table ID.
  - `status`: String, new status (e.g., `available`, `reserved`).
  - `ipAddress`: String, request IP.
  - `transaction`: Optional, Sequelize transaction.
- **Returns**: Object with `tableId`, `status`, `branchId`, `language`, `action`.
- **Errors**:
  - `INVALID_BOOKING_DETAILS` (400): Invalid table ID or status.
  - `TABLE_NOT_AVAILABLE` (404): Table not found.
- **Point Awarding**: `tableStatusUpdated` for merchants.

### `logCheckInTime`
- **Purpose**: Logs check-in time for gamification.
- **Parameters**:
  - `bookingId`: String, booking ID.
  - `ipAddress`: String, request IP.
  - `transaction`: Optional, Sequelize transaction.
- **Returns**: Object with `bookingId`, `language`, `action`.
- **Errors**:
  - `BOOKING_NOT_FOUND` (400): Booking not found or not checked in.
- **Point Awarding**: `checkInLogged` for customers.

### `handleSupportRequest`
- **Purpose**: Processes customer support requests during check-in.
- **Parameters**:
  - `bookingId`: String, booking ID.
  - `request`: Object with `type`, `description`.
  - `ipAddress`: String, request IP.
  - `transaction`: Optional, Sequelize transaction.
- **Returns**: Object with `bookingId`, `type`, `language`, `action`.
- **Errors**:
  - `INVALID_BOOKING_DETAILS` (400): Invalid input or type.
  - `BOOKING_NOT_FOUND` (404): Booking not found.
- **Point Awarding**: `supportRequestHandled` for customers.

## Point System
Points are awarded for actions in `mtablesConstants.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.js`.
- **Metadata-Based**: No metadata multipliers for check-in actions.
- **Role-Based**: Merchants: 1.2x; Customers: 1.1x.
- **Capped**: 200 points per action (`MAX_POINTS_PER_ACTION`).
- **Automated**: Handled in controller.

**Configuration** (`gamificationConstants.js`):
- `checkInProcessed`: 20 base points, 1.1x customer.
- `tableStatusUpdated`: 25 base points, 1.2x merchant.
- `checkInLogged`: 15 base points, 1.1x customer.
- `supportRequestHandled`: 10 base points, 1.1x customer.

**Workflow**:
1. User initiates action (e.g., process check-in).
2. Service processes data, returns metadata.
3. Controller calculates points using `gamificationConstants`.
4. Points awarded via `gamificationService`.
5. Notifications and socket events sent.

## Dependencies
- **Models**: `Booking`, `Table`, `Customer`, `User`, `Merchant`, `MerchantBranch`, `Address`.
- **Constants**: `mtablesConstants`, `customerConstants`, `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService` (in controller).

## Integration
- **Notifications**: Sent for actions and points, using `SUPPORT_SETTINGS.PRIORITIES`. Merchants notified for support requests.
- **Audits**: Logs actions with metadata and points.
- **Socket Events**: Namespaced (`merchant:mtables:`).
- **Gamification**: Automated points in controller.

## Error Handling
- Uses `AppError` with `mtablesConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- Localized messages from `en.json`.

## Usage Scenarios
- **Process Check-In**: Yields 22 points (20 * 1.1).
- **Update Table Status**: Yields 30 points (25 * 1.2).
- **Log Check-In Time**: Yields 16.5 points (15 * 1.1).
- **Handle Support Request**: Yields 11 points (10 * 1.1).

## Security
- **Authentication**: Via `authMiddleware.authenticate`.
- **Authorization**: Restricted to customers/merchants with permissions (`manage_checkins`, `manage_tables`, `manage_support`).
- **Validation**: Uses `express-validator` with localized messages.
- **Auditing**: Logs actions with IP and metadata.

## Notes
- **Constants**: Aligned with `mtablesConstants.js`.
- **Transactions**: Ensure atomicity.
- **Points**: Capped at 1000/day (`MAX_POINTS_PER_DAY`).
- **Localization**: Supports multiple languages via `language` return value.
- **Socket Events**: Namespaced for clarity.
- **Location Logic**: Removed, assumes external service.
- **Support Requests**: Stored as audit logs due to missing `SupportRequest` model.