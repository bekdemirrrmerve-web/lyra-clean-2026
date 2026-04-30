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

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function createDgsPlan(userText: string) {
  const oneHour =
    userText.includes('1 saat') ||
    userText.includes('bir saat') ||
    userText.includes('60 dakika');

  if (oneHour) {
    return `Tamam kankam, sana net ve uygulanabilir 1 saatlik DGS çalışma planı hazırladım:

00:00 - 05:00 | Hazırlık
Masayı toparla, suyu koy, telefonu sessize al. Bugünün amacı mükemmel çalışmak değil, sistemi tekrar başlatmak.

05:00 - 25:00 | Matematik konu ısınması
Bugün tek konu seç:
- Temel kavramlar
- Sayılar
- Problemler
- Rasyonel sayılar
- Denklem

20 dakika boyunca sadece konu mantığını tekrar et. Deftere mini özet çıkar.

25:00 - 42:00 | Soru çözümü
10-15 soru çöz.
Hedef hız değil, doğru düşünme. Takıldığın soruda hemen cevaba bakma; önce “benden ne istiyor?” diye sor.

42:00 - 52:00 | Türkçe paragraf
5 paragraf sorusu çöz.
Her paragrafta önce ana fikri bul, sonra şıklara geç.

52:00 - 58:00 | Yanlış analizi
Yanlışlarını 3 kategoriye ayır:
1. Konu eksiği
2. Dikkat hatası
3. Süre baskısı

58:00 - 60:00 | Kapanış
Yarın için tek hedef yaz:
“Yarın şu konudan 20 soru çözeceğim.”

Ben olsam bugün sadece bunu yapardım. Çünkü asıl mesele uzun çalışmak değil, çalışmaya geri dönebilmek.`;
  }

  return `Kankam DGS için başlangıç planını şöyle kurardım:

1. Önce seviye tespiti yap
Bugün 20 matematik, 10 Türkçe sorusu çöz. Netini değil, nerede takıldığını gör.

2. Matematikte ilk sıraya temel konuları koy
- Temel kavramlar
- Sayılar
- Bölme-bölünebilme
- Rasyonel sayılar
- Problemler

3. Türkçe tarafını her gün bırakma
Günde 5-10 paragraf bile çok şey değiştirir. DGS’de paragraf düzenli çalışanın yüzünü güldürür.

4. Günlük minimum plan
- 30 dakika matematik konu
- 30 dakika matematik soru
- 20 dakika Türkçe paragraf
- 10 dakika yanlış analizi

5. Haftalık mantık
Haftada 5 gün çalış, 1 gün deneme/mini test, 1 gün toparlama.

Bence senin için en iyi başlangıç: büyük program değil, küçük ama her gün yapılabilen plan.`;
}

function createDailyPlan() {
  return `Tamam kankam, bugün için sade ama işe yarar bir plan yapıyorum:

Sabah / İlk blok
- 10 dakika ortam toparla
- 25 dakika en önemli işi yap
- 5 dakika mola

Orta blok
- 1 içerik fikri seç
- Kısa bir video metni çıkar
- Çekim yapacaksan sadece 1 video hedefle

Ders / Araştırma bloğu
- 45 dakika odak çalışma
- 10 dakika not çıkarma
- 5 dakika “yarın neye devam edeceğim?” yazma

Kendin için mini alan
- 15 dakika yürüyüş, kahve, müzik veya sessizlik
- Telefonu biraz azalt
- Bugün kendine yüklenme; sadece akışı geri kur

Günün ana hedefi:
“Her şeyi bitirmek değil, kontrol hissini geri almak.”

Bence bugün 3 görev seç:
1. Mutlaka yapılacak
2. Yapılsa iyi olur
3. Enerji kalırsa yapılacak`;
}

