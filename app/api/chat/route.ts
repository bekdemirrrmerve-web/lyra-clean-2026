import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type LyraMessage = {
  role: 'user' | 'lyra';
  text: string;
};

function normalize(text: string) {
  return text
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c');
}

function getLastUserMessage(messages: LyraMessage[]) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  return lastUser?.text || '';
}

function createDgsPlan() {
  return `Tabii kankam, sana 1 saatlik net DGS çalışma planı hazırlıyorum:

00:00 - 05:00
Masayı toparla, suyu koy, telefonu sessize al. Bugünün mini hedefi: “1 saat boyunca sadece başlamak.”

05:00 - 25:00
Matematik konu tekrarı:
- Temel kavramlar
- Sayılar
- Problemlerde kısa çözüm mantığı
Burada amaç her şeyi bitirmek değil, beynini ısıtmak.

25:00 - 40:00
10-15 soru çöz.
Yanlış yaptığın soruları geçme; yanına küçük not düş:
“Ben burada neyi kaçırdım?”

40:00 - 50:00
Türkçe paragraf:
- 5 paragraf sorusu çöz
- Süre tut
- Cevabı bulmadan önce ana fikri kendine söyle

50:00 - 57:00
Yanlış analizi:
Bugün en çok nerede takıldın?
İşlem hatası mı, konu eksiği mi, dikkat mi?

57:00 - 60:00
Mini kapanış:
Yarın için tek hedef yaz:
“Yarın şu konudan 20 soru çözeceğim.”

Bence bugün sadece bu 1 saati yapman bile seni moda sokar. Büyük plan değil, küçük ama gerçek bir başlangıç yapıyoruz.`;
}

function createContentIdea(topic: string) {
  return `Tamam kankam, sana hızlı içerik fikri çıkarıyorum:

Kanca:
“Bunu herkes kullanıyor ama çoğu kişi neden işe yaradığını bilmiyor.”

Video akışı:
1. İlk 3 saniye: ürünü/konuyu göster.
2. Problem: “Yanlış kullanımda etkisi azalabilir.”
3. Bilimsel açıklama: Basit, kısa ve kimyager diliyle anlat.
4. Örnek: Evde/üründe nerede karşımıza çıkıyor?
5. Son: “Bunu daha önce duymuş muydun?”

Konu:
${topic || 'kozmetik / içerik üretimi'}

CTA:
“Devamı gelsin mi? Yoruma yaz, bir sonraki videoda formül tarafını anlatayım.”

Bence bunu 35-45 saniyelik Reels/TikTok olarak çeksen güzel akar.`;
}

function createMoral() {
  return `Kankam önce bir nefes. Gerçekten bazen insanın kafası aynı anda 40 sekme açık gibi oluyor, normal.

Bugün senden mükemmel olmanı istemiyoruz. Sadece küçük bir şeyi tamamlamanı istiyoruz. Çünkü motivasyon bazen başlamadan gelmiyor; başladıktan sonra geliyor.

Şu an yapman gereken:
- En küçük adımı seç.
- 10 dakika yap.
- Sonra devam edip etmeyeceğine karar ver.

Ben olsam bugün kendime “her şeyi yetiştireceğim” demezdim. “Sadece sistemi tekrar çalıştıracağım” derdim. Bu daha gerçekçi ve daha şefkatli.`;
}

function createKombin() {
  return `Bence bugün üç farklı kombin düşünebiliriz:

Soft fresh:
- Krem pantolon
- Beyaz/basic üst
- Hafif pembe veya bej hırka
- Nude makyaj, parlak dudak

Cool:
- Siyah jean veya kumaş pantolon
- Oversize gömlek/ceket
- Toplu saç
- İnce eyeliner + doğal ten

Feminen:
- Açık ton pantolon
- V yaka bluz
- Zarif kolye
- Şeftali ton allık

Ben olsam günlük ama şık görünmek için soft fresh tarafa giderdim. Hem temiz hem de kamera karşısında güzel durur.`;
}

