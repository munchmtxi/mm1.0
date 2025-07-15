authSystem.md
A detailed and thorough Markdown file documenting the authentication system, including endpoints, constants, services, and integration details.

File: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\common\auth\authSystem.md

markdown

Collapse

Unwrap

Copy
# Authentication System Documentation

## Overview
The Authentication System for MM1.0 provides secure user registration, login, logout, token refresh, and multi-factor authentication (MFA) for roles: `admin`, `customer`, `driver`, `merchant`, and `staff`. It integrates with `socketService` for real-time event emission, `notificationService` for user notifications, and `auditService` for compliance logging. The system uses JWT for session management, supports Google OAuth, and enforces role-based access control (RBAC).

**Last Updated**: June 26, 2025

## Architecture
- **Controllers**: `authController.js` handles HTTP requests and responses.
- **Services**: `authService.js` manages core authentication logic (registration, login, etc.).
- **Socket Handlers**: Handle real-time events (`loginHandler.js`, `logoutHandler.js`, `mfaHandler.js`, `verificationHandler.js`).
- **Middleware**: `authMiddleware.js` for JWT authentication and RBAC.
- **Validators**: `authValidator.js` for input validation.
- **Routes**: `authRoutes.js` defines API endpoints with Swagger documentation.
- **Constants**: `authConstants.js` for settings, error codes, and success messages.
- **Localization**: `en.json` for English translations of messages.
- **Dependencies**:
  - `socketService.js`: Emits socket events to role-specific rooms.
  - `notificationService.js`: Sends notifications (email, SMS, push, WhatsApp, in-app).
  - `auditService.js`: Logs actions for compliance.
  - `config.js`: Environment and security configurations.

## Endpoints
All endpoints are prefixed with `/auth`.

