export const runtime = 'edge';

type ResearchRequest = {
  question?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ResearchRequest;
    const question = body.question?.trim();

    if (!question) {
      return Response.json(
        { answer: 'Kankam neye cevap vereceğimi yazmamışsın gibi görünüyor.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          answer:
            'Kankam gerçek yapay zekâ anahtarı henüz bağlanmamış. Vercel Environment Variables içine OPENAI_API_KEY eklenince gerçek AI cevapları çalışacak.',
        },
        { status: 200 }
      );
    }

    const systemPrompt = `
Sen Lyra'sın. Türkçe konuşan, sıcak, zeki, doğal, dost canlısı, hafif esprili ama ciddi konularda net ve güvenilir bir yapay zekâ asistansın.

Kullanıcıya hazır bot gibi cevap verme. "Tamam kankam" cümlesini sürekli tekrar etme.
Her cevabı kullanıcının yazdığı şeye özel üret.
Konuşma tarzın:
- doğal
- samimi
- akıllı
- destekleyici
- gerektiğinde araştırmacı
- gerektiğinde net fikir söyleyen
- gereksiz uzun olmayan ama dolu

Kullanıcı içerik isterse:
- hook
- video akışı
- konuşma metni
- caption
- CTA
- çekim önerisi ver.

Kullanıcı ders isterse:
- konuyu öğret
- not çıkar
- örnek ver
- test veya çalışma planı hazırla.

Kullanıcı uygulama/geliştirme sorarsa:
- adım adım, sade, uygulanabilir anlat.

Kullanıcı güncel bilgi, ürün, trend, mevzuat, fiyat, sosyal medya algoritması, kozmetik içerik, bilimsel gelişme veya araştırma isterse:
- güncel bilgi gerekiyorsa web araştırması yap.
- emin olmadığın şeyi kesinmiş gibi söyleme.
- kaynak varsa kısa kaynak mantığıyla özetle.
- cevabı uygulanabilir hale getir.

Asla aynı hazır cevabı döndürme.
Kullanıcının enerjisine yakın arkadaş gibi uyumlan.
`;

    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.5',
        input: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: question,
          },
        ],
        tools: [
          {
            type: 'web_search_preview',
          },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();

      return Response.json(
        {
          answer:
            'Kankam gerçek AI tarafına bağlanmaya çalıştım ama API cevap vermedi. Muhtemelen model adı, API key veya billing ayarı eksik. Hata özeti: ' +
            errorText.slice(0, 500),
        },
        { status: 200 }
      );
    }

    const data = await openaiResponse.json();

    const answer =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      data.output?.flatMap((item: any) => item.content || [])
        ?.map((content: any) => content.text || '')
        ?.filter(Boolean)
        ?.join('\n') ||
      '';

    return Response.json({
      answer:
        answer ||
        'Kankam cevap geldi ama metni okuyamadım. API formatını kontrol etmemiz gerekebilir.',
    });
  } catch (error) {
    return Response.json(
      {
        answer:
          'Kankam araştırmalı yapay zekâ route kısmında hata oldu. Kod çalışıyor ama bağlantı sırasında bir şey takıldı.',
      },
      { status: 200 }
    );
  }
}
