function sendError(res, statusCode, message, details) {
  const payload = {
    success: false,
    error: message
  };

  if (details) payload.details = details;

  return res.status(statusCode).json(payload);
}

module.exports = {
  sendError
};
