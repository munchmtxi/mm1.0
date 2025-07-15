Markdown Documentation File
File: src/docs/api/customer/mtables/tableSearchService.md

markdown

Collapse

Unwrap

Copy
# Table Search Service API Documentation

## Overview

The Table Search Service enables customers to find available tables at merchant branches based on location, date, time, party size, and seating preferences. It integrates with audit logging, gamification, notifications, and real-time socket communication for enhanced user experience and interaction tracking.

**Last Updated:** July 3, 2025

---

## Endpoint: Search for Available Tables

### **POST /customer/mtables/search**

Searches for available tables based on specified criteria.

#### **Request**

- **Method:** POST
- **Path:** `/customer/mtables/search`
- **Content-Type:** `application/json`
- **Body:**
  ```json
  {
    "coordinates": {
      "lat": number,
      "lng": number
    },
    "radius": number,
    "date": string (YYYY-MM-DD),
    "time": string (HH:MM),
    "partySize": integer,
    "seatingPreference": string (optional, enum: ["indoor", "outdoor", "bar", "private", "no_preference"])
  }
Example:
json

Collapse

Unwrap

Copy
{
  "coordinates": { "lat": 40.7128, "lng": -74.0060 },
  "radius": 5000,
  "date": "2025-07-10",
  "time": "18:30",
  "partySize": 4,
  "seatingPreference": "indoor"
}
cURL Command
bash

Collapse

Unwrap

Run

Copy
curl -X POST "http://localhost:3000/customer/mtables/search" \
-H "Content-Type: application/json" \
-d '{
  "coordinates": { "lat": 40.7128, "lng": -74.0060 },
  "radius": 5000,
  "date": "2025-07-10",
  "time": "18:30",
  "partySize": 4,
  "seatingPreference": "indoor"
}'
Responses
200 OK
Description: Successfully retrieved available tables.
Body:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Found {count} available tables.",
  "data": [
    {
      "id": "string",
      "branch": { "name": "string" },
      "capacity": integer,
      "section": { "name": "string" }
    }
  ]
}
Example:
json

Collapse

Unwrap

Copy
{
  "success": true,
  "message": "Found 3 available tables.",
  "data": [
    {
      "id": "table_123",
      "branch": { "name": "Downtown Cafe" },
      "capacity": 4,
      "section": { " name": "indoor" }
    }
  ]
}
400 Bad Request
Description: Invalid input provided.
Body:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "error": "Invalid input provided."
}
403 Forbidden
Description: User lacks required permissions.
Body:
json

Collapse

Unwrap

Copy
{
  "success": false,
  "error": "Customer lacks required permissions."
}
Validation
coordinates: Must include lat and lng as numbers.
radius: Must be a positive number.
date: Must be a valid date in YYYY-MM-DD format.
time: Must be in HH:MM format (24-hour).
partySize: Must be an integer between 1 and 20.
seatingPreference: Must be one of indoor, outdoor, bar, private, or no_preference (optional).
Side Effects
Audit Logging: Logs the search action with user details and request parameters.
Gamification: Awards 5 points for the table_searched action.
Notification: Sends a notification with the number of tables found.
Socket Event: Emits a table_search_result event to the /customer/mtables namespace.
Implementation Details
Service Logic
File: src/services/customer/mtables/tableSearchService.js
Function: searchAvailableTables
Description: Queries the database for available tables, filtering by:
Location (using ST_DWithin for geospatial search).
Time slots matching the requested date and time.
Party size within table capacity.
Seating preferences (if specified).
Excludes tables affected by blackout dates or existing bookings.
Dependencies:
Sequelize models: Table, MerchantBranch, Address, BookingTimeSlot, BookingBlackoutDate, Booking, TableLayoutSection.
Utilities: dateTimeUtils.
Constants: mtablesConstants, customerConstants.
Controller
File: src/controllers/customer/mtables/tableSearchController.js
Function: searchTables
Description: Handles HTTP requests, calls the service, logs actions, awards points, sends notifications, and emits socket events.
Dependencies:
notificationService, socketService, pointService, auditService, localization, logger, catchAsync.
Constants: customerGamificationConstants, customerConstants, socketConstants, localizationConstants.
Validation
File: src/validators/customer/mtables/tableSearchValidator.js
Description: Uses Joi to validate request body fields.
Dependencies: customerConstants, dateTimeUtils.
Routing
File: src/routes/customer/mtables/tableSearchRoutes.js
Description: Defines the POST `/searchリー System: * Today's date and time is 05:02 PM BST on Thursday, July 03, 2025.