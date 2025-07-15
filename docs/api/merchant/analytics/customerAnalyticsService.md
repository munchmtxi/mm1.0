# Customer Analytics Service Documentation

## Overview
The Customer Analytics Service enables merchants to monitor customer behavior, analyze spending trends, and provide personalized recommendations. It integrates with gamification, notification, audit, and socket services. Points are automatically awarded for analytics actions, enhancing merchant engagement through a dynamic, rule-based system.

## Methods

### trackCustomerBehavior
Tracks customer order and booking patterns.

- **Parameters**:
  - `customerId` (string): Customer ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `customerId`, `behavior` (orders, bookings, rideFrequency), `language`, and `action`.
- **Errors**:
  - Invalid customer ID (400, `INVALID_INPUT`).
  - Customer not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Awards points for `behaviorTracked` based on engagement (orders + bookings).

### analyzeSpendingTrends
Analyzes customer spending habits over three months.

- **Parameters**:
  - `customerId` (string): Customer ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `customerId`, `trends` (totalSpent, averageOrderValue, orderCount, topItems), `language`, and `action`.
- **Errors**:
  - Invalid customer ID (400, `INVALID_INPUT`).
  - Customer not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Awards points for `spendingTrendsAnalyzed` based on total spending.

### provideRecommendations
Provides personalized item recommendations based on order history.

- **Parameters**:
  - `customerId` (string): Customer ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `customerId`, `recommendations`, `language`, `action`, and `metadata` (topCategory, previousCategory).
- **Errors**:
  - Invalid customer ID (400, `INVALID_INPUT`).
  - Customer not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Awards points for `recommendationsProvided` with multipliers for category changes.

### calculateAnalyticsPoints
Calculates points for an analytics action.

- **Parameters**:
  - `customerId` (string): Customer ID.
  - `action` (string): Analytics action (e.g., `behaviorTracked`).
  - `metadata` (object, optional): Contextual data (e.g., totalSpent, topCategory).
- **Returns**: Object with `customerId`, `points`, `language`, `action`, `metadata`, and `role`.
- **Errors**:
  - Customer not found (404, `MERCHANT_NOT_FOUND`).
  - Invalid action (400, `INVALID_INPUT`).
- **Logic**:
  - Uses `gamificationConstants.MERCHANT_ACTIONS` for configuration.
  - Applies multipliers: engagement (behavior), spending (trends), category change (recommendations).
  - Role-based multipliers: merchant (1.2), customer (1.0).
  - Caps points at `MAX_POINTS_PER_ACTION` (200).

## Point System
Points are automatically awarded for actions in `merchantConstants.ANALYTICS_CONSTANTS.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS`.
- **Contextual**:
  - `behaviorTracked`: Multiplier based on engagement (orders + bookings).
  - `spendingTrendsAnalyzed`: Multiplier based on total spending.
  - `recommendationsProvided`: Multiplier for category change.
- **Role-Based**: Merchants receive higher multipliers.
- **Capped**: Limited to 200 points per action.
- **Automated**: Integrated into each action, no manual endpoints.

**Configuration** (`gamificationConstants.js`):
- `behaviorTracked`: 30 base points, 0.05x per engagement unit, 1.2x for merchants.
- `spendingTrendsAnalyzed`: 40 base points, 0.01x per $100 spent, 1.2x for merchants.
- `recommendationsProvided`: 35 base points, 1.3x for category change, 1.2x for merchants.

**Workflow**:
1. Merchant performs an action (e.g., tracks behavior).
2. Service returns action and metadata.
3. Controller calculates points using `calculateAnalyticsPoints`.
4. Points awarded via `gamificationService.awardPoints`.
5. Notifications and socket events inform the merchant.

## Dependencies
- **Models**: `Customer`, `CustomerBehavior`, `Order`, `InDiningOrder`, `Booking`, `MenuInventory`, `ProductCategory`.
- **Constants**: `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `handleServiceError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration
- **Notifications**: Sent for action completion and points awarded.
- **Audits**: Logs action details and points.
- **Socket Events**: Namespaced (e.g., `merchant:analytics:behaviorTracked`).
- **Gamification**: Automatic point awarding.

## Error Handling
- Uses `AppError` with localized messages and `merchantConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- Common errors:
  - `INVALID_INPUT`: Invalid customer ID or action.
  - `MERCHANT_NOT_FOUND`: Customer not found.
  - `SYSTEM_ERROR`: Unexpected errors, logged.

## Usage Scenarios
- **Track Behavior**: Merchant tracks customer, gets 45 points for 300 engagement units (30 * 1.5 * 1.2).
- **Analyze Spending**: Merchant analyzes $5000 spent, gets 48 points (40 * 1.2 * 1.2).
- **Provide Recommendations**: Merchant gets 5 items, 54.6 points for category change (35 * 1.3 * 1.2).

## Security
- **Authentication**: Via `authMiddleware.authenticate`.
- **Authorization**: Restricted to merchants with `manage_analytics`.
- **Validation**: Uses `express-validator` and `merchantConstants`.
- **Auditing**: Logs all actions with IP and points.

## Notes
- Transactions ensure atomicity.
- Points capped at 1000/day (`MAX_POINTS_PER_DAY`).
- Localized messages in `en.json`.
- Namespaced socket events for clarity.
- No manual point endpoints, per pattern.
- Future services will automate point awarding similarly.