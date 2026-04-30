import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type LyraMessage = {
  role: 'user' | 'lyra';
  text: string;
};

function buildPrompt(messages: LyraMessage[]) {
  const history = messages
    .map((message) => {
      const speaker = message.role === 'user' ? 'Kullanıcı' : 'Lyra';
      return `${speaker}: ${message.text}`;
    })
    .join('\n');

  return `
Sen Lyra'sın. Türkçe konuşan, sıcak, samimi, akıllı, destekleyici bir AI asistansın.
Kullanıcıya yakın arkadaş gibi ama profesyonel şekilde yardım ediyorsun.
Kısa, anlaşılır, pratik ve doğal cevap ver.
Gerektiğinde içerik üretimi, günlük plan, kozmetik, kombin, moral, araştırma ve sosyal medya fikirlerinde yardımcı ol.

Konuşma geçmişi:
${history}

Şimdi kullanıcının son mesajına Lyra olarak cevap ver.
`;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          text: 'Kankam OPENAI_API_KEY Vercel Environment Variables içinde yok gibi görünüyor.',
        },
        { status: 200 }
      );
    }

    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const cleanMessages: LyraMessage[] = messages
      .filter(
        (message: unknown): message is LyraMessage =>
          typeof message === 'object' &&
          message !== null &&
          'role' in message &&
          'text' in message &&
          ((message as LyraMessage).role === 'user' ||
            (message as LyraMessage).role === 'lyra') &&
          typeof (message as LyraMessage).text === 'string'
      )
      .slice(-12);

    const prompt = buildPrompt(cleanMessages);

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: prompt,
        temperature: 0.8,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API error:', data);

      return NextResponse.json(
        {
          text:
            data?.error?.message ||
            'Kankam OpenAI tarafında cevap alınamadı. API kredisi, billing veya key yetkisini kontrol etmek gerekiyor.',
        },
        { status: 200 }
      );
    }

    const text =
      data?.output_text ||
      data?.output?.[0]?.content?.[0]?.text ||
      'Kankam cevap geldi ama metni okuyamadım. Route tarafını bir tık daha düzenlememiz gerekebilir.';

    return NextResponse.json({ text }, { status: 200 });
  } catch (error) {
    console.error('Chat route error:', error);

    return NextResponse.json(
      {
        text: 'Kankam sunucu tarafında takıldım. Büyük ihtimalle route.ts içinde küçük bir bağlantı hatası var.',
      },
      { status: 200 }
    );
  }
}
