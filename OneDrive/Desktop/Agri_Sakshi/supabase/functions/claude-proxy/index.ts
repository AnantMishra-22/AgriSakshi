// supabase/functions/claude-proxy/index.ts
// Proxy for OpenRouter API (vision-capable, free tier available).
// Deploy:    supabase functions deploy claude-proxy
// Set secret: supabase secrets set OPENROUTER_API_KEY=sk-or-...

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();

    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build a single content array for OpenRouter from Claude-style messages.
    // System prompt goes in as the first text block, then each message block follows.
    const contentParts: object[] = [];

    if (body.system) {
      contentParts.push({ type: 'text', text: body.system });
    }

    for (const msg of body.messages) {
      const content = msg.content;

      if (typeof content === 'string') {
        contentParts.push({ type: 'text', text: content });
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text') {
            contentParts.push({ type: 'text', text: block.text });
          } else if (block.type === 'image' && block.source?.type === 'base64') {
            // OpenRouter expects a data-URL inside image_url
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${block.source.media_type};base64,${block.source.data}`,
              },
            });
          }
        }
      }
    }

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://agrisakshi.app', // helps OpenRouter track your app
        'X-Title': 'AgriSakshi',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free', // free, vision-capable
        messages: [
          {
            role: 'user',
            content: contentParts,
          },
        ],
        max_tokens: body.max_tokens ?? 1500,
        temperature: 0.2,
      }),
    });

    if (!openRouterResponse.ok) {
      const errText = await openRouterResponse.text();
      console.error('OpenRouter error:', openRouterResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `OpenRouter API error ${openRouterResponse.status}`, detail: errText }),
        {
          status: openRouterResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await openRouterResponse.json();
    const text = data.choices?.[0]?.message?.content ?? '';

    // Return in Claude-style format so apiClient.ts needs zero changes
    return new Response(
      JSON.stringify({ content: [{ type: 'text', text }] }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Proxy error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
