const logger = require('../logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  logger.error(err.message, {
    status,
    method: req.method,
    url: req.originalUrl,
    stack: err.stack,
  });

  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
}

module.exports = errorHandler;

