import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SafeRole = "user" | "assistant";

type ClientMessage = {
  role?: string;
  content?: string;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const LYRA_SYSTEM_PROMPT = `
Sen Lyra Clean 2026'sın.

Türkçe konuşan, sıcak, doğal, akıcı, zeki ve destekleyici bir asistansın.
Kullanıcıyla robot gibi değil, yakın arkadaş gibi konuşursun.
Cevapların pratik, yaratıcı, anlaşılır ve doğrudan işe yarar olur.

Asla:
- "Duydum" diye başlama.
- Kullanıcının mesajını tekrar edip bırakma.
- "Ben bir botum" gibi soğuk cevap verme.
- Gereksiz resmi konuşma.
- Boş ve genel cevaplarla geçiştirme.

Mutlaka:
- Kullanıcı soru sorarsa doğrudan cevap ver.
- İçerik üretimi, kozmetik, kimya, INCI, formül, cilt bakımı, ders çalışma, araştırma, uygulama geliştirme ve günlük planlama konularında yardımcı ol.
- Kullanıcı teknik sorun anlatırsa sakin, net ve adım adım çöz.
- Kullanıcı içerik fikri isterse hook, video akışı, başlık, CTA ve fikir üret.

Cevap dili:
- Daima Türkçe.
- Samimi.
- Gerektiğinde "kanka" diyebilirsin.
- Ama yapay, abartılı veya çocukça olma.
`;

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeRole(role: unknown): SafeRole {
  return role === "assistant" ? "assistant" : "user";
}

function normalizeMessages(body: any): Array<{ role: SafeRole; content: string }> {
  const messagesFromClient = Array.isArray(body?.messages) ? body.messages : [];

  const normalized = messagesFromClient
    .map((msg: ClientMessage) => ({
      role: normalizeRole(msg?.role),
      content: cleanText(msg?.content),
    }))
    .filter((msg: { role: SafeRole; content: string }) => msg.content.length > 0)
    .slice(-14);

  const directMessage =
    cleanText(body?.message) ||
    cleanText(body?.input) ||
    cleanText(body?.prompt) ||
    cleanText(body?.text) ||
    cleanText(body?.userMessage);

  if (normalized.length === 0 && directMessage) {
    return [{ role: "user", content: directMessage }];
  }

  const lastMessage = normalized[normalized.length - 1]?.content;

  if (directMessage && directMessage !== lastMessage) {
    normalized.push({
      role: "user",
      content: directMessage,
    });
  }

  return normalized;
}

function buildGeminiPrompt(messages: Array<{ role: SafeRole; content: string }>) {
  const conversation = messages
    .map((m) => {
      const who = m.role === "user" ? "Kullanıcı" : "Lyra";
      return `${who}: ${m.content}`;
    })
    .join("\n\n");

  return `${LYRA_SYSTEM_PROMPT}

Aşağıdaki konuşmaya göre sadece Lyra'nın son cevabını yaz.
Kullanıcının mesajını tekrar etme.
Doğrudan cevap ver.

${conversation}

Lyra:`;
}

function extractGeminiText(data: any): string {
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
    name: "Lyra Chat API",
    model: GEMINI_MODEL,
    hasGeminiKey: Boolean(GEMINI_API_KEY),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        {
          ok: false,
          message: "Kanka mesaj JSON formatında gelmedi.",
        },
        { status: 400 }
      );
    }

    const userMessages = normalizeMessages(body);

    if (userMessages.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Kanka bana boş mesaj geldi. Bir şey yazınca cevaplayacağım.",
        },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Kanka GEMINI_API_KEY eksik. Vercel Environment Variables kısmına ekleyip redeploy yapman lazım.",
        },
        { status: 500 }
      );
    }

    const promptText = buildGeminiPrompt(userMessages);

    const geminiResponse = await fetch(
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
                  text: promptText,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 900,
          },
        }),
      }
    );

    const data = await geminiResponse.json().catch(() => null);

    if (!geminiResponse.ok) {
      const realError =
        data?.error?.message ||
        data?.message ||
        `Gemini API hata kodu: ${geminiResponse.status}`;

      return NextResponse.json(
        {
          ok: false,
          message: "Kanka Gemini bağlantısı takıldı. Gerçek hata şu: " + realError,
          error: realError,
        },
        { status: 500 }
      );
    }

    const answer = extractGeminiText(data);

    if (!answer) {
      return NextResponse.json(
        {
          ok: false,
          message: "Kanka Gemini boş cevap döndürdü.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      role: "assistant",
      assistant: "Lyra",
      provider: "gemini",
      model: GEMINI_MODEL,
      message: answer,
      content: answer,
      reply: answer,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Kanka route içinde beklenmeyen hata oldu: " +
          (error?.message || "Bilinmeyen hata"),
      },
      { status: 500 }
    );
  }
}
