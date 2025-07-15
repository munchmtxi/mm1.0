C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\docs\api\common\auth\backupApi.md
markdown

Collapse

Unwrap

Copy
# Backup API

## POST /api/common/backup
Creates a backup of admin data.

**Request:**
- **Body:**
  - `adminId` (number): Admin ID.
  - `data` (object): Data to archive.

**Response:**
- **200**: `{ "status": "success", "backupId": number }`
- **400**: `{ "error": "Invalid input" }`
- **500**: `{ "error": "Backup failed" }`

**Authentication:** Requires `security_admin` role, `manageBackups:write` permission.