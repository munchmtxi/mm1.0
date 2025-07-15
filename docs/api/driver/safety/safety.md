markdown

Collapse

Unwrap

Copy
# Driver Safety API Documentation

## Overview
The Driver Safety API manages driver safety incidents, SOS triggers, status checks, and discreet alerts. It integrates with common services and automatically awards gamification points for safety-related actions. The API aligns with the platform's localization and constants, supporting multiple languages as defined in the driver constants.

## Service File
**Path**: `src/services/driver/safety/safetyService.js`

The service handles core safety management logic:
- **reportIncident**: Logs an emergency or safety incident, awards points for `safety_report`.
- **triggerSOS**: Activates immediate assistance for the driver, awards points for `sos_trigger`.
- **getSafetyStatus**: Retrieves safety alerts and incident reports, awards points for `safety_status_check`.
- **sendDiscreetAlert**: Sends a discreet safety alert to support, awards points for `discreet_alert`.

The service uses `Driver`, `User`, `Ride`, `Order`, `DriverSafetyIncident`, and `sequelize` models, with constants from `driverConstants`. Common services (`socketService`, `notificationService`, `auditService`, `pointService`) are injected from the controller.

## Controller File
**Path**: `src/controllers/driver/safety/safetyController.js`

Handles HTTP requests and responses:
- **reportIncident**: Processes POST requests to report safety incidents.
- **triggerSOS**: Handles POST requests to trigger SOS alerts.
- **getSafetyStatus**: Manages GET requests to retrieve safety status.
- **sendDiscreetAlert**: Processes POST requests to send discreet alerts.

Injects common services and passes them to the service layer.

## Validation File
**Path**: `src/validators/driver/safety/safetyValidator.js`

Uses Joi to validate:
- **reportIncident**: Ensures `incident_type` is in `driverConstants.SAFETY_CONSTANTS.INCIDENT_TYPES`, `description` (≤1000 chars, optional), `location` (valid lat/lng, optional), and either `ride_id` or `delivery_order_id` (exclusive, optional).
- **sendDiscreetAlert**: Validates `alertType` is in `driverConstants.SAFETY_CONSTANTS.ALERT_TYPES`.
- **triggerSOS** and **getSafetyStatus**: No validation required.

## Middleware File
**Path**: `src/middleware/driver/safety/safetyMiddleware.js`

- **checkDriverExists**: Verifies the driver exists before allowing safety-related operations.

## Route File
**Path**: `src/routes/driver/safety/safetyRoutes.js`

Defines Express routes with Swagger documentation:
- **POST /driver/safety/incident**: Reports a safety incident.
- **POST /driver/safety/sos**: Triggers an SOS alert.
- **GET /driver/safety/status**: Retrieves safety status.
- **POST /driver/safety/discreet-alert**: Sends a discreet safety alert.

Authentication is handled at the main route index.

## Events File
**Path**: `src/socket/events/driver/safety/safetyEvents.js`

Defines namespaced socket events:
- `./safety:incident_reported`
- `./safety:sos_triggered`
- `./safety:status_updated`
- `./safety:discreet_alert_sent`

## Handler File
**Path**: `src/socket/handlers/driver/safetyHandler.js`

Initializes socket event listeners to handle and broadcast safety-related events.

## Localization File
**Path**: `src/locales/driver/safety/en.json`

Contains English translations for driver-facing messages:
- `safety.incident_reported`: "Safety incident {{incident_number}} reported successfully"
- `safety.sos_triggered`: "SOS emergency {{incident_number}} triggered successfully"
- `safety.status_updated`: "Safety status retrieved successfully"
- `safety.discreet_alert_sent`: "Discreet alert sent successfully"

## Constants
Uses constants from:
- `driverConstants.js`: Safety constants (incident types, alert types, support team ID), notification types, error codes, driver settings, and gamification actions (including assumed `safety_report`, `sos_trigger`, `safety_status_check`, `discreet_alert`).

## Endpoints

