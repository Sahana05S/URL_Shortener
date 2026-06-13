export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found.",
      requestId: req.id,
    },
  });
}

export function errorHandler(error, req, res, _next) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  const isServerError = status >= 500;

  if (isServerError) {
    console.error({
      message: error.message,
      requestId: req.id,
      stack: envSafeStack(error),
    });
  }

  res.status(status).json({
    error: {
      code: error.code ?? (isServerError ? "INTERNAL_ERROR" : "REQUEST_ERROR"),
      message: isServerError ? "An unexpected error occurred." : error.message,
      requestId: req.id,
    },
  });
}

function envSafeStack(error) {
  return process.env.NODE_ENV === "production" ? undefined : error.stack;
}