function createCosmeticAnswer() {
  return `Kozmetik tarafında kankam önce şuna bakardım:

1. Ürün ne vaat ediyor?
Nem, leke, bariyer, akne, aydınlık, sıkılaşma?

2. Ana aktif ne?
Örneğin:
- Niacinamide: ton eşitleme, bariyer desteği
- Panthenol: yatıştırma
- Hyaluronic acid: nem
- Retinol/retinal: yaşlanma karşıtı görünüm
- AHA/BHA: pürüz ve gözenek görünümü

3. Kullanım sıklığı doğru mu?
Aktif içerikler fazla kullanılırsa cilt “iyi olayım derken” kızarabilir.

4. Gündüz mü gece mi?
Retinoid/asit tarzı içeriklerde güneş koruyucu önemli.

İstersen bana ürünün adını veya içerik listesini yaz; ben onu kimyager gözüyle sade sade parçalarım.`;
}

function createTeleprompterText() {
  return `Tabii kankam, teleprompter için hazır metin:

“Bugün size çoğu kişinin fark etmeden yaptığı küçük ama önemli bir hatadan bahsedeceğim.

Bir ürünü sadece popüler diye kullanmak yetmez. İçindeki aktif madde ne, hangi oranlarda etkili olur, ciltte neyle birlikte kullanılır; bunları bilmek gerekiyor.

Ben kimyager gözüyle baktığımda şunu görüyorum: Bazen ürün kötü değildir, kullanım şekli yanlıştır.

O yüzden bir ürünü değerlendirirken sadece ambalajına değil, içeriğine ve kullanım mantığına bakın.

Devamında bu ürünlerin içeriklerini tek tek analiz etmemi ister misiniz?”`;
}

function createDefaultReply(userText: string) {
  return `Duydum kankam: “${userText}”

Şu an API’siz akıllı moddayım; yani gerçek OpenAI cevabı değil, uygulama içi Lyra mantığıyla cevap veriyorum.

Bunu birlikte şöyle toparlayabiliriz:
1. Konuyu küçültelim.
2. İlk yapılacak adımı seçelim.
3. Sana kısa ve uygulanabilir bir plan çıkarayım.

Bana şunlardan biri gibi yazabilirsin:
- “DGS planı hazırla”
- “İçerik fikri ver”
- “Moral ver”
- “Kombin öner”
- “Kozmetik içerik analizi yap”
- “Teleprompter metni yaz”`;
}

function generateLocalLyraReply(userText: string) {
  const text = normalize(userText);

  if (
    text.includes('dgs') ||
    text.includes('ders') ||
    text.includes('calisma') ||
    text.includes('matematik') ||
    text.includes('turkce') ||
    text.includes('plan')
  ) {
    return createDgsPlan();
  }

  if (
    text.includes('icerik') ||
    text.includes('video') ||
    text.includes('reels') ||
    text.includes('tiktok') ||
    text.includes('hook') ||
    text.includes('kanca')
  ) {
    return createContentIdea(userText);
  }

  if (
    text.includes('moral') ||
    text.includes('motivasyon') ||
    text.includes('kotu') ||
    text.includes('yorgun') ||
    text.includes('bunaldim') ||
    text.includes('canim sikildi')
  ) {
    return createMoral();
  }

  if (
    text.includes('kombin') ||
    text.includes('kiyafet') ||
    text.includes('makyaj') ||
    text.includes('sac')
  ) {
    return createKombin();
  }

  if (
    text.includes('kozmetik') ||
    text.includes('cilt') ||
    text.includes('krem') ||
    text.includes('serum') ||
    text.includes('inci') ||
    text.includes('formul')
  ) {
    return createCosmeticAnswer();
  }

  if (
    text.includes('teleprompter') ||
    text.includes('metin yaz') ||
    text.includes('konusma metni') ||
    text.includes('script')
  ) {
    return createTeleprompterText();
  }

  return createDefaultReply(userText);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const cleanMessages: LyraMessage[] = messages.filter(
      (message: unknown): message is LyraMessage =>
        typeof message === 'object' &&
        message !== null &&
        'role' in message &&
        'text' in message &&
        ((message as LyraMessage).role === 'user' ||
          (message as LyraMessage).role === 'lyra') &&
        typeof (message as LyraMessage).text === 'string'
    );

    const lastUserText = getLastUserMessage(cleanMessages);
    const text = generateLocalLyraReply(lastUserText);

    return NextResponse.json({ text }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        text: 'Kankam şu an yerel Lyra modunda küçük bir hata oldu ama sistem çalışıyor. Bir daha kısa bir cümleyle dener misin?',
      },
      { status: 200 }
    );
  }
}
