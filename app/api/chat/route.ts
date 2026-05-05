import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function jsonReply(text: string, success = true, extra: any = {}) {
  return NextResponse.json(
    {
      reply: text,
      answer: text,
      text: text,
      message: text,
      content: text,
      success,
      ...extra,
    },
    { status: 200 }
  );
}

function extractText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;

  if (Array.isArray(parts)) {
    return parts
      .map((part: any) => part?.text || "")
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return "";
}

async function getWorkingGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await res.json();

    if (!res.ok || !Array.isArray(data?.models)) {
      return [];
    }

    const usableModels = data.models
      .filter((model: any) => {
        const methods = model?.supportedGenerationMethods || [];
        return methods.includes("generateContent");
      })
      .map((model: any) => model?.name)
      .filter(Boolean);

    const flashModels = usableModels.filter((name: string) =>
      name.toLowerCase().includes("flash")
    );

    const otherModels = usableModels.filter(
      (name: string) => !name.toLowerCase().includes("flash")
    );

    return [...flashModels, ...otherModels];
  } catch {
    return [];
  }
}

async function callGemini(modelName: string, apiKey: string, prompt: string) {
  const cleanModelName = modelName.startsWith("models/")
    ? modelName
    : `models/${modelName}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${cleanModelName}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.85,
          topP: 0.95,
          maxOutputTokens: 1600,
        },
      }),
    }
  );

  const data = await res.json();

  return {
    ok: res.ok,
    data,
    error: data?.error?.message || "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userMessage =
      body?.message ||
      body?.text ||
      body?.prompt ||
      body?.content ||
      body?.input ||
      "";

    const memory = Array.isArray(body?.memory) ? body.memory : [];

    if (!userMessage || typeof userMessage !== "string") {
      return jsonReply("Kanka mesajı alamadım, bir daha yazar mısın?", false);
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return jsonReply(
        "Kanka GEMINI_API_KEY eksik. Vercel > Project Settings > Environment Variables kısmına GEMINI_API_KEY ekleyip tekrar deploy yapman lazım.",
        false
      );
    }

    const systemPrompt = `
Sen Lyra'sın.

Türkçe konuşan, sıcak, doğal, samimi ve akıllı bir yapay zeka asistansın.
Kullanıcıya yakın arkadaş gibi ama bilgili ve net cevap ver.
Kullanıcının mesajını tekrar etme.
"Duydum" deme.
"Cevap geldi ama ekrana aktarılamadı" deme.
Teknik hata yoksa teknik açıklama yapma.
Kısa soruya kısa, detay isteyen soruya detaylı cevap ver.
İçerik üretimi, kozmetik, formül, cilt bakımı, DGS, araştırma, uygulama geliştirme, günlük sohbet ve fikir üretimi konularında destek ol.
Cevapların işe yarar, akıcı, gerçek sohbet gibi ve anlaşılır olsun.
`;

    const memoryText =
      memory.length > 0
        ? `Kullanıcının kısa hafızası: ${memory.join(", ")}`
        : "Kısa hafıza boş.";

    const finalPrompt = `
${systemPrompt}

${memoryText}

Kullanıcının mesajı:
${userMessage}

Lyra'nın cevabı:
`;

    const envModel = process.env.GEMINI_MODEL;

    const fallbackModels = [
      "models/gemini-2.0-flash",
      "models/gemini-2.5-flash",
      "models/gemini-2.5-flash-lite",
      "models/gemini-flash-latest"
    ];

    const listedModels = await getWorkingGeminiModels(apiKey);

    const modelsToTry = [
      ...(envModel ? [envModel] : []),
      ...listedModels,
      ...fallbackModels,
    ];

    const uniqueModels = Array.from(new Set(modelsToTry));

    let lastError = "";
    const triedModels: string[] = [];

    for (const model of uniqueModels) {
      triedModels.push(model);

      const result = await callGemini(model, apiKey, finalPrompt);

      if (result.ok) {
        const answer = extractText(result.data);

        if (answer) {
          return jsonReply(answer, true, {
            usedModel: model,
          });
        }

        lastError = `${model}: cevap geldi ama metin boştu.`;
      } else {
        lastError = `${model}: ${result.error}`;
      }
    }

    return jsonReply(
      `Kanka Gemini bağlantısı takıldı. Çalışan model bulunamadı. Son hata: ${lastError}`,
      false,
      {
        triedModels,
      }
    );
  } catch (error: any) {
    return jsonReply(
      `Kanka sistem takıldı: ${error?.message || "Bilinmeyen hata"}`,
      false
    );
  }
}

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        status: "GEMINI_API_KEY eksik.",
      });
    }

    const models = await getWorkingGeminiModels(apiKey);

    return NextResponse.json({
      ok: true,
      status: "Lyra API çalışıyor.",
      availableModels: models,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      status: "Lyra API test edilirken hata oldu.",
      error: error?.message || "Bilinmeyen hata",
    });
  }
}
