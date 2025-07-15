Configuration Service Documentation
Overview
The Configuration Service for mtables (Admin) enables restaurant administrators to manage table assignment policies, gamification rules, waitlist settings, and pricing models for a merchant branch (restaurant). The service integrates with Sequelize models, automatically awards gamification points for configuration updates, and supports localization for user-facing messages. This service is critical for tailoring restaurant operations to specific business needs, enhancing customer engagement through gamification, and ensuring compliance via auditing. Complementary files include a controller, validator, middleware, routes, socket events, socket handlers, and an updated localization file. This documentation provides a comprehensive guide to the service, its endpoints, and all related components.

File Structure
Service: src/services/admin/mtables/configurationService.js
Controller: src/controllers/admin/mtables/configurationController.js
Validator: src/validators/admin/mtables/configurationValidator.js
Middleware: src/middleware/admin/mtables/configurationMiddleware.js
Routes: src/routes/admin/mtables/configurationRoutes.js
Events: socket/events/admin/mtables/configurationEvents.js
Handler: socket/handlers/admin/mtables/configurationHandler.js
Localization: locales/admin/mtables/en.json
Service Description
The configurationService.js file contains four core functions:

setTableRules:
Purpose: Defines table assignment policies for a restaurant, such as auto-assignment, minimum and maximum party sizes, and preferred table locations.
Input: restaurantId (number), rules (object with autoAssign, minCapacity, maxCapacity, preferredLocation), pointService (injected for point awarding).
Output: An object with restaurantId and updated rules.
Models Used: MerchantBranch, BookingTimeSlot.
Validation:
minCapacity ≥ TABLE_MANAGEMENT.MIN_TABLE_CAPACITY.
maxCapacity ≤ TABLE_MANAGEMENT.MAX_TABLE_CAPACITY.
preferredLocation must be in TABLE_MANAGEMENT.LOCATION_TYPES.
Gamification: Awards points to the merchant for settingsUpdated action (SETTINGS_UPDATE points).
configureGamificationRules:
Purpose: Sets point values and wallet credits for gamification actions (e.g., booking creation, check-in).
Input: restaurantId (number), gamificationRules (object mapping actions to { points, walletCredit }), pointService.
Output: An object with restaurantId and updated gamificationRules.
Models Used: MerchantBranch.
Validation:
Actions must exist in GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS or STAFF_ACTIONS.
points and walletCredit must be non-negative.
Gamification: Awards points to the merchant for settingsUpdated action.
updateWaitlistSettings:
Purpose: Adjusts waitlist policies, such as maximum waitlist size and notification intervals for customers.
Input: restaurantId (number), waitlistSettings (object with maxWaitlist, notificationInterval), pointService.
Output: An object with restaurantId and updated waitlistSettings.
Models Used: MerchantBranch.
Validation:
maxWaitlist ≤ TABLE_MANAGEMENT.WAITLIST_LIMIT.
notificationInterval between 5 and 60 minutes.
Gamification: Awards points to the merchant for settingsUpdated action.
configurePricingModels:
Purpose: Sets deposit percentages and service fees for bookings to manage financial policies.
Input: restaurantId (number), pricingModels (object with depositPercentage, serviceFee), pointService.
Output: An object with restaurantId and updated pricingModels.
Models Used: MerchantBranch.
Validation:
depositPercentage between BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE and MAX_DEPOSIT_PERCENTAGE.
serviceFee between 0 and 100.
Gamification: Awards points to the merchant for settingsUpdated action.
Dependencies
Sequelize Models: MerchantBranch (stores metadata), BookingTimeSlot (stores table assignment settings).
Constants:
mtablesConstants: Defines error codes, table management limits, location types, booking policies, notification types, audit types, permissions, gamification actions, and point award actions.
adminServiceConstants: Provides additional booking-related constants.
Utilities:
localizationService: Formats localized messages with formatMessage.
logger: Logs info and error events.
AppError: Handles errors with standardized codes and messages.
Gamification Integration
Points are awarded automatically within each function using pointService.awardPoints.
Action and Points (from mtablesConstants):
settingsUpdated: GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.SETTINGS_UPDATE (e.g., 10 points, merchant).
Points are awarded to the merchant for updating any configuration, incentivizing active management.
No separate point-awarding endpoint exists; points are awarded dynamically upon successful configuration updates.
Point expiration is managed by pointService, typically set to 365 days (assumed from GAMIFICATION_CONSTANTS.POINT_EXPIRY_DAYS).
Endpoints
1. PUT /admin/mtables/configuration/table-rules/:restaurantId
Description: Updates table assignment policies for a restaurant, controlling how tables are assigned to bookings.
Permission: MANAGE_SETTINGS
Parameters:
restaurantId (path, required): Integer ID of the merchant branch.
Request Body:
json

