const { env } = require('../config');

function buildPayload(status) {
  return {
    status,
    env,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

function liveness(req, res) {
  res.json(buildPayload('ok'));
}

function readiness(req, res) {
  res.json(buildPayload('ready'));
}

module.exports = {
  liveness,
  readiness,
};

