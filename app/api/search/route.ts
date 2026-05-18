import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchSource = "Brave" | "Tavily" | "Exa" | "DuckDuckGo" | "Wikipedia";

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: SearchSource;
};

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQuery(body: any): string {
  return (
    cleanText(body?.query) ||
    cleanText(body?.message) ||
    cleanText(body?.prompt) ||
    cleanText(body?.text) ||
    ""
  );
}

function uniqueResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();

  return results.filter((item) => {
    if (!item.url) return false;

    const normalized = item.url.split("?")[0].toLowerCase();

    if (seen.has(normalized)) return false;

    seen.add(normalized);
    return true;
  });
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 9000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "LyraClean/1.0 contact: no-email",
        ...(options.headers || {}),
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ücretli/key isteyen servisler.
 * Key varsa kullanır, yoksa sessizce boş döner.
 */

async function searchBrave(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
    query
  )}&count=5&search_lang=tr`;

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Search error: ${response.status}`);
  }

  const data = await response.json();
  const items = data?.web?.results || [];

  return items.map((item: any) => ({
    title: cleanText(item?.title) || "Başlıksız sonuç",
    url: cleanText(item?.url),
    snippet: cleanText(item?.description),
    source: "Brave" as const,
  }));
}

async function searchTavily(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const response = await fetchWithTimeout("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily Search error: ${response.status}`);
  }

  const data = await response.json();
  const items = data?.results || [];

  return items.map((item: any) => ({
    title: cleanText(item?.title) || "Başlıksız sonuç",
    url: cleanText(item?.url),
    snippet: cleanText(item?.content),
    source: "Tavily" as const,
  }));
}

async function searchExa(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];

  const response = await fetchWithTimeout("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      type: "auto",
      numResults: 5,
    }),
  });

  if (!response.ok) {
    throw new Error(`Exa Search error: ${response.status}`);
  }

  const data = await response.json();
  const items = data?.results || [];

  return items.map((item: any) => ({
    title: cleanText(item?.title) || "Başlıksız sonuç",
    url: cleanText(item?.url),
    snippet: cleanText(item?.text) || cleanText(item?.summary),
    source: "Exa" as const,
  }));
}

/**
 * API key gerektirmeyen ücretsiz fallbackler.
 * Bunlar tam Google gibi değildir ama Lyra'yı boş bırakmaz.
 */