### POST /register
- **Description**: Registers a new customer account.
- **Request Body**:
  ```json
  {
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "password": "string",
    "phone": "string|null",
    "country": "MWI|US",
    "merchant_type": "grocery|restaurant|cafe|null",
    "role": "customer|null",
    "mfa_method": "email|sms|authenticator|null"
  }
Responses:
201: { status: "success", message: "User successfully registered", data: { id, first_name, last_name, email, role } }
400: Validation error
403: Permission denied (non-customer role)
Middleware: rateLimiters.general, registerValidations, validate
Actions:
Registers user via authService.registerUser.
Logs audit event (USER_REGISTRATION) via auditService.
Emits user:mfa_enabled socket event if MFA is enabled.
Sends user_registered notification via notificationService.
POST /register-non-customer
Description: Registers a non-customer account (admin, driver, merchant, staff) by an admin.
Security: Requires JWT with admin role.
Request Body:
json

Collapse

Unwrap

Copy
{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "password": "string",
  "phone": "string|null",
  "country": "MWI|US",
  "merchant_type": "grocery|restaurant|cafe|null",
  "role": "admin|driver|merchant|staff",
  "mfa_method": "email|sms|authenticator|null"
}
Responses:
201: { status: "success", message: "User successfully registered", data: { id, first_name, last_name, email, role } }
400: Validation error
401: Unauthorized
403: Permission denied (non-admin requester)
Middleware: rateLimiters.auth, authenticate, restrictTo('admin'), registerNonCustomerValidations, validate
Actions:
Registers user via authService.registerUser.
Logs audit event (USER_REGISTRATION) with registeredBy detail.
Emits user:mfa_enabled socket event if MFA is enabled.
Sends user_registered notification.
POST /login/{role}
Description: Authenticates a user for a specific role (admin, customer, driver, merchant, staff).
Request Body:
json

Collapse

Unwrap

Copy
{
  "email": "string",
  "password": "string",
  "device_id": "string|null",
  "device_type": "desktop|mobile|tablet|unknown|null",
  "platform": "web|ios|android|null",
  "mfa_code": "string|null"
}
Responses:
200: { status: "success", message: "User successfully logged in", data: { user: { id, first_name, last_name, email, role, profile }, access_token, refresh_token } }
400: Validation error
401: Unauthorized
Middleware: rateLimiters.auth, loginValidations, validate
Actions:
Authenticates via authService.loginUser.
Emits user:login or user:google_login socket event.
Logs audit event (LOGIN).
Sends user_logged_in notification.
POST /logout
Description: Terminates a user session or all sessions.
Security: Requires JWT.
Request Body:
json

Collapse

Unwrap

Copy
{
  "device_id": "string|null",
  "clear_all_devices": "boolean|null"
}
Responses:
200: { status: "success", message: "Session successfully terminated" }
400: Validation error
401: Unauthorized
Middleware: rateLimiters.general, authenticate, logoutValidations, validate
Actions:
Logs out via authService.logoutUser.
Emits user:logout socket event.
Logs audit event (LOGOUT).
Sends session_terminated notification.
POST /refresh
Description: Refreshes JWT access token using a refresh token.
Request Body:
json

Collapse

Unwrap

Copy
{
  "refresh_token": "string"
}
Responses:
200: { status: "success", message: "Token successfully refreshed", data: { access_token, refresh_token } }
400: Validation error
401: Unauthorized
Middleware: rateLimiters.general, refreshTokenValidations, validate
Actions:
Refreshes token via authService.refreshToken.
Emits user:token_refreshed socket event.
Logs audit event (TOKEN_ISSUANCE).
Sends token_refreshed notification.
POST /verify-mfa
Description: Verifies an MFA code.
Request Body:
json

Collapse

Unwrap

Copy
{
  "user_id": "integer",
  "mfa_code": "string",
  "mfa_method": "email|sms|authenticator"
}
Responses:
200: { status: "success", message: "Multi-factor authentication enabled", data: {} }
400: Validation error
401: Unauthorized
Middleware: rateLimiters.auth, verifyMfaValidations, validate
Actions:
Verifies MFA via authService.verifyMfa.
Emits user:mfa_verified socket event.
Logs audit event (MFA_ATTEMPT).
Sends mfa_verified notification.
GET /auth/google
Description: Initiates Google OAuth flow (handled by authController.googleOAuth).
Responses:
Redirects to Google OAuth consent screen.
Middleware: None
GET /auth/google/callback
Description: Handles Google OAuth callback and issues tokens.
Query Parameters:
code: Authorization code (required)
state: State parameter (optional)
device_id: Device ID (optional)
device_type: Device type (optional)
Responses:
Redirects to frontend with access_token, refresh_token, user_id, and role.
400: Validation error
Middleware: googleOAuthCallbackValidations, validate
Actions:
Authenticates via authService.googleOAuthLogin.
Emits user:google_login socket event.
Logs audit event (LOGIN).
Sends user_logged_in notification.
Constants (authConstants.js)
AUTH_SETTINGS:
DEFAULT_ROLE: 'customer'
SUPPORTED_ROLES: ['admin', 'customer', 'driver', 'merchant', 'staff']
SUPPORTED_COUNTRIES: ['MWI', 'US']
MFA_CONSTANTS:
MFA_METHODS: ['email', 'sms', 'authenticator']
MFA_REQUIRED_ROLES: ['admin', 'driver', 'merchant', 'staff']
AUDIT_LOG_CONSTANTS:
LOG_TYPES: { USER_REGISTRATION, LOGIN, LOGOUT, TOKEN_ISSUANCE, MFA_ATTEMPT, VERIFICATION_ATTEMPT }
ERROR_CODES:
VALIDATION_ERROR, PERMISSION_DENIED, UNAUTHORIZED, USER_NOT_FOUND, SOCKET_ERROR, INVALID_STAFF_TYPE
SUCCESS_MESSAGES:
[0]: user_registered
[1]: token_refreshed
[2]: mfa_enabled
[3]: mfa_verified
[4]: user_verified
[5]: session_terminated
Socket Events (authEvents.js)
user:login: Emitted on standard login.
user:google_login: Emitted on Google OAuth login.
user:logout: Emitted on logout.
user:mfa_enabled: Emitted when MFA is enabled.
user:mfa_verified: Emitted when MFA is verified.
user:verification_submitted: Emitted when verification is submitted.
user:verification_approved: Emitted when verification is approved.
user:token_refreshed: Emitted on token refresh.
Integration with Services
SocketService:
Emits events to role:${role} rooms using socketService.emit.
Validates events, roles, and payload size.
Logs audit actions for events with auditAction.
NotificationService:
Sends notifications (email, SMS, push, WhatsApp, in-app) for registration, login, logout, token refresh, and MFA events.
Uses notificationType: 'AUTH' and messageKey from en.json.
Respects user notification_preferences and rate limits.
AuditService:
Logs actions (USER_REGISTRATION, LOGIN, LOGOUT, TOKEN_ISSUANCE, MFA_ATTEMPT, VERIFICATION_ATTEMPT).
Stores logs in AuditLog model with user_id, role, log_type, details, ip_address, and metadata.
Supports role-based access control for log retrieval.
Security
JWT: Uses HS256 algorithm, configured via config.js (jwt.secret, jwt.expiresIn).
Rate Limiting: Applied via rateLimiters.auth (5 reqs/min) and rateLimiters.general (100 reqs/min).
RBAC: Enforced via restrictTo middleware; only admins can register non-customers.
MFA: Required for admin, driver, merchant, staff roles; supports email, sms, authenticator.
Validation: Handled by express-validator in authValidator.js.
Localization: Messages localized via en.json and formatMessage from localizationService.
Error Handling
Errors are thrown as AppError with status codes (400, 401, 403, 500) and ERROR_CODES.
Socket errors (SOCKET_ERROR, INVALID_EVENT, etc.) are logged via logger.logErrorEvent.
Validation errors are aggregated and returned as a single message.
Dependencies
External:
express, express-validator, passport, google-libphonenumber, password-validator
axios, axios-retry, node-cache, ioredis, sequelize
twilio (SMS/WhatsApp), zohoMailClient, zohoPushClient
Internal:
Models: User, Role, Notification, NotificationLog, AuditLog
Utils: catchAsync, logger, rateLimiter, localizationService
Constants: authConstants, socketConstants, notificationConstants, localizationConstants
Configuration (config.js)
JWT: secret, expiresIn, refreshSecret, refreshExpiresIn.
Redis: host, port for rate limiting and caching.
Google OAuth: clientId, clientSecret, redirectUri.
Email/SMS/WhatsApp: Configured via emailService, sms, whatsapp.
Security: rateLimiting, cors, csp settings.
Notes
IP Address: Audit logs use req.ip in authController.js; handlers use placeholder 0.0.0.0 (pass IP from controller if needed).
MFA Code Length: Set to 6 characters; adjust if MFA_TOKEN_LENGTH is defined.
Password Requirements: Minimum 8 characters, maximum 128, requires uppercase, lowercase, digits, and symbols.
Localization: Assumes en.json is used with formatMessage; add other languages as needed.
Scalability: Uses Redis for rate limiting and caching; socketService supports Redis adapter for scalability.
Testing: Ensure en.json keys match notificationService calls; test MFA and Google OAuth flows thoroughly.
For further details, refer to the Swagger UI at /api-docs or contact the development team.

text

Collapse

Unwrap

Copy
**Notes**:
- Provides a comprehensive overview of the authentication system, including endpoints, constants, services, and integrations.
- Aligns with `authConstants`, `en.json`, and provided services (`socketService`, `notificationService`, `auditService`).
- Includes Swagger-compatible endpoint descriptions, matching `authRoutes.js`.
- Details security, error handling, and dependencies for clarity.
- Assumes `MFA_TOKEN_LENGTH` is 6; adjust if defined in `authConstants`.
- Assumes `SUPPORTED_COUNTRIES` maps to `SUPPORTED_CURRENCIES` (`MWI`, `US`) from `authConstants`.

### Additional Notes
- **Missing `authConstants.js` Details**: Assumed structure based on usage (e.g., `SUCCESS_MESSAGES` as array, `ERROR_CODES` as object). If you have the full `authConstants.js`, provide it to ensure exact mappings.
- **IP Address Handling**: Handlers use `0.0.0.0` as placeholders. To pass actual IPs, modify handlers to accept `ipAddress` as a parameter from `authController.js` (e.g., `handleLogin(io, user, isGoogle, req.ip)`).
- **Notification Keys**: Ensured `en.json` includes all `messageKey` values used in `notificationService.sendNotification`. Add to other language files if needed.
- **Swagger Setup**: Assumes Swagger is configured in the project (e.g., via `swagger-jsdoc` and `swagger-ui-express`). Add to main app if not present:
  ```javascript
  const swaggerUi = require('swagger-ui-express');
  const swaggerJsdoc = require('swagger-jsdoc');
  const options = {
    definition: {
      openapi: '3.0.0',
      info: { title: 'MM1.0 API', version: '1.0.0' },
      components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    },
    apis: ['./src/routes/**/*.js'],
  };
  const specs = swaggerJsdoc(options);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
Testing: Validate en.json keys in notificationService, test MFA and Google OAuth endpoints, and ensure audit logs capture correct ipAddress.