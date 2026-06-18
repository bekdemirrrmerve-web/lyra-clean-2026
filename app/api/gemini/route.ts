import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSiriusBaseUrl() {
  return String(process.env.SIRIUS_BASE_URL || "").replace(/\/+$/, "");
}

function getSiriusApiKey() {
  return process.env.SIRIUS_API_KEY || "";
}

function getTextFromBody(body: any) {
  return String(
    body?.message ||
      body?.prompt ||
      body?.input ||
      body?.text ||
      body?.question ||
      body?.userMessage ||
      body?.content ||
      ""
  ).trim();
}

function hasImage(body: any) {
  return Boolean(
    body?.imageDataUrl ||
      body?.image ||
      body?.photo ||
      body?.file
  );
}

function normalizeText(value: string) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

function detectMode(message: string, body: any) {
  const explicitMode = String(body?.mode || body?.type || "").trim();
  const lower = normalizeText(message);

  if (explicitMode) return explicitMode;

  if (
    lower.includes("içerik") ||
    lower.includes("icerik") ||
    lower.includes("tiktok") ||
    lower.includes("reels") ||
    lower.includes("video") ||
    lower.includes("senaryo") ||
    lower.includes("hook") ||
    lower.includes("metin")
  ) {
    return "content";
  }

  if (
    lower.includes("araştır") ||
    lower.includes("arastir") ||
    lower.includes("kaynak") ||
    lower.includes("keşfet") ||
    lower.includes("kesfet") ||
    lower.includes("trend") ||
    lower.includes("revaçta") ||
    lower.includes("revacta") ||
    lower.includes("nedir") ||
    lower.includes("ne işe yarar") ||
    lower.includes("ne ise yarar") ||
    lower.includes("farkı") ||
    lower.includes("farki")
  ) {
    return "research";
  }

  if (
    lower.includes("konu öner") ||
    lower.includes("konu oner") ||
    lower.includes("fikir ver") ||
    lower.includes("ne önerirsin") ||
    lower.includes("ne onerirsin") ||
    lower.includes("cilt bakımı") ||
    lower.includes("cilt bakimi")
  ) {
    return "topic_suggest";
  }

  return "lyra";
}

function endpointForMode(mode: string) {
  if (mode === "research") return "/api/research";
  if (mode === "content") return "/api/content";
  if (mode === "local-search") return "/api/local-search";
  return "/api/lyra";
}

function okAnswer(answer: string, extra: Record<string, any> = {}) {
  return NextResponse.json({
    ok: true,
    from: "sirius-cloud",
    answer,
    reply: answer,
    text: answer,
    message: answer,
    content: answer,
    output: answer,
    result: answer,
    response: answer,
    ...extra,
  });
}

async function callSirius(
  endpoint: string,
  payload: Record<string, any>,
  options?: { method?: "GET" | "POST" }
) {
  const baseUrl = getSiriusBaseUrl();
  const apiKey = getSiriusApiKey();

  if (!baseUrl || !apiKey) {
    throw new Error(
      "SIRIUS_BASE_URL veya SIRIUS_API_KEY eksik. Vercel Environment Variables kısmını kontrol et."
    );
  }

  const method = options?.method || "POST";

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: method === "POST" ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  });

  const raw = await response.text();

  let data: any = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    const msg =
      data?.answer ||
      data?.message ||
      data?.error ||
      raw ||
      `Sirius API hata verdi: ${response.status}`;

    throw new Error(msg);
  }

  return data;
}