Collapse

Unwrap

Copy
{
  "autoAssign": true,
  "minCapacity": 2,
  "maxCapacity": 8,
  "preferredLocation": "indoor"
}
autoAssign (optional): Boolean to enable/disable auto-assignment.
minCapacity (optional): Minimum party size (integer).
maxCapacity (optional): Maximum party size (integer).
preferredLocation (optional): Table location (e.g., indoor, outdoor).
At least one field required.
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "restaurantId": 123,
    "rules": {
      "autoAssign": true,
      "minCapacity": 2,
      "maxCapacity": 8,
      "preferredLocation": "indoor"
    }
  },
  "message": "Table assignment rules updated successfully."
}
400: Invalid restaurant ID, capacity, or location type (INVALID_BOOKING_DETAILS, INVALID_PARTY_SIZE, TABLE_NOT_AVAILABLE).
403: Permission denied (PERMISSION_DENIED).
404: Restaurant not found (BOOKING_NOT_FOUND).
Socket Event: /configuration:table_rules_updated (emits updated rules to merchants).
Notification: Sent to the merchant with configuration.table_rules_updated message, including restaurantId and autoAssign.
Audit: Logs action with BOOKING_UPDATED type, including restaurantId and rules.
Gamification: Awards 10 points to the merchant for settingsUpdated.
Use Case: Restaurant managers configure table assignment to optimize seating arrangements.
2. PUT /admin/mtables/configuration/gamification/:restaurantId
Description: Updates gamification rules, setting points and wallet credits for actions to incentivize customer and staff behavior.
Permission: MANAGE_SETTINGS
Parameters:
restaurantId (path, required): Integer ID of the restaurant.
Request Body:
json

Collapse

Unwrap

Copy
{
  "CHECK_IN": {
    "points": 20,
    "walletCredit": 5
  },
  "TASK_COMPLETION": {
    "points": 10,
    "walletCredit": 0
  }
}
Keys are action IDs (from GAMIFICATION_CONSTANTS); values are objects with points and walletCredit (non-negative numbers).
At least one action required.
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "restaurantId": 123,
    "gamificationRules": {
      "CHECK_IN": { "points": 20, "walletCredit": 5 },
      "TASK_COMPLETION": { "points": 10, "walletCredit": 0 }
    }
  },
  "message": "Gamification rules updated successfully."
}
400: Invalid restaurant ID, action, or negative values (INVALID_BOOKING_DETAILS, GAMIFICATION_POINTS_FAILED).
403: Permission denied (PERMISSION_DENIED).
404: Restaurant not found (BOOKING_NOT_FOUND).
Socket Event: /configuration:gamification_updated (emits updated rules to merchants).
Notification: Sent to the merchant with configuration.gamification_updated message, including restaurantId.
Audit: Logs action with BOOKING_UPDATED type, including restaurantId and gamificationRules.
Gamification: Awards 10 points to the merchant for settingsUpdated.
Use Case: Merchants customize rewards to encourage customer engagement and staff performance.
3. PUT /admin/mtables/configuration/waitlist/:restaurantId
Description: Updates waitlist policies, controlling the maximum waitlist size and notification frequency for customers.
Permission: MANAGE_SETTINGS
Parameters:
restaurantId (path, required): Integer ID of the restaurant.
Request Body:
json

Collapse

Unwrap

Copy
{
  "maxWaitlist": 50,
  "notificationInterval": 15
}
maxWaitlist (optional): Maximum waitlist entries (integer).
notificationInterval (optional): Notification interval in minutes (5-60).
At least one field required.
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "restaurantId": 123,
    "waitlistSettings": {
      "maxWaitlist": 50,
      "notificationInterval": 15
    }
  },
  "message": "Waitlist settings updated successfully."
}
400: Invalid restaurant ID, waitlist limit, or interval (INVALID_BOOKING_DETAILS, MAX_BOOKINGS_EXCEEDED).
403: Permission denied (PERMISSION_DENIED).
404: Restaurant not found (BOOKING_NOT_FOUND).
Socket Event: /configuration:waitlist_updated (emits updated settings to merchants).
Notification: Sent to the merchant with configuration.waitlist_updated message, including restaurantId and maxWaitlist.
Audit: Logs action with BOOKING_UPDATED type, including restaurantId and waitlistSettings.
Gamification: Awards 10 points to the merchant for settingsUpdated.
Use Case: Restaurants manage waitlist operations to balance customer demand and staff workload.
4. PUT /admin/mtables/configuration/pricing/:restaurantId
Description: Updates pricing models, setting deposit percentages and service fees for bookings.
Permission: MANAGE_SETTINGS
Parameters:
restaurantId (path, required): Integer ID of the restaurant.
Request Body:
json

