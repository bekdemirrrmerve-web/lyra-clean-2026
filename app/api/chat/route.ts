import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SafeRole = "user" | "assistant";

type ClientMessage = {
  role?: string;
  content?: string;
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Bunu özellikle daha stabil yaptım.
// Vercel'de OPENAI_MODEL yazmana gerek yok.
// İstersen sonra değiştiririz ama şimdilik bu şekilde kalsın.
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

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
- Cevapların ChatGPT gibi akıcı, fikir veren ve toparlayıcı olsun.

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
    .slice(-20);

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

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "Lyra Clean 2026 API",
    status: "Route çalışıyor.",
    model: OPENAI_MODEL,
    hasApiKey: Boolean(OPENAI_API_KEY),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        {
          ok: false,
          message: "Kanka mesaj JSON formatında gelmedi. Frontend isteğini kontrol etmemiz lazım.",
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

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Kanka OPENAI_API_KEY eksik. Vercel > Project Settings > Environment Variables kısmına OPENAI_API_KEY ekleyip redeploy yapman lazım.",
        },
        { status: 500 }
      );
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.75,
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content: LYRA_SYSTEM_PROMPT,
          },
          ...userMessages,
        ],
      }),
    });

    const data = await openaiResponse.json().catch(() => null);

    if (!openaiResponse.ok) {
      const realError =
        data?.error?.message ||
        data?.message ||
        `OpenAI API hata kodu: ${openaiResponse.status}`;

      console.error("Lyra OpenAI API error:", realError);

      return NextResponse.json(
        {
          ok: false,
          message:
            "Kanka OpenAI bağlantısı takıldı. Gerçek hata şu: " + realError,
          error: realError,
        },
        { status: 500 }
      );
    }

    const answer = cleanText(data?.choices?.[0]?.message?.content);

    if (!answer) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Kanka OpenAI boş cevap döndürdü. Model cevap verdi ama içerik alanı boş geldi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      role: "assistant",
      assistant: "Lyra",
      message: answer,
      content: answer,
      reply: answer,
    });
  } catch (error: any) {
    console.error("Lyra route fatal error:", error);

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
