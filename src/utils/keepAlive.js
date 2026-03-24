const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function startKeepAlive() {
  // Prefer an explicit keep-alive URL if provided
  const explicitUrl = process.env.KEEPALIVE_URL;
  const renderExternal = process.env.RENDER_EXTERNAL_URL;

  const baseUrl = explicitUrl ?? (renderExternal ? `${renderExternal}/ping` : undefined);

  if (!baseUrl) {
    return;
  }

  const interval = Number(process.env.KEEPALIVE_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

  const ping = async () => {
    try {
      await fetch(baseUrl, { method: "GET" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Keep-alive ping failed", err);
    }
  };

  // Initial ping (after small delay to let server start)
  setTimeout(ping, 10_000);

  // Periodic pings
  setInterval(ping, interval);
}