function createContentIdea(userText: string) {
  const text = normalize(userText);

  let niche = 'kozmetik / kişisel gelişim / günlük içerik';
  if (text.includes('kozmetik') || text.includes('cilt') || text.includes('serum')) {
    niche = 'kozmetik ve kimyager bakışı';
  } else if (text.includes('dgs') || text.includes('ders')) {
    niche = 'ders çalışma ve motivasyon';
  } else if (text.includes('anne') || text.includes('bebek')) {
    niche = 'anne-bebek ve günlük yaşam';
  }

  return `Tamam kankam, sana ${niche} için güçlü bir içerik fikri çıkarıyorum:

Kanca:
“Bunu çoğu kişi yapıyor ama neden işe yaramadığını bilmiyor olabilir.”

Video akışı:
1. İlk 3 saniye:
Ürünü/konuyu göster ve iddialı bir cümle kur.

2. Problem:
“Burada mesele ürünün kötü olması değil, yanlış kullanım mantığı.”

3. Açıklama:
Kimyager/uzman bakışıyla ama sade anlat.
Zor kelime kullanırsan hemen günlük örnekle aç.

4. Mini çözüm:
“Şöyle kullanırsan daha mantıklı olur…”

5. Kapanış:
“İstersen bir sonraki videoda bunun içerik listesini tek tek parçalayayım.”

CTA:
“Bunu sen de böyle mi kullanıyordun? Yoruma yaz.”

Caption:
Herkes ürün konuşuyor ama kullanım mantığını konuşan az. Ben kimyager gözüyle sade sade anlatıyorum.

Hashtag:
#kozmetik #ciltbakımı #kimyager #içerikönerisi #reelsfikirleri

Bence bunu 35-45 saniyelik video yaparsan hem izlenebilir hem kaydedilebilir durur.`;
}

function createTeleprompterText(userText: string) {
  const text = normalize(userText);

  if (text.includes('40') || text.includes('kirk')) {
    return `Tabii kankam, 40 saniyelik teleprompter metni:

“Bunu çoğu kişi kullanıyor ama bence asıl mesele ürünün kendisi değil, nasıl kullanıldığı.

Bir üründen sonuç almak istiyorsan önce içeriğine, sonra kullanım sıklığına, sonra da hangi ürünlerle birlikte kullandığına bakman gerekiyor.

Çünkü bazı aktifler birlikte kullanıldığında cildi yorabilir, bazıları ise doğru sırayla kullanıldığında çok daha mantıklı çalışır.

Ben kimyager gözüyle baktığımda şunu görüyorum: Cilt bakımında en pahalı ürün değil, en doğru rutin fark yaratıyor.

İstersen bir sonraki videoda bu ürünün içerik listesini tek tek analiz edeyim.”`;
  }

  return `Tabii kankam, teleprompter için akıcı bir metin hazırladım:

“Bugün size çoğu kişinin fark etmeden yaptığı küçük ama önemli bir hatadan bahsedeceğim.

Bir ürünü ya da yöntemi sadece popüler diye kullanmak yeterli değil. Neden işe yaradığını, ne zaman kullanılması gerektiğini ve hangi durumda işe yaramayabileceğini bilmek gerekiyor.

Ben bu tarz şeylere biraz daha içerik ve mantık tarafından bakıyorum. Çünkü bazen sorun ürün değildir; yanlış zaman, yanlış miktar ya da yanlış beklentidir.

O yüzden bir şeyi denemeden önce kendine şunu sor:
Bu bana gerçekten uygun mu?

Devamında istersen bu konuyu daha detaylı anlatayım.”`;
}

function createEngagementAnswer() {
  return `Kankam etkileşim hesaplamanın temel mantığı şu:

Etkileşim oranı formülü:
(Beğeni + Yorum + Kaydetme + Paylaşım) / Görüntülenme x 100

Ama bence sadece beğeniye bakmak yanıltıcı. Reels/TikTok tarafında daha önemli olanlar:

1. Kaydetme
İçerik değerli bulunmuş demektir.

2. Paylaşım
İnsanlar bunu başkasına göndermek istemiş demektir.

3. Yorum
Konu tartışma veya bağ kurma yaratmış demektir.

4. İzlenme / takipçi oranı
Takipçinden fazla izleniyorsa keşfet potansiyeli vardır.

Hızlı yorum:
- Beğeni var ama kaydetme yoksa: içerik hoş ama yeterince faydalı değil.
- Kaydetme var ama yorum yoksa: bilgi iyi ama tartışma sorusu eksik.
- İzlenme düşükse: ilk 3 saniye yani hook zayıf olabilir.
- Paylaşım yüksekse: konu sosyal olarak güçlüdür.

Bana takipçi, görüntülenme, beğeni, yorum, kaydetme, paylaşım sayılarını yazarsan sana net oran ve yorum çıkarırım.`;
}

