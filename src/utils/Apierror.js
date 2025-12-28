// ApiError is a custom error class
// It extends the built-in JavaScript Error class
class ApiError extends Error {
  constructor(
    statusCode,                    // HTTP status code (400, 401, 404, 500, etc.)
    message = "Something went wrong", // Default error message
    errors = [],                   // Optional array of validation / field errors
    stack = ""                     // Optional custom stack trace
  ) {
    // Call parent Error class constructor
    // This sets the `message` property automatically
    super(message);

    // HTTP status code for the error
    this.statusCode = statusCode;

    // Data is always null in error responses
    // Keeps response structure consistent
    this.data = null;

    // Explicitly assign message (good for clarity & logging)
    this.message = message;

    // success is always false for errors
    this.success = false;

    // Store additional error details (like validation errors)
    this.errors = errors;

    // If a custom stack trace is provided, use it
    if (stack) {
      this.stack = stack;
    } 
    // Otherwise, capture stack trace automatically
    // Removes constructor calls from stack for cleaner debugging
    else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Export ApiError so it can be used across the app
export { ApiError };