Collapse

Unwrap

Copy
{
  "depositPercentage": 10,
  "serviceFee": 5
}
depositPercentage (optional): Deposit percentage (within policy limits).
serviceFee (optional): Service fee amount (0-100).
At least one field required.
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "restaurantId": 123,
    "pricingModels": {
      "depositPercentage": 10,
      "serviceFee": 5
    }
  },
  "message": "Pricing models updated successfully."
}
400: Invalid restaurant ID, deposit percentage, or service fee (INVALID_BOOKING_DETAILS, PAYMENT_FAILED).
403: Permission denied (PERMISSION_DENIED).
404: Restaurant not found (BOOKING_NOT_FOUND).
Socket Event: /configuration:pricing_updated (emits updated models to merchants).
Notification: Sent to the merchant with configuration.pricing_updated message, including restaurantId and depositPercentage.
Audit: Logs action with BOOKING_UPDATED type, including restaurantId and pricingModels.
Gamification: Awards 10 points to the merchant for settingsUpdated.
Use Case: Restaurants set financial policies to manage booking revenue and customer expectations.
Complementary Files
Controller (configurationController.js)
Purpose: Handles HTTP requests, integrates notificationService, socketService, auditService, and pointService, and calls service methods.
Functions:
setTableRules: Updates table rules with audit, notification, socket event, and point awarding.
configureGamificationRules: Updates gamification rules with audit, notification, socket event, and point awarding.
updateWaitlistSettings: Updates waitlist settings with audit, notification, socket event, and point awarding.
configurePricingModels: Updates pricing models with audit, notification, socket event, and point awarding.
Response Format: Standardized JSON with status, data, and message (localized).
Dependencies: Service, common services, constants, localization, logger.
Error Handling: Passes errors to the Express error handler via next.
Validator (configurationValidator.js)
Purpose: Validates request parameters and body using Joi.
Schemas:
setTableRules: Validates restaurantId and body (autoAssign, minCapacity, maxCapacity, preferredLocation).
configureGamificationRules: Validates restaurantId and body (action objects with points, walletCredit).
updateWaitlistSettings: Validates restaurantId and body (maxWaitlist, notificationInterval).
configurePricingModels: Validates restaurantId and body (depositPercentage, serviceFee).
Error Messages: Localized using formatMessage with dynamic parameters.
Dependencies: Joi, constants, localization.
Middleware (configurationMiddleware.js)
Purpose: Validates requests and checks permissions.
Functions:
validateSetTableRules, validateConfigureGamificationRules, validateUpdateWaitlistSettings, validateConfigurePricingModels: Validate using validator schemas.
checkManageSettingsPermission: Ensures MANAGE_SETTINGS permission.
Error Handling: Throws AppError with localized messages and error codes.
Dependencies: Joi, constants, localization, AppError.
Routes (configurationRoutes.js)
Purpose: Defines Express routes with Swagger documentation.
Endpoints:
PUT /table-rules/:restaurantId
PUT /gamification/:restaurantId
PUT /waitlist/:restaurantId
PUT /pricing/:restaurantId
Middleware: Applies validation and permission checks.
Swagger: Detailed API specs with request/response schemas, error codes, and descriptions.
Dependencies: Express, controller, middleware, constants.
Events (configurationEvents.js)
Purpose: Defines socket event names with /configuration: namespace.
Events:
TABLE_RULES_UPDATED: /configuration:table_rules_updated
GAMIFICATION_UPDATED: /configuration:gamification_updated
WAITLIST_UPDATED: /configuration:waitlist_updated
PRICING_UPDATED: /configuration:pricing_updated
Usage: Used by controller and handler for real-time updates.
Handler (configurationHandler.js)
Purpose: Processes socket events for real-time client updates.
Function: setupConfigurationHandlers registers handlers for each event, logging and re-emitting data.
Dependencies: Events, logger.
Behavior: Ensures reliable event delivery with logging for debugging.
Localization (en.json)
Purpose: Provides English translations for all user-facing messages.
Sections:
error: Configuration, booking, and analytics errors (e.g., invalid_gamification_action, invalid_deposit_percentage).
success: Success messages for configuration, booking, and analytics operations.
analytics: Notification messages for analytics endpoints.
booking: Notification messages for booking operations.
configuration: Notification messages for configuration operations (e.g., table_rules_updated, pricing_updated).
Dynamic Values: Supports placeholders (e.g., {restaurantId}, {autoAssign}).
Dependencies: Used by formatMessage in service, controller, validator, and middleware.
Constants Usage
mtablesConstants:
ERROR_CODES: INVALID_BOOKING_DETAILS, BOOKING_NOT_FOUND, INVALID_PARTY_SIZE, TABLE_NOT_AVAILABLE, GAMIFICATION_POINTS_FAILED, MAX_BOOKINGS_EXCEEDED, PAYMENT_FAILED, INVALID_INPUT, PERMISSION_DENIED.
TABLE_MANAGEMENT: MIN_TABLE_CAPACITY, MAX_TABLE_CAPACITY, LOCATION_TYPES, WAITLIST_LIMIT.
BOOKING_POLICIES: MIN_DEPOSIT_PERCENTAGE, MAX_DEPOSIT_PERCENTAGE.
NOTIFICATION_TYPES: BOOKING_UPDATED.
AUDIT_TYPES: BOOKING_UPDATED.
PERMISSIONS: MANAGE_SETTINGS.
GAMIFICATION_CONSTANTS: CUSTOMER_ACTIONS, STAFF_ACTIONS, ADMIN_ACTIONS.SETTINGS_UPDATE, POINT_EXPIRY_DAYS.
POINT_AWARD_ACTIONS: settingsUpdated.
adminServiceConstants: Provides additional booking-related constants (e.g., MTABLES_CONSTANTS).
Security and Compliance
Authentication: Handled by middleware in the main route index (not included here), providing req.user with id and permissions.
Permissions: Requires MANAGE_SETTINGS for all endpoints, ensuring only authorized users can modify configurations.
Auditing: All actions are logged with auditService:
Each endpoint logs BOOKING_UPDATED with restaurantId and configuration details.
Localization: All user-facing messages are localized using formatMessage with dynamic parameters for clarity and multilingual support.
Data Validation: Joi ensures valid inputs, preventing invalid configurations or security issues like SQL injection.
Error Handling: Uses AppError with standardized error codes and localized messages for consistent error responses.
Real-Time Updates
Socket Events:
/configuration:table_rules_updated: Broadcasts updated table rules to merchants.
/configuration:gamification_updated: Broadcasts updated gamification rules.
/configuration:waitlist_updated: Broadcasts updated waitlist settings.
/configuration:pricing_updated: Broadcasts updated pricing models.
Notifications:
table_rules_updated: Informs merchants of table rule changes with autoAssign status.
gamification_updated: Notifies merchants of gamification rule updates.
waitlist_updated: Informs merchants of waitlist setting changes with maxWaitlist.
pricing_updated: Notifies merchants of pricing model updates with depositPercentage.
Reliability: Handlers log events for debugging and ensure delivery to connected clients.
Error Handling
AppError: Used for all errors with:
Localized message (via formatMessage with dynamic parameters).
HTTP status code (400, 403, 404).
Error code (from mtablesConstants.ERROR_CODES).
Optional details (e.g., validation errors).
Logging: Errors are logged with logger.logErrorEvent for traceability, including restaurantId and error message.
Controller: Errors are passed to Express error handler for consistent API responses.
Integration Points
Models: Interacts with MerchantBranch (stores booking_metadata) and BookingTimeSlot (stores table assignment settings).
Services: Relies on pointService for gamification, injected via controller.
Notifications: Uses notificationService to inform merchants of configuration changes.
Sockets: Uses socketService for real-time event broadcasting.
Auditing: Uses auditService for compliance logging of all configuration updates.
Localization: Integrates with localizationService for multilingual error and success messages.
Assumptions and Notes
Authentication: Assumed to be handled by main route index middleware, providing req.user with id and permissions.
Point Expiry: Assumed to be managed by pointService with GAMIFICATION_CONSTANTS.POINT_EXPIRY_DAYS (365 days).
booking_metadata: Assumed to be a JSON column in MerchantBranch for storing gamification, waitlist, and pricing configurations.
Gamification Actions: Assumed to be defined in GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS and STAFF_ACTIONS for validation.
SETTINGS_UPDATE Points: Assumed to be 10 points (configurable in GAMIFICATION_CONSTANTS.ADMIN_ACTIONS).
Constants: Relies on mtablesConstants and adminServiceConstants for consistency across services.