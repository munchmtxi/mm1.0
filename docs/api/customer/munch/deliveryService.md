deliveryService.md
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\customer\munch\deliveryService.md

markdown

Collapse

Unwrap

Copy
# Delivery Service API Documentation

This document outlines the API endpoints for the delivery service, including customer and driver functionalities. All endpoints require authentication via a bearer token, handled by the main route index.

## Base URL
/api/v1/customer/munch/delivery

text

Collapse

Unwrap

Copy
## Endpoints

### 1. Track Delivery
Retrieve the status and details of a delivery order.

- **Method**: GET
- **Path**: `/:orderId/track`
- **Roles**: Customer, Driver
- **Parameters**:
  - `orderId` (path, required): UUID of the order.
- **Response**:
  - **200**: `{ success: true, message: "Order tracked successfully", data: { status, deliveryLocationDetails } }`
  - **403**: Permission denied
  - **404**: Order not found
- **Curl Example**:
  ```bash
  curl -X GET "http://localhost:3000/api/v1/customer/munch/delivery/123e4567-e89b-12d3-a456-426614174000/track" \
       -H "Authorization: Bearer <token>"
2. Cancel Delivery
Cancel a pending delivery order.

Method: POST
Path: /:orderId/cancel
Roles: Customer
Parameters:
orderId (path, required): UUID of the order.
reason (body, required): String (5-500 characters).
Response:
200: { success: true, message: "Order {orderNumber} cancelled successfully", data: { orderId, refundProcessed, refundAmount } }
403: Permission denied
404: Order not found
400: Order not cancellable
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST "http://localhost:3000/api/v1/customer/munch/delivery/123e4567-e89b-12d3-a456-426614174000/cancel" \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"reason": "No longer needed"}'
3. Communicate with Driver
Send a message to the driver for an order.

Method: POST
Path: /:orderId/communicate
Roles: Customer
Parameters:
orderId (path, required): UUID of the order.
message (body, required): String (1-1000 characters).
Response:
200: { success: true, message: "Message sent to driver successfully", data: { orderId, message } }
403: Permission denied
404: Order not found
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST "http://localhost:3000/api/v1/customer/munch/delivery/123e4567-e89b-12d3-a456-426614174000/communicate" \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"message": "Please deliver to the back entrance"}'
4. Request Feedback
Request feedback for a completed delivery order.

Method: POST
Path: /:orderId/feedback
Roles: Customer
Parameters:
orderId (path, required): UUID of the order.
Response:
200: { success: true, message: "Feedback requested successfully", data: { orderId } }
403: Permission denied
404: Order not found
400: Feedback not allowed
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST "http://localhost:3000/api/v1/customer/munch/delivery/123e4567-e89b-12d3-a456-426614174000/feedback" \
     -H "Authorization: Bearer <token>"
5. Update Delivery Status
Update the status of a delivery order (driver only).

Method: PATCH
Path: /:orderId/status
Roles: Driver
Parameters:
orderId (path, required): UUID of the order.
status (body, required): One of pending, in_progress, delivered, cancelled.
Response:
200: { success: true, message: "Delivery status updated successfully", data: { orderId, status } }
403: Permission denied
404: Order not found
400: Invalid status
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X PATCH "http://localhost:3000/api/v1/customer/munch/delivery/123e4567-e89b-12d3-a456-426614174000/status" \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"status": "in_progress"}'
6. Process Driver Earnings
Process earnings for a completed delivery (driver only).

Method: POST
Path: /:orderId/earnings
Roles: Driver
Parameters:
orderId (path, required): UUID of the order.
Response:
200: { success: true, message: "Earnings processed successfully", data: { orderId, earningAmount } }
403: Permission denied
404: Order not found
400: Order not completed
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X POST "http://localhost:3000/api/v1/customer/munch/delivery/123e4567-e89b-12d3-a456-426614174000/earnings" \
     -H "Authorization: Bearer <token>"
7. Update Driver Location
Update the driver's current location.

Method: PATCH
Path: /location
Roles: Driver
Parameters:
coordinates (body, required): Object with latitude (-90 to 90) and longitude (-180 to 180).
countryCode (body, optional): Country code (default: US).
Response:
200: { success: true, message: "Location updated successfully", data: { coordinates, countryCode } }
403: Permission denied
400: Invalid coordinates
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X PATCH "http://localhost:3000/api/v1/customer/munch/delivery/location" \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"coordinates": {"latitude": 37.7749, "longitude": -122.4194}, "countryCode": "US"}'
8. Get Address Predictions
Retrieve address predictions for delivery location input.

Method: GET
Path: /address-predictions
Roles: Customer
Parameters:
input (query, required): Address input string (3-100 characters).
countryCode (query, optional): Country code (default: US).
Response:
200: { success: true, message: "Address predictions retrieved successfully", data: [predictions] }
403: Permission denied
400: Invalid input
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X GET "http://localhost:3000/api/v1/customer/munch/delivery/address-predictions?input=123%20Main%20St&countryCode=US" \
     -H "Authorization: Bearer <token>"
9. Update Delivery Location
Update the delivery location for a pending order.

Method: PATCH
Path: /:orderId/location
Roles: Customer
Parameters:
orderId (path, required): UUID of the order.
placeId (body, required): Place ID for the new location.
countryCode (body, optional): Country code (default: US).
Response:
200: { success: true, message: "Location updated successfully", data: { orderId, location } }
403: Permission denied
404: Order not found
400: Cannot update location
Curl Example:
bash

Collapse

Unwrap

Run

Copy
curl -X PATCH "http://localhost:3000/api/v1/customer/munch/delivery/123e4567-e89b-12d3-a456-426614174000/location" \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4", "countryCode": "US"}'
Socket Events
order_cancelled: Notifies driver of order cancellation.
driver_communication: Sends customer message to driver.
feedback_requested: Notifies admin of feedback request.
delivery_status_updated: Notifies customer of status update.
earnings_processed: Notifies driver of processed earnings.
delivery_location_updated: Notifies driver of updated delivery location.
Notes
All responses follow the format: { success: boolean, message: string, data: object }.
Localization is handled via en.json for English messages.
Gamification points are awarded via pointService for actions like order_cancelled and feedback_requested.
Audit logs are created for all actions using auditService.
text

Collapse

Unwrap

Copy
**Notes**:
- Comprehensive documentation with curl commands for each endpoint.
- Includes socket events and notes on response format, localization, gamification, and audit logging.
- Assumes authentication via bearer token, not detailed in routes.