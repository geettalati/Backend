// asyncHandler is a higher-order function
// It takes a controller function (requestHandler) as input
const asyncHandler = (requestHandler) => {

  // Return a new middleware function
  // Express automatically provides: req, res, next
  return (req, res, next) => {

    // Wrap the controller execution inside Promise.resolve
    // This ensures both async & non-async functions are handled
    Promise
      .resolve(requestHandler(req, res, next))
      
      // If any error occurs, forward it to Express error middleware
      .catch((err) => next(err));
  };
};

export { asyncHandler };
