Documentation File
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\staff\staffManagement\scheduling.md

markdown

Collapse

Unwrap

Copy
# Scheduling Service Documentation

This document outlines the Scheduling Service for staff management, responsible for creating, updating, and notifying staff about shift schedules. It integrates with various staff roles defined in the system and automatically awards gamification points for scheduling tasks.

## Overview

The Scheduling Service manages staff shift schedules for restaurant branches, ensuring compliance with role permissions, shift constraints, and gamification integration. It uses models (`Shift`, `Staff`, `TimeWindow`) and constants from `staffConstants.js` and role-specific constants.

### Key Features
- **Shift Creation**: Creates schedules for staff with validation for branch, staff, and shift type.
- **Shift Updates**: Updates existing shifts with validated changes.
- **Shift Notifications**: Sends notifications to staff about schedule changes.
- **Gamification**: Automatically awards points for shift creation and updates based on `task_completion` action.
- **Role-Based Access**: Restricts scheduling operations to managers with `manage_schedule` permission.

### File Structure
- **Service**: `src/services/staff/staffManagement/schedulingService.js`
- **Controller**: `src/controllers/staff/staffManagement/schedulingController.js`
- **Validator**: `src/validators/staff/staffManagement/schedulingValidator.js`
- **Middleware**: `src/middleware/staff/staffManagement/schedulingMiddleware.js`
- **Routes**: `src/routes/staff/staffManagement/schedulingRoutes.js`
- **Events**: `socket/events/staff/staffManagement/scheduling.events.js`
- **Handler**: `socket/handlers/staff/staffManagement/schedulingHandler.js`
- **Localization**: `locales/staff/staffManagement/en.json`

## Endpoints

### 1. Create Shift
- **Method**: `POST`
- **Path**: `/staff/scheduling/shift`
- **Description**: Creates a new shift schedule for a staff member.
- **Permission**: Requires `manage_schedule` permission (manager role).
- **Request Body**:
  ```json
  {
    "restaurantId": 1,
    "schedule": {
      "staffId": 1,
      "startTime": "2025-06-11T09:00:00Z",
      "endTime": "2025-06-11T17:00:00Z",
      "shiftType": "morning"
    }
  }
Responses:
201: Shift created successfully, returns shift data.
400: Invalid input (e.g., invalid shift type, end time before start time).
403: Permission denied.
404: Staff or branch not found.
500: Server error.
Side Effects:
Logs audit action (STAFF_PROFILE_UPDATE).
Sends notification (shift_update).
Emits socket event (scheduling:shift_created).
Awards gamification points for task_completion.
2. Update Shift
Method: PUT
Path: /staff/scheduling/shift/:scheduleId
Description: Updates an existing shift schedule.
Permission: Requires manage_schedule permission (manager role).
Parameters:
scheduleId (path): Integer, ID of the shift.
Request Body:
json

Collapse

Unwrap

Copy
{
  "startTime": "2025-06-11T10:00:00Z",
  "endTime": "2025-06-11T18:00:00Z",
  "shiftType": "afternoon"
}
Responses:
200: Shift updated successfully, returns updated shift data.
400: Invalid input (e.g., invalid shift type, end time before start time).
403: Permission denied.
404: Shift not found.
500: Server error.
Side Effects:
Logs audit action (STAFF_PROFILE_UPDATE).
Sends notification (shift_update).
Emits socket event (scheduling:shift_updated).
Awards gamification points for task_completion.
3. Notify Shift Change
Method: POST
Path: /staff/scheduling/notify/:staffId
Description: Notifies a staff member of a shift change.
Permission: Requires manage_schedule permission (manager role).
Parameters:
staffId (path): Integer, ID of the staff.
Responses:
200: Notification sent successfully.
403: Permission denied.
404: Staff not found.
500: Server error.
Side Effects:
Logs audit action (STAFF_PROFILE_UPDATE).
Sends notification (shift_update).
Emits socket event (scheduling:shift_notified).
Service Details
Models
Shift: Stores shift details (staff_id, branch_id, start_time, end_time, shift_type, status).
Staff: Stores staff details (id, branch_id, position).
TimeWindow: Validates shift types against predefined intervals.
Constants
Uses staffConstants.js for:
STAFF_SHIFT_SETTINGS.SHIFT_TYPES: Defines valid shift types (morning, afternoon, evening, night).
STAFF_ERROR_CODES: Error codes like INVALID_BRANCH, STAFF_NOT_FOUND.
STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES: Notification types like shift_update.
STAFF_AUDIT_ACTIONS: Audit actions like STAFF_PROFILE_UPDATE.
STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS: Gamification actions for point awarding.
Role-specific constants (e.g., managerConstants.js) define permissions and tasks.
Gamification
Points are awarded automatically for task_completion (10 points, 0.30 wallet credit) in createShiftSchedule and updateShift.
Points are emitted via socket (points:awarded).
Localization
Uses @utils/localization for messages in en.json:
scheduling.shift_created: "Shift {shiftId} has been successfully created."
scheduling.shift_updated: "Shift for staff {staffId} has been updated."
Integration
Socket Events: Emits events in the /munch/scheduling namespace for real-time updates.
Notifications: Sends shift_update notifications via notificationService.
Audit: Logs actions using auditService for traceability.
Permissions: Enforces manage_schedule permission for managers.
Error Handling
Uses AppError with standardized error codes from staffConstants.STAFF_ERROR_CODES.
Logs errors via logger for debugging.
Security
Authentication is handled by external middleware (as specified).
Permission checks ensure only managers can access endpoints.
Dependencies
Models: @models (Shift, Staff, TimeWindow)
Constants: @constants/staff/staffConstants
Utilities: @utils/localization, @utils/errors, @utils/logger
Services: @services/common/socketService, @services/common/notificationService, @services/common/auditService, @services/common/pointService