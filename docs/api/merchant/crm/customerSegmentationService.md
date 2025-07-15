# Customer Segmentation Service Documentation

## Overview
The Customer Segmentation Service enables merchants to group customers by behavior, analyze individual customer trends, and create targeted promotions. It integrates with gamification, notification, audit, and socket services. Points are automatically awarded for CRM actions, enhancing merchant engagement through a dynamic, rule-based system.

## Methods

### segmentCustomers
Groups customers by behavior criteria.

- **Parameters**:
  - `merchantId` (string): Merchant ID.
  - `criteria` (object): Order frequency, booking frequency, spending thresholds.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `segments`, `segmentCounts`, `language`, and `action`.
- **Errors**:
  - Invalid criteria or merchant ID (400, `INVALID_INPUT`).
  - Merchant not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Points for `customersSegmented` based on total segment count.

### analyzeBehavior
Identifies customer behavior trends.

- **Parameters**:
  - `merchantId` (string): Merchant ID.
  - `customerId` (string): Customer ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `customerId`, `trends`, `language`, and `action`.
- **Errors**:
  - Invalid merchant or customer ID (400, `INVALID_INPUT`).
  - Merchant or customer not found (404, `MERCHANT_NOT_FOUND`, `CUSTOMER_NOT_FOUND`).
- **Point Awarding**: Points for `behaviorAnalyzed` based on engagement score (average of order and booking frequency).

### targetOffers
Creates targeted promotions for a segment.

- **Parameters**:
  - `merchantId` (string): Merchant ID.
  - `segmentId` (string): Segment ID (highValue, frequent, occasional).
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `segmentId`, `promotionId`, `language`, and `action`.
- **Errors**:
  - Invalid merchant ID or segment ID (400, `INVALID_INPUT`, `INVALID_SEGMENT`).
  - Merchant not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Points for `offersTargeted` based on estimated segment size.

## Point System
Points are automatically awarded for actions in `merchantConstants.CRM_CONSTANTS.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS`.
- **Contextual**:
  - `customersSegmented`: Multiplier based on total segment count.
  - `behaviorAnalyzed`: Multiplier based on engagement score (average of order and booking frequency).
  - `offersTargeted`: Multiplier based on estimated segment size.
- **Role-Based**: Merchants receive 1.2x multiplier.
- **Capped**: Limited to 200 points per action.
- **Automated**: Integrated into each action, no manual endpoints.

**Configuration** (`gamificationConstants.js`):
- `customersSegmented`: 40 base points, 0.1x per segment, 1.2x for merchants.
- `behaviorAnalyzed`: 35 base points, 0.05x per engagement score, 1.2x for merchants.
- `offersTargeted`: 45 base points, 0.1x per segment size, 1.2x for merchants.

**Workflow**:
1. Merchant performs an action (e.g., segments customers).
2. Service returns action and metadata.
3. Controller calculates points using internal logic.
4. Points awarded via `gamificationService.awardPoints`.
5. Notifications and socket events inform the merchant.

## Dependencies
- **Models**: `Merchant`, `Customer`, `CustomerBehavior`, `Booking`, `InDiningOrder`, `Order`, `Promotion`.
- **Constants**: `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `handleServiceError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration
- **Notifications**: Sent for action completion and points awarded.
- **Audits**: Logs action details and points.
- **Socket Events**: Namespaced (e.g., `merchant:crm:customersSegmented`).
- **Gamification**: Automatic point awarding in controller.

## Error Handling
- Uses `AppError` with localized messages and `merchantConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- Common errors:
  - `INVALID_INPUT`: Invalid merchant ID, customer ID, criteria, or segment ID.
  - `INVALID_SEGMENT`: Invalid segment ID specified.
  - `MERCHANT_NOT_FOUND`, `CUSTOMER_NOT_FOUND`: Entity not found.
  - `SYSTEM_ERROR`: Unexpected errors, logged.

## Usage Scenarios
- **Segment Customers**: Segmenting 100 customers yields 57.6 points (40 * 1.0 * 1.2 *  **Analysis Behavior**: Engagement score of 5 yields 37.8 points (35 * 0.25 * 1.2 * 1.2).
- **Target Offers**: Segment size of 50 yields 64.8 points (45 * 0.5 * 1.2 * 1.2).

## Security
- **Authentication**: Via `authMiddleware.authenticated`.
- **Authorization**: Restricted to merchants with `manage_crm`.
- **Validation**: Uses `express-validator` and `merchantConstants`.
- **Audits**: Logs all actions with IP and points.

## Notes
- Transactions ensure atomicity.
- Points capped at 1000/day (`MAX_POINTS_PER_DAY`).
- Localized messages in `en.json`.
- Namespaced socket events for clarity.
- No manual point endpoints, per pattern.
- Point calculations handled in controller.
- Future CRM services will automate point awarding similarly.
- **Production Note**: Segment size estimation for `offersTargeted` is approximated; refine with actual segment counts in production for accuracy.
