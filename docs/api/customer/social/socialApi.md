Social API

API endpoints for managing social interactions, including friend management, group chats, live streams, and recommendations.

## 1. Manage Friend List

**Description**: Manages friend list actions (add, remove, accept, reject).

**Endpoint**: `POST /customer/social/friends`

**Request Body**:
- `friendId` (integer, required): ID of the friend.
- `action` (string, required): Action to perform (add/remove/accept/reject).

**Example Request**:
```bash
curl -X POST http://localhost:3000/customer/social/friends \
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

Endpoint: POST /customer/social/permissions

Request Body:

friendId (integer, required): ID of the friend.
permissions (object, required): Permissions object with viewPosts, viewStories, sendMessages (boolean).
Example Request:

bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/social/permissions \
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

Endpoint: POST /customer/social/chat

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
curl -X POST http://localhost:3000/customer/social/chat \
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
4. Create Live Event Stream
Description: Creates a live stream for an event.

Endpoint: POST /customer/social/stream

Request Body:

eventId (integer, required): ID of the event.
title (string, required): Stream title (max 100 characters).
description (string, optional): Stream description (max 500 characters).
streamUrl (string, required): URL of the live stream.
Example Request:

bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/social/stream \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{
  "eventId": 1,
  "title": "Live Concert Stream",
  "description": "Streaming the concert live!",
  "streamUrl": "https://example.com/stream"
}'
Responses:

201: { "message": "Live stream created successfully", "data": { "streamId": 1, ... } }
400: Invalid input.
403: Event not accessible.
500: Server error.
5. Manage Social Recommendations
Description: Retrieves social recommendations based on user preferences.

Endpoint: POST /customer/social/recommendations

Request Body:

preferences (object, required): Preferences object with interests (array of strings), location (string), maxDistance (integer, 1-100).
Example Request:

bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/social/recommendations \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{
  "preferences": {
    "interests": ["music", "food"],
    "location": "New York",
    "maxDistance": 50
  }
}'
Responses:

200: { "message": "Social recommendations received successfully", "data": { ... } }
400: Invalid input.
500: Server error.