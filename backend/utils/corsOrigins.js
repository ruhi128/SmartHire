// Browsers must originate from an explicitly configured SmartHire website.
// Native apps, CLI clients and server-to-server requests normally send no
// Origin header, so they remain supported without granting other websites
// access to authenticated browser responses.
function isAllowedWebOrigin(origin, {
  clientUrls = process.env.CLIENT_URL || '',
  nodeEnv = process.env.NODE_ENV || '',
} = {}) {
  if (!origin) return true;
  const allowed = new Set(String(clientUrls).split(',').map((value) => value.trim().replace(/\/$/, '')).filter(Boolean));
  if (nodeEnv !== 'production') {
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
  }
  return allowed.has(origin);
}

module.exports = { isAllowedWebOrigin };
