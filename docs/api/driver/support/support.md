Documentation File
File Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\driver\support\support.md

markdown

Collapse

Unwrap

Copy
# Driver Support API Documentation

## Overview
The Driver Support API manages driver support requests, ticket tracking, cancellation policies, and escalations. It integrates with common services and automatically awards gamification points for support-related actions. The API aligns with the platform's localization and constants, supporting multiple languages as defined in the driver constants.

## Service File
**Path**: `src/services/driver/support/supportService.js`

The service handles core support management logic:
- **createSupportTicket**: Submits a support request, awards points for `support_ticket_create`.
- **trackTicketStatus**: Tracks the status of a support ticket, awards points for `support_ticket_track`.
- **getCancellationPolicies**: Retrieves cancellation policies, awards points for `support_policy_access`.
- **escalateTicket**: Escalates an urgent support ticket, awards points for `support_ticket_escalate`.

The service uses `Driver`, `User`, `DriverSupportTicket`, `Ride`, `Order`, and `sequelize` models, with constants from `driverConstants`. Common services (`socketService`, `notificationService`, `auditService`, `pointService`) are injected from the controller.

## Controller File
**Path**: `src/controllers/driver/support/supportController.js`

Handles HTTP requests and responses:
- **createSupportTicket**: Processes POST requests to create support tickets.
- **trackTicketStatus**: Handles GET requests to track ticket status.
- **getCancellationPolicies**: Manages GET requests to retrieve cancellation policies.
- **escalateTicket**: Processes POST requests to escalate tickets.

Injects common services and passes them to the service layer.

## Validation File
**Path**: `src/validators/driver/support/supportValidator.js`

Uses Joi to validate:
- **createSupportTicket**: Ensures `service_type` is in `driverConstants.SUPPORT_CONSTANTS.SERVICE_TYPES`, `issue_type` is in `ISSUE_TYPES`, `description` (≥10 chars), and `ride_id` or `delivery_order_id` match `service_type` (`mtxi` or `munch`).
- **trackTicketStatus** and **escalateTicket**: Validates `ticketId` as a positive integer.
- **getCancellationPolicies**: No validation required.

## Middleware File
**Path**: `src/middleware/driver/support/supportMiddleware.js`

- **checkDriverExists**: Verifies the driver exists before allowing support-related operations.

## Route File
**Path**: `src/routes/driver/support/supportRoutes.js`

Defines Express routes with Swagger documentation:
- **POST /driver/support/ticket**: Creates a support ticket.
- **GET /driver/support/ticket/{ticketId}**: Tracks ticket status.
- **GET /driver/support/cancellation-policies**: Retrieves cancellation policies.
- **POST /driver/support/ticket/{ticketId}/escalate**: Escalates a ticket.

Authentication is handled at the main route index.

## Events File
**Path**: `src/socket/events/driver/support/supportEvents.js`

Defines namespaced socket events:
- `./support:ticket_created`
- `./support:ticket_status`
- `./support:cancellation_policies`
- `./support:ticket_escalated`

## Handler File
**Path**: `src/socket/handlers/driver/support/supportHandler.js`

Initializes socket event listeners to handle and broadcast support-related events.

## Localization File
**Path**: `src/locales/driver/support/en.json`

Contains English translations for driver-facing messages:
- `support.ticket_created`: "Support ticket {{ticket_number}} created successfully"
- `support.ticket_status`: "Support ticket {{ticket_number}} status retrieved successfully"
- `support.cancellation_policies`: "Cancellation policies retrieved successfully"
- `support.ticket_escalated`: "Support ticket {{ticket_number}} escalated successfully"

## Constants
Uses constants from:
- `driverConstants.js`: Support constants (service types, issue types, cancellation policies), notification types, error codes, driver settings, and gamification actions (including assumed `support_ticket_create`, `support_ticket_track`, `support_policy_access`, `support_ticket_escalate`).

## Endpoints

