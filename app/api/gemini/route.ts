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

function getApiKey() {
  return process.env.GEMINI_API_KEY || "";
}

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

function cleanBase64Image(value: any) {
  if (!value) return null;

  const asString = String(value);

  const match = asString.match(/^data:(.+?);base64,(.+)$/);

  if (!match) return null;

  return {
    mimeType: match[1],
    base64: match[2],
  };
}

function extractGeminiText(data: any) {
  const candidates = data?.candidates;

  if (!Array.isArray(candidates) || candidates.length === 0) return "";

  const parts = candidates?.[0]?.content?.parts;

  if (Array.isArray(parts)) {
    return parts
      .map((part: any) => part?.text || "")
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return "";
}

function isQuotaError(message: string) {
  const lower = message.toLowerCase();

  return (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("too many requests") ||
    lower.includes("exceeded")
  );
}

function quotaFriendlyMessage(errorMessage: string) {
  const retryMatch = errorMessage.match(/retry in ([0-9.]+)s/i);
  const retrySeconds = retryMatch?.[1]
    ? Math.ceil(Number(retryMatch[1]))
    : 30;

  return `Gemini ücretsiz kullanım kotası doldu kanka. API key çalışıyor ama Google şu an fazla istek attığımız için cevap vermiyor. Yaklaşık ${retrySeconds} saniye sonra tekrar dene. Çok sık kullanacaksak Gemini tarafında billing/plan açmak ya da farklı bir API key bağlamak gerekiyor.`;
}

async function callGemini(model: string, apiKey: string, parts: GeminiPart[]) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.65,
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
    const errorMessage =
      data?.error?.message ||
      data?.message ||
      raw ||
      `Gemini API hata verdi: ${response.status}`;

    throw new Error(errorMessage);
  }

  const text = extractGeminiText(data);

  if (!text) {
    throw new Error("Gemini boş cevap döndürdü.");
  }

  return text;
}

function okAnswer(answer: string) {
  return NextResponse.json({
    ok: true,
    answer,
    reply: answer,
    text: answer,
    message: answer,
    content: answer,
    output: answer,
    result: answer,
    response: answer,
  });
}

export async function GET(req: NextRequest) {
  const apiKey = getApiKey();

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
        text: `Türkçe kısa cevap ver. Test mesajı: ${test}`,
      },
    ]);

    return NextResponse.json({
      ok: true,
      route: "/api/gemini",
      hasGeminiKey: true,
      answer,
      reply: answer,
      text: answer,
      message: answer,
      content: answer,
    });
  } catch (error: any) {
    const message = error?.message || "Gemini test hatası.";

    if (isQuotaError(message)) {
      const answer = quotaFriendlyMessage(message);

      return NextResponse.json({
        ok: true,
        route: "/api/gemini",
        hasGeminiKey: true,
        quotaLimited: true,
        answer,
        reply: answer,
        text: answer,
        message: answer,
        content: answer,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        route: "/api/gemini",
        hasGeminiKey: true,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "GEMINI_API_KEY bulunamadı. Vercel > Settings > Environment Variables kısmını kontrol et.",
      },
      { status: 500 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    const text = getTextFromBody(body);

    const image =
      cleanBase64Image(body?.imageDataUrl) ||
      cleanBase64Image(body?.image) ||
      cleanBase64Image(body?.photo) ||
      cleanBase64Image(body?.file);

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
      ? ["gemini-1.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash"]
      : ["gemini-1.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash"];

    let finalAnswer = "";
    let lastError = "";

    for (const model of models) {
      try {
        finalAnswer = await callGemini(model, apiKey, parts);
        break;
      } catch (error: any) {
        lastError = error?.message || `${model} hata verdi.`;

        if (isQuotaError(lastError)) {
          continue;
        }
      }
    }

    if (!finalAnswer) {
      if (isQuotaError(lastError)) {
        return okAnswer(quotaFriendlyMessage(lastError));
      }

      throw new Error(lastError || "Gemini cevap veremedi.");
    }

    return okAnswer(finalAnswer);
  } catch (error: any) {
    const message = error?.message || "Gemini route hata verdi.";

    if (isQuotaError(message)) {
      return okAnswer(quotaFriendlyMessage(message));
    }

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
