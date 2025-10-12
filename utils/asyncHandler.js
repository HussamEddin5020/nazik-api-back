/**
 * Async handler to wrap async route handlers
 * Catches errors and passes them to error middleware
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;


