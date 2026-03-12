const { randomUUID } = require('crypto');

const requestContext = (req, res, next) => {
  const id = randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = id;
  req.startedAt = startedAt;

  res.setHeader('X-Request-Id', id);

  res.on('finish', () => {
    const finishedAt = process.hrtime.bigint();
    const durationMs = Number(finishedAt - startedAt) / 1e6;
    res.setHeader('X-Response-Time-ms', durationMs.toFixed(2));
  });

  next();
};

module.exports = requestContext;

