Tip Documentation File
C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\services\tip\tipDocumentation.md

markdown

Collapse

Unwrap

Copy
# Tip Service Documentation

## Overview
The Tip Service enables customers to tip drivers or staff for completed services (rides, orders, bookings, event services, in-dining orders) within MunchMtxi, integrating with `mtables`, `munch`, `mtxi`, and `mevents`.

## Features
- **Tip Creation**: Tip for a single completed service with validated amount and currency.
- **Tip Update**: Modify tip amount or status (pending, completed, failed).
- **Tip Retrieval**: Fetch customer’s tip history.
- **Gamification**: Award points for creating (10 points per currency unit) and completing (50 points) tips.
- **Real-Time**: Socket events for tip sent and updated.
- **Notifications**: Push notifications for tip sent, received, updated, or failed.

## File Structure
- **Constants**: `src/constants/common/tipConstants.js`
- **Service**: `src/services/customer/tip/tipService.js`
- **Controller**: `src/controllers/customer/tip/tipController.js`
- **Validator**: `src/validators/customer/tip/tipValidator.js`
- **Middleware**: `src/middleware/customer/tip/tipMiddleware.js`
- **Routes**: `src/routes/customer/tip/tipRoutes.js`
- **Events**: `socket/events/customer/tip/tipEvents.js`
- **Handler**: `socket/handlers/customer/tip/tipHandler.js`

## API Endpoints
### Create Tip
- **POST /api/v1/customer/tip**
  - Body: `{ recipientId: number, amount: number, currency: string, rideId?: number, orderId?: number, bookingId?: number, eventServiceId?: number, inDiningOrderId?: number }`
  - Response: `{ status: "success", data: { tipId: number, amount: number, currency: string, status: string, [serviceType]Id: number } }`

### Update Tip
- **PATCH /api/v1/customer/tip/:tipId**
  - Body: `{ amount?: number, status?: string }`
  - Response: `{ status: "success", data: { tipId: number, amount: number, currency: string, status: string, [serviceType]Id: number } }`

### Get Customer Tips
- **GET /api/v1/customer/tip**
  - Response: `{ status: "success", data: [{ tipId: number, amount: number, currency: string, status: string, recipientName: string, createdAt: string, [serviceType]Id: number }] }`

## Socket Events
- **tip:sent**: Notifies recipient of new tip.
- **tip:updated**: Notifies recipient of tip update.

## Models
- **Tip**: `{ id, customer_id, recipient_id, wallet_id, amount, currency, status, ride_id, order_id, booking_id, event_service_id, in_dining_order_id, created_at }`
- **Wallet**: `{ id, user_id, balance, currency }`

## Dependencies
- **Sequelize Models**: User, Customer, Driver, Staff, Wallet, Ride, Order, Booking, EventService, InDiningOrder, Event
- **Constants**: tipConstants, mtablesConstants, munchConstants, rideConstants, meventsConstants
- **Services**: notificationService, walletService, auditService, socketService, pointService
- **Utils**: localization, AppError, logger, catchAsync

## Error Handling
- Uses `AppError` with localized messages from `tipConstants.ERROR_CODES`.
- Common errors: `INVALID_CUSTOMER`, `INVALID_RECIPIENT`, `INVALID_AMOUNT`, `TIP_ALREADY_EXISTS`, etc.

## Notes
- Transactions ensure data consistency.
- Points awarded dynamically in service.
- No external API calls.
- Assumes `Tip` and `Wallet` models are defined.