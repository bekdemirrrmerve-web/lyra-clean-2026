import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message || body?.rawMessage || '';

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is missing in Vercel environment variables' },
        { status: 500 }
      );
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        {
          error: 'Gemini request failed',
          detail,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text || '')
        .join('')
        .trim() || '';

    if (!text) {
      return NextResponse.json(
        {
          error: 'Gemini returned empty text',
          data,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      answer: text,
      source: 'gemini',
      model,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Gemini route error',
        detail: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
