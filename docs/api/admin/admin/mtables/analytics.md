Documentation File: analytics.md
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\admin\mtables\analytics.md

Analytics Service Documentation
Overview
The Analytics Service for mtables (Admin) provides functionality to retrieve booking completion rates, generate booking reports, analyze customer engagement, and track gamification metrics for a restaurant (merchant branch). This service integrates with Sequelize models, gamification point awarding, and localization for user-facing messages. Complementary files include a controller, validator, middleware, routes, socket events, socket handlers, and localization.

File Structure
Service: src/services/admin/mtables/analyticsService.js
Controller: src/controllers/admin/mtables/analyticsController.js
Validator: src/validators/admin/mtables/analyticsValidator.js
Middleware: src/middleware/admin/mtables/analyticsMiddleware.js
Routes: src/routes/admin/mtables/analyticsRoutes.js
Events: socket/events/admin/mtables/analyticsEvents.js
Handler: socket/handlers/admin/mtables/analyticsHandler.js
Localization: locales/admin/mtables/en.json
Service Description
The analyticsService.js file contains four core functions:

getBookingAnalytics: Retrieves booking completion rates for a restaurant over the last 30 days, including total bookings, completion rate, and status breakdown. Awards points for bookingTrendsAnalyzed.
exportBookingReports: Generates a detailed report of all bookings for a restaurant, including customer details and feedback. Awards points for reportGenerated.
analyzeCustomerEngagement: Analyzes customer engagement metrics, such as total bookings, feedback rate, average rating, and repeat customer count. Awards points for engagementAnalyzed.
trackGamificationMetrics: Tracks gamification points for customers associated with a restaurant, including total points and points by action. Awards points for analytics_review.
Dependencies
Sequelize Models: Booking, Feedback, GamificationPoints, MerchantBranch, Customer
Constants: mtablesConstants for booking statuses, error codes, and gamification actions
Utilities: localizationService for formatting messages, logger for logging, AppError for error handling
Gamification Integration
Points are awarded automatically within each function using pointService.awardPoints. The actions and points are defined in mtablesConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS and mtablesConstants.POINT_AWARD_ACTIONS.

Endpoints
1. GET /admin/mtables/analytics/bookings/:restaurantId
Description: Retrieves booking analytics for a specified restaurant.
Permission: manageAnalytics
Parameters:
restaurantId (path, required): Integer ID of the merchant branch.
Response:
200: Success with analytics data (totalBookings, completionRate, byStatus).
400: Invalid restaurant ID.
403: Permission denied.
404: Restaurant not found.
Socket Event: /analytics:booking_analytics
Notification: Sent with analytics.booking_analytics message.
Audit: Logs action with BOOKING_UPDATED type.
2. GET /admin/mtables/analytics/reports/:restaurantId
Description: Exports a detailed booking report for a restaurant.
Permission: manageAnalytics
Parameters:
restaurantId (path, required): Integer ID of the merchant branch.
Response:
200: Success with report data (array of booking details).
400: Invalid restaurant ID.
403: Permission denied.
404: Restaurant not found.
Socket Event: /analytics:report_generated
Notification: Sent with analytics.report_generated message.
Audit: Logs action with BOOKING_UPDATED type.
3. GET /admin/mtables/analytics/engagement/:restaurantId
Description: Analyzes customer engagement metrics for a restaurant.
Permission: manageAnalytics
Parameters:
restaurantId (path, required): Integer ID of the merchant branch.
Response:
200: Success with engagement data (totalBookings, feedbackRate, averageRating, repeatCustomerCount).
400: Invalid restaurant ID.
403: Permission denied.
404: Restaurant not found.
Socket Event: /analytics:engagement_completed
Notification: Sent with analytics.engagement message.
Audit: Logs action with BOOKING_UPDATED type.
4. GET /admin/mtables/analytics/gamification/:restaurantId
Description: Tracks gamification metrics for customers associated with a restaurant.
Permission: manageAnalytics
Parameters:
restaurantId (path, required): Integer ID of the merchant branch.
Response:
200: Success with gamification metrics (totalPoints, pointsByAction, activeUsers).
400: Invalid restaurant ID.
403: Permission denied.
404: Restaurant not found.
Socket Event: /analytics:gamification_tracked
Notification: Sent with analytics.gamification_tracked message.
Audit: Logs action with BOOKING_UPDATED type.
Complementary Files
Controller (analyticsController.js)
Handles HTTP requests and responses.
Integrates notificationService, socketService, auditService, and pointService for notifications, real-time updates, auditing, and point awarding.
Returns standardized JSON responses with status, data, and message.
Validator (analyticsValidator.js)
Uses Joi to validate restaurantId as a positive integer.
Provides localized error messages via formatMessage.
Middleware (analyticsMiddleware.js)
Validates request parameters using validator schemas.
Checks for manageAnalytics permission.
Throws AppError for invalid inputs or permissions.
Routes (analyticsRoutes.js)
Defines Express routes for the four endpoints.
Includes Swagger documentation for API specifications.
Applies validation and permission middleware.
Events (analyticsEvents.js)
Defines socket event names with /analytics: namespace.
Events: booking_analytics, report_generated, engagement_completed, gamification_tracked.
Handler (analyticsHandler.js)
Handles socket events by logging and re-emitting them for real-time updates.
Ensures reliable event processing.
Localization (en.json)
Provides English translations for all user-facing messages (errors, success, notifications).
Supports dynamic placeholders for values like restaurantId and totalBookings.
Constants Usage
mtablesConstants: Defines booking statuses, error codes, notification types, audit types, permissions, and gamification actions.
Gamification: Points are awarded for bookingTrendsAnalyzed, reportGenerated, engagementAnalyzed, and analytics_review actions, with points defined in GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.
Security and Compliance
Authentication: Handled by middleware in the main route index (not included here).
Permissions: Requires manageAnalytics permission.
Auditing: All actions are logged with auditService for compliance.
Localization: All user-facing messages are localized using formatMessage.
Error Handling
Uses AppError for consistent error responses with status codes and error codes from mtablesConstants.ERROR_CODES.
Logs errors using logger.logErrorEvent.
Real-Time Updates
Socket events are emitted for each endpoint to provide real-time updates to clients.
Notifications are sent to inform users of analytics activities.
This documentation provides a comprehensive overview of the Analytics Service and its integration with the mtables platform. For further details, refer to the source files or contact the development team.