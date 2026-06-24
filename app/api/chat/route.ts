import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SafeRole = "user" | "assistant";

type ClientMessage = {
  role?: string;
  content?: string;
};

type NormalizedMessage = {
  role: SafeRole;
  content: string;
};

const ROUTE_VERSION = "sirius-chat-bridge-v3-2026-06-24";

const SIRIUS_LYRA_URL =
  process.env.SIRIUS_LYRA_URL ||
  process.env.SIRIUS_CORE_URL ||
  "https://sirius-core-apii.vercel.app/api/lyra";

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

function normalizeMessages(body: any): NormalizedMessage[] {
  const messagesFromClient = Array.isArray(body?.messages) ? body.messages : [];

  const normalized = messagesFromClient
    .map((msg: ClientMessage) => ({
      role: normalizeRole(msg?.role),
      content: cleanText(msg?.content),
    }))
    .filter((msg: NormalizedMessage) => msg.content.length > 0)
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

function getLastUserMessage(messages: NormalizedMessage[]): string {
  return [...messages].reverse().find((msg) => msg.role === "user")?.content || "";
}

function pickAnswer(data: any): string {
  return (
    cleanText(data?.reply) ||
    cleanText(data?.message) ||
    cleanText(data?.content) ||
    cleanText(data?.answer) ||
    cleanText(data?.text) ||
    cleanText(data?.speakText) ||
    cleanText(data?.data?.reply) ||
    cleanText(data?.data?.message) ||
    cleanText(data?.data?.content) ||
    cleanText(data?.result?.reply) ||
    cleanText(data?.result?.message)
  );
}

function makeLyraResponse({
  ok,
  provider,
  model,
  answer,
  status = 200,
  extra = {},
}: {
  ok: boolean;
  provider: string;
  model?: string;
  answer: string;
  status?: number;
  extra?: Record<string, any>;
}) {
  return NextResponse.json(
    {
      ok,
      route: "api/chat",
      version: ROUTE_VERSION,
      role: "assistant",
      assistant: "Lyra",
      provider,
      model,
      message: answer,
      content: answer,
      reply: answer,
      speakText: answer,
      ...extra,
    },
    { status }
  );
}

function buildGeminiPrompt(messages: NormalizedMessage[]) {
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

async function callSiriusCore(messages: NormalizedMessage[]) {
  const lastUserMessage = getLastUserMessage(messages);

  if (!lastUserMessage) {
    throw new Error("Sirius'a gönderilecek kullanıcı mesajı bulunamadı.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const siriusResponse = await fetch(SIRIUS_LYRA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: lastUserMessage,
        text: lastUserMessage,
        prompt: lastUserMessage,
        userMessage: lastUserMessage,
        messages,
        mode: "chat",
        source: "lyra-clean-2026",
        clientRoute: "/api/chat",
        user: "Merve",
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const data = await siriusResponse.json().catch(() => null);

    if (!siriusResponse.ok) {
      const realError =
        data?.error ||
        data?.message ||
        data?.reply ||
        `Sirius Core API hata kodu: ${siriusResponse.status}`;

      throw new Error(String(realError));
    }

    const answer = pickAnswer(data);

    if (!answer) {
      throw new Error("Sirius Core API boş cevap döndürdü.");
    }

    return {
      answer,
      raw: data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callGeminiFallback(messages: NormalizedMessage[]) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Sirius cevap vermedi, ayrıca GEMINI_API_KEY yok. Bu yüzden Gemini fallback çalışamadı."
    );
  }

  const promptText = buildGeminiPrompt(messages);

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
      cache: "no-store",
    }
  );

  const data = await geminiResponse.json().catch(() => null);

  if (!geminiResponse.ok) {
    const realError =
      data?.error?.message ||
      data?.message ||
      `Gemini API hata kodu: ${geminiResponse.status}`;

    throw new Error(String(realError));
  }

  const answer = extractGeminiText(data);

  if (!answer) {
    throw new Error("Gemini boş cevap döndürdü.");
  }

  return {
    answer,
    raw: data,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "Lyra Chat API - Sirius Bridge",
    route: "api/chat",
    version: ROUTE_VERSION,
    primaryProvider: "sirius-core-api",
    fallbackProvider: "gemini",
    siriusUrl: SIRIUS_LYRA_URL,
    geminiModel: GEMINI_MODEL,
    hasGeminiKey: Boolean(GEMINI_API_KEY),
    deployedAt: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return makeLyraResponse({
        ok: false,
        provider: "none",
        answer: "Kanka mesaj JSON formatında gelmedi.",
        status: 400,
      });
    }

    const userMessages = normalizeMessages(body);

    if (userMessages.length === 0) {
      return makeLyraResponse({
        ok: false,
        provider: "none",
        answer: "Kanka bana boş mesaj geldi. Bir şey yazınca cevaplayacağım.",
        status: 400,
      });
    }

    try {
      const sirius = await callSiriusCore(userMessages);

      return makeLyraResponse({
        ok: true,
        provider: "sirius-core-api",
        model: "sirius-lyra-brain",
        answer: sirius.answer,
        extra: {
          siriusUrl: SIRIUS_LYRA_URL,
          raw: sirius.raw,
        },
      });
    } catch (siriusError: any) {
      try {
        const gemini = await callGeminiFallback(userMessages);

        return makeLyraResponse({
          ok: true,
          provider: "gemini-fallback",
          model: GEMINI_MODEL,
          answer: gemini.answer,
          extra: {
            warning:
              "Sirius Core API cevap vermediği için Gemini fallback kullanıldı.",
            siriusUrl: SIRIUS_LYRA_URL,
            siriusError: siriusError?.message || "Bilinmeyen Sirius hatası",
          },
        });
      } catch (geminiError: any) {
        const finalMessage =
          "Kanka Lyra şu an cevap üretemedi. Sirius Core API hatası: " +
          (siriusError?.message || "Bilinmeyen hata") +
          " | Gemini fallback hatası: " +
          (geminiError?.message || "Bilinmeyen hata");

        return makeLyraResponse({
          ok: false,
          provider: "none",
          answer: finalMessage,
          status: 500,
          extra: {
            siriusUrl: SIRIUS_LYRA_URL,
            siriusError: siriusError?.message || "Bilinmeyen Sirius hatası",
            geminiError: geminiError?.message || "Bilinmeyen Gemini hatası",
          },
        });
      }
    }
  } catch (error: any) {
    const finalMessage =
      "Kanka route içinde beklenmeyen hata oldu: " +
      (error?.message || "Bilinmeyen hata");

    return makeLyraResponse({
      ok: false,
      provider: "route-error",
      answer: finalMessage,
      status: 500,
    });
  }
}