async function searchDuckDuckGoInstant(query: string): Promise<SearchResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
    query
  )}&format=json&no_html=1&skip_disambig=1`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(`DuckDuckGo error: ${response.status}`);
  }

  const data = await response.json();
  const results: SearchResult[] = [];

  const abstractText = cleanText(data?.AbstractText);
  const abstractURL = cleanText(data?.AbstractURL);
  const heading = cleanText(data?.Heading);

  if (abstractText && abstractURL) {
    results.push({
      title: heading || query,
      url: abstractURL,
      snippet: abstractText,
      source: "DuckDuckGo",
    });
  }

  const relatedTopics = Array.isArray(data?.RelatedTopics)
    ? data.RelatedTopics
    : [];

  for (const topic of relatedTopics) {
    if (results.length >= 5) break;

    if (topic?.FirstURL && topic?.Text) {
      results.push({
        title: cleanText(topic.Text).slice(0, 90) || query,
        url: cleanText(topic.FirstURL),
        snippet: cleanText(topic.Text),
        source: "DuckDuckGo",
      });
    }

    if (Array.isArray(topic?.Topics)) {
      for (const sub of topic.Topics) {
        if (results.length >= 5) break;

        if (sub?.FirstURL && sub?.Text) {
          results.push({
            title: cleanText(sub.Text).slice(0, 90) || query,
            url: cleanText(sub.FirstURL),
            snippet: cleanText(sub.Text),
            source: "DuckDuckGo",
          });
        }
      }
    }
  }

  return results;
}

async function searchWikipediaTR(query: string): Promise<SearchResult[]> {
  const url = `https://tr.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
    query
  )}&limit=5&namespace=0&format=json`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(`Wikipedia TR error: ${response.status}`);
  }

  const data = await response.json();

  const titles = Array.isArray(data?.[1]) ? data[1] : [];
  const snippets = Array.isArray(data?.[2]) ? data[2] : [];
  const urls = Array.isArray(data?.[3]) ? data[3] : [];

  return titles.map((title: string, index: number) => ({
    title: cleanText(title) || "Wikipedia sonucu",
    url: cleanText(urls[index]),
    snippet: cleanText(snippets[index]) || "Wikipedia üzerinden bulunan ilgili sonuç.",
    source: "Wikipedia" as const,
  }));
}

function buildAnswer(query: string, results: SearchResult[]) {
  if (!results.length) {
    return `Kanka "${query}" için ücretsiz arama fallback'i de sonuç getiremedi. Yani route çalışıyor ama kaynaklardan veri gelmedi. İstersen daha güçlü arama için Brave/Tavily/Exa key ekleyebiliriz.`;
  }

  const topResults = results
    .slice(0, 5)
    .map((item, index) => {
      return `${index + 1}. ${item.title} (${item.source}) — ${
        item.snippet || item.url
      }`;
    })
    .join("\n");

  return `Kanka API key olmadan ücretsiz kaynaklardan şunları buldum:\n\n${topResults}`;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/search",
    hasBraveKey: Boolean(process.env.BRAVE_SEARCH_API_KEY),
    hasTavilyKey: Boolean(process.env.TAVILY_API_KEY),
    hasExaKey: Boolean(process.env.EXA_API_KEY),
    hasFreeFallback: true,
    freeFallbackSources: ["DuckDuckGo Instant Answer", "Wikipedia TR"],
    message:
      "Search route çalışıyor kanka. Key yoksa ücretsiz fallback kaynakları denenir.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = extractQuery(body);

    if (!query) {
      const answer = "Kanka arama için boş mesaj geldi.";

      return NextResponse.json(
        {
          ok: false,
          answer,
          reply: answer,
          text: answer,
          sources: [],
          links: [],
          results: [],
        },
        { status: 200 }
      );
    }

    const hasPaidSearchKey =
      Boolean(process.env.BRAVE_SEARCH_API_KEY) ||
      Boolean(process.env.TAVILY_API_KEY) ||
      Boolean(process.env.EXA_API_KEY);

    const searchJobs = hasPaidSearchKey
      ? await Promise.allSettled([
          searchBrave(query),
          searchTavily(query),
          searchExa(query),
          searchDuckDuckGoInstant(query),
          searchWikipediaTR(query),
        ])
      : await Promise.allSettled([
          searchDuckDuckGoInstant(query),
          searchWikipediaTR(query),
        ]);

    const allResults = searchJobs.flatMap((job) => {
      if (job.status === "fulfilled") return job.value;
      return [];
    });

    const results = uniqueResults(allResults).slice(0, 10);
    const answer = buildAnswer(query, results);

    return NextResponse.json({
      ok: results.length > 0,
      query,
      answer,
      reply: answer,
      text: answer,
      sources: results,
      links: results,
      results,
      debug: {
        hasBraveKey: Boolean(process.env.BRAVE_SEARCH_API_KEY),
        hasTavilyKey: Boolean(process.env.TAVILY_API_KEY),
        hasExaKey: Boolean(process.env.EXA_API_KEY),
        hasFreeFallback: true,
        resultCount: results.length,
      },
    });
  } catch (error: any) {
    const message = error?.message || String(error);

    const answer =
      "Kanka online araştırma route’u çalıştı ama ücretsiz kaynaklardan düzgün cevap alamadı. Bağlantı, kaynak limiti veya sorgu tarafında sorun olabilir.";

    return NextResponse.json(
      {
        ok: false,
        answer,
        reply: answer,
        text: answer,
        error: message,
        sources: [],
        links: [],
        results: [],
      },
      { status: 200 }
    );
  }
}
