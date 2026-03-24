const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const env = process.env.NODE_ENV || 'development';
const port = Number(process.env.PORT) || 3000;
const isRender = process.env.RENDER === 'true' || Boolean(process.env.RENDER_EXTERNAL_URL);

const trustProxy =
  process.env.TRUST_PROXY === undefined
    ? env === 'production' || isRender
    : process.env.TRUST_PROXY === '1';

const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 300; // all routes

const mathRateLimitWindowMs = Number(process.env.MATH_RATE_LIMIT_WINDOW_MS) || 60_000;
const mathRateLimitMax = Number(process.env.MATH_RATE_LIMIT_MAX) || 60; // /api/math routes

module.exports = {
  env,
  port,
  isRender,
  trustProxy,
  rateLimitWindowMs,
  rateLimitMax,
  mathRateLimitWindowMs,
  mathRateLimitMax,
};
