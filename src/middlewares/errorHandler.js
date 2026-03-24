const logger = require('../logger');
const { env } = require('../config');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  logger.error(err.message, {
    status,
    method: req.method,
    url: req.originalUrl,
    stack: err.stack,
  });

  const payload = {
    error: err.message || 'Internal Server Error',
    requestId: req.requestId,
  };
  if (env !== 'production' && status >= 500) {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
}

module.exports = errorHandler;

