
class AppError extends Error {
 
  constructor(message, statusCode, errorCode = null, details = null, meta = null) {
    super(message);

    // HTTP status code.
    this.statusCode = statusCode;
    
    // Determine error status based on the HTTP code:
    // 'fail' for 4xx errors, 'error' for others.
    this.status = statusCode.toString().startsWith('4') ? 'fail' : 'error';
    
    // Indicates whether the error is operational (trusted error).
    this.isOperational = true;
    
    // Custom error code identifier.
    this.errorCode = errorCode;
    
    // Additional error details.
    this.details = details;
    
    // Contextual metadata.
    this.meta = meta;
    
    // Timestamp when the error instance was created.
    this.timestamp = new Date();

    // Capture the stack trace excluding the constructor call.
    Error.captureStackTrace(this, this.constructor);
  }

 
  toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      status: this.status,
      errorCode: this.errorCode,
      details: this.details,
      meta: this.meta,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

module.exports = AppError;
