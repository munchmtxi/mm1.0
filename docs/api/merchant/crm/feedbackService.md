# Feedback Service Documentation

## Overview
The Feedback Service enables merchants and customers to manage reviews, community interactions, and feedback responses. It integrates with gamification, notification, audit, and socket services. Points are automatically awarded for feedback actions, enhancing engagement through a dynamic, rule-based system.

## Methods

### collectReviews
Gathers customer reviews for a merchant.

- **Parameters**:
  - `merchantId` (string): Merchant ID.
  - `reviewData` (object): Customer ID, rating, service type, service ID, comment.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `merchantId`, `reviewId`, `customerId`, `rating`, `language`, and `action`.
- **Errors**:
  - Invalid review data, service type, or rating (400, `INVALID_INPUT`, `INVALID_SERVICE_TYPE`, `INVALID_RATING`).
  - Merchant or customer not found (404, `MERCHANT_NOT_FOUND`, `CUSTOMER_NOT_FOUND`).
- **Point Awarding**: Points for `reviewCollected` based on rating (customer).

### manageCommunityInteractions
Handles upvotes or comments on a review.

- **Parameters**:
  - `reviewId` (string): Review ID.
  - `action` (object): Customer ID, action type (upvote/comment), comment.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `reviewId`, `interactionId`, `customerId`, `actionType`, `merchantId`, `language`, and `action`.
- **Errors**:
  - Invalid interaction data or action type (400, `INVALID_INPUT`, `INVALID_ACTION_TYPE`).
  - Review or customer not found (404, `REVIEW_NOT_FOUND`, `CUSTOMER_NOT_FOUND`).
- **Point Awarding**: Points for `interactionManaged` based on interaction type (customer).

### respondToFeedback
Replies to customer feedback.

- **Parameters**:
  - `reviewId` (string): Review ID.
  - `response` (object): Merchant ID, response content.
  - `ipAddress` (string): Request IP address.
  - `transaction` (optional): Sequelize transaction.
- **Returns**: Object with `reviewId`, `merchantId`, `customerId`, `language`, and `action`.
- **Errors**:
  - Invalid response data (400, `INVALID_INPUT`).
  - Review or merchant not found (404, `REVIEW_NOT_FOUND`, `MERCHANT_NOT_FOUND`).
- **Point Awarding**: Points for `feedbackResponded` based on response length (merchant).

## Point System
Points are automatically awarded for actions in `merchantConstants.CRM_CONSTANTS.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS`.
- **Contextual**:
  - `reviewCollected`: Multiplier based on rating (0.2x per star).
  - `interactionManaged`: Multiplier based on interaction type (2x for comment, 1x for upvote).
  - `feedbackResponded`: Multiplier based on response length (0.05x per 100 characters).
- **Role-Based**: Customers receive 1.1x multiplier for reviews and interactions; merchants receive 1.2x for responses.
- **Capped**: Limited to 200 points per action.
- **Automated**: Integrated into each action, no manual endpoints.

**Configuration** (`gamificationConstants.js`):
- `reviewCollected`: 30 base points, 0.2x per rating star, 1.1x for customers.
- `interactionManaged`: 25 base points, 0.1x (2x for comment, 1x for upvote), 1.1x for customers.
- `feedbackResponded`: 35 base points, 0.05x per 100 characters, 1.2x for merchants.

**Workflow**:
1. User performs an action (e.g., submits a review).
2. Service returns action and metadata.
3. Controller calculates points using internal logic.
4. Points awarded via `gamificationService.awardPoints`.
5. Notifications and socket events inform the user.

## Dependencies
- **Models**: `Merchant`, `Customer`, `Review`, `ReviewInteraction`.
- **Constants**: `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `handleServiceError`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration
- **Notifications**: Sent for action completion and points awarded.
- **Audits**: Logs action details and points.
- **Socket Events**: Namespaced (e.g., `merchant:crm:reviewCollected`).
- **Gamification**: Automatic point awarding in controller.

## Error Handling
- Uses `AppError` with localized messages and `merchantConstants.ERROR_CODES`.
- Transactions ensure data integrity.
- Common errors:
  - `INVALID_INPUT`: Invalid merchant ID, customer ID, review data, interaction data, or response data.
  - `INVALID_SERVICE_TYPE`, `INVALID_RATING`, `INVALID_ACTION_TYPE`: Invalid specific inputs.
  - `MERCHANT_NOT_FOUND`, `CUSTOMER_NOT_FOUND`, `REVIEW_NOT_FOUND`: Entity not found.
  - `SYSTEM_ERROR`: Unexpected errors, logged.

## Usage Scenarios
- **Collect Review**: 5-star review yields 66 points (30 * 1.0 * 1.1 * 2).
- **Manage Interaction**: Comment interaction yields 66 points (25 * 0.2 * 2 * 1.1 * 1.2).
- **Respond to Feedback**: 200-char response yields 50.4 points (35 * 0.1 * 2 * 1.2 * 1.2).

## Security
- **Authentication**: Via `authMiddleware.authenticate`.
- **Authorization**: Restricted to merchants/customers for reviews/interactions; merchants only for responses (`manage_crm` permission).
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