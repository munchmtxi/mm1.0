# Mtables Analytics Service Documentation

## Overview
The Mtables Analytics Service enables merchants (restaurants, cafes, caterers) to track sales, analyze table booking trends, generate reports, and assess customer engagement. Points are awarded automatically for all actions, integrated with notifications, audits, and sockets, aligning with `mtablesConstants.js` and `merchantConstants.js`.

## Methods

### `trackSales`
- **Purpose**: Tracks sales for table bookings and in-dining orders.
- **Parameters**:
  - `restaurantId`: (string) Merchant ID.
  - `period`: (string) Time period (`daily`, `weekly`, `monthly`, `yearly`).
  - `ipAddress`: (string) Request IP.
  - `transaction`: (optional) Sequelize transaction.
- **Returns**: Object with `totalGuests`, `totalBookings`, `totalRevenue`, `totalOrders`, `action`, `language`.
- **Errors**:
  - `INVALID_INPUT` (400): Invalid restaurant ID or input.
  - `INVALID_PERIOD` (400): Invalid time period.
- **Point Awarding**: `salesTracked` for merchants, based on `totalOrders`.

### `analyzeBookingTrends`
- **Purpose**: Analyzes table booking patterns.
- **Parameters**:
  - `restaurantId`: (string) Merchant ID.
  - `period`: (string) Time period.
  - `ipAddress`: (string) Request IP.
  - `transaction`: (optional) Sequelize transaction.
- **Returns**: Object with `trends` (array of period, bookingCount, guestCount, etc.), `action`, `language`.
- **Errors**:
  - `INVALID_INPUT` (400): Invalid restaurant ID or input.
  - `INVALID_PERIOD` (400): Invalid time period.
- **Point Awarding**: `bookingTrendsAnalyzed` for merchants, based on `bookingCount`.

### `generateBookingReports`
- **Purpose**: Generates reports combining sales and booking trends.
- **Parameters**:
  - `restaurantId`: (string) Merchant ID.
  - `ipAddress`: (string) Request IP.
  - `transaction`: (optional) Sequelize transaction.
- **Returns**: Object with `sales`, `bookingTrends`, `generatedAt`, `action`, `language`.
- **Errors**:
  - `INVALID_INPUT` (400): Invalid restaurant ID.
- **Point Awarding**: `reportGenerated` for merchants, based on `trendsCount`.

### `analyzeCustomerEngagement`
- **Purpose**: Analyzes customer interactions with bookings and orders.
- **Parameters**:
  - `restaurantId`: (string) Merchant ID.
  - `ipAddress`: (string) Request IP.
  - `transaction`: (optional) Sequelize transaction.
- **Returns**: Object with `topEngaged` (array of userId, bookingCount, orderCount, engagementScore), `totalCustomers`, `action`, `language`.
- **Errors**:
  - `INVALID_INPUT` (400): Invalid restaurant ID.
- **Point Awarding**: `engagementAnalyzed` for merchants (`totalCustomers`); `crossServiceUsage` for customers (`serviceCount`).

## Point System
Points are awarded automatically for actions in `mtablesConstants.POINT_AWARD_ACTIONS`:
- **Dynamic**: Configured in `gamificationConstants.MERCHANT_ACTIONS` and `CUSTOMER_ACTIONS`.
- **Metadata-Based**:
  - `salesTracked`: 0.05x per `totalOrders`.
  - `bookingTrendsAnalyzed`: 0.1x per `bookingCount`.
  - `reportGenerated`: 0.1x per `trendsCount`.
  - `engagementAnalyzed`: 0.05x per `totalCustomers`.
  - `crossServiceUsage`: 0.1x per `serviceCount`.
- **Role-Based**: Merchants: 1.2x; Customers: 1.1x.
- **Capped**: 200 points per action (`MAX_POINTS_PER_ACTION`).
- **Automated**: Awarded in controller post-service execution.

**Configuration** (`gamificationConstants.js`):
- `salesTracked`: 30 base points, 0.05x `totalOrders`, 1.2x merchant.
- `bookingTrendsAnalyzed`: 35 base points, 0.1x `bookingCount`, 1.2x merchant.
- `reportGenerated`: 40 base points, 0.1x `trendsCount`, 1.2x merchant.
- `engagementAnalyzed`: 35 base points, 0.05x `totalCustomers`, 1.2x merchant.
- `crossServiceUsage`: 50 base points, 0.1x `serviceCount`, 1.1x customer.

**Workflow**:
1. Merchant initiates action (e.g., track sales).
2. Service processes data, returns metadata.
3. Controller calculates points using `gamificationConstants`.
4. Points awarded via `gamificationService`.
5. Notifications and socket events sent.

## Dependencies
- **Models**: `Booking`, `InDiningOrder`, `Table`, `Customer`, `User`.
- **Constants**: `mtablesConstants`, `gamificationConstants`.
- **Utilities**: `formatMessage`, `logger`.
- **Services**: `notificationService`, `auditService`, `socketService`, `gamificationService`.

## Integration
- **Notifications**: Sent for actions and points, using `SUPPORT_SETTINGS.PRIORITIES`.
- **Audits**: Logs actions with metadata and points.
- **Socket Events**: Namespaced (`merchant:mtables:<action>`).
- **Gamification**: Automated points in controller.

## Error Handling
- Uses `AppError` with `mtablesConstants.ERROR_CODES` (e.g., `INVALID_INPUT`, `PERMISSION_DENIED`).
- Transactions ensure data integrity.
- Localized messages from `en.json`.

## Usage Scenarios
- **Track Sales**: 100 orders yields 36 points (30 * 100 * 0.05 * 1.2).
- **Booking Trends**: 50 bookings yields 42 points (35 * 50 * 0.1 * 1.2).
- **Report Generation**: 10 trends yields 48 points (40 * 10 * 0.1 * 1.2).
- **Engagement Analysis**: 100 customers yields 42 points (35 * 100 * 0.05 * 1.2).
- **Customer Engagement**: 5 services (bookings + orders) yields 55 points (50 * 5 * 0.1 * 1.1).

## Security
- **Authentication**: Via `authMiddleware.authenticate`.
- **Authorization**: Restricted to merchants with `view_analytics` permission.
- **Validation**: Uses `express-validator` with localized messages.
- **Auditing**: Logs actions with IP and metadata.

## Notes
- **Constants**: Aligned with `mtablesConstants.js` (e.g., `IN_DINING_STATUSES`, `TABLE_MANAGEMENT`).
- **Transactions**: Ensure atomicity.
- **Points**: Capped at 1000/day (`MAX_POINTS_PER_DAY`).
- **Localization**: Supports `merchantConstants.BRANCHES.SUPPORTED_LANGUAGES`.