async function buildTopicSuggestion(message: string) {
  let topics: any[] = [];

  try {
    const data = await callSirius("/api/topics", {}, { method: "GET" });
    topics = Array.isArray(data?.topics) ? data.topics : [];
  } catch {
    topics = [];
  }

  const topicNames = topics.map((t) => t?.name).filter(Boolean);

  const hasRetinol = topicNames.some((x) =>
    String(x).toLowerCase().includes("retinol")
  );

  const ideas = [
    "Güneş kreminde sadece SPF’ye bakmak neden yetmez?",
    "Niasinamid gerçekten gözenekleri küçültür mü, yoksa algı mı?",
    "Retinol kullanırken yapılan 3 büyük hata",
    "Kepek sandığın şey aslında seboreik dermatit olabilir mi?",
    "Cilt bariyeri bozulunca cilt neden her şeye tepki verir?",
    "Aynı anda çok aktif kullanmak cildi neden yorabilir?",
  ];

  if (!hasRetinol) {
    ideas[2] = "Retinol nedir ve neden herkes aynı şekilde kullanmamalı?";
  }

  const answer = [
    "Kanka cilt bakımı için keşfete oynayacak birkaç konu öneriyorum:",
    "",
    ...ideas.map((idea, index) => `${index + 1}) ${idea}`),
    "",
    "Ben olsam bugün en güçlü olanı şunu seçerdim:",
    "“Retinol kullanırken yapılan 3 büyük hata”",
    "",
    "Çünkü hem merak uyandırıyor, hem kaydedilebilir, hem de yorum getirir.",
    "",
    "İstersen bunu direkt 1 dakikalık TikTok metnine çevirebilirim.",
  ].join("\n");

  return okAnswer(answer, {
    mode: "topic_suggest",
    availableTopics: topicNames,
    source: "sirius-topic-suggestion",
  });
}

export async function GET(req: NextRequest) {
  const baseUrl = getSiriusBaseUrl();
  const hasApiKey = Boolean(getSiriusApiKey());

  const { searchParams } = new URL(req.url);
  const test = searchParams.get("test") || "retinol ciltte ne işe yarar?";

  if (!baseUrl || !hasApiKey) {
    return NextResponse.json(
      {
        ok: false,
        route: "/api/gemini",
        bridge: "sirius-cloud",
        hasSiriusBaseUrl: Boolean(baseUrl),
        hasSiriusApiKey: hasApiKey,
        error:
          "SIRIUS_BASE_URL veya SIRIUS_API_KEY bulunamadı. Vercel Environment Variables kısmını kontrol et.",
      },
      { status: 500 }
    );
  }

  try {
    const data = await callSirius("/api/research", {
      message: test,
      query: test,
    });

    const answer =
      data?.answer ||
      data?.script ||
      data?.message ||
      "Sirius cevap döndürdü ama okunacak metin bulunamadı.";

    return okAnswer(answer, {
      route: "/api/gemini",
      bridge: "sirius-cloud",
      test,
      sirius: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        route: "/api/gemini",
        bridge: "sirius-cloud",
        error: error?.message || "Sirius test hatası.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = getTextFromBody(body);

    if (hasImage(body)) {
      return okAnswer(
        "Kanka şu an Lyra’nın görsel analizi Gemini tarafındaydı; bu route’u Sirius Cloud’a bağladık. Görsel okuma modunu ayrıca Sirius’a ekleyeceğiz. Şimdilik yazılı mesajla devam edebilirim.",
        {
          mode: "image_not_supported_yet",
          bridge: "sirius-cloud",
        }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          ok: false,
          error: "empty_message",
          answer: "Kanka mesaj boş geldi.",
        },
        { status: 400 }
      );
    }

    const mode = detectMode(message, body);

    if (mode === "topic_suggest") {
      return await buildTopicSuggestion(message);
    }

    const endpoint = endpointForMode(mode);

    const data = await callSirius(endpoint, {
      message,
      query: message,
      mode,
    });

    const answer =
      data?.answer ||
      data?.script ||
      data?.message ||
      data?.text ||
      "Sirius cevap döndürdü ama okunacak metin bulunamadı.";

    return okAnswer(answer, {
      route: "/api/gemini",
      bridge: "sirius-cloud",
      mode,
      endpoint,
      sirius: data,
    });
  } catch (error: any) {
    const answer =
      "Kanka Sirius'a bağlanırken sorun oldu: " +
      (error?.message || "bilinmeyen hata");

    return NextResponse.json(
      {
        ok: false,
        error: "sirius_bridge_error",
        answer,
        reply: answer,
        text: answer,
        message: answer,
        content: answer,
        detail: error?.message || "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}
