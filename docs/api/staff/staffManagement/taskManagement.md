Documentation File
Path: C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\staff\staffManagement\taskManagement.md

markdown

Collapse

Unwrap

Copy
# Task Management Service Documentation

This document outlines the Task Management Service for staff management, responsible for assigning tasks, tracking progress, and notifying delays. It integrates with various staff roles and automatically awards gamification points for task-related actions.

## Overview

The Task Management Service handles task assignments for staff across supported merchant types, ensuring role-specific task validation and gamification integration. It uses models (`Task`, `Staff`) and constants from `staffConstants.js` and role-specific constants.

### Key Features
- **Task Assignment**: Assigns role-specific tasks to staff with validation.
- **Task Progress Tracking**: Monitors task status and completion.
- **Task Delay Notification**: Notifies staff of delayed tasks.
- **Gamification**: Automatically awards points for task assignment and completion.
- **Role-Based Access**: Restricts task operations to managers with `manage_schedule` permission.

### File Structure
- **Service**: `src/services/staff/staffManagement/taskManagementService.js`
- **Controller**: `src/controllers/staff/staffManagement/taskManagementController.js`
- **Validator**: `src/validators/staff/staffManagement/taskManagementValidator.js`
- **Middleware**: `src/middleware/staff/staffManagement/taskManagementMiddleware.js`
- **Routes**: `src/routes/staff/staffManagement/taskManagementRoutes.js`
- **Events**: `socket/events/staff/staffManagement/taskManagement.events.js`
- **Handler**: `socket/handlers/staff/staffManagement/taskManagementHandler.js`
- **Localization**: `locales/staff/staffManagement/en.json`

## Endpoints

### 1. Assign Task
- **Method**: `POST`
- **Path**: `/staff/task/task`
- **Description**: Assigns a new task to a staff member.
- **Permission**: Requires `manage_schedule` permission (manager role).
- **Request Body**:
  ```json
  {
    "staffId": 1,
    "task": {
      "taskType": "process_checkout",
      "description": "Process customer checkouts for evening shift",
      "dueDate": "2025-06-11T23:59:59Z"
    }
  }
Responses:
201: Task assigned successfully, returns task data.
400: Invalid input (e.g., invalid task type, past due date).
403: Permission denied.
404: Staff not found.
500: Server error.
Side Effects:
Logs audit action (STAFF_PROFILE_UPDATE).
Sends notification (task_assignment).
Emits socket event (task:assigned).
Awards gamification points for task_completion.
2. Track Task Progress
Method: GET
Path: /staff/task/progress/:taskId
Description: Retrieves task progress.
Permission: Requires manage_schedule permission (manager role).
Parameters:
taskId (path): Integer, ID of the task.
Responses:
200: Task progress retrieved, returns progress data.
404: Task not found.
500: Server error.
Side Effects:
Emits socket event (task:progress_updated).
Awards gamification points for task_completion if status is completed.
3. Notify Task Delay
Method: POST
Path: /staff/task/notify-delay/:taskId
Description: Notifies staff of a task delay.
Permission: Requires manage_schedule permission (manager role).
Parameters:
taskId (path): Integer, ID of the task.
Responses:
200: Notification sent successfully.
400: Task not eligible for delay notification.
403: Permission denied.
404: Task not found.
500: Server error.
Side Effects:
Updates task status to delayed.
Logs audit action (STAFF_PROFILE_UPDATE).
Sends notification (task_assignment).
Emits socket event (task:delayed).
Service Details
Models
Task: Stores task details (staff_id, branch_id, task_type, description, status, due_date, completed_at).
Staff: Stores staff details (id, branch_id, position).
Constants
Uses staffConstants.js for:
STAFF_TASK_TYPES: Role-specific task types (e.g., process_checkout for cashiers).
STAFF_TASK_STATUSES: Task statuses (assigned, in_progress, completed, delayed, failed).
STAFF_ERROR_CODES: Error codes like STAFF_NOT_FOUND, TASK_ASSIGNMENT_FAILED.
STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES: Notification types like task_assignment.
STAFF_AUDIT_ACTIONS: Audit actions like STAFF_PROFILE_UPDATE.
STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS: Gamification actions for point awarding.
Gamification
Points awarded for task_completion (10 points, 0.30 wallet credit) in assignTask and trackTaskProgress (on completed status).
Points emitted via socket (points:awarded).
Localization
Uses @utils/localization for messages in en.json:
taskManagement.task_assigned: "Task {taskId} has been successfully assigned."
taskManagement.task_delayed: "Task {taskId} is delayed."
Integration
Socket Events: Emits events in the /munch/task namespace.
Notifications: Sends task_assignment notifications via notificationService.
Audit: Logs actions using auditService.
Permissions: Enforces manage_schedule permission for managers.
Error Handling
Uses AppError with standardized error codes from staffConstants.STAFF_ERROR_CODES.
Logs errors via logger.
Security
Authentication handled by external middleware.
Permission checks ensure manager-only access.
Dependencies
Models: @models (Task, Staff)
Constants: @constants/staff/staffConstants
Utilities: @utils/localization, @utils/errors, @utils/logger
Services: @services/common/socketService, @services/common/notificationService, @services/common/auditService, @services/common/pointService