### POST /driver/support/ticket
- **Description**: Creates a support ticket.
- **Request Body**:
  ```json
  {
    "service_type": "mtxi",
    "issue_type": "PAYMENT_ISSUE",
    "description": "Payment not received for ride",
    "ride_id": 123
  }
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "id": 1,
    "ticket_number": "TKT-1623456789-ABCDEF123",
    "service_type": "mtxi",
    "issue_type": "PAYMENT_ISSUE",
    "status": "open",
    "priority": "high",
    "created_at": "2025-06-11T16:21:00Z"
  },
  "message": "Support ticket TKT-1623456789-ABCDEF123 created successfully"
}
Points Awarded: 10 points for support_ticket_create (assumed action).
GET /driver/support/ticket/{ticketId}
Description: Tracks the status of a support ticket.
Parameters: ticketId (e.g., 1)
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "id": 1,
    "ticket_number": "TKT-1623456789-ABCDEF123",
    "service_type": "mtxi",
    "issue_type": "PAYMENT_ISSUE",
    "description": "Payment not received for ride",
    "status": "open",
    "priority": "high",
    "resolution_details": null,
    "created_at": "2025-06-11T16:21:00Z",
    "updated_at": "2025-06-11T16:21:00Z",
    "ride_id": 123,
    "delivery_order_id": null,
    "assigned_staff_id": null
  }
}
Points Awarded: 5 points for support_ticket_track (assumed action).
GET /driver/support/cancellation-policies
Description: Retrieves cancellation policies.
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "mtxi": {
      "driver_cancellation_before_acceptance": {
        "fee": 0,
        "allowed": true
      },
      "driver_cancellation_after_acceptance": {
        "fee": 5,
        "allowed": true,
        "time_limit_minutes": 5
      }
    },
    "munch": {
      "driver_cancellation_before_pickup": {
        "fee": 2,
        "allowed": true
      },
      "driver_cancellation_after_pickup": {
        "fee": 10,
        "allowed": false
      }
    }
  }
}
Points Awarded: 5 points for support_policy_access (assumed action).
POST /driver/support/ticket/{ticketId}/escalate
Description: Escalates a support ticket.
Parameters: ticketId (e.g., 1)
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "id": 1,
    "ticket_number": "TKT-1623456789-ABCDEF123",
    "status": "escalated",
    "priority": "high",
    "updated_at": "2025-06-11T16:30:00Z"
  },
  "message": "Support ticket TKT-1623456789-ABCDEF123 escalated successfully"
}
Points Awarded: 15 points for support_ticket_escalate (assumed action).
Gamification Integration
Points are awarded automatically:

support_ticket_create: 10 points for creating a ticket (assumed action).
support_ticket_track: 5 points for tracking ticket status (assumed action).
support_policy_access: 5 points for accessing cancellation policies (assumed action).
support_ticket_escalate: 15 points for escalating a ticket (assumed action). Points are managed by pointService and tied to driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.
Localization
All driver-facing messages use formatMessage with translations from en.json, supporting the driver’s preferred_language (or driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE as fallback) and placeholders for dynamic data (e.g., ticket_number).

Internationalization
The service supports multiple languages as defined in driverConstants.DRIVER_SETTINGS.SUPPORTED_LANGUAGES (assumed to align with munchConstants.MUNCH_SETTINGS.SUPPORTED_LANGUAGES: en, es, fr, de, it, sw, ny, pt, hi, yo, zu). The preferred_language field in the User model determines the language for notifications and messages.

Dependencies
Models: Driver, User, DriverSupportTicket, Ride, Order, sequelize
Constants: driverConstants
Utilities: AppError, logger, formatMessage
Services: socketService, notificationService, auditService, pointService
Error Handling
Uses AppError with error codes from driverConstants:

DRIVER_NOT_FOUND: Driver not found.
INVALID_DRIVER: Invalid service type, issue type, description, IDs, ticket status, or operation failure.
Notes
Assumed gamification actions support_ticket_create, support_ticket_track, support_policy_access, and support_ticket_escalate. Add to driverConstants.js under GAMIFICATION_CONSTANTS.DRIVER_ACTIONS:
javascript

Collapse

Unwrap

Run

Copy
{ action: 'support_ticket_create', points: 10, walletCredit: 0.20 },
{ action: 'support_ticket_track', points: 5, walletCredit: 0.10 },
{ action: 'support_policy_access', points: 5, walletCredit: 0.10 },
{ action: 'support_ticket_escalate', points: 15, walletCredit: 0.25 }
The DriverSupportTicket model is assumed to have fields driver_id, ride_id, delivery_order_id, ticket_number, service_type, issue_type, description, status, priority, resolution_details, created_at, updated_at, assigned_staff_id.
Removed Staff model reference in trackTicketStatus to avoid undefined model errors; assigned_staff_id is included in the response but not joined with a model.
The CANCELLATION_POLICIES structure in the response is an example based on typical policy formats; actual policies should be defined in driverConstants.