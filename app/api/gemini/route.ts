import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

function extractText(data: any) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text || '')
      .join('')
      .trim() || ''
  );
}

async function askGemini(message: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      error: 'GEMINI_API_KEY is missing',
      detail:
        'Vercel > Settings > Environment Variables kısmında GEMINI_API_KEY yok ya da Production ortamına eklenmemiş.',
    };
  }

  let lastError = '';

  for (const model of MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: message,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.8,
              topP: 0.95,
              maxOutputTokens: 1800,
            },
          }),
        }
      );

      const raw = await response.text();

      if (!response.ok) {
        lastError = `[${model}] HTTP ${response.status}: ${raw}`;
        continue;
      }

      let data: any = null;

      try {
        data = JSON.parse(raw);
      } catch {
        lastError = `[${model}] JSON parse failed: ${raw}`;
        continue;
      }

      const answer = extractText(data);

      if (answer) {
        return {
          ok: true,
          status: 200,
          answer,
          source: 'gemini',
          model,
        };
      }

      lastError = `[${model}] Empty answer: ${raw}`;
    } catch (error: any) {
      lastError = `[${model}] Fetch crashed: ${error?.message || String(error)}`;
    }
  }

  return {
    ok: false,
    status: 500,
    error: 'Gemini request failed for all models',
    detail: lastError,
  };
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const { searchParams } = new URL(req.url);
  const test = searchParams.get('test');

  if (test) {
    const result = await askGemini(test);

    return NextResponse.json(result, {
      status: result.status || (result.ok ? 200 : 500),
    });
  }

  return NextResponse.json({
    ok: true,
    route: '/api/gemini',
    hasGeminiKey: Boolean(apiKey),
    keyNameFound: process.env.GEMINI_API_KEY
      ? 'GEMINI_API_KEY'
      : process.env.GOOGLE_API_KEY
        ? 'GOOGLE_API_KEY'
        : null,
    hint: 'Tarayıcıdan gerçek Gemini testi için /api/gemini?test=merhaba yaz.',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const message =
      body?.message ||
      body?.rawMessage ||
      body?.prompt ||
      body?.text ||
      '';

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: 'Message is required',
          hint: 'Frontend { message: "..." } göndermeli.',
        },
        { status: 400 }
      );
    }

    const result = await askGemini(message);

    return NextResponse.json(result, {
      status: result.status || (result.ok ? 200 : 500),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Gemini route crashed',
        detail: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
