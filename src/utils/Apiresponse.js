/* ApiResponse is NOT an error.
It represents a successful HTTP response.

 Therefore:

 It should NOT extend Error

 It does NOT need stack traces

 It does NOT need exception behavior

*/ 
// ApiResponse is a simple class used to standardize
// all successful API responses across the application
class ApiResponse {

  constructor(
    statusCode,              // HTTP status code (200, 201, 204, etc.)
    data,                    // Actual response payload (user, list, object)
    message = "Success"      // Optional message for frontend display
  ) {
    // Assign HTTP status code to the response object
    this.statusCode = statusCode;

    // Attach actual data returned by the API
    this.data = data;

    // Human-readable message describing the response
    this.message = message;

    // Automatically determine success or failure
    // Any status code < 400 is considered a success
    this.success = statusCode < 400;
  }
}


export {ApiResponse}