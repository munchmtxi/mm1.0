# Booking Service Documentation

## Overview
The Booking Service manages table reservations, waitlists, and booking policies for merchants. It integrates with notification, audit, socket, and gamification services. Points are automatically awarded for actions, enhancing user engagement.

## Methods

### `createReservation`
- **Purpose**: Creates a table reservation.
- **Parameters**:
  - `bookingId`: String, booking ID.
  - `customerId`: String, customer ID.
  - `details`: Object with `branchId`, `tableId`, `guestCount`, `date`, `time`, `seatingPreference`, `dietaryFilters`, `depositAmount`, `coordinates`.
  - `ipAddress`: String, request IP.
  - `transaction`: Optional, Sequelize transaction.
- **Returns**: Object with `bookingId`, `reference`, `guestCount`, `language`, `action`.
- **Errors**:
  - `INVALID_BOOKING_DETAILS` (400): Invalid input.
  - `INVALID_CUSTOMER_ID` (404): Customer not found.
  - `TABLE_NOT_AVAILABLE` (400): Table unavailable.
  - `MAX_BOOKINGS_EXCEEDED` (400): Too many active bookings.
- **Point Awarding**: `bookingCreated` for customers, based on `guestCount`.

### `manageWaitlist`
- **Purpose**: Manages waitlist entries for a branch.
- **Parameters**:
  - `branchId`: String, branch ID.
  - `customerId`: String, customer ID.
  - `ipAddress`: String, request IP.
  - `transaction`: Optional, Sequelize transaction.
- **Returns**: Object with `waitlistId`, `status`, `language`, `action`.
- **Errors**:
  - `INVALID_BOOKING_DETAILS` (400): Invalid input.
  - `INVALID_CUSTOMER_ID` (404): Customer not found.
- **Point Awarding**: `waitlistAdded` for customers.

### `setBookingPolicies`
- **Purpose**: Sets booking policies for a merchant.
- **Parameters**:
  - `merchantId`: String, merchant ID.
  - `policies`: Object with `cancellationWindowHours`, `depositPercentage`.
  - `ipAddress`: String, request IP.
  - `transaction`: Optional, Sequelize transaction.
- **Returns**: Object with `merchantId`, `policies`, `language`, `action`.
- **Errors**:
  - `INVALID_BOOKING_DETAILS` (400): Invalid input.
- **Point Awarding**: `bookingPoliciesUpdated` for merchants.

### `updateReservation`
- **Purpose**: Updates an existing reservation.
- **Parameters**:
  - `bookingId`: String, booking ID.
  - `updates`: Object with `guestCount`, `date`, `time`, `seatingPreference`, `dietaryFilters`.
  - `ipAddress`: String, request IP.
  - `transaction`: Optional, Sequelize transaction.
- **Returns**: Object with `bookingId`, `guestCount`, `language`, `action`.
- **Errors**:
  - `BOOKING_NOT_FOUND` (404): Booking not found.
  - `CANCELLATION_WINDOW_EXPIRED` (400): Non-pending booking.
  - `TABLE_NOT_AVAILABLE` (400): Table unavailable.
- **Point Awarding**: `bookingUpdated` for customers.

## Point System
Points are awarded for actions in `mtablesConstants.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants`.
- **Metadata-Based**:
  - `bookingCreated`: 0.05x per `guestCount`.
  - `waitlistAdded`: No metadata multiplier.
  - `bookingPoliciesUpdated`: No metadata multiplier.
  - `bookingUpdated`: No metadata multiplier.
- **Role-Based**: Merchants: 1.2x; Customers: 1.1x.
- **Capped**: 200 points per action (`MAX_POINTS_PER_ACTION`).
- **Automated**: Handled in controller.

**Configuration** (`gamificationConstants.js`):
- `bookingCreated`: 20 base points, 0.05x `guestCount`, 1.1x customer.
- `waitlistAdded`: 15 base points, 1.1x customer.
- `bookingPoliciesUpdated`: 30 base points, 1.2x merchant.
- `bookingUpdated`: 10 base points, 1.1x customer.

**Workflow**:
1. User initiates action (e.g., create reservation).
2. Service processes data, returns metadata.
3. Controller calculates points using `gamificationConstants`.
4. Points awarded via `gamificationService`.
5. Notifications and socket events sent.

## Dependencies
- **Models**: `Booking`, `Table`, `Customer`, `User`, `Merchant`, `MerchantBranch`, `Address`.
- **Constants**: `mtablesConstants`, `customerConstants`, `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration
- **Notifications**: Sent for actions and points, using `SUPPORT_SETTINGS.PRIORITIES`.
- **Audits**: Logs actions with metadata and points.
- **Socket Events**: Namespaced (`merchant:mtables:`).
- **Gamification**: Automated points in controller.

## Error Handling
- Uses `AppError` with `mtablesConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- Localized messages from `en.json`.

## Usage Scenarios
- **Create Reservation**: 4 guests yields 22 points (20 * 4 * 0.05 * 1.1).
- **Manage Waitlist**: Adding yields 16.5 points (15 * 1.1).
- **Set Policies**: Updating yields 36 points (30 * 1.2).
- **Update Reservation**: Updating yields 11 points (10 * 1.1).

## Security
- **Authentication**: Via `authMiddleware.authenticate`.
- **Authorization**: Restricted to customers/merchants with appropriate permissions.
- **Validation**: Uses `express-validator` with localized messages.
- **Auditing**: Logs actions with IP and metadata.

## Notes
- **Constants**: Aligned with `mtablesConstants.js`.
- **Transactions**: Ensure atomicity.
- **Points**: Capped at 1000/day (`MAX_POINTS_PER_DAY`).
- **Localization**: Supports multiple languages.
- **Socket Events**: Namespaced for clarity.
- **No Manual Payments**: Deposit logic removed, assumes external service.