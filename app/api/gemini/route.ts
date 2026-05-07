import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeminiPart =
  | { text: string }
  | {
      inline_data: {
        mime_type: string;
        data: string;
      };
    };

function getTextFromBody(body: any) {
  return String(
    body?.message ||
      body?.prompt ||
      body?.input ||
      body?.text ||
      body?.question ||
      body?.userMessage ||
      ""
  ).trim();
}

function parseImageDataUrl(imageDataUrl: string) {
  if (!imageDataUrl || typeof imageDataUrl !== "string") return null;

  const match = imageDataUrl.match(/^data:(.+?);base64,(.+)$/);

  if (!match) return null;

  return {
    mimeType: match[1],
    base64: match[2],
  };
}

function extractGeminiText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts;

  if (Array.isArray(parts)) {
    return parts.map((part: any) => part?.text || "").join("\n").trim();
  }

  return "";
}

async function callGemini(model: string, apiKey: string, parts: GeminiPart[]) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  const raw = await response.text();

  let data: any = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      raw ||
      `Gemini API error: ${response.status}`;

    throw new Error(msg);
  }

  const text = extractGeminiText(data);

  if (!text) {
    throw new Error("Gemini boş cevap döndürdü.");
  }

  return text;
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  const { searchParams } = new URL(req.url);
  const test = searchParams.get("test") || "merhaba";

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        route: "/api/gemini",
        hasGeminiKey: false,
        error: "GEMINI_API_KEY bulunamadı.",
      },
      { status: 500 }
    );
  }

  try {
    const answer = await callGemini("gemini-1.5-flash", apiKey, [
      {
        text: `Türkçe ve kısa cevap ver: ${test}`,
      },
    ]);

    return NextResponse.json({
      ok: true,
      route: "/api/gemini",
      hasGeminiKey: true,
      answer,
      reply: answer,
      text: answer,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        route: "/api/gemini",
        hasGeminiKey: true,
        error: error?.message || "Gemini test hatası.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "GEMINI_API_KEY bulunamadı. Vercel Environment Variables kısmını kontrol et.",
      },
      { status: 500 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    const text = getTextFromBody(body);
    const imageDataUrl =
      body?.imageDataUrl || body?.image || body?.photo || body?.file || "";

    const image = parseImageDataUrl(imageDataUrl);

    const parts: GeminiPart[] = [];

    if (text) {
      parts.push({
        text,
      });
    }

    if (image) {
      parts.push({
        inline_data: {
          mime_type: image.mimeType,
          data: image.base64,
        },
      });
    }

    if (!parts.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "Mesaj veya görsel gelmedi.",
        },
        { status: 400 }
      );
    }

    const models = image
      ? ["gemini-1.5-flash", "gemini-1.5-pro"]
      : ["gemini-1.5-flash", "gemini-1.5-pro"];

    let finalAnswer = "";
    let lastError = "";

    for (const model of models) {
      try {
        finalAnswer = await callGemini(model, apiKey, parts);
        break;
      } catch (error: any) {
        lastError = error?.message || "Model hatası.";
      }
    }

    if (!finalAnswer) {
      throw new Error(lastError || "Gemini cevap veremedi.");
    }

    return NextResponse.json({
      ok: true,
      answer: finalAnswer,
      reply: finalAnswer,
      text: finalAnswer,
      message: finalAnswer,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Gemini route hata verdi.",
      },
      { status: 500 }
    );
  }
}
