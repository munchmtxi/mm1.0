# SupportService Documentation

## Overview
The `SupportService` manages order inquiries, disputes, and policy communication for the `munch` module. Gamification points for support interactions are awarded automatically in the controller.

## Methods

### `handleOrderInquiry`
- **Purpose**: Addresses order inquiries by creating a support ticket.
- **Parameters**:
  - `orderId`: Number, order ID.
  - `issue`: Object with `type`, `description`, `priority`.
- **Returns**: Object with `ticketId`, `ticketNumber`, `orderId`, `status`.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input or issue type.
  - `ERROR_CODES[0]` (404): Order not found.

### `resolveOrderDispute`
- **Purpose**: Resolves order disputes.
- **Parameters**:
  - `orderId`: Number.
  - `resolution`: Object with `action`, `details`.
- **Returns**: Object with `ticketId`, `orderId`, `status`, `resolutionAction`.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input or resolution action.
  - `ERROR_CODES[0]` (404): Ticket or order not found.

### `shareOrderPolicies`
- **Purpose**: Communicates refund and order policies.
- **Parameters**:
  - `orderId`: Number.
- **Returns**: Object with `orderId`, `customerId`.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input.
  - `ERROR_CODES[0]` (404): Order not found.

## Points
Points awarded via `gamificationConstants`:
- **support_interaction**: 3 points, 1.05x customer (3.15 points).
- **Capped**: 30/action, 150/day.
- **Automated**: In `resolveOrderDisputeController` for resolved tickets within 24 hours.

**Workflow**:
1. Customer submits inquiry or merchant resolves dispute.
2. Service processes data.
3. Controller sends notifications, emits sockets, logs audits, and awards points (for resolved disputes).

## Dependencies
- **Models**: `SupportTicket`, `Order`, `Customer`, `MerchantBranch`, `Staff`, `GamificationPoints` (controller).
- **Constants**: `munchConstants`, `gamificationConstants` (controller).
- **Utilities**: `formatMessage`, `AppError`, `logger`.
- **Services** (controller): `notificationService`, `auditService`, `socketService`, `pointService`.

## Integration
- **Notifications**:
  - Customer: `INQUIRY_SUBMITTED`, `DISPUTE_RESOLVED`, `ORDER_POLICIES`.
  - Staff: `TICKET_ASSIGNED`.
- **Audits**: Logs `HANDLE_ORDER_INQUIRY`, `RESOLVE_ORDER_DISPUTE`, `SHARE_ORDER_POLICIES`.
- **Socket Events**: Namespaced (`merchant:munch:`) via `supportEvents.js`.
- **Gamification**: Points in controller for resolved disputes.

## Error Handling
- `AppError` with `munchConstants.ERROR_CODES[0]`.
- Localized via `formatMessage` (`en.json`).
- Transactions ensure atomicity.
- Logs via `logger.error`.

## Usage Scenarios
- **Order Inquiry**: Customer submits issue, ticket created.
- **Resolve Dispute**: Merchant resolves ticket, customer earns points.
- **Share Policies**: Merchant communicates policies.

## Security
- **Authentication**: Via `authMiddleware`.
- **Authorization**: `merchant` role with permissions.
- **Validation**: Joi schemas in `supportValidator.js`.
- **Auditing**: Logs actions with IP.

## API Endpoints
- **POST /merchant/munch/support/inquiry**
- **POST /merchant/munch/support/dispute**
- **POST /merchant/munch/support/policies**

## Performance
- **Transactions**: Ensures consistency.
- **Caching**: None in service.
- **Rate Limiting**: Via `notificationService`.
- **Scalability**: Socket events use namespaced rooms.

## Notes
- **Constants**: Aligned with `munchConstants.js`.
- **Localization**: Supports `en.json`.
- **Socket Events**: Namespaced.
- **Points**: Automated in controller, capped at 150/day.
- **Models**: Unchanged.

## Example Workflow
1. Customer sends `POST /merchant/munch/support/inquiry`.
2. Middleware authenticates, validates.
3. Controller calls `handleOrderInquiry`, sends notifications, emits socket.
4. Audit logs `handle_order_inquiry`.
5. Response with ticket data.