import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

function extractText(data: any) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text || '')
      .join('')
      .trim() || ''
  );
}

export async function GET() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

  return NextResponse.json({
    ok: true,
    route: '/api/gemini',
    hasGeminiKey: hasKey,
    keyNameFound: process.env.GEMINI_API_KEY
      ? 'GEMINI_API_KEY'
      : process.env.GOOGLE_API_KEY
        ? 'GOOGLE_API_KEY'
        : null,
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
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: 'GEMINI_API_KEY is missing',
          hint: 'Vercel > Settings > Environment Variables kısmına GEMINI_API_KEY ekle ve Redeploy yap.',
        },
        { status: 500 }
      );
    }

    let lastError = '';

    for (const model of MODELS) {
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
                role: 'user',
                parts: [{ text: message }],
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
        lastError = `[${model}] ${response.status}: ${raw}`;
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
        return NextResponse.json({
          ok: true,
          answer,
          source: 'gemini',
          model,
        });
      }

      lastError = `[${model}] Empty answer: ${raw}`;
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Gemini request failed for all models',
        detail: lastError,
      },
      { status: 500 }
    );
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
