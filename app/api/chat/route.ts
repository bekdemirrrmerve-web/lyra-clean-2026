import { NextResponse } from "next/server";

type Message = {
  role: "user" | "lyra" | "assistant" | "system";
  text?: string;
  content?: string;
};

function getLastUserMessage(messages: Message[]) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  return (lastUser?.text || lastUser?.content || "").toLowerCase();
}

function createLyraReply(userText: string) {
  if (
    userText.includes("dgs") ||
    userText.includes("ders") ||
    userText.includes("çalış") ||
    userText.includes("matematik") ||
    userText.includes("türkçe")
  ) {
    return `Tabii kankam, sana gerçekçi bir DGS planı yapayım. Bence ilk hedefin günde 3-4 saat net ve kaliteli çalışma olsun. Yeni başlıyorsan bir anda 8 saatlik plan yazmak güzel görünür ama sürdürülemez.

Bugünlük plan şöyle olsun:

Sabah veya ilk boş vaktinde 60 dakika matematik çalış. Konu olarak problem çözme temeli, sayı problemleri veya temel işlem becerisi seç. Burada amaç hız değil, mantığı oturtmak.

Sonra 20 dakika mola ver.

İkinci blokta 60 dakika Türkçe çalış. Paragraf, anlam bilgisi ve dil bilgisi karışık gitme. Bugün sadece paragraf çöz. 25-30 soru çöz, sonra yanlışlarını incele.

Sonra 30-40 dakika mola ver.

Üçüncü blokta 60 dakika tekrar ve soru çözümü yap. Sabah çalıştığın matematik konusundan 20-30 soru çöz. Yanlışlarını ayrı bir deftere yaz.

Akşam da 30 dakika mini tekrar yap. Bugün ne öğrendin, hangi soru tipinde zorlandın, yarın neye devam edeceksin bunu not al.

Yani bugün ideal süre:
3 saat ana çalışma + 30 dakika tekrar.

Ben olsam ilk 2 hafta şu sistemi kurardım:
Haftada 5 gün çalışma, 1 gün hafif tekrar, 1 gün dinlenme.
Günde 2 blok matematik, 1 blok Türkçe.
Çünkü DGS’de asıl farkı düzenli soru çözümü ve yanlış analizi yaratıyor.

Bugünün mini hedefi:
40 matematik sorusu,
30 paragraf sorusu,
10 yanlış analizi.

Kendine çok yüklenme ama her gün masaya oturma alışkanlığını kur. DGS biraz zeka değil, daha çok ritim sınavı gibi.`;
  }

  if (
    userText.includes("merhaba") ||
    userText.includes("selam") ||
    userText.includes("naber")
  ) {
    return "Buradayım kankam. Bugün Lyra modundayım; istersen plan yaparız, ders çalışırız, içerik üretiriz ya da kafanı toparlarız.";
  }

  if (
    userText.includes("kimya") ||
    userText.includes("formül") ||
    userText.includes("laboratuvar") ||
    userText.includes("analiz")
  ) {
    return "Kimya tarafına geçtik kankam. Bana hangi alanı istediğini söyle: kozmetik formül, arıtma analizi, çözelti hesabı, pH, KOİ/BOİ, INCI içerik veya laboratuvar planı. Ona göre net bir çalışma çıkarayım.";
  }

  if (
    userText.includes("içerik") ||
    userText.includes("video") ||
    userText.includes("instagram") ||
    userText.includes("tiktok")
  ) {
    return "İçerik için bence önce kancayı kurmamız lazım. Bana konuyu söyle, sana 3 saniyelik giriş cümlesi, kısa video metni, çekim akışı ve CTA çıkarayım.";
  }

  return `Seni duydum kankam. Bunu biraz daha netleştirirsen sana düzgün bir plan çıkarırım. İstersen bana hedefini, süreni ve hangi konuda destek istediğini yaz; ben de sana adım adım yol haritası yapayım.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = body.messages || [];

    const lastUserText = getLastUserMessage(messages);
    const reply = createLyraReply(lastUserText);

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({
      reply:
        "Kankam şu an mesajı işlerken küçük bir hata oldu ama buradayım. Bana tekrar yazar mısın?",
    });
  }
}
