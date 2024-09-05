// 1. Using try-catch blocks in async functions

// export const asyncHandler = (fn) => async (req, res, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (error) {
//     res.status(error.status || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// 2. Using Promise.catch() in async functions
export const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    return Promise.resolve(
      requestHandler(req, res, next).catch((error) =>
        next(console.error(error))
      )
    );
  };
};
