The revised Markdown file includes the updated localization.js and all previously provided utility files, with a concise and organized structure. It reflects the change to use localizationConstants and includes the new constants file in the documentation.

markdown

Collapse

Unwrap

Copy
# MM1.0 Backend Utilities Documentation

This document details the utility modules in the `MM1.0/src/utils` directory and relevant constants in `MM1.0/src/constants` of the MMFinale project. Each module provides specific functionality to support the backend system, including security, response handling, logging, mathematical operations, date/time utilities, error handling, async error catching, and localization.

## Table of Contents
1. [security.js](#securityjs)
2. [responseHandler.js](#responsehandlerjs)
3. [logger.js](#loggerjs)
4. [mathUtils.js](#mathutilsjs)
5. [errorHandling.js](#errorhandlingjs)
6. [dateTimeUtils.js](#datetimeutilsjs)
7. [catchAsyncSocket.js](#catchasyncsocketjs)
8. [catchAsync.js](#catchasyncjs)
9. [AppError.js](#apperrorjs)
10. [localization.js](#localizationjs)
11. [localizationConstants.js](#localizationconstantsjs)

---

## security.js
**Purpose**: Provides middleware and functions for securing the application, including headers, XSS sanitization, CSRF protection, password hashing, JWT handling, and input validation.

**Dependencies**:
- `helmet`: Sets security headers.
- `express-xss-sanitizer`: Sanitizes inputs against XSS.
- `csurf`: CSRF protection middleware.
- `bcryptjs`: Password hashing.
- `jsonwebtoken`: JWT generation and verification.
- `logger`: Custom logging utility.

**Exports**:
- **applySecurityHeaders**: Configures Helmet with Content Security Policy (CSP) and other headers.
  - CSP Directives: Restricts sources for scripts, styles, images, and connections.
  - Options: `crossOriginResourcePolicy: 'same-site'`, `crossOriginOpenerPolicy: 'same-origin'`.
- **sanitizeXSS**: Middleware to sanitize request body against XSS attacks.
- **csrfProtection**: CSRF middleware with secure cookie options.
- **generateCsrfToken**: Generates and sets a CSRF token in a cookie.
- **hashPassword**: Hashes a password using bcrypt with 12 salt rounds.
- **comparePassword**: Compares a password with its hashed version.
- **generateJwtToken**: Creates a JWT with a 1-day expiry (customizable options).
- **verifyJwtToken**: Verifies a JWT and returns the payload.
- **validateInput**: Validates input against patterns (email, phone, password, string).

**Example**:
```javascript
const { applySecurityHeaders, validateInput } = require('./security');
app.use(applySecurityHeaders);
const isValidEmail = validateInput('user@example.com', 'email'); // true
responseHandler.js
Purpose: Standardizes HTTP response formatting for consistent API responses.

Exports:

sendResponse(res, statusCode, { message, data, meta }):
Parameters:
res: Express response object.
statusCode: HTTP status code (e.g., 200, 404).
payload: Object with message (string), data (any), and optional meta (e.g., pagination info).
Returns: JSON response with status: 'success', message, data, and optional meta.
Example:

javascript

Collapse

Unwrap

Run

Copy
const { sendResponse } = require('./responseHandler');
sendResponse(res, 200, { message: 'User fetched', data: user, meta: { page: 1 } });
logger.js
Purpose: Configures Winston-based logging with daily rotation and custom log levels for error tracking and debugging.

Dependencies:

winston: Logging library.
winston-daily-rotate-file: Rotates log files daily.
fs, path: File system utilities for log directory creation.
config: Configuration module for environment settings.
Configuration:

Log directory: logs/ at project root.
Custom levels: error (0), warn (1), info (2), debug (3), verbose (4).
Transports:
Error logs: error-YYYY-MM-DD.log (14-day retention, 20MB max).
Combined logs: combined-YYYY-MM-DD.log (14-day retention, 20MB max).
Console output (non-production) with colored logs.
Exports:

logger: Winston logger instance.
logSecurityEvent(message, metadata): Logs security events at info level.
logErrorEvent(message, metadata): Logs errors at error level.
logApiEvent(message, metadata): Logs API events at info level.
logWarnEvent(message, metadata): Logs warnings at warn level.
Example:

javascript

Collapse

Unwrap

Run

Copy
const logger = require('./logger');
logger.logSecurityEvent('User login attempt', { userId: 123 });
mathUtils.js
Purpose: Provides mathematical and geospatial utility functions with input validation.

Exports:

roundToDecimal(num, decimals=2): Rounds a number to specified decimals.
sumArray(arr): Sums an array of numbers.
averageArray(arr): Calculates the average of an array.
calculateDistance(lat1, lon1, lat2, lon2): Computes distance (km) between two coordinates using the Haversine formula.
calculatePercentage(value, total): Calculates percentage of value relative to total.
clamp(num, min, max): Clamps a number between min and max.
randomInt(min, max): Generates a random integer (inclusive).
factorial(n): Calculates factorial of a non-negative integer.
toRadians(degrees): Converts degrees to radians.
standardDeviation(arr): Computes standard deviation of an array.
Example:

javascript

Collapse

Unwrap

Run

Copy
const { calculateDistance } = require('./mathUtils');
const distance = calculateDistance(40.7128, -74.0060, 51.5074, -0.1278); // ~5570 km
errorHandling.js
Purpose: Standardizes error handling for service operations with logging.

Dependencies:

winston: For error logging.
winston-daily-rotate-file: Rotates error logs.
Exports:

handleServiceError(functionName, error, errorCode):
Parameters:
functionName: Name of the function where the error occurred.
error: Original error object.
errorCode: Custom error code.
Returns: Formatted Error with code, originalError, and stack trace.
Logs error to logs/error-YYYY-MM-DD.log.
Example:

javascript

Collapse

Unwrap

Run

Copy
const { handleServiceError } = require('./errorHandling');
try {
  throw new Error('Database failure');
} catch (err) {
  throw handleServiceError('fetchUser', err, 'DB_ERROR');
}
dateTimeUtils.js
Purpose: Provides date and time manipulation functions using date-fns.

Dependencies:

date-fns: For date parsing, formatting, and calculations.
Exports:

formatDate(date, pattern): Formats a date to a string (default: yyyy-MM-dd HH:mm:ss).
isValidDate(date): Checks if a date is valid.
getTimeDifference(start, end): Returns seconds between two dates.
addDaysToDate(date, days): Adds days to a date.
subtractDaysFromDate(date, days): Subtracts days from a date.
getStartOfDay(date): Returns start of the day for a date.
getEndOfDay(date): Returns end of the day for a date.
isDateBefore(date1, date2): Checks if date1 is before date2.
isDateAfter(date1, date2): Checks if date1 is after date2.
formatDuration(seconds): Formats seconds into Xh Ym Zs string.
getCurrentTimestamp(): Returns current ISO timestamp.
isWithinRange(date, start, end): Checks if a date is within a range.
Example:

javascript

Collapse

Unwrap

Run

Copy
const { formatDate } = require('./dateTimeUtils');
const formatted = formatDate(new Date(), 'yyyy-MM-dd'); // e.g., 2025-06-08
catchAsyncSocket.js
Purpose: Wraps async socket functions to catch and handle errors, emitting them to the client.

Dependencies:

logger: For error logging.
AppError: Custom error class.
Exports:

catchAsyncSocket(fn):
Wraps an async socket function.
Catches errors, logs them, and emits an error event to the socket with status, message, and code.
Example:

javascript

Collapse

Unwrap

Run

Copy
const catchAsyncSocket = require('./catchAsyncSocket');
const handleSocketEvent = catchAsyncSocket(async (socket) => {
  throw new Error('Socket error');
});
catchAsync.js
Purpose: Wraps async Express middleware or route handlers to catch and pass errors to the next middleware.

Dependencies:

logger: For error logging.
Exports:

catchAsync(fn):
Wraps an async function.
Catches errors and passes them to Express's error-handling middleware.
Example:

javascript

Collapse

Unwrap

Run

Copy
const catchAsync = require('./catchAsync');
const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});
AppError.js
Purpose: Defines a custom error class for standardized error handling in the application.

Exports:

AppError(message, statusCode, errorCode, details, meta):
Constructor Parameters:
message: Error message.
statusCode: HTTP status code (e.g., 400, 500).
errorCode: Custom error code (optional).
details: Additional error details (optional).
meta: Contextual metadata (optional).
Properties:
status: fail (4xx) or error (others).
isOperational: Set to true for trusted errors.
timestamp: Creation time.
stack: Stack trace.
Methods:
toJSON(): Returns a JSON representation of the error.
Example:

javascript

Collapse

Unwrap

Run

Copy
const AppError = require('./AppError');
throw new AppError('User not found', 404, 'USER_NOT_FOUND', { id: req.params.id });
localization.js
Purpose: Loads and formats messages from JSON translation files for notifications and UI across all roles, using centralized localization constants.

Dependencies:

fs, path: File system utilities for loading translation files.
localizationConstants: Provides supported languages and default language.
Configuration:

Translation files: Located in locales/{role}/{module}/{languageCode}.json.
Supports nested modules (e.g., payments/wallet).
Uses translationCache (Map) to cache loaded translations.
Exports:

getSupportedLanguages(): Returns a Set of ISO 639-1 language codes from localizationConstants.
getDefaultLanguage(): Returns the default language (en) from localizationConstants.
formatMessage(role, module, languageCode, messageKey, params):
Parameters:
role: Role identifier (e.g., admin, customer).
module: Module identifier (e.g., profile, payments/wallet).
languageCode: ISO 639-1 language code (e.g., en, es).
messageKey: Message key (supports dot notation, e.g., profile.welcome_message).
params: Optional object for placeholder replacement (e.g., { name: 'John' }).
Returns: Formatted message with fallback to default language or admin/profile/en.
Features: Supports date formatting and placeholder replacement.
Example:

javascript

Collapse

Unwrap

Run

Copy
const { formatMessage } = require('./localization');
const message = formatMessage('customer', 'profile', 'es', 'welcome_message', { name: 'John' });
// e.g., "¡Bienvenido, John!"
localizationConstants.js
Purpose: Defines centralized localization settings for currencies, languages, countries, cities, timezones, and map providers.

Exports:

DEFAULT_CURRENCY: Default currency (USD).
SUPPORTED_CURRENCIES: Array of supported currency codes (e.g., USD, EUR, MWK).
COUNTRY_CURRENCY_MAP: Maps country codes to currencies (e.g., { US: 'USD', GB: 'GBP' }).
SUPPORTED_COUNTRIES: Array of supported country codes (e.g., US, GB, MW).
DEFAULT_LANGUAGE: Default language (en).
SUPPORTED_LANGUAGES: Array of supported ISO 639-1 language codes (e.g., en, es, sw).
SUPPORTED_CITIES: Object mapping countries to supported cities (e.g., { US: ['New York', 'Los Angeles'] }).
DEFAULT_TIMEZONE: Default timezone (UTC).
SUPPORTED_MAP_PROVIDERS: Maps countries to map providers (e.g., { US: 'google_maps', EU: 'openstreetmap' }).
Example:

javascript

Collapse

Unwrap

Run

Copy
const { SUPPORTED_LANGUAGES } = require('./localizationConstants');
console.log(SUPPORTED_LANGUAGES); // ['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'yo', 'zu']
This documentation provides a concise overview of the utility and constants modules, their functionality, and usage examples. Each module is designed to be reusable and maintainable, ensuring robust backend operations for the MMFinale system.