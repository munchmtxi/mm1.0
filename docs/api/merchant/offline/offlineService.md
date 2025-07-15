# OfflineService Documentation

## Overview
The `OfflineService` manages caching and synchronization of orders and bookings for offline processing in the `offline` module. Gamification points for offline interactions are awarded automatically in the controller.

## Methods

### `cacheOrders`
- **Purpose**: Caches orders for offline processing.
- **Parameters**:
  - `restaurantId`: Number, merchant ID.
  - `orders`: Array of objects with `items`, `total_amount`, `customer_id`, `currency` (optional).
- **Returns**: Object with `merchantId`, `orderCount`.
- **Errors**:
  - `ERROR_CODES[1]` (404): Merchant or branch not found.
  - `ERROR_CODES[5]` (400): Invalid order data.

### `cacheBookings`
- **Purpose**: Caches bookings for offline processing.
- **Parameters**:
  - `restaurantId`: Number, merchant ID.
  - `bookings`: Array of objects with `booking_date`, `booking_time`, `customer_id`.
- **Returns**: Object with `merchantId`, `bookingCount`.
- **Errors**:
  - `ERROR_CODES[1]` (404): Merchant or branch not found.
  - `ERROR_CODES[5]` (400): Invalid booking data.

### `syncOfflineData`
- **Purpose**: Synchronizes cached orders and bookings to the database.
- **Parameters**:
  - `restaurantId`: Number, merchant ID.
- **Returns**: Object with `merchantId`, `orderCount`, `bookingCount`.
- **Errors**:
  - `ERROR_CODES[1]` (404): Merchant or customer not found.
  - `ERROR_CODES[5]` (400): Invalid input.

## Points
Points awarded via `customerConstants.GAMIFICATION_CONSTANTS`:
- **offline_order**: 30 points, 0.75 wallet credit.
- **offline_booking**: 50 points, 1.00 wallet credit.
- **Capped**: 1000/day.
- **Automated**: In `syncOfflineDataController` for synced items.

**Workflow**:
1. Merchant caches orders/bookings or syncs data.
2. Service processes data.
3. Controller sends notifications, emits sockets, logs audits, and awards points (for synced data).

## Dependencies
- **Models**: `User`, `Merchant`, `MerchantBranch`, `Order`, `Booking`, `OfflineCache`, `Customer`.
- **Constants**: `merchantConstants`, `customerConstants` (controller).
- **Utilities**: `formatMessage`, `AppError`, `logger`.
- **Services** (controller): `notificationService`, `auditService`, `socketService`, `pointService`.

## Integration
- **Notifications**:
  - Merchant: `ORDERS_CACHED`, `BOOKINGS_CACHED`, `DATA_SYNCED`.
- **Audits**: Logs `CACHE_ORDERS`, `CACHE_BOOKINGS`, `SYNC_OFFLINE_DATA`.
- **Socket Events**: Namespaced (`merchant:offline:`) via `offlineEvents.js`.
- **Gamification**: Points in controller for synced offline data.

## Error Handling
- `AppError` with `merchantConstants.ERROR_CODES`.
- Localized via `formatMessage` (`en.json`).
- Transactions ensure atomicity.
- Logs via `logger.error`.

## Usage Scenarios
- **Cache Orders**: Merchant stores orders offline.
- **Cache Bookings**: Merchant stores bookings offline.
- **Sync Data**: Merchant syncs cached data, customers earn points.

## Security
- **Authentication**: Via `authMiddleware`.
- **Authorization**: `merchant` role with permissions.
- **Validation**: Joi schemas in `offlineValidator.js`.
- **Auditing**: Logs actions with IP.

## API Endpoints
- **POST /merchant/offline/cache-orders**
- **POST /merchant/offline/cache-bookings**
- **POST /merchant/offline/sync**

## Performance
- **Transactions**: Ensures consistency.
- **Caching**: Uses `OfflineCache` model.
- **Rate Limiting**: Via `notificationService`.
- **Scalability**: Socket events use namespaced rooms.

## Notes
- **Constants**: Updated in `merchantConstants.js`.
- **Localization**: Supports `en.json`.
- **Socket Events**: Namespaced.
- **Points**: Automated in controller, capped at 1000/day.
- **Models**: Unchanged.

## Example Workflow
1. Merchant sends `POST /merchant/offline/cache-orders`.
2. Middleware authenticates, validates.
3. Controller caches orders, sends notifications, emits socket.
4. Audit logs `cache_orders`.
5. Response with cache data.