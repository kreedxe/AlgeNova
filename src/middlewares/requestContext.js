const { randomUUID } = require('crypto');
const logger = require('../logger');

const requestContext = (req, res, next) => {
  const id = randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = id;
  req.startedAt = startedAt;

  res.setHeader('X-Request-Id', id);

  res.on('finish', () => {
    const finishedAt = process.hrtime.bigint();
    const durationMs = Number(finishedAt - startedAt) / 1e6;

    logger.info('request completed', {
      requestId: id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    });
  });

  next();
};

module.exports = requestContext;

