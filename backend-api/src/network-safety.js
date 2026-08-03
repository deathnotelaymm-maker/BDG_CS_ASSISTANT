import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';

function blocked(message, code = 'CONNECTOR_URL_BLOCKED') {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  return error;
}

function ipv4Parts(address) {
  if (isIP(address) !== 4) return null;
  return address.split('.').map(Number);
}

export function isForbiddenNetworkAddress(value) {
  const address = String(value || '').trim().toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return isForbiddenNetworkAddress(mapped[1]);

  const parts = ipv4Parts(address);
  if (parts) {
    const [a, b] = parts;
    return a === 0
      || a === 10
      || a === 127
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 0)
      || (a === 192 && b === 168)
      || (a === 198 && (b === 18 || b === 19))
      || a >= 224;
  }

  if (isIP(address) !== 6) return false;
  if (address === '::' || address === '::1') return true;
  if (address.startsWith('::ffff:')) return true; // Disallow every IPv4-mapped form, including hexadecimal forms.
  if (address.startsWith('64:ff9b:') || address.startsWith('100:')) return true;
  const first = Number.parseInt(address.split(':')[0] || '0', 16);
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10
  if ((first & 0xff00) === 0xff00) return true; // multicast
  return address.startsWith('2001:db8:');
}

export async function validatePublicHttpsUrl(value, label = 'Connector URL', lookupFn = lookup) {
  return (await resolvePublicHttpsTarget(value, label, lookupFn)).url;
}

export async function resolvePublicHttpsTarget(value, label = 'Connector URL', lookupFn = lookup) {
  const input = String(value || '').trim();
  if (!input) return '';

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw blocked(`${label} must be a valid HTTPS URL`, 'CONNECTOR_URL_INVALID');
  }
  if (parsed.protocol !== 'https:') throw blocked(`${label} must use HTTPS`, 'CONNECTOR_HTTPS_REQUIRED');
  if (parsed.username || parsed.password) throw blocked(`${label} cannot contain embedded credentials`);

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw blocked(`${label} cannot target a private network host`);
  }
  if (isIP(hostname) && isForbiddenNetworkAddress(hostname)) {
    throw blocked(`${label} cannot target a private, local, or reserved network address`);
  }

  let addresses;
  try {
    addresses = isIP(hostname)
      ? [{ address: hostname, family: isIP(hostname) }]
      : await lookupFn(hostname, { all: true, verbatim: true });
  } catch {
    throw blocked(`${label} hostname could not be resolved`, 'CONNECTOR_DNS_LOOKUP_FAILED');
  }
  if (!addresses.length || addresses.some((entry) => isForbiddenNetworkAddress(entry.address))) {
    throw blocked(`${label} resolves to a private, local, or reserved network address`);
  }

  parsed.hash = '';
  return {
    url: parsed.toString(),
    addresses: addresses.map((entry) => ({ address:entry.address, family:Number(entry.family || isIP(entry.address)) })),
  };
}

/**
 * HTTPS-only request with the validated DNS result pinned into the socket.
 * This closes the DNS-rebinding gap between URL validation and connection.
 */
export async function fetchPublicHttpsText(value, { headers = {}, signal, maxBytes = 1_000_000, label = 'Connector URL' } = {}) {
  const target = await resolvePublicHttpsTarget(value, label);
  const pinned = target.addresses[0];
  if (!pinned?.address || !pinned.family) throw blocked(`${label} has no usable public address`, 'CONNECTOR_DNS_LOOKUP_FAILED');

  return new Promise((resolve, reject) => {
    const request = httpsRequest(target.url, {
      method: 'GET',
      headers,
      signal,
      agent: false,
      family: pinned.family,
      autoSelectFamily: false,
      lookup(_hostname, _options, callback) {
        callback(null, pinned.address, pinned.family);
      },
    }, (response) => {
      const status = Number(response.statusCode || 0);
      if (status >= 300 && status < 400) {
        response.resume();
        reject(blocked('Connector redirects are not allowed', 'CONNECTOR_REDIRECT_BLOCKED'));
        return;
      }
      let total = 0;
      const chunks = [];
      response.on('data', (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          request.destroy(blocked('Connector response is too large', 'CONNECTOR_RESPONSE_TOO_LARGE'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({
        ok: status >= 200 && status < 300,
        status,
        text: Buffer.concat(chunks).toString('utf8'),
        target_host: new URL(target.url).hostname,
        pinned_address: pinned.address,
      }));
    });
    request.on('error', reject);
    request.end();
  });
}
