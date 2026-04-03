/**
 * Cloudflare Worker — CORS proxy for Anthropic Messages API
 *
 * Deploy:
 *   1. Create a Cloudflare account (free) → Workers & Pages → Create Worker
 *   2. Paste this code and deploy
 *   3. Copy the worker URL (e.g. https://humanize-proxy.your-subdomain.workers.dev)
 *   4. Paste it into Humanize's Settings → CORS Proxy URL
 *
 * What it does:
 *   - Forwards POST /v1/messages to https://api.anthropic.com/v1/messages
 *   - Passes through your API key (x-api-key header) from the browser
 *   - Adds CORS headers so the browser allows the cross-origin request
 *   - No data is stored or logged
 */

const ANTHROPIC_API = 'https://api.anthropic.com';

// Allowed origins — set to '*' for development, restrict in production
const ALLOWED_ORIGIN = '*';

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // Only allow POST to /v1/messages
    const url = new URL(request.url);
    if (request.method !== 'POST' || !url.pathname.startsWith('/v1/messages')) {
      return new Response(JSON.stringify({ error: 'Only POST /v1/messages is allowed' }), {
        status: 405,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    // Forward to Anthropic API
    const anthropicUrl = `${ANTHROPIC_API}${url.pathname}`;
    const body = await request.text();

    const response = await fetch(anthropicUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': request.headers.get('x-api-key') || '',
        'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01',
      },
      body,
    });

    // Clone response with CORS headers
    const responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'application/json',
      },
    });
  },
};
