import { NextRequest, NextResponse } from 'next/server';

interface GeminiMessage {
  role: string;
  content: string | { type: string; text?: string; image_url?: { url: string } }[];
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey, baseUrl, model, systemPrompt, messages, provider } = await req.json();

    if (!baseUrl) {
      return NextResponse.json({ error: 'Base URL is required' }, { status: 400 });
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    if (provider === 'gemini') {
      return handleGeminiRequest(apiKey, baseUrl, model, systemPrompt, messages);
    }

    const fullMessages = systemPrompt?.trim()
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    // Format clean URL path (remove trailing slash)
    const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const apiUrl = `${sanitizedBaseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: fullMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `API error (${response.status}): ${errorText || response.statusText}` },
        { status: response.status }
      );
    }

    // Pipe the body stream directly to the response
    const stream = response.body;
    if (!stream) {
      return NextResponse.json({ error: 'Response body is not readable' }, { status: 500 });
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

async function handleGeminiRequest(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  messages: GeminiMessage[]
) {
  const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const apiUrl = `${sanitizedBaseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const contents = messages.map((msg: GeminiMessage) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: contentToParts(msg.content),
  }));

  const body: { contents: typeof contents; system_instruction?: { parts: { text: string }[] } } = { contents };
  if (systemPrompt?.trim()) {
    body.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let msg = `Gemini error (${response.status})`;
    try {
      const err = JSON.parse(errorText);
      if (err.error?.message) msg = err.error.message;
    } catch {}
    return NextResponse.json({ error: msg }, { status: response.status });
  }

  const geminiStream = response.body;
  if (!geminiStream) {
    return NextResponse.json({ error: 'Response body is not readable' }, { status: 500 });
  }

  const reader = geminiStream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const transformedStream = new ReadableStream({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            const lines = (buffer + decoder.decode()).split('\n');
            for (const line of lines) {
              processGeminiLine(line.trim(), controller, encoder);
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            processGeminiLine(line.trim(), controller, encoder);
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(transformedStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function processGeminiLine(
  line: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) {
  if (!line || line === 'data: [DONE]') return;
  if (!line.startsWith('data: ')) return;

  try {
    const parsed = JSON.parse(line.slice(6));
    const text = parsed.candidates?.[0]?.content?.parts
      ?.map((p: GeminiPart) => p.text || '')
      .join('') || '';
    if (text) {
      const openaiChunk = JSON.stringify({
        choices: [{ delta: { content: text }, index: 0 }],
      });
      controller.enqueue(encoder.encode(`data: ${openaiChunk}\n\n`));
    }
  } catch {}
}

function contentToParts(content: GeminiMessage['content']): GeminiPart[] {
  if (typeof content === 'string') {
    return [{ text: content }];
  }
  if (Array.isArray(content)) {
    return content.map((block) => {
      if (block.type === 'text') return { text: block.text };
      if (block.type === 'image_url') {
        const match = block.image_url?.url?.match(/^data:(.+?);base64,(.+)$/);
        if (match) {
          return { inlineData: { mimeType: match[1], data: match[2] } };
        }
      }
      return { text: '' };
    });
  }
  return [{ text: '' }];
}
