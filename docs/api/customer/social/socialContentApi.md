API Documentation (src/docs/api/customer/social)
socialContentApi.md
markdown

Collapse

Unwrap

Copy
# Social Content API

API endpoints for managing social content such as posts, reactions, stories, and service invites.

## 1. Create Post

**Description**: Creates a new social post for the authenticated customer.

**Endpoint**: `POST /customer/social/content/post`

**Request Body**:
- `content` (string, required): Post content (max 500 characters).
- `media` (array, optional): List of media objects with `type` (image/video) and `url`.
- `visibility` (string, optional): Post visibility (public/friends/private, default: public).

**Example Request**:
```bash
curl -X POST http://localhost:3000/customer/social/content/post \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{
  "content": "Enjoying a great day!",
  "media": [{"type": "image", "url": "https://example.com/image.jpg"}],
  "visibility": "public"
}'
Responses:

201: { "message": "Post created successfully", "data": { "postId": 1, ... } }
400: Invalid input.
500: Server error.
2. Manage Post Reactions
Description: Adds or updates a reaction to a post.

Endpoint: POST /customer/social/content/reaction

Request Body:

postId (integer, required): ID of the post.
reaction (string, required): Reaction type (like/love/laugh/sad/angry).
Example Request:

bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/social/content/reaction \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{
  "postId": 1,
  "reaction": "like"
}'
Responses:

200: { "message": "Reaction added to post", "data": { ... } }
400: Invalid input.
403: Post not owned by user.
500: Server error.
3. Share Story
Description: Shares a new story with media content.

Endpoint: POST /customer/social/content/story

Request Body:

media (object, required): Media object with type (image/video) and url.
caption (string, optional): Story caption (max 200 characters).
duration (integer, optional): Story duration in hours (1-24, default: 24).
Example Request:

bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/social/content/story \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{
  "media": {"type": "video", "url": "https://example.com/video.mp4"},
  "caption": "Fun moment!",
  "duration": 12
}'
Responses:

201: { "message": "Story shared successfully", "data": { "storyId": 1, ... } }
400: Invalid input.
500: Server error.
4. Invite Friend to Service
Description: Sends an invitation to a friend for a specific service (event, table, deal).

Endpoint: POST /customer/social/content/invite

Request Body:

friendId (integer, required): ID of the friend to invite.
serviceType (string, required): Service type (event/table/deal).
serviceId (integer, required): ID of the service.
Example Request:

bash

Collapse

Unwrap

Run

Copy
curl -X POST http://localhost:3000/customer/social/content/invite \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{
  "friendId": 2,
  "serviceType": "event",
  "serviceId": 1
}'
Responses:

201: { "message": "Invite sent successfully", "data": { "inviteId": 1, ... } }
400: Invalid input.
404: Friend not found.
500: Server error.