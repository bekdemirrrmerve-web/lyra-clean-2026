import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: "Brave" | "Tavily" | "Exa";
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
    });
  } finally {
    clearTimeout(timer);
  }
}

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

function buildAnswer(query: string, results: SearchResult[]) {
  if (!results.length) {
    return `Kanka "${query}" için online araştırma bağlantısı gelmedi. Arama API anahtarı eksik olabilir ya da arama servisi cevap vermemiş olabilir. Seni boş bırakmamak için API’siz modla devam ediyorum.`;
  }

  const topResults = results
    .slice(0, 4)
    .map((item, index) => {
      return `${index + 1}. ${item.title} — ${item.snippet || item.url}`;
    })
    .join("\n");

  return `Kanka online araştırma bağlantısı geldi. Bulduğum ilk kaynaklara göre hızlı özet:\n\n${topResults}`;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/search",
    hasBraveKey: Boolean(process.env.BRAVE_SEARCH_API_KEY),
    hasTavilyKey: Boolean(process.env.TAVILY_API_KEY),
    hasExaKey: Boolean(process.env.EXA_API_KEY),
    message: "Search route çalışıyor kanka.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = extractQuery(body);

    if (!query) {
      return NextResponse.json(
        {
          ok: false,
          answer: "Kanka arama için boş mesaj geldi.",
          reply: "Kanka arama için boş mesaj geldi.",
          text: "Kanka arama için boş mesaj geldi.",
          sources: [],
          links: [],
          results: [],
        },
        { status: 200 }
      );
    }

    const searchJobs = await Promise.allSettled([
      searchBrave(query),
      searchTavily(query),
      searchExa(query),
    ]);

    const allResults = searchJobs.flatMap((job) => {
      if (job.status === "fulfilled") return job.value;
      return [];
    });

    const results = uniqueResults(allResults).slice(0, 8);
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
        resultCount: results.length,
      },
    });
  } catch (error: any) {
    const message = error?.message || String(error);

    const answer =
      "Kanka online araştırma route’u çalıştı ama arama servisinden düzgün cevap alamadı. API key, kota veya servis bağlantısı tarafında sorun olabilir.";

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