### POST /driver/safety/incident
- **Description**: Reports a safety incident.
- **Request Body**:
  ```json
  {
    "incident_type": "ACCIDENT",
    "description": "Minor collision at intersection",
    "location": { "lat": 40.7128, "lng": -74.0060 },
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
    "incident_number": "INC-12345678",
    "incident_type": "ACCIDENT",
    "status": "open",
    "priority": "high",
    "created_at": "2025-06-11T15:00:00Z"
  },
  "message": "Safety incident INC-12345678 reported successfully"
}
Points Awarded: 15 points for safety_report (assumed action).
POST /driver/safety/sos
Description: Triggers an SOS alert.
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "id": 2,
    "incident_number": "INC-87654321",
    "status": "open",
    "priority": "critical",
    "created_at": "2025-06-11T15:30:00Z"
  },
  "message": "SOS emergency INC-87654321 triggered successfully"
}
Points Awarded: 25 points for sos_trigger (assumed action).
GET /driver/safety/status
Description: Retrieves safety status and recent incidents.
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "active_alerts": 1,
    "recent_incidents": [
      {
        "id": 1,
        "incident_number": "INC-12345678",
        "incident_type": "ACCIDENT",
        "status": "open",
        "priority": "high",
        "created_at": "2025-06-11T15:00:00Z",
        "ride_id": 123,
        "delivery_order_id": null
      }
    ]
  }
}
Points Awarded: 5 points for safety_status_check (assumed action).
POST /driver/safety/discreet-alert
Description: Sends a discreet safety alert.
Request Body:
json

Collapse

Unwrap

Copy
{
  "alertType": "UNSAFE_SITUATION"
}
Response:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "id": 3,
    "incident_number": "INC-45678901",
    "status": "open",
    "priority": "high",
    "created_at": "2025-06-11T16:00:00Z"
  },
  "message": "Discreet alert sent successfully"
}
Points Awarded: 10 points for discreet_alert (assumed action).
Gamification Integration
Points are awarded automatically:

safety_report: 15 points for reporting an incident (assumed action).
sos_trigger: 25 points for triggering SOS (assumed action).
safety_status_check: 5 points for checking safety status (assumed action).
discreet_alert: 10 points for sending a discreet alert (assumed action). Points are managed by pointService and tied to driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.
Localization
All driver-facing messages use formatMessage with translations from en.json, supporting the driver’s preferred_language (or driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE as fallback) and placeholders for dynamic data (e.g., incident_number).

Internationalization
The service supports multiple languages as defined in driverConstants.DRIVER_SETTINGS.SUPPORTED_LANGUAGES (assumed to align with munchConstants.MUNCH_SETTINGS.SUPPORTED_LANGUAGES: en, es, fr, de, it, sw, ny, pt, hi, yo, zu). The preferred_language field in the User model determines the language for notifications and messages.

Dependencies
Models: Driver, User, Ride, Order, DriverSafetyIncident, sequelize
Constants: driverConstants
Utilities: AppError, logger, formatMessage, uuid
Services: socketService, notificationService, auditService, pointService
Error Handling
Uses AppError with error codes from driverConstants:

DRIVER_NOT_FOUND: Driver not found.
INVALID_DRIVER: Invalid incident type, description, location, IDs, alert type, or operation failure.
Notes
Assumed gamification actions safety_report, sos_trigger, safety_status_check, and discreet_alert. Add to driverConstants.js under GAMIFICATION_CONSTANTS.DRIVER_ACTIONS:
javascript

Collapse

Unwrap

Run

Copy
{ action: 'safety_report', points: 15, walletCredit: 0.25 },
{ action: 'sos_trigger', points: 25, walletCredit: 0.50 },
{ action: 'safety_status_check', points: 5, walletCredit: 0.10 },
{ action: 'discreet_alert', points: 10, walletCredit: 0.20 }
The DriverSafetyIncident model is assumed to have fields driver_id, ride_id, delivery_order_id, incident_number, incident_type, description, location, status, priority, created_at.
The SUPPORT_TEAM_ID is assumed to be a valid userId for sending notifications to the support team.
Fixed typo in incident_number in the original triggerSOS notification message.