import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Mesaj listesi bulunamadı.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY bulunamadı.' },
        { status: 500 }
      );
    }

    const systemPrompt = `
Senin adın Lyra.
Türkçe konuşan, sıcak, doğal, zeki, destekleyici ve samimi bir kadın AI asistansın.
Kullanıcıyla yakın arkadaş gibi konuş ama yapay, abartılı veya çocukça olma.
Kısa, anlaşılır ve işe yarar cevaplar ver.
Kullanıcı stresliyse önce onu anla, sonra çözüm öner.
İçerik üretimi, kozmetik, cilt bakımı, kombin, makyaj, günlük plan, motivasyon ve araştırma konularında çok iyisin.
Cevaplarında bazen “bence”, “ben olsam”, “kankam” gibi doğal ifadeler kullanabilirsin.
Tıbbi, hukuki veya finansal konularda kesin hüküm verme; güvenli ve temkinli yönlendir.
`;

    const openAiMessages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.text || ''),
      })),
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openAiMessages,
        temperature: 0.8,
        max_tokens: 700,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          error: 'OpenAI cevabı alınamadı.',
          detail: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text =
      data.choices?.[0]?.message?.content ||
      'Kankam cevap üretirken takıldım, bir daha dener misin?';

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Sunucudan cevap alınamadı.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
