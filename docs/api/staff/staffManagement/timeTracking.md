Documentation File
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\staff\staffManagement\timeTracking.md

markdown

Collapse

Unwrap

Copy
# Time Tracking Service Documentation

This document outlines the Time Tracking Service for staff management, responsible for logging clock-in/out times, calculating shift durations, and generating time reports. It integrates with staff roles and automatically awards gamification points.

## Overview

The Time Tracking Service manages staff time tracking for restaurant branches, ensuring accurate logging and reporting. It uses models (`TimeTracking`, `Staff`, `Report`) and constants from `staffConstants.js`.

### Key Features
- **Clock-In/Out**: Logs staff clock-in and clock-out times with validation.
- **Shift Duration Calculation**: Computes total shift hours for a staff member.
- **Time Report Generation**: Creates encrypted time tracking reports.
- **Gamification**: Awards points for clock-in and report generation.
- **Role-Based Access**: Restricts operations to managers with `manage_schedule` permission.

### File Structure
- **Service**: `src/services/staff/staffManagement/timeTrackingService.js`
- **Controller**: `src/controllers/staff/staffManagement/timeTrackingController.js`
- **Validator**: `src/validators/staff/staffManagement/timeTrackingValidator.js`
- **Middleware**: `src/middleware/staff/staffManagement/timeTrackingMiddleware.js`
- **Routes**: `src/routes/staff/staffManagement/timeTrackingRoutes.js`
- **Events**: `socket/events/staff/staffManagement/timeTracking.events.js`
- **Handler**: `socket/handlers/staff/staffManagement/timeTrackingHandler.js`
- **Localization**: `locales/staff/staffManagement/en.json`

## Endpoints

### 1. Record Clock-In/Out
- **Method**: `POST`
- **Path**: `/staff/timetracking/clock`
- **Description**: Records a staff member's clock-in or clock-out.
- **Permission**: Requires `manage_schedule` permission (manager role).
- **Request Body**:
  ```json
  {
    "staffId": 1,
    "action": "clock_in"
  }
Responses:
201: Clock-in/out recorded, returns record data.
400: Invalid input or already clocked in/out.
403: Permission denied.
404: Staff not found.
500: Server error.
Side Effects:
Logs audit action (STAFF_PROFILE_UPDATE).
Sends notification (profile_updated).
Emits socket event (timetracking:clock_in or timetracking:clock_out).
Awards gamification points for clock_in (task_completion).
2. Calculate Shift Duration
Method: GET
Path: /staff/timetracking/duration/:staffId
Description: Calculates total shift hours for a staff member.
Permission: Requires manage_schedule permission (manager role).
Parameters:
staffId (path): Integer, ID of the staff.
Responses:
200: Shift duration calculated, returns total hours.
404: Staff not found.
500: Server error.
Side Effects:
Emits socket event (timetracking:duration_calculated).
3. Generate Time Report
Method: POST
Path: /staff/timetracking/report/:staffId
Description: Generates an encrypted time tracking report.
Permission: Requires manage_schedule permission (manager role).
Parameters:
staffId (path): Integer, ID of the staff.
Responses:
200: Report generated, returns report data.
403: Permission denied.
404: Staff not found.
500: Server error.
Side Effects:
Logs audit action (STAFF_PROFILE_RETRIEVE).
Sends notification (profile_updated).
Emits socket event (timetracking:report_generated).
Awards gamification points for task_completion.
Service Details
Models
TimeTracking: Stores clock-in/out records (staff_id, action, timestamp, clock_out_time).
Staff: Stores staff details (id, branch_id, position).
Report: Stores report details (report_type, data, generated_by).
Constants
Uses staffConstants.js for:
STAFF_ERROR_CODES: Error codes like STAFF_NOT_FOUND, ERROR.
STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES: Notification types like profile_updated.
STAFF_AUDIT_ACTIONS: Audit actions like STAFF_PROFILE_UPDATE, STAFF_PROFILE_RETRIEVE.
STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS: Gamification actions for point awarding.
Gamification
Points awarded for task_completion (10 points, 0.30 wallet credit) in recordClockInOut (for clock_in) and generateTimeReport.
Points emitted via socket (points:awarded).
Localization
Uses @utils/localization for messages in en.json:
timeTracking.clock_in: "Staff {staffId} clocked in successfully."
timeTracking.clock_out: "Staff {staffId} clocked out successfully."
timeTracking.report_generated: "Time tracking report {reportId} generated successfully."
Integration
Socket Events: Emits events in the /munch/timetracking namespace.
Notifications: Sends profile_updated notifications via notificationService.
Audit: Logs actions using auditService.
Security: Encrypts report data using securityService.
Permissions: Enforces manage_schedule permission for managers.
Error Handling
Uses AppError with standardized error codes from staffConstants.STAFF_ERROR_CODES.
Logs errors via logger.
Security
Authentication handled by external middleware.
Permission checks ensure manager-only access.
Report data encrypted using securityService.
Dependencies
Models: @models (TimeTracking, Staff, Report)
Constants: @constants/staff/staffConstants
Utilities: @utils/localization, @utils/errors, @utils/logger
Services: @services/common/socketService, @services/common/notificationService, @services/common/auditService, @services/common/pointService, @services/common/securityService