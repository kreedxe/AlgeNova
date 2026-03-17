const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const {
  env,
  port,
  trustProxy,
  rateLimitWindowMs,
  rateLimitMax,
  mathRateLimitWindowMs,
  mathRateLimitMax,
} = require('./config');
const logger = require('./logger');
const healthController = require('./controllers/healthController');
const mathRoutes = require('./routes/mathRoutes');
const requestContext = require('./middlewares/requestContext');
const { createJsonRateLimiter } = require('./middlewares/rateLimit');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

if (trustProxy) {
  // Needed when deployed behind a reverse proxy (Heroku, Render, Fly.io, Nginx, etc.)
  app.set('trust proxy', 1);
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(requestContext);
app.use(morgan(env === 'production' ? 'combined' : 'dev'));

// Global rate limit for basic DDOS/burst protection
app.use(
  createJsonRateLimiter({
    windowMs: rateLimitWindowMs,
    max: rateLimitMax,
    message: 'Too many requests.',
  }),
);

app.get('/health', healthController.liveness);
app.get('/health/ready', healthController.readiness);

// Stricter limit for potentially expensive math endpoints
app.use(
  '/api/math',
  createJsonRateLimiter({
    windowMs: mathRateLimitWindowMs,
    max: mathRateLimitMax,
    message: 'Too many math requests.',
  }),
  mathRoutes,
);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Server listening on http://localhost:${port}`, { env });
});

