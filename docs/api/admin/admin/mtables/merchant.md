Merchant Documentation
Overview
The MerchantService for mtables (Admin) manages merchant onboarding, menu approvals, reservation policies, and branch performance monitoring within the mtables platform. The service integrates with Sequelize models and supports localization for user-facing messages. It ensures merchant compliance and operational efficiency through notifications, real-time updates, and notifications, and audit logging. Complementary files include a controller, validator, middleware, middleware, events, socket handlers, events, and an updated localization file. This documentation provides a comprehensive guide to the service, its endpoints, and all related components.

File Structure
Service: merchantService.js
Controller: src/controllers/admin/mtables/\merchantController.js
Validator: src/validators/admin/mtables/\merchantValidator.js `
Middleware: src/middleware/admin/mtables/\merchantMiddleware.js `
Routes: src/routes/admin/mtables/\merchantRoutes.js `
Events: socket/events/admin/mtables/\merchantEvents.js `
Handler: socket/handlers/admin/mtables/\merchantHandler.js `
Localization: locales/admin/mtables/\en.json
Service Description
The merchantService.js file contains four core functions:

approveMerchantOnboarding:
Purpose: Verifies and approves a merchant's setup for onboarding, activating their account.
Input: merchantId (number).
Output: An object with merchantId and status.
Models Used: Merchant.
Validation:
merchantId is required.
Merchant must exist and not be ACTIVE.
All compliance documents (from merchantConstants.COMPLIANCE_CONSTANTS.REGULATORY_REQUIREMENTS) must be present.
Gamification: No points awarded, as per the original implementation.
manageMenus:
Purpose: Approves or updates menu items for a restaurant branch, ensuring valid dietary filters and item count limits.
Input: restaurantId (number), menuUpdates (object with items array).
Output: An object with restaurantId, menuItems (count), and itemCount.
Models Used: MerchantBranch.
Validation:
restaurantId and menuUpdates are required.
items array must not exceed merchantConstants.MENU_SETTINGS.MAX_MENU_ITEMS.
dietaryFilters must be in merchantConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.
Gamification: No points awarded.
configureReservationPolicies:
Purpose: Sets booking and reservation policies for a restaurant branch, ensuring compliance with platform constraints.
Input: restaurantId (number), policies (object with minBookingHours, maxBookingHours, cancellationWindowHours, depositPercentage).
Output: An object with restaurantId and policies.
Models Used: MerchantBranch.
Validation:
restaurantId and policies are required.
minBookingHours ≥ mtablesConstants.BOOKING_HOURS.MIN_BOOKING_HOURS.
maxBookingHours ≤ mtablesConstants.BOOKING_HOURS.MAX_BOOKING_HOURS.
cancellationWindowHours ≥ 0.
depositPercentage between mtablesConstants.BOOKING_POLICIES.DEFAULT_DEPOSIT_PERCENTAGE and 100.
Gamification: No points awarded.
monitorBranchPerformance:
Purpose: Retrieves performance metrics for a merchant's branches, aggregating revenue, orders, and customer insights.
Input: merchantId (number).
Output: An object with merchantId and performanceSummary (array of branch metrics).
Models Used: Merchant, MerchantBranch, BranchMetrics, BranchInsights.
Validation: merchantId is required, and the merchant must exist.
Gamification: No points awarded, as this is a read-only operation.
Dependencies
Sequelize Models: Merchant (merchant details), MerchantBranch (restaurant details), BranchMetrics (performance metrics), BranchInsights (customer insights).
Constants:
merchantConstants: Defines error codes, merchant statuses, notification types, audit types, permissions, menu settings, and order settings.
mtablesConstants: Provides error codes, booking hours, and booking policies.
Utilities:
localizationService: Formats localized messages with formatMessage.
logger: Logs info and error events.
AppError: Handles errors with standardized codes and messages.
Gamification Integration
No gamification points are awarded in any of the service functions, consistent with the original merchantService.js.
No pointService dependency is required.
No separate point-awarding endpoint exists, as merchant actions (e.g., onboarding, menu updates) are administrative and not gamified.
Endpoints
1. PUT /admin/mtables/merchants/:merchantId
Description: Approves a merchant's onboarding, activating their account after compliance verification.
Permission: MANAGE_MERCHANTS
Parameters:
merchantId (path, required): Integer ID of the merchant.
Request Body: None.
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "merchantId": 123,
    "status": "active"
  },
  "message": "Merchant onboarding approved successfully."
}
400: Invalid merchant ID or missing compliance documents (MERCHANT_NOT_FOUND, COMPLIANCE_VIOLATION).
403: Permission denied or merchant already active (PERMISSION_DENIED).
404: Merchant not found (MERCHANT_NOT_FOUND).
Socket Event: /merchant:onboarding_approved (emits approval details to the merchant).
Notification: Sent to the merchant with merchant.onboarding_approved message, including merchantId.
Audit: Logs action with ONBOARDING_APPROVED type, including merchantId and status.
Use Case: An admin approves a new restaurant's onboarding after verifying their licenses and tax documents.
2. PUT /admin/mtables/merchants/:restaurantId/menu
Description: Approves or updates menu items for a restaurant branch.
Permission: MANAGE_MERCHANTS
Parameters:
restaurantId (path, required): Integer ID of the restaurant branch.
Request Body:
json

Collapse

Unwrap

Copy
{
  "items": [
    {
      "name": "Vegan Pasta",
      "dietaryFilters": ["vegan", "gluten-free"],
      "price": 15.99
    }
  ]
}
items (required): Array of menu items, each with optional dietaryFilters.
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "restaurantId": 456,
    "menuItems": 1,
    "itemCount": 1
  },
  "message": "Menu updated successfully."
}
400: Invalid restaurant ID, menu items, or dietary filters (MERCHANT_NOT_FOUND, MENU_INVALID).
403: Permission denied (PERMISSION_DENIED).
404: Restaurant not found (MERCHANT_NOT_FOUND).
Socket Event: /merchant:menu_updated (emits update details to the merchant).
Notification: Sent to the merchant with merchant.menu_updated message, including restaurantId.
Audit: Logs action with MENU_UPDATED type, including restaurantId and itemCount.
Use Case: A merchant updates their menu to add vegan options, and an admin approves the changes.
3. PUT /admin/mtables/merchants/:restaurantId/policies
Description: Sets booking and reservation policies for a restaurant branch.
Permission: MANAGE_MERCHANTS
Parameters:
restaurantId (path, required): Integer ID of the restaurant branch.
Request Body:
json

Collapse

Unwrap

Copy
{
  "minBookingHours": 1,
  "maxBookingHours": 3,
  "cancellationWindowHours": 24,
  "depositPercentage": 10
}
minBookingHours, maxBookingHours, cancellationWindowHours, depositPercentage (optional): Policy settings.
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "restaurantId": 456,
    "policies": {
      "minBookingHours": 1,
      "maxBookingHours": 3,
      "cancellationWindowHours": 24,
      "depositPercentage": 10
    }
  },
  "message": "Reservation policies updated successfully."
}
400: Invalid restaurant ID or policies (INVALID_BOOKING_DETAILS, INVALID_BOOKING, PAYMENT_FAILED).
403: Permission denied (PERMISSION_DENIED).
404: Restaurant not found (MERCHANT_NOT_FOUND).
Socket Event: /merchant:reservation_policies_updated (emits policy details to the merchant).
Notification: Sent to the merchant with merchant.reservation_policies_updated message, including restaurantId.
Audit: Logs action with BOOKING_UPDATED type, including restaurantId and policies.
Use Case: A restaurant sets a 10% deposit requirement for bookings, approved by an admin.
4. GET /admin/mtables/merchants/:merchantId/performance
Description: Retrieves performance metrics for a merchant's branches.
Permission: MANAGE_MERCHANTS
Parameters:
merchantId (path, required): Integer ID of the merchant.
Response:
200:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "data": {
    "merchantId": 123,
    "performanceSummary": [
      {
        "branchId": 456,
        "name": "Downtown Branch",
        "revenue": 50000,
        "orders": 1000,
        "averageOrderValue": 50,
        "customerRetention": 0.75,
        "sentiment": { "positive": 80, "neutral": 15, "negative": 5 },
        "performanceScores": { "overall": 85, "service": 90, "quality": 80, "timeliness": 85 }
      }
    ]
  },
  "message": "Performance metrics tracked successfully."
}
400: Invalid merchant ID (MERCHANT_NOT_FOUND).
403: Permission denied (PERMISSION_DENIED).
404: Merchant not found (MERCHANT_NOT_FOUND).
Socket Event: /merchant:performance_updated (emits performance details to the merchant).
Notification: Sent to the merchant with merchant.performance_updated message, including merchantId.
Audit: Logs action with SALES type, including merchantId and branch count.
Use Case: A merchant reviews their branches' revenue and customer retention metrics.
Complementary Files
Controller (merchantController.js)
Purpose: Handles HTTP requests, integrates notificationService, socketService, and auditService, and calls service methods.
Functions:
approveMerchantOnboarding: Approves onboarding with notification, socket event, and audit.
manageMenus: Updates menus with notification, socket event, and audit.
configureReservationPolicies: Sets policies with notification, socket event, and audit.
monitorBranchPerformance: Retrieves performance metrics with notification, socket event, and audit.
Response Format: Standardized JSON with status, data, and message (localized).
Dependencies: Service, common services, constants, localization, logger.
Error Handling: Passes errors to the Express error handler via next.
Validator (merchantValidator.js)
Purpose: Validates request parameters and body using Joi.
Schemas:
approveMerchantOnboarding: Validates merchantId.
manageMenus: Validates restaurantId and body (items array with dietaryFilters).
configureReservationPolicies: Validates restaurantId and body (minBookingHours, maxBookingHours, cancellationWindowHours, depositPercentage).
monitorBranchPerformance: Validates merchantId.
Error Messages: Localized using formatMessage.
Dependencies: Joi, constants, localization.
Middleware (merchantMiddleware.js)
Purpose: Validates requests and checks permissions.
Functions:
validateApproveMerchantOnboarding, validateManageMenus, validateConfigureReservationPolicies, validateMonitorBranchPerformance: Validate using validator schemas.
checkManageMerchantPermission: Ensures MANAGE_MERCHANTS permission.
Error Handling: Throws AppError with localized messages and error codes.
Dependencies: Joi, constants, localization, AppError.
Routes (merchantRoutes.js)
Purpose: Defines Express routes with Swagger documentation.
Endpoints:
PUT /:merchantId
PUT /:restaurantId/menu
PUT /:restaurantId/policies
GET /:merchantId/performance
Middleware: Applies validation and permission checks.
Swagger: Detailed API specs with request/response schemas, error codes, and descriptions.
Dependencies: Express, controller, middleware, constants.
Events (merchantEvents.js)
Purpose: Defines socket event names with /merchant: namespace.
Events:
ONBOARDING_APPROVED: /merchant:onboarding_approved
MENU_UPDATED: /merchant:menu_updated
RESERVATION_POLICIES_UPDATED: /merchant:reservation_policies_updated
PERFORMANCE_UPDATED: /merchant:performance_updated
Usage: Used by controller and handler for real-time updates.
Handler (merchantHandler.js)
Purpose: Processes socket events for real-time client updates.
Function: setupMerchantHandlers registers handlers for each event, logging and re-emitting data.
Dependencies: Events, logger.
Behavior: Ensures reliable event delivery with logging for debugging.
Localization (en.json)
Purpose: Provides English translations for all user-facing messages.
Sections:
error: Merchant, dispute, booking, configuration, and analytics errors.
success: Success messages for merchant, dispute, booking, configuration, and analytics operations.
analytics, booking, configuration, dispute, merchant: Notification messages for respective modules.
Dynamic Values: Supports placeholders (e.g., {merchantId}, {restaurantId}, {max}).
Dependencies: Used by formatMessage in service, controller, validator, and middleware.
Constants Usage
merchantConstants:
ERROR_CODES: MERCHANT_NOT_FOUND, PERMISSION_DENIED, COMPLIANCE_VIOLATION, MENU_INVALID, INVALID_INPUT.
MERCHANT_STATUSES: ACTIVE.
NOTIFICATION_TYPES: MERCHANT_ONBOARDING, PROMOTION_UPDATE, PROMOTION.
AUDIT_TYPES: ONBOARDING_APPROVED, MENU_UPDATED.
METRICS: SALES.
PERMISSIONS: MANAGE_MERCHANTS.
COMPLIANCE_CONSTANTS.REGULATORY_REQUIREMENTS: Compliance document requirements.
MENU_SETTINGS.MAX_MENU_ITEMS: Maximum menu items allowed.
ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS: Valid dietary filters.
mtablesConstants:
ERROR_CODES: INVALID_BOOKING_DETAILS, INVALID_BOOKING, PAYMENT_FAILED.
BOOKING_HOURS: MIN_BOOKING_HOURS, MAX_BOOKING_HOURS.
BOOKING_POLICIES: CANCELLATION_WINDOW_HOURS, DEFAULT_DEPOSIT_PERCENTAGE.
NOTIFICATION_TYPES: BOOKING_UPDATED.
AUDIT_TYPES: BOOKING_UPDATED.
Security and Compliance
Authentication: Handled by middleware in the main route index (not included here), providing req.user with id and permissions.
Permissions: Requires MANAGE_MERCHANTS for all endpoints, ensuring only authorized users can manage merchants.
Auditing: All actions are logged with auditService:
approveMerchantOnboarding: ONBOARDING_APPROVED with merchant details.
manageMenus: MENU_UPDATED with menu details.
configureReservationPolicies: BOOKING_UPDATED with policy details.
monitorBranchPerformance: SALES with branch count.
Localization: All user-facing messages are localized using formatMessage with dynamic parameters.
Data Validation: Joi ensures valid inputs, preventing invalid operations or security issues like SQL injection.
Error Handling: Uses AppError with standardized error codes and localized messages.
Real-Time Updates
Socket Events:
/merchant:onboarding_approved: Notifies merchants of onboarding approval.
/merchant:menu_updated: Notifies merchants of menu updates.
/merchant:reservation_policies_updated: Notifies merchants of policy updates.
/merchant:performance_updated: Notifies merchants of performance updates.
Notifications:
onboarding_approved: Sent to merchants with onboarding approval details.
menu_updated: Sent to merchants for menu updates.
reservation_policies_updated: Sent to merchants for policy updates.
performance_updated: Sent to merchants for performance updates.
Reliability: Handlers log events for debugging and ensure delivery to connected clients.
Error Handling
AppError: Used for all errors with:
Localized message (via formatMessage).
HTTP status code (400, 403, 404).
Error code (from merchantConstants.ERROR_CODES or mtablesConstants.ERROR_CODES).
Optional details (e.g., validation errors).
Logging: Errors are logged with logger.logErrorEvent for traceability, including merchantId or restaurantId.
Controller: Errors are passed to Express error handler for consistent API responses.
Integration Points
Models: Interacts with Merchant (core entity), MerchantBranch (restaurant details), BranchMetrics (performance data), BranchInsights (customer insights).
Services: Uses notificationService, socketService, and auditService via controller.
Notifications: Sends updates to merchants for onboarding, menu, policies, and performance.
Sockets: Broadcasts real-time events for immediate merchant updates.
Auditing: Logs all actions for compliance and traceability.
Localization: Integrates with localizationService for multilingual support.
Assumptions and Notes
Authentication: Assumed to be handled by main route index middleware, providing req.user with id and permissions.
Merchant ID: Uses merchantId from params or result.merchant_id for notifications and sockets, with fallback to req.user.id.
Menu Items: Assumes menuUpdates.items contains valid item structures, with dietaryFilters as an optional array.
Policies: Defaults to mtablesConstants values if policy fields are not provided.
Performance Metrics: Assumes BranchMetrics and BranchInsights provide the latest data as the first record ([0]).
Constants: Relies on merchantConstants and mtablesConstants for settings.
Compliance Documents: Assumes compliance_data is a JSON object with document keys matching REGULATORY_REQUIREMENTS.