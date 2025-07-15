src/docs/api/customer/mtables/bookingService.md
markdown

Collapse

Unwrap

Copy
# Booking Service API Documentation

This document provides a detailed overview of the Booking Service API for the `mtables` module, which allows customers to manage table reservations, check-ins, and feedback. The API is designed to integrate with other services like notifications, gamification, and audit logging, ensuring a robust and scalable booking system.

---

## Base URL
`https://api.munchmagic.com/customer/mtables`

## Authentication
All endpoints require a Bearer token in the `Authorization` header. Tokens are validated against the `Customer` model, ensuring the customer is active and the session is valid.

---

## Endpoints

### 1. Create a Reservation
**POST /bookings**

Creates a new table reservation for a customer.

#### Request
- **Method**: POST
- **Path**: `/bookings`
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Body**:
  ```json
  {
    "customerId": 1,
    "tableId": 101,
    "branchId": 201,
    "date": "2025-07-01",
    "time": "18:00",
    "partySize": 4,
    "dietaryPreferences": ["VEGETARIAN", "GLUTEN_FREE"],
    "specialRequests": "Window seat preferred",
    "seatingPreference": "WINDOW"
  }
Validation:
customerId: Required, integer
tableId: Required, integer
branchId: Required, integer
date: Required, ISO date (e.g., "2025-07-01")
time: Required, HH:MM format (24-hour)
partySize: Required, integer between 1 and 30
dietaryPreferences: Optional, array of valid dietary filters (e.g., VEGETARIAN, VEGAN)
specialRequests: Optional, string (max 1000 characters)
seatingPreference: Optional, valid seating preference (e.g., WINDOW, BOOTH)
Response
Status: 201 Created
Body:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Reservation BK-123456-ABCDEF created successfully.",
  "data": {
    "booking": {
      "id": 301,
      "reference": "BK-123456-ABCDEF",
      "customer_id": 1,
      "table_id": 101,
      "branch_id": 201,
      "booking_date": "2025-07-01",
      "booking_time": "18:00",
      "guest_count": 4,
      "status": "confirmed",
      "seating_preference": "WINDOW"
    },
    "table": {
      "id": 101,
      "capacity": 6,
      "status": "RESERVED"
    }
  }
}
Error Responses:
400 Bad Request: Invalid input, table not available, or max bookings exceeded.
401 Unauthorized: Invalid or expired token.
cURL Example
bash

Collapse

Unwrap

Run

Copy
curl -X POST https://api.munchmagic.com/customer/mtables/bookings \
-H "Authorization: Bearer <token>" \
-H "Content-Type: application/json" \
-d '{
  "customerId": 1,
  "tableId": 101,
  "branchId": 201,
  "date": "2025-07-01",
  "time": "18:00",
  "partySize": 4,
  "dietaryPreferences": ["VEGETARIAN", "GLUTEN_FREE"],
  "specialRequests": "Window seat preferred",
  "seatingPreference": "WINDOW"
}'
2. Update a Reservation
PUT /bookings

Updates an existing reservation with new details.

Request
Method: PUT
Path: /bookings
Headers:
Authorization: Bearer <token>
Content-Type: application/json
Body:
json

Collapse

Unwrap

Copy
{
  "bookingId": 301,
  "date": "2025-07-02",
  "time": "19:00",
  "partySize": 5,
  "dietaryPreferences": ["VEGAN"],
  "specialRequests": "Allergy information updated",
  "seatingPreference": "BOOTH"
}
Validation:
bookingId: Required, integer
date: Optional, ISO date
time: Optional, HH:MM format
partySize: Optional, integer between 1 and 30
dietaryPreferences: Optional, array of valid dietary filters
specialRequests: Optional, string (max 1000 characters)
seatingPreference: Optional, valid seating preference
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Reservation BK-123456-ABCDEF updated successfully.",
  "data": {
    "booking": {
      "id": 301,
      "reference": "BK-123456-ABCDEF",
      "booking_date": "2025-07-02",
      "booking_time": "19:00",
      "guest_count": 5,
      "status": "confirmed",
      "seating_preference": "BOOTH"
    }
  }
}
Error Responses:
400 Bad Request: Invalid input, booking not found, or table not available.
401 Unauthorized: Invalid or expired token.
cURL Example
bash

Collapse

Unwrap

Run

Copy
curl -X PUT https://api.munchmagic.com/customer/mtables/bookings \
-H "Authorization: Bearer <token>" \
-H "Content-Type: application/json" \
-d '{
  "bookingId": 301,
  "date": "2025-07-02",
  "time": "19:00",
  "partySize": 5,
  "dietaryPreferences": ["VEGAN"],
  "specialRequests": "Allergy information updated",
  "seatingPreference": "BOOTH"
}'
3. Cancel a Reservation
DELETE /bookings/{bookingId}

Cancels an existing reservation.

Request
Method: DELETE
Path: /bookings/{bookingId}
Headers:
Authorization: Bearer <token>
Parameters:
bookingId: Required, integer (path parameter)
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Reservation BK-123456-ABCDEF cancelled successfully.",
  "data": {
    "booking": {
      "id": 301,
      "reference": "BK-123456-ABCDEF",
      "status": "cancelled"
    }
  }
}
Error Responses:
400 Bad Request: Booking not found or cancellation window expired.
401 Unauthorized: Invalid or expired token.
cURL Example
bash

Collapse

Unwrap

Run

Copy
curl -X DELETE https://api.munchmagic.com/customer/mtables/bookings/301 \
-H "Authorization: Bearer <token>"
4. Process Check-In
POST /bookings/check-in

Processes check-in for a reservation using QR code, manual, or NFC methods.

Request
Method: POST
Path: /bookings/check-in
Headers:
Authorization: Bearer <token>
Content-Type: application/json
Body:
json

Collapse

Unwrap

Copy
{
  "bookingId": 301,
  "qrCode": "ABC123",
  "method": "QR_CODE",
  "coordinates": {
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
Validation:
bookingId: Required, integer
qrCode: Required for QR_CODE method, string
method: Required, valid check-in method (QR_CODE, MANUAL, NFC)
coordinates: Optional, object with latitude and longitude
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Checked in for reservation BK-123456-ABCDEF.",
  "data": {
    "booking": {
      "id": 301,
      "reference": "BK-123456-ABCDEF",
      "status": "checked_in",
      "arrived_at": "2025-07-01T18:00:00Z"
    }
  }
}
Error Responses:
400 Bad Request: Invalid input, booking not found, or invalid QR code.
401 Unauthorized: Invalid or expired token.
cURL Example
bash

Collapse

Unwrap

Run

Copy
curl -X POST https://api.munchmagic.com/customer/mtables/bookings/check-in \
-H "Authorization: Bearer <token>" \
-H "Content-Type: application/json" \
-d '{
  "bookingId": 301,
  "qrCode": "ABC123",
  "method": "QR_CODE",
  "coordinates": {
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}'
5. Get Booking History
GET /bookings/history

Retrieves the booking history for a customer.

Request
Method: GET
Path: /bookings/history
Headers:
Authorization: Bearer <token>
Query Parameters:
customerId: Required, integer
Response
Status: 200 OK
Body:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Booking history retrieved successfully.",
  "data": {
    "bookings": [
      {
        "id": 301,
        "reference": "BK-123456-ABCDEF",
        "booking_date": "2025-07-01",
        "booking_time": "18:00",
        "guest_count": 4,
        "status": "confirmed",
        "table": { "id": 101, "capacity": 6 },
        "branch": { "id": 201, "addressRecord": { "city": "New York" } }
      }
    ]
  }
}
Error Responses:
400 Bad Request: Invalid customer ID.
401 Unauthorized: Invalid or expired token.
cURL Example
bash

Collapse

Unwrap

Run

Copy
curl -X GET "https://api.munchmagic.com/customer/mtables/bookings/history?customerId=1" \
-H "Authorization: Bearer <token>"
6. Submit Booking Feedback
POST /bookings/feedback

Submits feedback for a completed booking.

Request
Method: POST
Path: /bookings/feedback
Headers:
Authorization: Bearer <token>
Content-Type: application/json
Body:
json

Collapse

Unwrap

Copy
{
  "bookingId": 301,
  "rating": 4,
  "comment": "Great experience!"
}
Validation:
bookingId: Required, integer
rating: Required, integer between 1 and 5
comment: Optional, string (max 2000 characters)
Response
Status: 201 Created
Body:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Feedback for reservation BK-123456-ABCDEF submitted successfully.",
  "data": {
    "feedback": {
      "id": 401,
      "booking_id": 301,
      "rating": 4,
      "comment": "Great experience!",
      "status": "pending"
    }
  }
}
Error Responses:
400 Bad Request: Invalid input, booking not found, or invalid rating.
401 Unauthorized: Invalid or expired token.
cURL Example
bash

Collapse

Unwrap

Run

Copy
curl -X POST https://api.munchmagic.com/customer/mtables/bookings/feedback \
-H "Authorization: Bearer <token>" \
-H "Content-Type: application/json" \
-d '{
  "bookingId": 301,
  "rating": 4,
  "comment": "Great experience!"
}'
Integration Details
Database Models
Booking: Stores reservation details (id, customer_id, table_id, branch_id, reference, booking_date, booking_time, guest_count, status, etc.).
Table: Manages table details (id, branch_id, capacity, status).
Customer: Stores customer information (id, wallet_id, preferred_language, status).
MerchantBranch: Links tables to merchant branches (id, merchant_id, addressRecord).
BookingTimeSlot: Defines available time slots for bookings.
BookingBlackoutDate: Manages blackout dates for reservations.
Review: Stores feedback for bookings.
Services
bookingService: Handles core booking logic (create, update, cancel, check-in, history, feedback).
pointService: Awards gamification points for actions (e.g., booking created: 10 points, check-in: 5 points).
notificationService: Sends notifications (e.g., booking confirmation, check-in).
socketService: Emits real-time socket events for booking updates.
mapService: Updates customer location during check-in (if coordinates provided).
auditService: Logs actions for compliance (e.g., booking created, updated).
Socket Events
booking_created: Triggered when a reservation is created.
booking_updated: Triggered when a reservation is updated.
booking_cancelled: Triggered when a reservation is cancelled.
booking_checked_in: Triggered when a check-in is processed.
booking_feedback_submitted: Triggered when feedback is submitted.
Localization
Notifications and error messages are localized using en.json (e.g., "Reservation {reference} created successfully").
Supports multiple languages and formats defined in localizationConstants.
Gamification
Awards points for actions (e.g., booking_created: 10 points, check_in: 5 points, feedback_submitted: 8 points).
Points are managed via pointService and stored in the customer's wallet.
Error Handling
Uses AppError for consistent error responses with specific error codes from mtablesConstants and customerConstants.
Examples: INVALID_INPUT, TABLE_NOT_AVAILABLE, BOOKING_NOT_FOUND.
Security and Compliance
Authentication: Bearer token required, validated against Customer model.
Data Protection: Complies with GDPR, CCPA, LGPD, and PIPA standards (see customerConstants.COMPLIANCE_CONSTANTS).
Audit Logging: All actions are logged via auditService with details (e.g., booking ID, customer ID, IP address).
Rate Limiting: Notification limits enforced (max 20 per hour).
Notes
All endpoints are protected by authenticateCustomer middleware to ensure only authorized customers can access them.
Transactions are used to ensure data consistency across database operations.
Socket events provide real-time updates to customers.
The API supports localization and currency conversion based on the customer's country (e.g., USD for US, GBP for GB).