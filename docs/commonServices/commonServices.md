# MMFinale Backend Services Documentation

This document provides an overview of the core backend services in the `MMFinale` project, located under `C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\services\common`. These services manage wallet operations, socket events, security, gamification, notifications, location handling, and audit logging for various roles (admin, customer, driver, merchant, staff) across services (mtables, munch, mtxi, mevents). Each service is designed to be modular, secure, and scalable, with last updates on **May 28, 2025**.

---

## Table of Contents

1. [Wallet Service](#wallet-service)
2. [Socket Service](#socket-service)
3. [Security Service](#security-service)
4. [Point Service (Gamification)](#point-service-gamification)
5. [Notification Service](#notification-service)
6. [Location Service](#location-service)
7. [Audit Service](#audit-service)

---

## Wallet Service

**File**: `walletService.js`

**Description**: Manages wallet operations for all roles across services. Supports wallet creation, funding, withdrawals, payments, balance checks, and transaction history with robust security and auditing.

**Dependencies**:
- Models: `Wallet`, `WalletTransaction`, `User`
- Services: `notificationService`, `auditService`, `securityService`, `socketService`
- Utilities: `AppError`, `logger`, `localization`, `validation`, `catchAsync`
- Constants: `paymentConstants`, `socketConstants`
- External: `node-cache`

**Key Functionalities**:
- **Wallet Creation**: Creates wallets for users based on their role.
- **Fund Addition**: Processes deposits with payment method validation.
- **Fund Withdrawal**: Handles secure withdrawals with KYC, MFA, and AML checks.
- **Payments**: Processes payments for services (mtables, munch, mtxi).
- **Balance and Transaction History**: Retrieves wallet balance and transaction history with caching.

**Methods**:
- `createWallet(userId, role)`: Creates a wallet for a user.
  - Validates user existence and role.
  - Checks for existing wallets.
  - Emits socket events and notifications.
- `addFunds(walletId, amount, paymentMethod)`: Adds funds to a wallet.
  - Validates payment method, amount, and daily transaction limits.
  - Processes payment via `securityService`.
  - Updates balance and logs audit events.
- `withdrawFunds(walletId, amount, { paymentMethodId, sessionToken, ipAddress })`: Withdraws funds with enhanced security.
  - Validates payment method, KYC, MFA, session token, and IP address.
  - Performs AML checks and risk scoring.
  - Processes withdrawal and updates balance.
- `payWithWallet(walletId, serviceId, amount)`: Processes payments for services.
  - Validates service ID, amount, and balance.
  - Creates transaction and updates balance.
- `getWalletBalance(walletId)`: Retrieves wallet balance with caching.
- `getWalletTransactions(walletId)`: Retrieves transaction history with caching.

**Notes**:
- Uses `NodeCache` for performance optimization (300s TTL).
- Integrates with `securityService` for payment tokenization and processing.
- Emits real-time updates via `socketService`.

---

## Socket Service

**File**: `socketService.js`

**Description**: Centralized service for managing Socket.IO events across all roles and services. Ensures secure and validated event emission with audit logging.

**Dependencies**:
- Constants: `socketConstants`
- Utilities: `logger`, `catchAsyncSocket`

**Key Functionalities**:
- Handles event emission to specific rooms or all clients.
- Validates events and payload sizes.
- Logs audit actions for socket events.

**Methods**:
- `emit(io, event, data, room = null)`: Emits a socket event.
  - Validates Socket.IO instance, event type, and payload size.
  - Emits to specified room or broadcasts to all clients.
  - Logs audit actions if specified in `data.auditAction`.

**Notes**:
- Ensures payload size does not exceed `MAX_EVENT_PAYLOAD_SIZE_MB`.
- Uses `catchAsyncSocket` for async error handling.

---

## Security Service

**File**: `securityService.js`

**Description**: Manages password encryption, MFA token generation/validation, and data encryption/decryption for all roles.

**Dependencies**:
- Libraries: `bcryptjs`, `crypto`
- Models: `mfaTokens`, `User`
- Constants: `securityConstants`
- Utilities: `logger`

**Key Functionalities**:
- Encrypts passwords with role-specific salt rounds.
- Generates and validates MFA tokens with role-based configurations.
- Encrypts/decrypts sensitive data using AES-256.

**Methods**:
- `deriveEncryptionKey()`: Derives a 32-byte encryption key from environment variable.
- `encryptPassword(password, role)`: Encrypts a password using bcrypt.
- `generateMFAToken(userId, method, role)`: Generates an MFA token.
  - Validates user, method, and token limits.
  - Deletes expired tokens.
- `validateMFAToken(userId, token, role)`: Validates an MFA token and deletes it upon use.
- `encryptData(data, role)`: Encrypts data using AES-256 with role-specific algorithm.
- `decryptData(encryptedData, role)`: Decrypts data using AES-256.

**Notes**:
- Relies on `ENCRYPTION_KEY` environment variable for encryption.
- Role-specific configurations are defined in `securityConstants`.

---

## Point Service (Gamification)

**File**: `pointService.js`

**Description**: Manages gamification features, including points, badges, rewards, leaderboards, and point history for all roles.

**Dependencies**:
- Models: `GamificationPoints`, `Badge`, `UserBadge`, `Reward`, `UserReward`
- Constants: `merchantConstants`, `driverConstants`, `customerConstants`, `adminCoreConstants`, `staffConstants`, `socketConstants`
- Services: `notificationService`, `socketService`, `walletService`

**Key Functionalities**:
- Awards points for role-specific actions.
- Assigns badges based on action criteria.
- Redeems points for rewards with wallet integration.
- Provides leaderboards and point history.

**Methods**:
- `awardPoints(userId, action, points, metadata)`: Awards points for an action.
  - Validates action, role, and daily point limits.
  - Credits wallet if applicable and checks badge eligibility.
- `assignBadge(userId, badgeId, metadata)`: Assigns a badge to a user.
- `redeemPoints(userId, rewardId, walletId, metadata)`: Redeems points for a reward and credits wallet.
  - Validates points and reward availability.
  - Deducts points and updates wallet.
- `getLeaderboard(userId, metadata)`: Retrieves top 10 leaderboard for a role.
- `trackPointHistory(userId, metadata)`: Retrieves point history for a user.

**Notes**:
- Role-specific configurations for actions, points, and rewards.
- Integrates with `walletService` for reward credits.

---

## Notification Service

**File**: `notificationService.js`

**Description**: Centralized service for managing notifications across all roles and services. Supports multiple delivery methods (push, email, SMS, WhatsApp, in-app) with rate limiting, retries, and analytics.

**Dependencies**:
- Libraries: `ioredis`, `sequelize`
- Models: `Notification`, `NotificationLog`, `User`
- Constants: `notificationConstants`
- Utilities: `logger`, `config`, `localizationService`, `zohoMailClient`, `zohoPushClient`, `twilioClient`

**Key Functionalities**:
- Sends localized notifications with role-specific preferences.
- Manages rate limiting via Redis.
- Tracks delivery status and retries failed notifications.
- Provides notification history and analytics.

**Methods**:
- `sendNotification(params)`: Sends a notification to a user.
  - Validates user, notification type, and delivery method.
  - Uses Redis for rate limiting.
  - Supports push, email, SMS, WhatsApp, and in-app delivery.
- `setNotificationPreferences(userId, preferences)`: Updates user notification preferences.
- `trackNotificationDelivery(userId)`: Tracks delivery status for a user.
- `getNotificationHistory(userId)`: Retrieves notification history.
- `deliverNotification(payload)`: Handles delivery with retries.
- `storeInAppNotification(userId, message, data)`: Stores in-app notifications.
- `scheduleRetry(payload)`: Schedules retries for failed deliveries.
- `updateAnalytics(notificationId, action)`: Updates notification analytics.
- `cleanupOldNotifications()`: Cleans up old notification logs.

**Notes**:
- Uses Redis for rate limiting (`MAX_NOTIFICATIONS_PER_HOUR`).
- Integrates with Zoho (email, push) and Twilio (SMS, WhatsApp).
- Retains logs for `DATA_RETENTION_DAYS`.

---

## Location Service

**File**: `locationService.js`

**Description**: Manages location resolution, validation, and geofence checks for all roles. Integrates with Google Maps and OpenStreetMap.

**Dependencies**:
- Libraries: `axios`, `axios-retry`, `node-cache`
- Models: `Address`, `Geofence`, `User`, `Session`, `Customer`, `Driver`, `Merchant`, `Staff`
- Constants: `locationConstants`, `localizationServiceConstants`
- Utilities: `logger`, `AppError`, `config`

**Key Functionalities**:
- Resolves addresses or coordinates using Google Maps/OpenStreetMap.
- Validates locations against role-specific constraints and geofences.
- Updates user sessions and stores addresses.
- Caches results for performance.

**Methods**:
- `resolveLocation(location, userId, sessionToken, role, languageCode)`: Resolves and validates a location.
  - Supports address strings, coordinates, or JSON.
  - Validates city, confidence level, and geofences.
- `deriveCountryCode(location)`: Derives country code from location input.
- `updateSessionLocation(userId, sessionToken, location, role)`: Updates session with location data.
- `geocodeAddress(address, provider)`: Geocodes an address string.
- `reverseGeocode(lat, lng, provider)`: Reverse geocodes coordinates.
- `parseOSMAddressComponents(address)`: Parses OpenStreetMap address components.
- `storeAddress(location, userId, role)`: Stores location in `Address` model.
- `validateGeofence(location, role, userId)`: Validates location against geofences.
- `validateRoleSpecificConstraints(userId, role, location)`: Applies role-specific validations.
- `determineConfidenceLevel(locationType)`: Determines location accuracy level.
- `isConfidenceLevelSufficient(level, minLevel)`: Checks if confidence level meets requirements.
- `isPointInPolygon(point, polygon)`: Checks if a point is inside a polygon.
- `calculateDistance(coord1, coord2)`: Calculates distance using Haversine formula.

**Notes**:
- Uses `NodeCache` for caching (TTL defined in `locationConstants`).
- Supports role-specific geofence and service radius checks.

---

## Audit Service

**File**: `auditService.js`

**Description**: Logs actions for compliance and audit trails across all roles. Supports role-based access control for log retrieval.

**Dependencies**:
- Models: `AuditLog`, `User`
- Constants: `adminSystemConstants`, `merchantConstants`, `customerConstants`, `staffConstants`, `driverConstants`, `meventsConstants`, `meventsTrackingConstants`
- Utilities: `sanitize-html`, `AppError`, `logger`, `node-cache`

**Key Functionalities**:
- Logs actions with user ID, role, action type, details, and IP address.
- Retrieves audit logs with role-based access control (admin, merchant).
- Caches query results for performance.

**Methods**:
- `logAction(auditData, transaction)`: Logs an action to the audit log.
  - Validates user, role, action, and IP address.
  - Sanitizes details and metadata.
- `getAuditLogs(query)`: Retrieves audit logs based on role and permissions.
  - Supports filtering by user, role, action, and date range.
  - Applies role-based access control (admin: all roles; merchant: staff, customer).
- `getValidActions(role)`: Returns valid actions for a role.
- `getErrorCode(role)`: Returns role-specific error code.
- `isValidIpAddress(ipAddress)`: Validates IPv4/IPv6 addresses.

**Notes**:
- Uses `NodeCache` for query caching (300s TTL).
- Sanitizes inputs to prevent injection attacks.
- Admins can access all logs; merchants are restricted to staff and customer logs.

---

## General Notes
- All services integrate with `logger` for consistent logging.
- Error handling uses `AppError` for standardized responses.
- Services use role-specific constants for configuration.
- Caching (`NodeCache`) is used in `walletService`, `locationService`, and `auditService` to optimize performance.
- Real-time updates are handled via `socketService` in `walletService`, `pointService`, and `notificationService`.
- Security features (KYC, MFA, AML) are enforced in `walletService` and `securityService`.

