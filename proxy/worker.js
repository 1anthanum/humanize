/**
 * Cloudflare Worker — Smart CORS proxy for Anthropic Messages API
 *
 * TWO MODES:
 *   1. Public mode: Client sends NO api key → Worker uses its own env.ANTHROPIC_API_KEY
 *      - Rate limited: 10 requests per IP per hour (configurable)
 *      - Forces model to Haiku for cost control
 *   2. BYOK mode: Client sends x-api-key header → Worker passes it through
 *      - No rate limit (user's own key, user's own cost)
 *
 * Deploy:
 *   1. npm install -g wrangler && wrangler login
 *   2. cd proxy && wrangler deploy
 *   3. Set secret: wrangler secret put ANTHROPIC_API_KEY
 *   4. (Optional) Create KV namespace for rate limiting:
 *      wrangler kv namespace create RATE_LIMIT
 *      Then add binding in wrangler.toml
 *
 * Environment Variables:
 *   ANTHROPIC_API_KEY  — Your Anthropic API key (secret)
 *   RATE_LIMIT_PER_HOUR — Max requests per IP/hour in public mode (default: 10)
 *
 * KV Binding (optional, for rate limiting):
 *   RATE_LIMIT — KV namespace for rate tracking
 *   Falls back to no rate limit if KV not bound
 */

const ANTHROPIC_API = 'https://api.anthropic.com';
const PUBLIC_MODEL = 'claude-haiku-4-5-20251001'; // Cost control: force Haiku for public
const DEFAULT_RATE_LIMIT = 10; // requests per IP per hour

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

/**
 * Simple rate limiter using Cloudflare KV.
 * Key: IP address, Value: request count, TTL: 1 hour
 */
async function checkRateLimit(env, ip) {
  if (!env.RATE_LIMIT) return { allowed: true, remaining: -1 };

  const limit = parseInt(env.RATE_LIMIT_PER_HOUR) || DEFAULT_RATE_LIMIT;
  const key = `rl:${ip}`;
  const current = parseInt(await env.RATE_LIMIT.get(key)) || 0;

  if (current >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // Increment counter with 1-hour TTL
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 3600 });
  return { allowed: true, remaining: limit - current - 1 };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Only POST /v1/messages
    const url = new URL(request.url);
    if (request.method !== 'POST' || !url.pathname.startsWith('/v1/messages')) {
      return jsonResponse({ error: 'Only POST /v1/messages is allowed' }, 405, origin);
    }

    // Determine mode: BYOK vs Public
    const clientKey = request.headers.get('x-api-key');
    const isPublicMode = !clientKey;
    let apiKey;

    if (isPublicMode) {
      // Public mode: use worker's API key with rate limiting
      apiKey = env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return jsonResponse({ error: 'Server API key not configured' }, 503, origin);
      }

      // Rate limit by IP
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const { allowed, remaining } = await checkRateLimit(env, ip);
      if (!allowed) {
        return jsonResponse(
          { error: 'Rate limit exceeded. Try again later or use your own API key in Settings.' },
          429,
          origin,
        );
      }
    } else {
      // BYOK mode: pass through client's key
      apiKey = clientKey;
    }

    // Parse and optionally modify request body
    let body;
    try {
      body = JSON.parse(await request.text());
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
    }

    // Public mode: force Haiku model and cap tokens
    if (isPublicMode) {
      body.model = PUBLIC_MODEL;
      body.max_tokens = Math.min(body.max_tokens || 1024, 1024);
    }

    // Forward to Anthropic
    const response = await fetch(`${ANTHROPIC_API}${url.pathname}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  },
};
