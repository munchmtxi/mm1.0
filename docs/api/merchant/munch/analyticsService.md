# AnalyticsService Documentation

## Overview
The `AnalyticsService` provides analytics for the `munch` module, analyzing order trends, delivery performance, customer insights, gamification, and delivery locations. It ensures transactional integrity and integrates with order systems. Points are awarded automatically in the controller.

## Methods

### `trackOrderTrends`
- **Purpose**: Analyzes order patterns.
- **Parameters**:
  - `restaurantId`: Number, merchant branch ID.
  - `period`: String, report period (`daily`, `weekly`, `monthly`, `yearly`).
- **Returns**: Object with:
  - `orderCount`: Number.
  - `revenue`: Number.
  - `byType`, `byStatus`: Objects.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input.
  - `ERROR_CODES[0]` (404): Restaurant not found.

### `monitorDeliveryPerformance`
- **Purpose**: Tracks delivery metrics.
- **Parameters**:
  - `restaurantId`: Number.
  - `period`: String.
- **Returns**: Object with:
  - `result`: Object with `totalDeliveries`, `avgDeliveryTime`, `onTimeRate`, `avgDistance`.
  - `drivers`: Array of driver IDs.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input.
  - `ERROR_CODES[0]` (404): Restaurant not found.
- **Point Awarding**: `high_performance_delivery` for drivers if `onTimeRate > 0.9` (controller).

### `aggregateCustomerInsights`
- **Purpose**: Aggregates customer data.
- **Parameters**:
  - `restaurantId`: Number.
  - `period`: String.
- **Returns**: Object with:
  - `totalOrders`, `avgOrderValue`, `uniqueCustomers`, `uniqueLocations`: Number.
  - `popularItems`: Object.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input.
  - `ERROR_CODES[0]` (404): Restaurant not found.

### `trackOrderGamification`
- **Purpose**: Tracks gamification metrics.
- **Parameters**:
  - `restaurantId`: Number.
  - `period`: String.
- **Returns**: Object with:
  - `totalPoints`, `uniqueUsers`: Number.
  - `pointsByAction`: Object.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input.
  - `ERROR_CODES[0]` (404): Restaurant not found.

### `analyzeDeliveryLocations`
- **Purpose**: Analyzes delivery locations.
- **Parameters**:
  - `restaurantId`: Number.
  - `period`: String.
- **Returns**: Object with:
  - `totalDeliveries`, `uniqueCities`, `avgConfidenceLevel`: Number.
- **Errors**:
  - `ERROR_CODES[0]` (400): Invalid input.
  - `ERROR_CODES[0]` (404): Restaurant not found.

## Points
Points awarded via `gamificationConstants`:
- **high_performance_delivery**: 10 points, 1.1x driver (11 points) if `onTimeRate > 0.9`.
- **Capped**: 200/action, 1000/day.
- **Automated**: Controller via `pointService`.

**Workflow**:
1. Merchant initiates analytics request.
2. Service processes data.
3. Controller awards points (if applicable), sends notifications, emits sockets.

## Dependencies
- **Models**: `Order`, `Customer`, `Driver`, `MerchantBranch`, `GamificationPoints`.
- **Constants**: `munchConstants`, `merchantConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `AppError`, `logger`.
- **Services** (controller): `notificationService`, `auditService`, `socketService`, `pointService`.

## Integration
- **Notifications**:
  - Merchant: `ORDER_TRENDS_UPDATED`, `DELIVERY_PERFORMANCE_UPDATED`, `CUSTOMER_INSIGHTS_UPDATED`, `GAMIFICATION_UPDATED`, `DELIVERY_LOCATIONS_UPDATED`, `HIGH_CUSTOMER_ENGAGEMENT` (if `uniqueCustomers > 100`).
- **Audits**: Logs `TRACK_ORDER_TRENDS`, `MONITOR_DELIVERY_PERFORMANCE`, `AGGREGATE_CUSTOMER_INSIGHTS`, `TRACK_GAMIFICATION`, `ANALYZE_DELIVERY_LOCATIONS`.
- **Socket Events**: Namespaced (`merchant:munch:`) via `analyticsEvents.js`.
- **Gamification**: Points in controller.

## Error Handling
- `AppError` with `munchConstants.ERROR_CODES[0]`.
- Localized via `formatMessage` (`en.json`).
- Transactions ensure atomicity.
- Logs via `logger.error`.

## Usage Scenarios
- **Order Trends**: Merchant tracks monthly order patterns.
- **Delivery Performance**: Merchant monitors delivery metrics, drivers get 11 points if `onTimeRate > 0.9`.
- **Customer Insights**: Merchant gets customer data, notification if `uniqueCustomers > 100`.
- **Gamification**: Merchant tracks points awarded.
- **Delivery Locations**: Merchant analyzes delivery areas.

## Security
- **Authentication**: Via `authMiddleware`.
- **Authorization**: `merchant` role with specific permissions.
- **Validation**: Joi schemas in `analyticsValidator.js`.
- **Auditing**: Logs actions with IP.

## API Endpoints
- **POST /merchant/munch/analytics/order-trends**
- **POST /merchant/munch/analytics/delivery-performance**
- **POST /merchant/munch/analytics/customer-insights**
- **POST /merchant/munch/analytics/gamification**
- **POST /merchant/munch/analytics/delivery-locations**

## Performance
- **Transactions**: Ensures consistency.
- **Caching**: None in service.
- **Rate Limiting**: Via `notificationService`.
- **Scalability**: Socket events use namespaced rooms.

## Notes
- **Constants**: Aligned with `munchConstants.js`, `gamificationConstants.js`.
- **Localization**: Supports `en.json`.
- **Socket Events**: Namespaced.
- **Points**: Automated in controller, capped at 1000/day.
- **Models**: Unchanged.

## Example Workflow
1. Merchant sends `POST /merchant/munch/analytics/order-trends`.
2. Middleware authenticates, validates.
3. Controller calls `trackOrderTrends`.
4. Socket emits `merchant:munch:orderTrends`.
5. Audit logs `track_order_trends`.
6. Response with trends data.