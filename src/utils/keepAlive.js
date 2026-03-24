const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function startKeepAlive() {
  // Only enable keep-alive when an explicit target is configured.
  const explicitUrl = process.env.KEEPALIVE_URL;
  if (!explicitUrl) {
    return;
  }

  const interval = Number(process.env.KEEPALIVE_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

  const ping = async () => {
    try {
      await fetch(explicitUrl, { method: 'GET' });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Keep-alive ping failed', err);
    }
  };

  // Initial ping (after small delay to let server start)
  const initialTimer = setTimeout(ping, 10_000);
  initialTimer.unref();

  // Periodic pings
  const intervalTimer = setInterval(ping, interval);
  intervalTimer.unref();
}

module.exports = {
  startKeepAlive,
};
