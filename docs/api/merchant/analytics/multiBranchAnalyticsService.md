# Multi-Branch Analytics Service Documentation

## Overview
The Multi-Branch Analytics Service enables merchants to aggregate data, compare performance, generate reports, and allocate resources across multiple branches. It integrates with gamification, notification, audit, and socket services. Points are automatically awarded for analytics actions, enhancing merchant engagement through a dynamic, rule-based system.

## Methods

### aggregateBranchData
Aggregates performance data across all branches.

- **Parameters**:
  - `merchantId` (string): Merchant ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `aggregatedData` (branchId, branchName, totalOrders, totalRevenue, averageOrderValue, customerSentiment), `language`, and `action`.
- **Errors**:
  - Invalid merchant ID (400, `INVALID_INPUT`).
  - Merchant or branches not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Awards points for `branchDataAggregated` based on branch count.

### compareBranchPerformance
Compares performance metrics across branches.

- **Parameters**:
  - `merchantId` (string): Merchant ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `ranked` (branchId, branchName, revenue, orders, customerRetention, performanceScore), `language`, and `action`.
- **Errors**:
  - Invalid merchant ID (400, `INVALID_INPUT`).
  - Merchant or branches not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Awards points for `branchPerformanceCompared` based on top performance score.

### generateMultiBranchReports
Generates centralized performance reports for all branches.

- **Parameters**:
  - `merchantId` (string): Merchant ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `report` (branches, summary), `language`, and `action`.
- **Errors**:
  - Invalid merchant ID (400, `INVALID_INPUT`).
  - Merchant or branches not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Awards points for `multiBranchReportsGenerated` based on total revenue.

### allocateResources
Suggests resource allocation based on branch performance.

- **Parameters**:
  - `merchantId` (string): Merchant ID.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `suggestions` (branchId, branchName, resourceScore, suggestedStaff, suggestedInventory, resourcePercentage), `language`, and `action`.
- **Errors**:
  - Invalid merchant ID (400, `INVALID_INPUT`).
  - Merchant or branches not found (404, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Awards points for `resourcesAllocated` based on total resource score.

## Point System
Points are automatically awarded for actions in `merchantConstants.ANALYTICS_CONSTANTS.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS`.
- **Contextual**:
  - `branchDataAggregated`: Multiplier based on branch count.
  - `branchPerformanceCompared`: Multiplier based on top performance score.
  - `multiBranchReportsGenerated`: Multiplier based on total revenue.
  - `resourcesAllocated`: Multiplier based on total resource score.
- **Role-Based**: Merchants receive 1.2x multiplier.
- **Capped**: Limited to 200 points per action.
- **Automated**: Integrated into each action, no manual endpoints.

**Configuration** (`gamificationConstants.js`):
- `branchDataAggregated`: 40 base points, 0.1x per branch, 1.2x for merchants.
- `branchPerformanceCompared`: 45 base points, 0.05x per performance score unit, 1.2x for merchants.
- `multiBranchReportsGenerated`: 50 base points, 0.01x per $1M revenue, 1.2x for merchants.
- `resourcesAllocated`: 35 base points, 0.02x per 1000 resource score units, 1.2x for merchants.

**Workflow**:
1. Merchant performs an action (e.g., aggregates branch data).
2. Service returns action and metadata.
3. Controller calculates points using internal logic.
4. Points awarded via `gamificationService.awardPoints`.
5. Notifications and socket events inform the merchant.

## Dependencies
- **Models**: `MerchantBranch`, `BranchMetrics`, `BranchInsights`, `Merchant`, `BranchActivity`, `Notification`.
- **Constants**: `merchantConstants`.
- **Utilities**: `formatMessage`, `AppError`, `handleServiceError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration
- **Notifications**: Sent for action completion and points awarded.
- **Audits**: Logs action details and points.
- **Socket Events**: Namespaced (e.g., `merchant:analytics:branchDataAggregated`).
- **Gamification**: Automatic point awarding in controller.

## Error Handling
- Uses `AppError` with localized messages and `merchantConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- Common errors:
  - `INVALID_INPUT`: Invalid merchant ID.
  - `MERCHANT_NOT_FOUND`: Merchant or branches not found.
  - `SYSTEM_ERROR`: Unexpected errors, logged.

## Usage Scenarios
- **Aggregate Data**: Merchant with 5 branches gets 57.6 points (40 * 1.2 * 1.2).
- **Compare Performance**: Merchant with top score 80 gets 64.8 points (45 * 1.2 * 1.2).
- **Generate Reports**: Merchant with $2M revenue gets 72 points (50 * 1.2 * 1.2).
- **Allocate Resources**: Merchant with 5000 resource score gets 50.4 points (35 * 1.2 * 1.2).

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
- Point calculations handled in controller.
- Future services will automate point awarding similarly.