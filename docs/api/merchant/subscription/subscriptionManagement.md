// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\merchant\subscription\subscriptionManagement.md
# Subscription Management Service Documentation

## Overview
The Subscription Management Service handles subscription plan creation, tier tracking, and management (enroll, upgrade, cancel) for the Munch merchant service. It integrates with Socket.IO for real-time updates, uses transactions for data consistency, and awards points for user actions, aligned with global operations defined in `merchantConstants.js` and `munchConstants.js`.

## File Structure
- **Service**: `src/services/merchant/subscription/subscriptionManagementService.js`
- **Controller**: `src/controllers/merchant/subscription/subscriptionController.js`
- **Validator**: `src/validators/merchant/subscription/subscriptionValidator.js`
- **Middleware**: `src/middleware/merchant/subscription/subscriptionMiddleware.js`
- **Routes**: `src/routes/merchant/subscription/subscriptionRoutes.js`
- **Socket Events**: `socket/events/merchant/subscription/subscriptionEvents.js`
- **Socket Handler**: `socket/handlers/merchant/subscription/subscriptionHandler.js`
- **Localization**: `locales/merchant/subscription/en.json`
- **Documentation**: `docs/api/merchant/subscription/subscriptionManagement.md`

## Service Details
The service handles three main functionalities:
1. **Create Subscription Plan**: Creates a new subscription plan for a merchant.
2. **Track Subscription Tiers**: Retrieves active subscription tiers for a customer.
3. **Manage Subscriptions**: Manages customer subscriptions (enroll, upgrade, cancel).

### Point Awarding
Points are awarded using `pointService` with specific actions:
- **Plan Creation**: `subscription_plan_creation` (15 points)
- **Tier Tracking**: `subscription_tier_tracking` (10 points per tier)
- **Subscription Management**: `subscription_management` (15 points per operation)

## Endpoints

### 1. Create Subscription Plan
- **Endpoint**: `POST /api/merchant/subscriptions/:merchantId/create`
- **Description**: Creates a new subscription plan
- **Parameters**:
  - `merchantId` (path): Integer ID of the merchant
- **Body**:
  - `name` (string): Plan name
  - `price` (number): Plan price (> 0)
  - `currency` (string): Currency (from `MERCHANT_SETTINGS.SUPPORTED_CURRENCIES`)
  - `benefits` (array): List of benefits
  - `durationDays` (integer): Duration in days (> 0)
- **Responses**:
  - 200: Plan created successfully
  - 400: Invalid request
  - 404: Merchant not found
- **Socket Event**: `subscription:planCreated`
- **Points**: 15
- **Audit Action**: `subscription:created`
- **Notification**: `SUBSCRIPTION_CREATED`

### 2. Track Subscription Tiers
- **Endpoint**: `GET /api/merchant/subscriptions/:customerId/tiers`
- **Description**: Tracks active subscription tiers for a customer
- **Parameters**:
  - `customerId` (path): Integer ID of the customer
- **Responses**:
  - 200: Tiers retrieved successfully
  - 400: Invalid request
  - 404: Customer not found
- **Socket Event**: `subscription:tiersTracked`
- **Points**: 10 per tier
- **Audit Action**: `subscription:tracked`
- **Notification**: None

### 3. Manage Subscriptions
- **Endpoint**: `PATCH /api/merchant/subscriptions/:customerId/manage`
- **Description**: Manages customer subscriptions (enroll, upgrade, cancel)
- **Parameters**:
  - `customerId` (path): Integer ID of the customer
- **Body**:
  - `subscriptionId` (integer): ID of the subscription
  - `operation` (string): Enum [enroll, upgrade, cancel]
- **Responses**:
  - 200: Subscription managed successfully
  - 400: Invalid request
  - 403: Unauthorized operation
  - 404: Customer or subscription not found
- **Socket Event**: `subscription:managed`
- **Points**: 15
- **Audit Action**: `subscription:updated`
- **Notification**: `SUBSCRIPTION_UPDATED`

## Dependencies
- **Models**: Subscription, Customer, User
- **Services**: auditService, socketService, notificationService, pointService
- **Utilities**: logger, localization, AppError, handleServiceError
- **Constants**: merchantConstants, munchConstants

## Socket Events
Defined in `subscriptionEvents.js`:
- `subscription:planCreated`
- `subscription:tiersTracked`
- `subscription:managed`

## Error Handling
All functions use `AppError` with localized messages from `en.json` and error codes from `merchantConstants.ERROR_CODES`. Transactions ensure data consistency.

## Localization
Messages are localized using `formatMessage` with translations in `locales/merchant/subscription/en.json`. Supported languages are defined in `MERCHANT_SETTINGS.SUPPORTED_LANGUAGES`.

## Security
- Authentication is handled by main route middleware.
- Input validation uses express-validator with error codes from `merchantConstants.ERROR_CODES`.
- Audit logging uses actions: `subscription:created`, `subscription:tracked`, `subscription:updated`.
- Socket events are namespaced to prevent unauthorized access.
- Transactions ensure atomicity for database operations.

## Global Operations
The service supports global operations in regions defined in `MERCHANT_SETTINGS.SUPPORTED_CITIES` and uses `MERCHANT_SETTINGS.SUPPORTED_LANGUAGES` for localization.

## Notes
- Point awarding uses specific actions (`subscription_plan_creation`, etc.) instead of `subscription_loyalty`.
- Audit actions are subscription-specific (`subscription:created`, etc.).
- `ipAddress` uses `req.ip` for accurate audit logging.
- Constants use `munchConstants.SUBSCRIPTION_CONSTANTS` for subscription statuses and limits.