export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SourceItem = {
  title: string;
  url: string;
};

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function extractText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part: any) => part?.text || "").join("\n").trim();
}

function extractSources(data: any): SourceItem[] {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  const sources = chunks
    .map((chunk: any) => ({
      title: clean(chunk?.web?.title),
      url: clean(chunk?.web?.uri),
    }))
    .filter((source: SourceItem) => source.title || source.url);

  const seen = new Set<string>();

  return sources.filter((source: SourceItem) => {
    const key = source.url || source.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function callGeminiSearch(query: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      answer:
        "GEMINI_API_KEY bulunamadı kanka. Vercel Environment Variables içinde GEMINI_API_KEY ekli olmalı.",
      sources: [],
      model: null,
    };
  }

  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
  let lastError = "";

  const prompt = `
Sen Lyra adında Türkçe konuşan, sade ve güvenilir bir araştırma asistanısın.

Kullanıcının araştırma isteği:
"${query}"

Görevin:
- Gerekiyorsa Google Search grounding kullanarak güncel web bilgisiyle cevap ver.
- Kullanıcının istemediği sürece teleprompter, reklam metni veya sosyal medya metni yazma.
- Sadece araştırma sonucunu anlat.
- Bilgin kesin değilse kesinmiş gibi söyleme.
- Cevabı Türkçe, net ve anlaşılır yaz.
- Sonuna kısa "Kaynak notu" ekle.
`;

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            tools: [
              {
                google_search: {},
              },
            ],
            generationConfig: {
              temperature: 0.25,
              topP: 0.9,
              maxOutputTokens: 1800,
            },
          }),
          cache: "no-store",
        }
      );

      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;

      if (!res.ok) {
        lastError =
          data?.error?.message ||
          `Gemini ${model} hata verdi. HTTP ${res.status}`;
        continue;
      }

      const answer = extractText(data);
      const sources = extractSources(data);

      if (!answer) {
        lastError = `Gemini ${model} boş cevap döndürdü.`;
        continue;
      }

      return {
        ok: true,
        answer,
        sources,
        model,
      };
    } catch (error: any) {
      lastError = error?.message || String(error);
    }
  }

  return {
    ok: false,
    answer:
      "Online araştırma cevabı alamadım kanka. Gemini kotası, model erişimi veya billing tarafı takılmış olabilir. Hata: " +
      lastError,
    sources: [],
    model: null,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = clean(body?.query || body?.message);

    if (!query) {
      return Response.json(
        {
          ok: false,
          answer: "Araştırmam için bir şey yazman gerekiyor kanka.",
          sources: [],
        },
        { status: 400 }
      );
    }

    const result = await callGeminiSearch(query);

    return Response.json({
      ok: result.ok,
      query,
      answer: result.answer,
      sources: result.sources,
      model: result.model,
      sourceCount: result.sources.length,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        answer:
          "Araştırma route’unda hata oluştu kanka. app/api/search/route.ts dosyasını ve GEMINI_API_KEY ayarını kontrol edelim.",
        error: error?.message || String(error),
        sources: [],
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    route: "/api/search",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    message: "Search route hazır kanka.",
  });
}
