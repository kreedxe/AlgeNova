const { env } = require('./config');

function formatMessage(level, message, meta) {
  const base = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
  if (!meta) {
    return `${base} ${message}`;
  }
  return `${base} ${message} ${JSON.stringify(meta)}`;
}

function log(level, message, meta) {
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(formatMessage(level, message, meta));
    return;
  }

  if (env !== 'test') {
    // eslint-disable-next-line no-console
    console.log(formatMessage(level, message, meta));
  }
}

module.exports = {
  info(message, meta) {
    log('info', message, meta);
  },
  error(message, meta) {
    log('error', message, meta);
  },
};

