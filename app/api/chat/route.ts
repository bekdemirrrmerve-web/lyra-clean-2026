import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SafeRole = "user" | "assistant";

type ClientMessage = {
  role?: string;
  content?: string;
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Vercel Environment Variables kısmına OPENAI_MODEL eklemezsen bunu kullanır.
// Daha ekonomik/hızlı olsun diye mini seçtim. İstersen Vercel'den OPENAI_MODEL=gpt-5.5 yapabilirsin.
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

const LYRA_SYSTEM_PROMPT = `
Sen Lyra Clean 2026'sın.

Kimliğin:
- Türkçe konuşan, doğal, sıcak, sezgisel, zeki ve destekleyici bir kişisel asistansın.
- Kullanıcıyla robot gibi değil, yakın arkadaş gibi konuşursun.
- Cevapların canlı, akıcı, yaratıcı, pratik ve uygulanabilir olur.
- Gerektiğinde "kanka" tonuna yaklaşabilirsin ama abartılı, çocukça veya yapay konuşmazsın.
- Kullanıcı Merve gibi içerik üreten, kimya/kozmetik/INCI/formülasyon, sosyal medya, araştırma, ders çalışma, uygulama geliştirme ve günlük planlama konularında destek isteyen biri olabilir. Buna göre uzman ama samimi davran.

Asla yapma:
- Kullanıcının mesajını tekrar edip bırakma.
- "Ben bir botum", "Size nasıl yardımcı olabilirim?", "Anladım, başka ne istersiniz?" gibi soğuk bot cümleleri kurma.
- Kullanıcı senden fikir istediğinde boş ve genel cevap verme.
- Sadece tek cümlelik geçiştirme cevapları verme.
- Kullanıcı bir sorun anlattığında onu suçlama veya teknik terimlerle boğma.
- Kendini gereksiz yere yapay zeka olarak tanıtma.
- Aynı cümleleri tekrar etme.
- Kullanıcının yazdığı şeyi assistant cevabı gibi aynen geri basma.

Mutlaka yap:
- Kullanıcı içerik fikri isterse hook, video akışı, teleprompter metni, CTA, başlık ve gerekiyorsa hashtag üret.
- Kozmetik, cilt bakım, kimya, INCI, aktif içerikler, formül ve ev tipi tariflerde anlaşılır ama güvenli konuş.
- Ev tipi formül istenirse güvenli sınırları, hijyen, pH, koruyucu ve alerji uyarısını kısa ve net belirt.
- Uygulama/kod sorunu anlatılırsa panikletmeden adım adım çözüm ver.
- Kullanıcı “tek kod”, “tek prompt”, “komple sil yapıştır” isterse doğrudan kullanılabilir tek parça çıktı ver.
- Kullanıcı araştırma isterse sade, güncel ve anlaşılır özetle.
- Kullanıcı günlük, moral, kararsızlık, kombin, makyaj, içerik veya iş fikri konuşursa sıcak, yakın ve fikir veren biri gibi davran.
- Gerekirse "Ben olsam..." diyerek net ama nazik görüş belirt.

Cevap stili:
- Daima Türkçe cevap ver.
- Samimi, sıcak, doğal ve akıcı ol.
- Gerektiğinde kısa, gerektiğinde detaylı anlat.
- Kullanıcının enerjisine uyum sağla.
- Cevabın sonunda gereksiz resmi kapanışlar yapma.
- Kullanıcı teknik bir sorunla geldiyse önce sorunu çöz, sonra kısa kontrol adımı ver.

Özel Lyra davranışı:
- Lyra, sıradan bir chatbot değildir.
- Lyra; içerik üretim asistanı, kimya/kozmetik destekçisi, ders çalışma koçu, araştırma yardımcısı, yaratıcı fikir ortağı ve günlük hayat asistanı gibi davranır.
- Cevap verirken "bot cevabı" değil, insan gibi düşünen, toparlayan ve pratik çözüm sunan bir arkadaş enerjisi verir.
`;

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function normalizeRole(role: unknown): SafeRole {
  if (role === "assistant") return "assistant";
  return "user";
}

function normalizeMessages(body: any): Array<{ role: SafeRole; content: string }> {
  const messagesFromClient = Array.isArray(body?.messages) ? body.messages : [];

  const normalized = messagesFromClient
    .map((msg: ClientMessage) => ({
      role: normalizeRole(msg?.role),
      content: cleanText(msg?.content),
    }))
    .filter((msg: { role: SafeRole; content: string }) => msg.content.length > 0)
    .slice(-24);

  const directMessage =
    cleanText(body?.message) ||
    cleanText(body?.input) ||
    cleanText(body?.prompt) ||
    cleanText(body?.text) ||
    cleanText(body?.userMessage);

  if (normalized.length === 0 && directMessage) {
    return [{ role: "user", content: directMessage }];
  }

  const lastClientMessage = normalized[normalized.length - 1]?.content;
  if (directMessage && directMessage !== lastClientMessage) {
    normalized.push({ role: "user", content: directMessage });
  }

  return normalized;
}

function friendlyFallback(errorMessage?: string) {
  const detail =
    process.env.NODE_ENV === "development" && errorMessage
      ? `\n\nGeliştirici notu: ${errorMessage}`
      : "";

  return {
    role: "assistant",
    content:
      "Kanka şu an Lyra cevap motoruna bağlanırken takıldı. Bu genelde API anahtarı, model adı ya da Vercel environment ayarından olur. Mesajını anladım ama düzgün cevap üretemedim; ayarı düzeltince direkt akıcı cevap vermeye devam edeceğim." +
      detail,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "Lyra Clean 2026 API",
    status: "Route çalışıyor kanka.",
    model: OPENAI_MODEL,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        {
          error: "Geçersiz istek.",
          message: friendlyFallback("Body JSON formatında gelmedi.").content,
        },
        { status: 400 }
      );
    }

    const userMessages = normalizeMessages(body);

    if (userMessages.length === 0) {
      return NextResponse.json(
        {
          error: "Boş mesaj.",
          message:
            "Kanka bana bir mesaj göndermen lazım ki Lyra cevap üretebilsin.",
        },
        { status: 400 }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "OPENAI_API_KEY eksik.",
          message:
            "Kanka Vercel'de OPENAI_API_KEY eksik görünüyor. Project Settings > Environment Variables kısmına OPENAI_API_KEY ekleyip redeploy yapman lazım.",
        },
        { status: 500 }
      );
    }

    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.8,
        max_tokens: 1200,
        messages: [
          {
            role: "developer",
            content: LYRA_SYSTEM_PROMPT,
          },
          ...userMessages,
        ],
      }),
    });

    const data = await openAIResponse.json().catch(() => null);

    if (!openAIResponse.ok) {
      const apiError =
        data?.error?.message ||
        data?.message ||
        `OpenAI API hata kodu: ${openAIResponse.status}`;

      console.error("Lyra OpenAI API error:", apiError);

      return NextResponse.json(
        {
          error: apiError,
          message: friendlyFallback(apiError).content,
        },
        { status: 500 }
      );
    }

    const answer = cleanText(data?.choices?.[0]?.message?.content);

    if (!answer) {
      return NextResponse.json(
        {
          error: "Model boş cevap döndürdü.",
          message: friendlyFallback("OpenAI cevabı boş geldi.").content,
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
        error: error?.message || "Bilinmeyen route hatası.",
        message: friendlyFallback(error?.message).content,
      },
      { status: 500 }
    );
  }
}
