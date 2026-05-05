import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview";

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function extractImage(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;

  const imagePart =
    parts.find((p) => p?.inlineData?.data) ||
    parts.find((p) => p?.inline_data?.data);

  const data64 = imagePart?.inlineData?.data || imagePart?.inline_data?.data;
  const mime =
    imagePart?.inlineData?.mimeType ||
    imagePart?.inline_data?.mime_type ||
    "image/png";

  if (!data64) return null;

  return {
    mime,
    dataUrl: `data:${mime};base64,${data64}`,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "Lyra Image API",
    hasGeminiKey: Boolean(GEMINI_API_KEY),
    model: GEMINI_IMAGE_MODEL,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const prompt = cleanText(body?.prompt || body?.text || body?.message);

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          message: "GEMINI_API_KEY eksik. Vercel Environment Variables kısmına ekleyip redeploy yapmalısın.",
        },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        {
          ok: false,
          message: "Görsel oluşturmak için prompt gelmedi.",
        },
        { status: 400 }
      );
    }

    const finalPrompt = `
Create a high-quality visual based on this Turkish design/image prompt.

Style direction:
- premium AI assistant product
- dark glassmorphism
- soft violet, pink, blue glow
- futuristic but elegant
- clean composition
- usable as app/web design concept or social media visual

Prompt:
${prompt}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: finalPrompt }],
            },
          ],
        }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error =
        data?.error?.message ||
        data?.message ||
        `Gemini image hata kodu: ${response.status}`;

      return NextResponse.json(
        {
          ok: false,
          message: "Kanka görsel üretimi takıldı. Gerçek hata: " + error,
          error,
        },
        { status: 500 }
      );
    }

    const image = extractImage(data);

    if (!image) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Kanka Gemini cevap verdi ama görsel alanı boş geldi. Promptu daha net yazmayı deneyelim ya da GEMINI_IMAGE_MODEL değerini değiştirelim.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      imageUrl: image.dataUrl,
      mime: image.mime,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Image route içinde beklenmeyen hata oldu: " +
          (error?.message || "Bilinmeyen hata"),
      },
      { status: 500 }
    );
  }
}
