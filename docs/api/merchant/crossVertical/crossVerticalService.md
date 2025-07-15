# Cross-Vertical Service Documentation

## Overview
The Cross-Vertical Service integrates Munch and Mtables functionalities, enabling service unification, loyalty point syncing, and UI consistency across merchant branches. It integrates with notification, audit, socket, and gamification services. Points are automatically awarded for actions, enhancing engagement through a dynamic, rule-based system.

## Methods

### unifyServices
Unifies Mtables and Munch services for a merchant across all branches.

- **Parameters**:
  - `merchantId` (string): Merchant ID.
  - `ipAddress`: (string): Request IP address.
  - `transaction`: (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `orders`, `bookings`, `language`, and `action`.
- **Errors**:
  - Invalid merchant ID (400, `INVALID_REQUEST`).
  - Merchant or branches not found (404, `INVALID_MERCHANT_NOT_FOUND`, `BRANCH_NOT_FOUND`).
- **Point Awarding**: Points for `servicesUnified`, based on branch count (merchant).

### syncLoyaltyPoints
Syncs loyalty points from Munch and Mtables for a customer.

- **Parameters**:
  - `customerId`: (string): Customer ID.
  - `ipAddress`: (string): Request IP address.
  - `transaction`: (optional): Sequelize transaction.
- **Returns**: Object with `customerId`, `totalPoints`, `munchPoints`, `mtablesPoints`, `language`, and `action`.
- **Errors**:
  - Invalid customer ID (400, `INVALID_REQUEST`).
  - Customer not found (404, `CUSTOMER_NOT_FOUND`).
- **Point Awarding**: Points for `pointsSynced`, based on total points (customer).

### ensureConsistentUI
Ensures consistent UI settings (theme, language, font) across merchant branches.

- **Parameters**:
  - `merchantId`: (string): Merchant ID.
  - `ipAddress`: (string): Request IP address.
  - `transaction`: (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `uiSettings`, `language`, and `action`.
- **Errors**:
  - Invalid merchant ID (400, `INVALID_REQUEST`).
  - Merchant or branches not found (404, `MERCHANT_NOT_FOUND`, `BRANCH_NOT_FOUND`).
- **Point Awarding**: Points for `uiEnsured`, based on branch count (merchant).

## Point System
Points are automatically awarded for actions in `merchantConstants.CROSS_VERTICAL_CONSTANTS.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS`.
- **Contextual**:
  - `servicesUnified`: Multiplier based on branch count (0.1x per branch).
  - `pointsSynced`: Multiplier based on total points (0.01x per point).
  - `uiEnsured`: Multiplier based on branch count (0.1x per branch).
- **Role-Based**: Merchants receive 1.2x multiplier for unification and UI; customers receive 1.1x for point syncing.
- **Capped**: Limited to 200 points per action.
- **Automated**: Integrated into each action, no manual endpoints.

**Configuration** (`gamificationConstants.js`):
- `servicesUnified`: 50 base points, 0.1x per branch, 1.2x for merchants.
- `pointsSynced`: 30 base points, 0.01x per point, 1.1x for customers.
- `uiEnsured`: 40 base points, 0.1x per branch, 1.2x for merchants.

**Workflow**:
1. User performs an action (e.g., unifies services).
2. Service returns action and metadata.
3. Controller calculates points using internal logic.
4. Points awarded via `gamificationService.awardPoints`.
5. Notifications and socket events inform the user.

## Dependencies
- **Models**: `User`, `Merchant`, `MerchantBranch`, `Order`, `Booking`, `Customer`.
- **Constants**: `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `handleServiceError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration
- **Notifications**: Sent for action completion and points awarded.
- **Audits**: Logs action details and points.
- **Socket Events**: Namespaced (e.g., `merchant:crossVertical:servicesUnified`).
- **Gamification**: Automatic point awarding in controller.

## Error Handling
- Uses `AppError` with localized messages and `merchantConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- Common errors:
  - `INVALID_REQUEST`: Invalid merchant or customer ID.
  - `MERCHANT_NOT_FOUND`, `CUSTOMER_NOT_FOUND`, `BRANCH_NOT_FOUND`: Entity not found.
  - `SYSTEM_ERROR`: Unexpected errors, logged.

## Usage Scenarios
- **Unify Services**: 3 branches yield 72 points (50 * 0.3 * 0.2 * 1.2).
- **Sync Points**: 1000 points synced yield 33 points (30 * 10 * 0.1 * 1.1).
- **Ensure UI**: 3 branches yield 58 points (40 * 0.3 * 0.2 * 1.2).

## Security
- **Authentication**: Via `authMiddleware.authenticate`.
- **Authorization**: Restricted to merchants/customers; merchants need `manage_crossVertical` for unification/UI.
- **Validation**: Uses `express-validator` with `merchantConstants`.
- **Audits**: Logs all actions with IP and points.

## Notes
- Transactions ensure atomicity.
- Points capped at 1000/day (`MAX_POINTS_PER_DAY`).
- Localized messages in `en.json`.
- Namespaced socket events for clarity.
- No manual point endpoints, per pattern.
- Point calculations handled in controller.
- This is the only service in the cross-vertical directory.
