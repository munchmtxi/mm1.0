# Staff Communication Service Documentation

## Overview
The Staff Communication Service handles messaging, shift announcements, and communication channel management for the Munch merchant service. It integrates with Socket.IO for real-time communication and includes automatic point awarding for user actions, aligned with the global operations and inclusivity features defined in `staffConstants.js`.

## File Structure
- **Service**: `src/services/merchant/staff/communicationService.js`
- **Controller**: `src/controllers/merchant/staff/communicationController.js`
- **Validator**: `src/validators/merchant/staff/communicationValidator.js`
- **Middleware**: `src/middleware/merchant/staff/communicationMiddleware.js`
- **Routes**: `src/routes/merchant/staff/communicationRoutes.js`
- **Socket Events**: `socket/events/merchant/staff/communicationEvents.js`
- **Socket Handler**: `socket/handlers/merchant/staff/communicationHandler.js`
- **Localization**: `locales/merchant/staff/en.json`

## Service Details
The service handles four main functionalities:
1. **Send Message**: Sends direct messages between staff members with optional channel specification.
2. **Announce Shift**: Broadcasts shift updates to relevant staff.
3. **Manage Channels**: Creates and manages communication channels for different team types.
4. **Track Communication**: Retrieves communication history for a staff member.

### Point Awarding
Points are automatically awarded using the `pointService`:
- Message sent: 10 points (uses `task_completion` from `STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS`)
- Shift announced: 10 points (uses `task_completion`)
- Channel created: 10 points (uses `task_completion`)

## Endpoints

### 1. Send Message
- **Endpoint**: `POST /api/merchant/staff/communication/:staffId/message`
- **Description**: Sends a message to a specific staff member
- **Parameters**:
  - `staffId` (path): Integer ID of the receiving staff
- **Body**:
  - `senderId` (integer): ID of the sending staff
  - `content` (string): Message content
  - `channelId` (integer, optional): Channel ID
- **Responses**:
  - 200: Message sent successfully
  - 400: Invalid request
- **Socket Event**: `staff:messageSent`
- **Points**: 10

### 2. Announce Shift
- **Endpoint**: `POST /api/merchant/staff/communication/:scheduleId/announce`
- **Description**: Broadcasts a shift announcement
- **Parameters**:
  - `scheduleId` (path): Integer ID of the shift
- **Body**:
  - `content` (string): Announcement content
- **Responses**:
  - 200: Shift announced successfully
  - 400: Invalid request
- **Socket Event**: `staff:shiftAnnounced`
- **Points**: 10

### 3. Manage Channels
- **Endpoint**: `POST /api/merchant/staff/communication/:restaurantId/channels`
- **Description**: Creates a new communication channel
- **Parameters**:
  - `restaurantId` (path): Integer ID of the restaurant branch
- **Body**:
  - `name` (string): Channel name
  - `type` (string): Enum [team, shift, manager]
- **Responses**:
  - 200: Channel created successfully
  - 400: Invalid request
- **Socket Event**: `staff:channelManaged`
- **Points**: 10

### 4. Track Communication
- **Endpoint**: `GET /api/merchant/staff/communication/:staffId/track`
- **Description**: Retrieves communication history for a staff member
- **Parameters**:
  - `staffId` (path): Integer ID of the staff member
- **Responses**:
  - 200: Communication history retrieved
  - 400: Invalid request
- **Socket Event**: `staff:communicationTracked`
- **Points**: None

## Dependencies
- **Models**: Staff, Merchant, User, Shift, Message, Channel, MerchantBranch
- **Services**: auditService, socketService, notificationService, pointService
- **Utilities**: logger, localization
- **Constants**: staffConstants

## Socket Events
Defined in `communicationEvents.js`:
- `staff:messageSent`
- `staff:shiftAnnounced`
- `staff:channelManaged`
- `staff:communicationTracked`

## Error Handling
All functions include error handling with error messages from `staffConstants.STAFF_ERROR_CODES` and localized in `en.json`. Fallback error messages are used if constants are unavailable.

## Localization
All user-facing messages are localized using the `formatMessage` utility, with translations stored in `en.json`. Supported languages include those defined in `staffConstants.STAFF_SETTINGS.SUPPORTED_LANGUAGES`.

## Security
- Authentication is handled by main route middleware.
- Input validation uses express-validator with error codes from `staffConstants.STAFF_ERROR_CODES`.
- Audit logging tracks all actions using `staffConstants.STAFF_AUDIT_ACTIONS`.
- Socket events are namespaced to prevent unauthorized access.
- Permissions are aligned with `staffConstants.STAFF_PERMISSIONS` for roles like `manager`.

## Global Operations
The service supports global operations in regions defined in `staffConstants.STAFF_SETTINGS.SUPPORTED_CITIES` (e.g., Malawi, Tanzania, Kenya, India, Brazil) and uses `STAFF_SETTINGS.SUPPORTED_LANGUAGES` for localization.

## Notes
- Point awarding uses the `task_completion` action from `STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS` as a fallback (10 points) due to the absence of specific communication-related actions.
- The service is compatible with merchant types defined in `staffConstants.STAFF_ROLES` (e.g., restaurant, cafe, grocery).