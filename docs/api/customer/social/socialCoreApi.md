Social Core API

API endpoints for managing core social functionalities like friend lists, permissions, and group chats.

## 1. Manage Friend List

**Description**: Manages friend list actions (add, remove, accept, reject).

**Endpoint**: `POST /customer/social/core/friends`

**Request Body**:
- `friendId` (integer, required): ID of the friend.
- `action` (string, required): Action to perform (add/remove/accept/reject).

**Example Request**:
```bash
curl -X POST http://localhost:3000/customer/social/core/friends \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{
  "friendId": 2,
  "action": "add"
}'
Responses:

200: { "message": "Friend request sent successfully", "data": { ... } }
400: Invalid input.
404: Friend not found.
500: Server error.
2. Set Friend Permissions
Description: Sets permissions for a friend (view posts, view stories, send messages).

Endpoint: POST /customer/social/core/permissions

Request Body:

friendId (integer, required): ID of the friend.
permissions (object, required): Permissions object with viewPosts, viewStories, sendMessages (boolean).
Example Request:

bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/social/core/permissions \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{
  "friendId": 2,
  "permissions": {"viewPosts": true, "viewStories": false, "sendMessages": true}
}'
Responses:

200: { "message": "Friend permissions updated successfully", "data": { ... } }
400: Invalid input.
404: Friend not found.
500: Server error.
3. Facilitate Group Chat
Description: Sends a message or media to a group chat or joins a chat.

Endpoint: POST /customer/social/core/chat

Request Body:

chatId (integer, required): ID of the group chat.
message (string, optional): Message content (max 1000 characters).
media (object, optional): Media object with type (image/video) and url.
Example Request:

bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/social/core/chat \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{
  "chatId": 1,
  "message": "Hey, let's plan the event!"
}'
Responses:

200: { "message": "Message sent to group chat", "data": { "messageId": 1, ... } }
400: Invalid input.
403: User not a member of the chat.
500: Server error.