function createVideoPlan() {
  return `Tamam kankam, video çekim planını şöyle yapalım:

1. Hazırlık
- Telefonu dikey 9:16 ayarla
- Işığı yüzüne doğru al
- Arka planı sade tut
- İlk 3 saniyeyi en güçlü cümleye ayır

2. Çekim akışı
Sahne 1:
Yüzün kamerada, direkt kanca cümlesi.

Sahne 2:
Ürün/konu yakın plan.

Sahne 3:
Sen açıklarken 1-2 kısa B-roll görüntü.

Sahne 4:
Son cümlede CTA:
“Devamı gelsin mi?”

3. Teleprompter ayarı
- Yazı büyük olsun
- Hız yavaş/orta
- Cümleleri kısa tut
- Her paragraf 1 fikir anlatsın

4. Çekim sonrası
- Kapak yazısı ekle
- İlk cümleyi caption’a da koy
- Yorum sorusu ekle

Ben olsam ilk videoyu mükemmel yapmaya çalışmazdım; 1 temiz çekim alıp yayınlardım.`;
}

function createMoral() {
  return `Kankam önce şunu söyleyeyim: şu an dağılmış hissetmen, hiçbir şeyi yapamayacağın anlamına gelmiyor.

Bazen insanın zihni çok yoruluyor ve her şey gözünde büyüyor. O an çözüm “devasa motivasyon” değil, küçücük bir hareket.

Şimdi sadece şunu yap:
- 1 bardak su iç
- 10 dakika tek bir şeye bak
- Bitince kendine “tamam, sistem açıldı” de

Bugün mükemmel olmak zorunda değilsin. Bugün sadece yeniden başlatma günü olabilir.

Ben olsam kendime kızmazdım. Çünkü bazen yavaşlamak tembellik değil, toparlanma şeklidir.`;
}

function createKombin() {
  return `Bence bugün üç seçenekten biri güzel olur:

Soft fresh:
- Krem veya açık renk pantolon
- Beyaz/basic üst
- Bej, pudra ya da açık pembe hırka
- Nude dudak, şeftali allık

Cool:
- Siyah jean veya bol kesim pantolon
- Oversize gömlek/ceket
- Toplu saç
- İnce eyeliner, temiz ten

Feminen:
- V yaka bluz
- Açık ton pantolon
- Zarif kolye
- Hafif dalgalı saç
- Parlak dudak

Kamera karşısı için ben olsam soft fresh seçerdim. Çünkü hem temiz hem güven veren hem de yormayan bir görüntü verir.`;
}

function createCosmeticAnswer(userText: string) {
  return `Kozmetik tarafında kankam ben bunu şöyle analiz ederdim:

Önce ürünün iddiasına bak:
- Nem mi?
- Leke görünümü mü?
- Bariyer onarımı mı?
- Akne/sivilce desteği mi?
- Aydınlık görünüm mü?
- Yaşlanma karşıtı bakım mı?

Sonra içerik mantığına bak:
- Niacinamide: ton eşitleme ve bariyer desteği
- Panthenol: yatıştırma
- Hyaluronic acid: nem desteği
- Retinol/retinal: yaşlanma karşıtı görünüm
- AHA/BHA: pürüz ve gözenek görünümü
- Seramid: bariyer desteği

Dikkat:
Bir ürünü “çok iyi” yapan şey sadece aktif içermesi değil. Formül dengesi, pH, kullanım sıklığı ve cilt tipine uygunluk da önemli.

Sen bana ürünün adını veya INCI listesini yazarsan, ben onu sade sade:
1. Ne işe yarar?
2. Kim kullanmalı?
3. Kim dikkat etmeli?
4. İçerik iyi mi pazarlama mı?
şeklinde parçalarım.

Yazdığın konu:
“${userText}”`;
}

function createPdfAnswer() {
  return `PDF alanı için mantık şöyle olacak kankam:

PDF yükleyince Lyra sana şunları çıkaracak:
1. Kısa özet
2. Uzun özet
3. Önemli başlıklar
4. Ana fikir
5. Yapılacaklar listesi
6. Sosyal medya içeriğine çevirme
7. Teleprompter metnine çevirme
8. Sunum taslağı çıkarma

API’siz modda PDF dosyasını gerçekten okuyamam ama uygulama mantığını şöyle kuruyoruz:
- PDF yükle
- Metni çıkar
- Özetle
- İçerik fikrine dönüştür
- Kaydet

Gerçek PDF okuma için bir sonraki teknik adımda dosya yükleme alanı ve metin çıkarma sistemi ekleriz.`;
}

