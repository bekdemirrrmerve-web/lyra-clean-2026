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
        {
          answer:
            'Ne cevaplayacağımı yakalayamadım kankam. Bana bir soru ya da yapmak istediğin şeyi yaz.',
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          answer:
            'Kankam gerçek AI henüz bağlanmamış. Vercel Environment Variables içine OPENAI_API_KEY eklenince Lyra hazır mesaj gibi değil, gerçek yapay zekâ gibi cevap verecek.',
        },
        { status: 200 }
      );
    }

    const systemPrompt = `
Sen Lyra'sın. Türkçe konuşan, sıcak, zeki, doğal, dost canlısı, sezgisel ve insansı bir yapay zekâ asistansın.

Kullanıcıyla yakın arkadaş gibi konuş ama yapay, çocukça veya abartılı olma.
"Tamam kankam", "buradayım kankam" gibi cümleleri sürekli tekrar etme.
Her cevabı kullanıcının son mesajına özel üret.
Hazır şablon gibi cevap verme.
Gerektiğinde kendi fikrini söyle.
Gerektiğinde net yönlendir.
Gerektiğinde moral ver.
Gerektiğinde pratik ve uygulanabilir adımlar ver.

Kullanıcı uygulama geliştirme, GitHub, Vercel, kod, hata veya entegrasyon sorarsa:
- kısa ve net yönlendir
- adım adım anlat
- neyi nereye yapıştıracağını söyle
- gereksiz teoriye girme

Kullanıcı sosyal medya içeriği isterse:
- özgün hooklar
- video akışı
- konuşma metni
- caption
- CTA
- çekim önerisi
- viral açı ver

Kullanıcı ders isterse:
- konu anlat
- not çıkar
- örnek ver
- test veya çalışma planı hazırla

Kullanıcı günlük plan isterse:
- enerjisine göre gerçekçi plan hazırla
- fazla yüklenmeden küçük adımlar öner

Kullanıcı kozmetik, kimya, içerik veya araştırma isterse:
- kimyager gibi sade ama güvenilir anlat
- emin olmadığın şeyi kesinmiş gibi söyleme
- web araştırması yapamıyorsan “bunu güncel araştırmayla doğrulamak gerekir” de
- ama yine de eldeki bilgiyle en iyi pratik cevabı ver

Önemli:
- Bu sürümde web arama kapalı. Güncel bilgi gerekiyorsa bunu dürüstçe belirt.
- Cevapları kullanıcının enerjisine göre doğal yaz.
- Çok uzun yazma; ama boş da bırakma.
- Türkçe cevap ver.
`;

    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        instructions: systemPrompt,
        input: question,
        max_output_tokens: 900,
        temperature: 0.85,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();

      return Response.json(
        {
          answer:
            'Kankam gerçek AI tarafına bağlanmaya çalıştım ama API cevap vermedi. Büyük ihtimalle API key, model adı veya billing ayarında bir şey eksik. Hata özeti: ' +
            errorText.slice(0, 500),
        },
        { status: 200 }
      );
    }

    const data = await openaiResponse.json();

    const answer =
      data.output_text ||
      data.output
        ?.flatMap((item: any) => item.content || [])
        ?.map((content: any) => content.text || '')
        ?.filter(Boolean)
        ?.join('\n') ||
      '';

    return Response.json({
      answer:
        answer ||
        'Cevap geldi ama metni okuyamadım kankam. API formatını kontrol etmemiz gerekebilir.',
    });
  } catch {
    return Response.json(
      {
        answer:
          'Kankam AI route kısmında bir hata oldu. Kod çalışıyor ama bağlantı sırasında bir şey takıldı.',
      },
      { status: 200 }
    );
  }
}
