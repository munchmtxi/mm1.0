# SupportService Documentation

## Overview
The `SupportService` manages merchant-side support operations for the `mtables` module, enabling inquiry handling, dispute resolution, and policy communication. It ensures secure, transactional operations with real-time auditing. Points are awarded automatically in the controller to enhance user engagement, with notifications and socket events.

## Methods

### `handleInquiry`
- **Purpose**: Creates a support ticket for customer or staff inquiries.
- **Parameters**:
  - `bookingId`: Number, ID of the booking.
  - `issue`: Object with:
    - `customerId`: Number, ID of customer.
    - `orderId`: Number, ID of order (optional).
    - `issueType`: String, type of issue (`booking`, `order`, `payment`, `table`).
    - `description`: String, issue description (max 1000 chars).
    - `staffId`: Number, ID of staff (optional).
    - `ipAddress`: String, request IP address.
- **Returns**: Ticket object with:
  - `id`: Ticket ID.
  - `customer_id`: Customer ID.
  - `booking_id`: Booking ID.
  - `in_dining_order_id`: Order ID (or null).
  - `assigned_staff_id`: Staff ID (or null).
  - `ticket_number`: Unique ticket identifier.
  - `service_type`: String, `mtables`.
  - `issue_type`: String.
  - `description`: String.
  - `status`: String, `open`.
  - `priority`: String, `high` for payment, `medium` otherwise.
- **Errors**:
  - `INVALID_INPUT` (400): Missing fields, invalid issue type, or description too long.
  - `INVALID_CUSTOMER_ID` (404): Customer not found.
  - `BOOKING_NOT_FOUND` (404): Booking or order not found or not associated.
- **Point Awarding**: `support_interaction` for customer (controller).

### `resolveDispute`
- **Purpose**: Resolves a support ticket with resolution details.
- **Parameters**:
  - `bookingId`: Number, ID of the booking.
  - `resolution`: Object with:
    - `ticketId`: Number, ID of ticket.
    - `staffId`: Number.
    - `resolutionDetails`: String (max 1000 chars).
    - `ipAddress`: String.
- **Returns**: Updated ticket object with:
  - `id`: Ticket ID.
  - `status`: String, `resolved`.
  - `resolution_details`: String.
- **Errors**:
  - `INVALID_INPUT` (400): Missing fields or ticket already resolved/closed.
  - `BOOKING_NOT_FOUND` (404): Ticket or booking not found or not associated.
- **Point Awarding**: `ticket_closure` for customer (controller).

### `communicatePolicies`
- **Purpose**: Sends refund and cancellation policies to customer.
- **Parameters**:
  - `bookingId`: Number, ID of the booking.
- **Returns**: Object with:
  - `refund`: String, refund policy.
  - `cancellation`: String, cancellation policy.
- **Errors**:
  - `BOOKING_NOT_FOUND` (404): Booking not found.
- **Point Awarding**: None.

## Point System
Points are awarded for actions in `gamificationConstants.CUSTOMER_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.js`.
- **support_interaction`: 10 points, 1.1x customer (11 points).
- **ticket_closure`: 5 points, 1.1x customer (5.5 points).
- **Capped**: 200 points/action (`MAX_POINTS_PER_ACTION`), 1000/day (`MAX_POINTS_PER_DAY`)).
- **Automated**: Handled in controller via `pointService`.

**Workflow**:
1. User initiates action (e.g., create inquiry).
2. Service processes data, returns result.
3. Controller awards points using `gamificationConstants`.
4. Points awarded via `pointService`.
5. Notifications sent.

## Dependencies
- **Models**: `SupportTicket`, `Customer`, `Booking`, `InDiningOrder`, `Staff`.
- **Constants**: `mTablesConstants`, `customerConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `logger`.
- **Services** (controller): `notificationService`, `auditService`, `socketService`, `pointService`.

## Integration
- **Notifications**:
  - Customer: `SUPPORTED_TICKET_CREATED`, `SUPPORTED_TICKET_RESOLVED`, `POLICY_COMMUNICATION`.
  - Merchant: `SUPPORTED_TICKET_AIGNED`.
  - Priority: Medium (`mTablesConstants.SUPPORTED_SETTINGS.PRIORITIES[1]`).
- **Audits**: Logs `SUPPORTED_TICKET_CREATED`, `SUPPORTED_TICK_RESOLVED`, `POLICY_COMMUNICATED` via `auditService`.
- **Socket Events**: Namespaced (`merchant:mtables:`) via `supportEvents.js` (`SUPPORTED_TICKET_CREATED`, `SUPPORTED_TICKET_RESOLVED`, `SUPPORTED_TICKET_COMMUNICATED`).
- **Gamification**: Points awarded in controller.

## Error Handling
- Uses `AppError` with `mTablesConstants.ERROR_CODES`.
- Localized messages via `formatMessage` (`en.json`).
- Transactions for atomicity.
- Logs errors via `logger.error`.

## Usage Scenarios
- **Handle Inquiry**: Customer submits payment issue, ticket created, customer gets 11 points.
- **Resolve Dispute**: Staff resolves ticket, customer gets 5.5 points, notified via `SUPPORTED_TICKET_RESOLVED`.
- **Communicate Policies**: Policies sent to customer, no points awarded.

## Security
- **Authentication**: Via `authMiddleware.authenticate`.
- **Authorization**: Roles (`merchant`, `customer`) with permissions (`SUPPORTED_TICKER_CREATE`, `SUPPORTED_TICKER_RESOLVE`, `POLICY_COMMUNICATE`) via `supportMiddleware`.
- **Validation**: Joi schemas in `supportValidator.js`.
- **Auditing**: Logs actions with IP via `auditService`.

## API Endpoints
- **POST /merchant/mtables/support/inquiry**: Creates support ticket.
- **POST /merchant/mtables/support/dispute**: Resolves ticket.
- **POST /merchant/mtables/support/policies**: Sends policies.

## Performance Considerations
- **Transactions**: Ensures atomicity.
- **Caching**: None in service; controller uses `auditService` caching.
- **Rate Limiting**: Handled by `notificationService`.
- **Scalability**: Socket events use namespaced rooms.

## Notes
- **Constants**: Aligned with `mTablesConstants.js`, `gamificationConstants.js`.
- **Localization**: Supports multiple languages (`en.json`).
- **Socket Events**: Namespaced (`merchant:mtables:`).
- **Points**: Capped at 1000/day.
- **Models**: Unchanged.

## Example Workflow
1. Customer sends `POST /merchant/mtables/support/inquiry` with `bookingId`, `customerId`, `issueType`, `description`.
2. Middleware authenticates, validates.
3. Controller calls `handleInquiry`, awards 11 points.
4. Notifications sent to customer (`SUPPORTED_TICKET_CREATED`) and staff (`SUPPORTED_TICKET_ASSIGNED` if applicable).
5. Socket emits `merchant:mtables:supportTicketCreated`.
6. Audit log for `support_ticket_created`.