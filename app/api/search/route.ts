export const runtime = "nodejs";

type SearchSource = {
  title: string;
  url: string;
  snippet: string;
  engine: string;
};

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueByUrl(items: SearchSource[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function searchBrave(query: string): Promise<SearchSource[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "8");
  url.searchParams.set("country", "TR");
  url.searchParams.set("search_lang", "tr");
  url.searchParams.set("safesearch", "moderate");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": key,
    },
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = await res.json();
  const results = data?.web?.results ?? [];

  return results.map((item: any) => ({
    title: cleanText(item?.title),
    url: cleanText(item?.url),
    snippet: cleanText(item?.description),
    engine: "Brave",
  }));
}

async function searchTavily(query: string): Promise<SearchSource[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      query,
      topic: "general",
      search_depth: "advanced",
      max_results: 8,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
    }),
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = await res.json();
  const results = data?.results ?? [];

  return results.map((item: any) => ({
    title: cleanText(item?.title),
    url: cleanText(item?.url),
    snippet: cleanText(item?.content),
    engine: "Tavily",
  }));
}

async function searchExa(query: string): Promise<SearchSource[]> {
  const key = process.env.EXA_API_KEY;
  if (!key) return [];

  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({
      query,
      numResults: 8,
      type: "auto",
      contents: {
        highlights: true,
        summary: true,
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = await res.json();
  const results = data?.results ?? [];

  return results.map((item: any) => ({
    title: cleanText(item?.title),
    url: cleanText(item?.url),
    snippet: cleanText(
      item?.summary ||
        item?.highlights?.join(" ") ||
        item?.text ||
        item?.description
    ),
    engine: "Exa",
  }));
}

async function summarizeWithGemini(query: string, sources: SearchSource[]) {
  const key = process.env.GEMINI_API_KEY;

  if (!sources.length) {
    return "Bu konu için bağlı arama kaynaklarından sonuç alamadım. Arama API anahtarı eksik olabilir veya servis cevap vermemiş olabilir.";
  }

  const sourceText = sources
    .slice(0, 10)
    .map(
      (s, i) =>
        `${i + 1}. Başlık: ${s.title}\nKaynak: ${s.engine}\nURL: ${s.url}\nÖzet: ${s.snippet}`
    )
    .join("\n\n");

  if (!key) {
    return `Kaynaklardan ilk bulguları topladım kanka. Gemini özeti kapalı olduğu için ham araştırma özetini veriyorum:\n\n${sources
      .slice(0, 5)
      .map((s, i) => `${i + 1}. ${s.title}\n${s.snippet}`)
      .join("\n\n")}`;
  }

  const prompt = `
Sen Lyra adında Türkçe konuşan araştırma asistanısın.

Kullanıcının araştırma sorusu:
"${query}"

Aşağıda web arama kaynaklarından gelen sonuçlar var:
${sourceText}

Görevin:
- Kaynaklara dayanarak Türkçe, sade ve güvenilir bir cevap yaz.
- Emin olmadığın şeyi kesinmiş gibi söyleme.
- Güncel bilgi gerekiyorsa kaynakların tarih/güncellik sınırlaması olabileceğini belirt.
- Cevabın sonunda "Kaynaklar" başlığı altında kullanılan kaynakları numaralı ver.
- Reklam dili kullanma.
- Gereksiz teleprompter/metin üretme, sadece araştırma sonucu ver.
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return `Araştırma kaynaklarını topladım ama Gemini özetleyemedi. Ham bulgular:\n\n${sources
      .slice(0, 5)
      .map((s, i) => `${i + 1}. ${s.title}\n${s.snippet}`)
      .join("\n\n")}`;
  }

  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Araştırma yapıldı ama özet metni üretilemedi."
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = cleanText(body?.query || body?.message);

    if (!query) {
      return Response.json(
        {
          ok: false,
          answer: "Araştırma için bir soru yazman gerekiyor.",
          sources: [],
        },
        { status: 400 }
      );
    }

    const settled = await Promise.allSettled([
      searchBrave(query),
      searchTavily(query),
      searchExa(query),
    ]);

    const sources = uniqueByUrl(
      settled.flatMap((result) =>
        result.status === "fulfilled" ? result.value : []
      )
    ).slice(0, 18);

    const answer = await summarizeWithGemini(query, sources);

    return Response.json({
      ok: true,
      query,
      answer,
      sources,
      usedEngines: Array.from(new Set(sources.map((s) => s.engine))),
      sourceCount: sources.length,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        answer:
          "Araştırma altyapısında hata oluştu. API anahtarları, route dosyası veya servis cevapları kontrol edilmeli.",
        error: error?.message || String(error),
        sources: [],
      },
      { status: 500 }
    );
  }
}