function createPhotoAnswer() {
  return `Fotoğraf/görsel alanı için Lyra şunları yapacak:

1. Fotoğraf analizi
- Kadraj
- Işık
- Renk uyumu
- Estetik yorum

2. İçerik önerisi
- Bu fotoğrafla ne paylaşılır?
- Caption ne olmalı?
- İlk cümle nasıl olmalı?

3. Ürün çekimi
- Arka plan önerisi
- Işık önerisi
- Props önerisi
- Kapak yazısı

API’siz modda görseli gerçekten okuyamam ama fotoğraf yükleme alanını canlı gösterebiliriz. Görsel analizi için ileride vision API veya başka ücretsiz görsel analiz mantığı eklenir.`;
}

function createDefaultReply(userText: string) {
  return `Duydum kankam: “${userText}”

Şu an Lyra Offline Akıllı Mod’dayım. Yani API kullanmadan uygulama içinden cevap veriyorum.

Bana şunlardan biri gibi yazarsan daha güçlü cevap veririm:
- “DGS için 1 saatlik plan hazırla”
- “Bugün ne yapmalıyım?”
- “Instagram içerik fikri ver”
- “40 saniyelik teleprompter metni yaz”
- “Video çekim planı hazırla”
- “Etkileşim oranımı yorumla”
- “Kozmetik ürün içeriği analiz et”
- “Moral ver”
- “Kombin öner”

Bence şimdi konuyu tek cümleyle netleştir, ben sana hemen uygulanabilir bir plan çıkarayım.`;
}

function generateLocalLyraReply(userText: string) {
  const text = normalize(userText);

  if (
    hasAny(text, [
      'dgs',
      'ders',
      'calisma',
      'matematik',
      'turkce',
      'sinav',
      'soru',
    ])
  ) {
    return createDgsPlan(text);
  }

  if (
    hasAny(text, [
      'bugun ne yap',
      'gunluk plan',
      'plan yap',
      'yapilacak',
      'todo',
      'gorev',
    ])
  ) {
    return createDailyPlan();
  }

  if (
    hasAny(text, [
      'icerik',
      'reels',
      'tiktok',
      'instagram',
      'hook',
      'kanca',
      'caption',
      'hashtag',
    ])
  ) {
    return createContentIdea(userText);
  }

  if (
    hasAny(text, [
      'teleprompter',
      'metin yaz',
      'konusma metni',
      'script',
      '40 saniye',
      '1 dakika',
    ])
  ) {
    return createTeleprompterText(text);
  }

  if (
    hasAny(text, [
      'video cek',
      'cekime',
      'kamera',
      'video plani',
      'cekis',
      'kayit',
    ])
  ) {
    return createVideoPlan();
  }

  if (
    hasAny(text, [
      'etkilesim',
      'engagement',
      'begeni',
      'yorum',
      'kaydetme',
      'paylasim',
      'izlenme',
    ])
  ) {
    return createEngagementAnswer();
  }

  if (
    hasAny(text, [
      'moral',
      'motivasyon',
      'bunaldim',
      'yorgun',
      'kotu hiss',
      'canim sikildi',
      'stres',
    ])
  ) {
    return createMoral();
  }

  if (
    hasAny(text, [
      'kombin',
      'kiyafet',
      'makyaj',
      'sac',
      'stil',
      'ne giy',
    ])
  ) {
    return createKombin();
  }

  if (
    hasAny(text, [
      'kozmetik',
      'cilt',
      'krem',
      'serum',
      'inci',
      'formul',
      'aktif',
      'retinol',
      'niacinamide',
    ])
  ) {
    return createCosmeticAnswer(userText);
  }

  if (hasAny(text, ['pdf', 'dosya', 'ozetle', 'belge'])) {
    return createPdfAnswer();
  }

  if (hasAny(text, ['foto', 'fotograf', 'gorsel', 'resim', 'kapak'])) {
    return createPhotoAnswer();
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
        text: 'Kankam Lyra yerel modda küçük bir hata yaşadı. Bir daha daha kısa bir cümleyle dener misin?',
      },
      { status: 200 }
    );
  }
}
