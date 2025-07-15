# Event Management Service Documentation

## Overview
The Event Management Service enables merchants to create events, manage group bookings, and facilitate group chats. It integrates with notification, audit, socket, and gamification services. Points are automatically awarded for actions, enhancing engagement through a dynamic, rule-based system.

## Methods

### `createEvent`
- **Purpose**: Creates an event with participants.
- **Parameters**:
  - `eventId`: (string): Event ID.
  - `details`: Object containing `merchantId`, `title`, `description`, `occasion`, `paymentType`, `participantIds`.
  - `ipAddress`: (string): IP address of the request.
  - `transaction`: (optional): Sequelize transaction.
- **Returns**: Object with `eventId`, `title`, `participantCount`, `language`, `action`.
- **Errors**:
  - Invalid input (400, `INVALID_EVENT`).
  - Merchant not found (404, `INVALID_CUSTOMER`).
  - Invalid participants (400, `INVALID_PARTICIPANT`).
- **Point Awarding**: Points for `eventCreated`, based on participant count (merchant).

### `manageGroupBookings`
- **Purpose**: Manages bookings (orders, mtables, rides, in-dining) for an event.
- **Parameters**:
  - `eventId`: (string): Event ID.
  - `bookings`: Object with `orders`, `mtablesBookings`, `rides`, `inDiningOrders`.
  - `ipAddress`: (string): IP address of the request.
  - `transaction`: (optional): Sequelize transaction.
- **Returns**: Object with `eventId`, `serviceCount`, `totalAmount`, `language`, `action`.
- **Errors**:
  - Event not found (404, `EVENT_NOT_FOUND`).
  - Invalid services (400, `INVALID_SERVICE`).
  - Max services exceeded (400, `MAX_SERVICES_EXCEEDED`).
- **Point Awarding**: Points for `groupBookingsManaged`, based on service count (merchant).

### `facilitateGroupChat`
- **Purpose**: Sets up a group chat for event participants.
- **Parameters**:
  - `eventId`: (string): Event ID.
  - `participants`: Array of participant IDs.
  - `ipAddress`: (string): IP address of the request.
  - `transaction`: (optional): Sequelize transaction.
- **Returns**: Object with `eventId`, `chatRoom`, `participantCount`, `language`, `action`.
- **Errors**:
  - Event not found (404, `EVENT_NOT_FOUND`).
  - Invalid participants (400, `INVALID_PARTICIPANT`).
- **Point Awarding**: Points for `groupChatFacilitated`, based on participant count (merchant).

## Point System
Points are automatically awarded for actions in `meventsConstants.EVENT_CONSTANTS.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS`.
- **Metadata-Based**:
  - `eventCreated`: Multiplier based on participant count (0.1x per participant).
  - `groupBookingsManaged`: Multiplier based on service count (0.1x service).
  - `groupChatFacilitated`: Multiplier based on participant count (0.1x per participant).
- **Role-Based**: Merchants: 1.2x multiplier.
- **Capped**: Limited to 200 points per action (`MAX_POINTS_PER_ACTION`).
- **Automated**: Integrated into each action, no manual endpoints.

**Configuration** (`gamificationConstants.js`):
- `eventCreated`: 40 base points, 0.1x multiplier for participant count, 1.2x for merchants.
- `groupBookingsManaged`: 35 base points, 0.1x multiplier for service count, 1.2x for merchants.
- `groupChatFacilitated`: 30 base points, 0.1x multiplier for participant count, 1x.2 for merchants.

**Workflow**:
1. **Merchant Action**: Merchant initiates an action (e.g., creates an event).
2. **Service Processing**: Service processes and returns details with metadata.
3. **Point Calculation**: Controller calculates points based on action and metadata.
4. **Point Awarding**: Points are awarded using `gamificationService.awardPoints`.
5. **Notifications and Sockets**: Events inform the merchant and participants.

## Dependencies
- **Models**: `Event`, `EventParticipant`, `EventService`, `User`, `Order`, `Booking`, `Ride`, `InDiningOrder`, `Payment`, `Wallet`.
- **Constants**: `meventsConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `handleServiceError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration
- **Notifications**: Sent for action completion and points awarded (merchant and participants).
- **Audits**: Logs action details and points.
- **Socket Events**: Namespaced (e.g., `merchant:mevents:eventCreated`).
- **Gamification**: Automatic point awards in controller.

## Error Handling
- Uses `AppError` with localized messages and `meventsConstants.errorCodes`.
- Transactions ensure data integrity.
- **Common Errors**:
  - `INVALID_EVENT`: Invalid event details or occasion.
  - `INVALID_CUSTOMER`: Invalid merchant ID.
  - `INVALID_PARTICIPANT`: Invalid participant IDs.
  - `EVENT_NOT_FOUND`: Event not found.
  - `INVALID_SERVICE`: Invalid service IDs.
  - `SYSTEM_ERROR`: Unexpected errors, logged for debugging.

## Usage Scenarios
- **Event Creation**: Creating an event with 5 participants yields 48 points (40 * 5 * 0.2 * 1.2).
- **Group Bookings**: Managing 10 bookings yields 42 points (35 * 1 * 1.2).
- **Group Chat**: Facilitating a chat with 5 participants yields 36 points (30 * 5 * 0.1 * 1.2).

## Security
- **Authentication**: Enforced via `authMiddleware.authenticate`.
- **Authorization**: Restricted to merchants with `manage_events` permissions.
- **Validation**: Uses `express-validator` with localized messages.
- **Auditing**: Logs all actions with IP addresses and metadata.

## Notes
- **Transactions**: Ensure atomicity of operations.
- **Points**: Capped at 1000/day (`MAX_POINTS_PER_PAGE`).
- **Localization**: Messages stored in `en.json`.
- **Socket Events**: Namespaced for clarity.
- **No Manual Points**: Manual endpoint removed, per pattern.
- **Point Calculations**: Simplified by removing wallet logic; assumes external payment service.
