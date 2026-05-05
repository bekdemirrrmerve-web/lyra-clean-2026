import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function extractText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => part?.text || "")
    .join("")
    .trim();
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "Lyra PDF API",
    hasGeminiKey: Boolean(GEMINI_API_KEY),
    model: GEMINI_MODEL,
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          message: "GEMINI_API_KEY eksik. Vercel Environment Variables kısmına ekleyip redeploy yapmalısın.",
        },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = cleanText(formData.get("mode")) || "summary";
    const extraQuestion = cleanText(formData.get("question"));

    if (!file) {
      return NextResponse.json(
        {
          ok: false,
          message: "PDF dosyası gelmedi.",
        },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "text/html",
    ];

    const mimeType = file.type || "application/pdf";

    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Şimdilik PDF, TXT, Markdown veya HTML dosyası yükleyebilirsin.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    let instruction = "";

    if (mode === "long") {
      instruction =
        "Bu dosyayı uzun ve anlaşılır şekilde konu anlatımı gibi özetle. Başlıklar, önemli kavramlar, örnekler ve akılda kalıcı ipuçları ekle.";
    } else if (mode === "short") {
      instruction =
        "Bu dosyayı kısa, net ve sınav öncesi tekrar notu gibi özetle.";
    } else if (mode === "questions") {
      instruction =
        "Bu dosyadan çoktan seçmeli sorular üret. Her soruda A-B-C-D-E şıkları olsun. En altta cevap anahtarı ver.";
    } else if (mode === "solved") {
      instruction =
        "Bu dosyadan çözümlü sorular üret. Her sorunun altında adım adım çözümünü anlat.";
    } else {
      instruction =
        "Bu dosyayı anlaşılır şekilde özetle. Ana fikirleri, önemli başlıkları, sınavlık noktaları ve kısa tekrar bölümünü ver.";
    }

    if (extraQuestion) {
      instruction += `\n\nKullanıcının özel sorusu: ${extraQuestion}`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64,
                  },
                },
                {
                  text: instruction,
                },
              ],
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
        `Gemini PDF hata kodu: ${response.status}`;

      return NextResponse.json(
        {
          ok: false,
          message: "Kanka PDF özetleme takıldı. Gerçek hata: " + error,
          error,
        },
        { status: 500 }
      );
    }

    const result = extractText(data);

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          message: "Gemini PDF için boş cevap döndürdü.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "PDF route içinde beklenmeyen hata oldu: " +
          (error?.message || "Bilinmeyen hata"),
      },
      { status: 500 }
    );
  }
}
