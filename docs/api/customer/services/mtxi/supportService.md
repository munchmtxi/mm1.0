supportService.md
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\supportService.md

markdown

Collapse

Unwrap

Copy
# Support Service API Documentation

**Module**: Customer Support Service (mtxi, munch, mtables)  
**Version**: 1.0  
**Last Updated**: June 2, 2025  

This document outlines the API endpoints for the Support Service, which manages customer support tickets for mtxi (rides), munch (deliveries), and mtables (bookings). The service supports creating, tracking, escalating, and closing tickets, with group-related issue handling for shared services. It integrates with notifications, audits, and gamification points.

## Base URL
`/api/customer/mtxi/support`

## Authentication
All endpoints require Bearer Token authentication and are restricted to users with the `customer` role.

## Endpoints

### 1. Create a Support Ticket
- **Method**: POST
- **Path**: `/`
- **Permissions**: `create_support_ticket`
- **Description**: Creates a support ticket for a specific service issue, with optional group member involvement.
- **Request Body**:
  ```json
  {
    "serviceType": "ride",
    "issueType": "PAYMENT_ISSUE",
    "description": "Payment was charged twice",
    "rideId": 1,
    "groupCustomerIds": [2, 3]
  }
serviceType (string, required): Service type (ride, order, booking, event_service, in_dining_order).
issueType (string, required): Issue type (PAYMENT_ISSUE, SERVICE_QUALITY, CANCELLATION, DELIVERY_ISSUE, BOOKING_ISSUE, OTHER).
description (string, required): Issue description.
rideId (integer, optional): Ride ID (required if no orderId or bookingId).
orderId (integer, optional): Order ID (required if no rideId or bookingId).
bookingId (integer, optional): Booking ID (required if no rideId or orderId).
groupCustomerIds (array, optional): List of customer IDs for group issues.
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Support ticket created",
  "data": {
    "ticketId": 1,
    "gamificationError": null
  }
}
400 Bad Request: Invalid service type, issue type, or reference.
401 Unauthorized: Missing or invalid token.
403 Forbidden: Insufficient permissions.
Gamification: Awards 10 points and $0.20 credit for support_interaction.
2. Track Ticket Status
Method: GET
Path: /{ticketId}
Permissions: track_support_ticket
Description: Retrieves the status and details of a support ticket.
Parameters:
ticketId (path, integer, required): Ticket ID.
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Ticket status retrieved",
  "data": {
    "ticketId": 1,
    "serviceType": "ride",
    "issueType": "PAYMENT_ISSUE",
    "status": "OPEN",
    "description": "Payment was charged twice",
    "updatedAt": "2025-06-01T00:00:00Z",
    "ride": { "id": 1, "pickupLocation": "123 Main St", "dropoffLocation": "456 Elm St" },
    "order": null,
    "booking": null
  }
}
400 Bad Request: Invalid ticket ID.
401 Unauthorized: Missing or invalid token.
404 Not Found: Ticket not found.
Gamification: No points awarded.
3. Escalate a Ticket
Method: POST
Path: /escalate
Permissions: escalate_support_ticket
Description: Escalates an unresolved support ticket to a higher support level.
Request Body:
json

Collapse

Unwrap

Copy
{
  "ticketId": 1
}
ticketId (integer, required): Ticket ID.
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Ticket escalated",
  "data": {
    "ticketId": 1,
    "gamificationError": null
  }
}
400 Bad Request: Invalid or non-escalatable ticket.
401 Unauthorized: Missing or invalid token.
404 Not Found: Ticket not found.
Gamification: Awards 10 points and $0.20 credit for support_interaction.
4. Close a Ticket
Method: POST
Path: /close
Permissions: close_support_ticket
Description: Closes a resolved support ticket.
Request Body:
json

Collapse

Unwrap

Copy
{
  "ticketId": 1
}
ticketId (integer, required): Ticket ID.
Responses:
200 OK:
json

Collapse

Unwrap

Copy
{
  "status": "success",
  "message": "Ticket closed",
  "data": {
    "ticketId": 1,
    "gamificationError": null
  }
}
400 Bad Request: Invalid or already closed ticket.
401 Unauthorized: Missing or invalid token.
404 Not Found: Ticket not found.
Gamification: Awards 5 points for ticket_closure.
Gamification Integration
Support Interaction: 10 points, $0.20 credit for creating or escalating tickets.
Ticket Closure: 5 points for closing tickets.
Error Codes
CUSTOMER_NOT_FOUND: Customer or group member not found.
INVALID_SERVICE_TYPE: Invalid service type.
INVALID_ISSUE_TYPE: Invalid issue type.
INVALID_TICKET: Invalid ticket reference or configuration.
RIDE_NOT_FOUND: Ride not found.
ORDER_FAILED: Order not found.
BOOKING_FAILED: Booking not found.
SUPPORT_TICKET_NOT_FOUND: Ticket not found.
SUPPORT_TICKET_NOT_ESCALATABLE: Ticket cannot be escalated.
SUPPORT_TICKET_FAILED: Ticket operation failed.
Events
support:ticket_created: Triggered on ticket creation.
support:ticket_escalated: Triggered on ticket escalation.
support:ticket_closed: Triggered on ticket closure.
Dependencies
customerConstants.js: Notification types, audit types, error codes.
rideConstants.js: Shared ride settings.
tipConstants.js: Service types.
gamificationConstants.js: Customer actions, point awards.
en.json: Localization messages.