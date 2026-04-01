// src/services/apiClient.ts
// Central client for all Anthropic Claude API calls.
// Routes through the Supabase Edge Function proxy so the API key
// is never exposed in the browser.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// The edge function URL
const PROXY_URL = `${SUPABASE_URL}/functions/v1/claude-proxy`;

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
      >;
}

export interface ClaudeRequestOptions {
  system?: string;
  messages: ClaudeMessage[];
  max_tokens?: number;
  model?: string;
}

/**
 * Call Claude via the secure Supabase Edge Function proxy.
 * Returns the plain text content of Claude's first response block.
 */
export async function callClaude(options: ClaudeRequestOptions): Promise<string> {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Supabase anon key authorises the edge function call
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      model: options.model ?? 'claude-sonnet-4-20250514',
      max_tokens: options.max_tokens ?? 1500,
      system: options.system,
      messages: options.messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude proxy error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  // Extract text from response content blocks
  const text = (data.content as Array<{ type: string; text?: string }>)
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('');

  // Strip any accidental markdown code fences
  return text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
}

/**
 * Parse JSON from a Claude response safely.
 * Strips code fences and provides a typed result.
 */
export function parseClaudeJSON<T>(raw: string): T {
  // Strip ```json ... ``` fences if present
  const clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  return JSON.parse(clean) as T;
}
