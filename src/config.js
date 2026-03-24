const dotenv = require('dotenv');

dotenv.config();

const env = process.env.NODE_ENV || 'development';
const port = Number(process.env.PORT) || 3000;

const trustProxy = process.env.TRUST_PROXY === '1';

const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 300; // all routes

const mathRateLimitWindowMs = Number(process.env.MATH_RATE_LIMIT_WINDOW_MS) || 60_000;
const mathRateLimitMax = Number(process.env.MATH_RATE_LIMIT_MAX) || 60; // /api/math routes

module.exports = {
  env,
  port,
  trustProxy,
  rateLimitWindowMs,
  rateLimitMax,
  mathRateLimitWindowMs,
  mathRateLimitMax,
};

