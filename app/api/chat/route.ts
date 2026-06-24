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

const ROUTE_VERSION = "sirius-only-chat-v1-2026-06-24";

const SIRIUS_LYRA_URL =
  process.env.SIRIUS_LYRA_URL ||
  process.env.SIRIUS_CORE_URL ||
  "https://sirius-core-apii.vercel.app/api/lyra";

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

function makeResponse({
  ok,
  answer,
  status = 200,
  extra = {},
}: {
  ok: boolean;
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
      provider: "sirius-core-api",
      model: "sirius-lyra-brain",
      message: answer,
      content: answer,
      reply: answer,
      speakText: answer,
      ...extra,
    },
    { status }
  );
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

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "Lyra Chat API - Sirius Only",
    route: "api/chat",
    version: ROUTE_VERSION,
    provider: "sirius-core-api",
    siriusUrl: SIRIUS_LYRA_URL,
    geminiRemovedFromChat: true,
    deployedAt: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return makeResponse({
        ok: false,
        answer: "Kanka mesaj JSON formatında gelmedi.",
        status: 400,
      });
    }

    const userMessages = normalizeMessages(body);

    if (userMessages.length === 0) {
      return makeResponse({
        ok: false,
        answer: "Kanka bana boş mesaj geldi. Bir şey yazınca cevaplayacağım.",
        status: 400,
      });
    }

    const sirius = await callSiriusCore(userMessages);

return makeResponse({
  ok: true,
  answer:
    "TEST BAŞARILI KANKA ✅ /api/chat yeni Sirius route çalışıyor. Sirius'tan gelen ham cevap şuydu: " +
    sirius.answer,
  extra: {
    siriusUrl: SIRIUS_LYRA_URL,
    raw: sirius.raw,
  },
});
  } catch (error: any) {
    const finalMessage =
      "Kanka Lyra şu an Sirius Core API’ye bağlanamadı: " +
      (error?.message || "Bilinmeyen hata");

    return makeResponse({
      ok: false,
      answer: finalMessage,
      status: 500,
      extra: {
        siriusUrl: SIRIUS_LYRA_URL,
        error: error?.message || String(error),
      },
    });
  }
}
