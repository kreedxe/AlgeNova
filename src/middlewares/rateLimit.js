const rateLimit = require('express-rate-limit');

const createJsonRateLimiter = ({
  windowMs,
  max,
  message = 'Too many requests, please try again later.',
}) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    handler: (req, res, _next, options) => {
      res.status(options.statusCode).json({
        error: message,
        requestId: req.requestId,
      });
    },
  });

module.exports = {
  createJsonRateLimiter,
};

