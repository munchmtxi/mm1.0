API Documentation File
File: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\crossVerticalOutlook\cvo.md

markdown

Collapse

Unwrap

Copy
# Customer Cross Vertical Outlook API

This API provides endpoints for customers to manage and view their active services across multiple verticals (mtables, munch, in_dining, mtxi, mpark, mevents).

## Base URL
/api/customer/cross-vertical-outlook

text

Collapse

Unwrap

Copy
## Endpoints

### 1. Get Customer Services
Retrieve all active services for the authenticated customer.

- **Method**: GET
- **Path**: `/`
- **Query Parameters**:
  - `languageCode` (optional, string): Language code for response messages (e.g., `en`). Default: `en`.
- **Headers**:
  - `Authorization`: Bearer token (handled by global auth middleware).
- **Response**:
  - **200 Success**:
    ```json
    {
      "status": "success",
      "message": "Services fetched successfully",
      "data": {
        "bookings": [{ "id": 1, "customer": {}, "merchant": {}, "table": {}, "branch": {} }, ...],
        "orders": [{ "id": 1, "customer": {}, "merchant": {}, "branch": {} }, ...],
        "inDiningOrders": [{ "id": 1, "customer": {}, "branch": {}, "table": {} }, ...],
        "rides": [{ "id": 1, "customer": {}, "driver": {} }, ...],
        "parkingBookings": [{ "id": 1, "customer": {}, "space": {}, "merchant": {} }, ...],
        "eventServices": [{ "id": 1, "event": {}, "Booking": {}, "Order": {}, "Ride": {}, "InDiningOrder": {}, "ParkingBooking": {} }, ...]
      }
    }
500 Error:
json

Collapse

Unwrap

Copy
{
  "status": "error",
  "message": "Failed to fetch services",
  "errorCode": "SERVICES_FETCH_FAILED",
  "details": null,
  "meta": { "customerId": 123 }
}
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X GET "http://localhost:3000/api/customer/cross-vertical-outlook?languageCode=en" \
     -H "Authorization: Bearer <your-token>"
2. Cancel Service
Cancel a specific service by its type and ID.

Method: POST
Path: /cancel
Body:
json

Collapse

Unwrap

Copy
{
  "serviceType": "mtables|munch|in_dining|mtxi|mpark",
  "serviceId": 123,
  "languageCode": "en"
}
Headers:
Authorization: Bearer token (handled by global auth middleware).
Response:
200 Success:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Service cancelled successfully",
  "data": { "id": 123, "status": "CANCELLED", ... }
}
400 Error (Invalid service type or cancellation window expired):
json

Collapse

Unwrap

Copy
{
  "status": "error",
  "message": "Invalid service type",
  "errorCode": "INVALID_SERVICE_TYPE",
  "details": null
}
404 Error (Service not found):
json

Collapse

Unwrap

Copy
{
  "status": "error",
  "message": "Booking not found or not cancellable",
  "errorCode": "BOOKING_CANCELLATION_FAILED",
  "details": null
}
500 Error:
json

Collapse

Unwrap

Copy
{
  "status": "error",
  "message": "Failed to cancel service",
  "errorCode": "SERVICE_CANCELLATION_FAILED",
  "details": null,
  "meta": { "customerId": 123, "serviceId": 123 }
}
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST "http://localhost:3000/api/customer/cross-vertical-outlook/cancel" \
     -H "Authorization: Bearer <your-token>" \
     -H "Content-Type: application/json" \
     -d '{"serviceType":"mtables","serviceId":123,"languageCode":"en"}'
Notes
All endpoints require authentication via a bearer token, managed by global middleware.
The languageCode parameter supports localization for response messages.
Gamification points are awarded for actions like viewing services (services_viewed) or cancelling services (service_cancelled), as defined in customerGamificationConstants.js.
Socket events are emitted for real-time updates (e.g., SERVICE_CANCELLED).
Audit logs and notifications are triggered for all actions.
text

Collapse

Unwrap

Copy
### Notes
- **Validator**: Uses `express-validator` for input validation, ensuring `serviceType`, `serviceId`, and `languageCode` are valid.
- **Route**: Includes Swagger comments for API documentation, with no mention of authentication middleware (assumed to be handled globally).
- **Middleware**: Validates `customerId` from `req.user`, aligning with the controller's usage.
- **Socket Handler**: Handles the `SERVICE_CANCELLED` event, emitting updates and sending notifications.
- **Socket Events**: Defines simple constant names (`SERVICE_CANCELLED`, `ERROR`) for clarity.
- **Localization**: Provides `en.json` with messages for success and error cases, used by `formatMessage` in the controller.
- **API Documentation**: Extensive Markdown file with detailed endpoint descriptions, response schemas, and curl examples.
- **JSDoc**: Minimal, focusing on essential function descriptions across all files.