docs/api/customer/mtables/PartyManagementService.md

markdown

Collapse

Unwrap

Copy
# Party Management Service API Documentation

This document details the Party Management Service endpoints for managing party-related actions in the mtables module, including inviting party members, updating statuses, removing members, and splitting bills.

## Base URL
/api/customer/mtables/party

text

Collapse

Unwrap

Copy
## Authentication
All endpoints require a Bearer token in the `Authorization` header.

## Endpoints

### 1. Invite Party Member
Invites a customer to join a booking's party.

- **Method**: POST
- **Path**: `/invite`
- **Request Body**:
  ```json
  {
    "bookingId": 1,
    "customerId": 2,
    "inviteMethod": "push"
  }
Success Response (200):
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Invite sent successfully",
  "data": {
    "partyMember": {
      "id": 1,
      "booking_id": 1,
      "customer_id": 2,
      "status": "PENDING",
      "invite_method": "push"
    },
    "booking": {
      "id": 1,
      "customer_id": 1,
      "guest_count": 4,
      "status": "CONFIRMED"
    }
  }
}
Error Response (400):
json

Collapse

Unwrap

Copy
{
  "success": false,
  "error": "Invalid customer ID"
}
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/customer/mtables/party/invite \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":1,"customerId":2,"inviteMethod":"push"}'
2. Update Party Member Status
Updates the status of a party member (e.g., accept or decline an invite).

Method: PUT
Path: /status
Request Body:
json

Collapse

Unwrap

Copy
{
  "bookingId": 1,
  "status": "ACCEPTED"
}
Success Response (200):
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Status updated successfully",
  "data": {
    "partyMember": {
      "id": 1,
      "booking_id": 1,
      "customer_id": 2,
      "status": "ACCEPTED"
    }
  }
}
Error Response (400):
json

Collapse

Unwrap

Copy
{
  "success": false,
  "error": "Invalid status"
}
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X PUT http://localhost:3000/api/customer/mtables/party/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":1,"status":"ACCEPTED"}'
3. Remove Party Member
Removes a customer from a booking's party.

Method: DELETE
Path: /remove
Request Body:
json

Collapse

Unwrap

Copy
{
  "bookingId": 1,
  "customerId": 2
}
Success Response (200):
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Party member removed successfully",
  "data": {
    "booking": {
      "id": 1,
      "customer_id": 1,
      "guest_count": 4,
      "status": "CONFIRMED"
    }
  }
}
Error Response (400):
json

Collapse

Unwrap

Copy
{
  "success": false,
  "error": "Party member not found"
}
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X DELETE http://localhost:3000/api/customer/mtables/party/remove \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":1,"customerId":2}'
4. Split Bill
Initiates bill splitting among party members.

Method: POST
Path: /split-bill
Request Body:
json

Collapse

Unwrap

Copy
{
  "bookingId": 1,
  "customerIds": [2, 3],
  "amount": 100.50,
  "currency": "USD",
  "billSplitType": "EQUAL"
}
Success Response (200):
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Bill split completed successfully",
  "data": {
    "paymentRequests": [
      {
        "id": 1,
        "booking_id": 1,
        "customer_id": 2,
        "amount": 33.50,
        "currency": "USD",
        "status": "pending"
      },
      {
        "id": 2,
        "booking_id": 1,
        "customer_id": 3,
        "amount": 33.50,
        "currency": "USD",
        "status": "pending"
      }
    ],
    "booking": {
      "id": 1,
      "customer_id": 1,
      "guest_count": 4,
      "status": "CONFIRMED"
    }
  }
}
Error Response (400):
json

Collapse

Unwrap

Copy
{
  "success": false,
  "error": "Invalid bill split type"
}
cURL Command:
bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/api/customer/mtables/party/split-bill \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":1,"customerIds":[2,3],"amount":100.50,"currency":"USD","billSplitType":"EQUAL"}'
Socket Events
The following socket events are emitted for real-time updates:

PARTY_INVITE_SENT: Notifies a customer of a party invite.
Payload: { userId, role, auditAction, details: { bookingId, partyMemberId } }
PARTY_STATUS_UPDATED: Notifies a customer of a status update.
Payload: { userId, role, auditAction, details: { bookingId, status } }
PARTY_MEMBER_REMOVED: Notifies a customer of removal from a party.
Payload: { userId, role, auditAction, details: { bookingId, customerId } }
BILL_SPLIT_REQUESTED: Notifies customers of a bill split request.
Payload: { userId, role, auditAction, details: { bookingId, amount, billSplitType } }
Gamification
The following actions award points:

party_member_invited: 5 points
party_member_status_updated: 3 points
party_member_removed: 2 points
bill_split_initiated: 10 points, 5-unit wallet credit
Error Codes
INVALID_CUSTOMER_ID: Invalid customer ID provided.
BOOKING_NOT_FOUND: Booking does not exist.
INVALID_PARTY_SIZE: Party size exceeds limits.
PARTY_MEMBER_ALREADY_INVITED: Customer already invited.
PARTY_MEMBER_NOT_FOUND: Party member not found.
INVALID_BILL_SPLIT: Invalid bill split parameters.
NOT_FRIEND: Customer is not a friend.
INVALID_PERMISSIONS: Customer lacks required permissions.
Notes
All endpoints require authentication via a Bearer token.
Responses include localized messages based on the user's preferred language.
Socket events are emitted to specific customer rooms (customer:<id>).
Gamification points are awarded and logged for all actions.
text

