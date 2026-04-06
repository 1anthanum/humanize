import type { LLMConfig } from '@/types';

/** Message format for Anthropic Messages API */
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
}

/**
 * Call Anthropic Messages API via CORS proxy.
 *
 * Two modes:
 *   - BYOK: user provides apiKey → sent as x-api-key header
 *   - Public: no apiKey → proxy uses its own server-side key (rate-limited)
 *
 * The proxy URL should point to a Cloudflare Worker or similar
 * that forwards requests to https://api.anthropic.com.
 */
export async function callAnthropic(
  config: LLMConfig,
  systemPrompt: string,
  messages: AnthropicMessage[],
): Promise<string> {
  const { apiKey, model, proxyUrl } = config;

  if (!proxyUrl) throw new Error('Proxy URL not configured');

  // Ensure proxyUrl doesn't end with slash
  const base = proxyUrl.replace(/\/+$/, '');

  // Build headers — omit x-api-key for public mode (worker provides its own)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const response = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg: string;
    try {
      const parsed = JSON.parse(errorText) as { error?: { message?: string } };
      errorMsg = parsed.error?.message || errorText;
    } catch {
      errorMsg = errorText;
    }
    throw new Error(`Anthropic API error (${response.status}): ${errorMsg}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const textBlock = data.content.find((c) => c.type === 'text');
  if (!textBlock) throw new Error('No text response from Anthropic');

  return textBlock.text;
}
