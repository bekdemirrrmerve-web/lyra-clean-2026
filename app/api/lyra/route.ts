import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LyraEmotion =
  | "playful"
  | "supportive"
  | "sassy"
  | "happy"
  | "calm"
  | "thinking"
  | "sad"
  | "frustrated"
  | "study"
  | "content"
  | "code";

type LyraMood =
  | "normal"
  | "bored"
  | "excited"
  | "tired"
  | "sad"
  | "angry"
  | "confused"
  | "focused"
  | "creative";

type VoicePacket = {
  audioEnabled: boolean;
  engine: "browser-speech-synthesis-ready";
  speakText: string;
  voiceProfile: {
    genderHint: "female";
    style: "warm-turkish-ai-friend";
    language: "tr-TR";
  };
  prosody: {
    rate: number;
    pitch: number;
    volume: number;
  };
  voiceHints: string[];
};

type LyraResponse = {
  ok: boolean;
  source: "sirius-core-lyra";
  version: string;
  reply: string;
  speakText: string;
  emotion: LyraEmotion;
  mood: LyraMood;
  reaction: string;
  avatarState: string;
  memoryUpdate: {
    lastMood: LyraMood;
    lastEmotion: LyraEmotion;
    lastTopic: string;
    shouldRemember: boolean;
    summary: string;
  };
  voicePacket: VoicePacket;
  debug?: {
    receivedMessage: string;
    detectedIntent: string;
    note: string;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const lowerTR = (text: string): string => {
  return text.toLocaleLowerCase("tr-TR");
};

const includesAny = (text: string, words: string[]): boolean => {
  return words.some((word) => text.includes(word));
};

const cleanSpeakText = (text: string): string => {
  return text
    .replace(/[🤍😄😂✨💅🏻💅🌙⭐️🔥]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const detectIntent = (message: string): string => {
  const text = lowerTR(message);

  if (
    includesAny(text, [
      "kod",
      "hata",
      "compile",
      "build",
      "vercel",
      "route",
      "endpoint",
      "api",
      "tsx",
      "typescript",
      "çalışmıyor",
      "bozuldu",
      "404",
    ])
  ) {
    return "code_help";
  }

  if (
    includesAny(text, [
      "video",
      "hook",
      "içerik",
      "reels",
      "tiktok",
      "başlık",
      "seslendirme",
      "metin",
      "senaryo",
    ])
  ) {
    return "content_help";
  }

  if (
    includesAny(text, [
      "ders",
      "öğren",
      "özet",
      "anlat",
      "soru çöz",
      "çalışmam lazım",
      "sınav",
    ])
  ) {
    return "study_help";
  }

  if (
    includesAny(text, [
      "canım sıkıldı",
      "sıkılıyorum",
      "moralim bozuk",
      "ağlamak",
      "üzgünüm",
      "dert",
      "yoruldum",
    ])
  ) {
    return "emotional_support";
  }

  if (
    includesAny(text, [
      "alooo",
      "alo",
      "orda mısın",
      "burda mısın",
      "napıyon",
      "naber",
      "kanka",
    ])
  ) {
    return "daily_chat";
  }

  return "general_chat";
};

const detectMood = (message: string): LyraMood => {
  const text = lowerTR(message);

  if (includesAny(text, ["çok heyecanlı", "heyecanlıyım", "süper", "oldu", "çalıştı", "harika"])) {
    return "excited";
  }

  if (includesAny(text, ["canım sıkıldı", "sıkılıyorum", "sıkıldım"])) {
    return "bored";
  }

  if (includesAny(text, ["yoruldum", "yorgunum", "uykum", "bitkin"])) {
    return "tired";
  }

  if (includesAny(text, ["üzgünüm", "ağladım", "moralim bozuk", "kötüyüm"])) {
    return "sad";
  }

  if (includesAny(text, ["sinirlendim", "delircem", "çıldırıcam", "bıktım", "of ya"])) {
    return "angry";
  }

  if (includesAny(text, ["anlamadım", "kafam karıştı", "ne demek", "nasıl yani"])) {
    return "confused";
  }

  if (includesAny(text, ["içerik", "video", "hook", "tasarım", "fikir"])) {
    return "creative";
  }

  if (includesAny(text, ["ders", "çalış", "araştırma", "analiz", "test"])) {
    return "focused";
  }

  return "normal";
};

const detectEmotion = (message: string, intent: string, mood: LyraMood): LyraEmotion => {
  const text = lowerTR(message);

  // Önemli: sassy/playful kelimeleri "çalışmıyor"dan önce yakalanıyor.
  // Böylece "saçmalama kanka bu niye çalışmıyor" sadece supportive'a düşmüyor.
  if (
    includesAny(text, [
      "saçmalama",
      "şaka mı",
      "ne alaka",
      "yok artık",
      "kanka bu ne",
      "alooo",
      "napıyon",
    ])
  ) {
    return "sassy";
  }

  if (
    includesAny(text, [
      "alo",
      "alooo",
      "orda mısın",
      "burda mısın",
      "naber",
      "napıyon",
    ])
  ) {
    return "playful";
  }

  if (intent === "code_help") return "code";
  if (intent === "content_help") return "content";
  if (intent === "study_help") return "study";

  if (mood === "excited") return "happy";
  if (mood === "sad" || mood === "tired" || mood === "bored") return "supportive";
  if (mood === "angry" || mood === "confused") return "frustrated";

  if (
    includesAny(text, [
      "düşün",
      "sence",
      "ne yapalım",
      "hangisi",
      "kararsız",
      "plan",
    ])
  ) {
    return "thinking";
  }

  return "calm";
};

const getAvatarState = (emotion: LyraEmotion, mood: LyraMood): string => {
  if (emotion === "playful") return "playful-glow";
  if (emotion === "sassy") return "sassy-spark";
  if (emotion === "happy") return "happy-bright";
  if (emotion === "supportive") return "soft-support";
  if (emotion === "frustrated") return "focused-calm";
  if (emotion === "thinking") return "thinking-glow";
  if (emotion === "code") return "tech-focus";
  if (emotion === "content") return "creative-glow";
  if (emotion === "study") return "study-focus";
  if (emotion === "sad" || mood === "sad") return "gentle-dim";
  return "idle-breathing";
};

const getReaction = (emotion: LyraEmotion): string => {
  const reactions: Record<LyraEmotion, string> = {
    playful: "warm-joke",
    supportive: "soft-care",
    sassy: "friendly-sassy",
    happy: "excited",
    calm: "warm-calm",
    thinking: "thoughtful",
    sad: "gentle",
    frustrated: "calm-focus",
    study: "teacher-mode",
    content: "creator-mode",
    code: "developer-mode",
  };

  return reactions[emotion] ?? "warm-calm";
};

const getVoiceProsody = (emotion: LyraEmotion): VoicePacket["prosody"] => {
  if (emotion === "happy" || emotion === "playful") {
    return { rate: 1.02, pitch: 1.08, volume: 1 };
  }

  if (emotion === "sassy") {
    return { rate: 1.0, pitch: 1.06, volume: 1 };
  }

  if (emotion === "supportive" || emotion === "sad") {
    return { rate: 0.92, pitch: 1.02, volume: 0.92 };
  }

  if (emotion === "code" || emotion === "study" || emotion === "thinking") {
    return { rate: 0.95, pitch: 1.0, volume: 0.96 };
  }

  return { rate: 0.96, pitch: 1.04, volume: 0.96 };
};

const buildMemoryUpdate = (
  message: string,
  mood: LyraMood,
  emotion: LyraEmotion,
  intent: string
): LyraResponse["memoryUpdate"] => {
  const important =
    includesAny(lowerTR(message), [
      "unutma",
      "hatırla",
      "bundan sonra",
      "hep böyle",
      "benim",
      "lyra",
      "sirius",
      "proje",
      "api",
      "avatar",
      "canlı ekran",
    ]) || intent === "code_help";

  return {
    lastMood: mood,
    lastEmotion: emotion,
    lastTopic: intent,
    shouldRemember: important,
    summary: important
      ? `Kullanıcı ${intent} konusunda konuştu. Ruh hali: ${mood}. Lyra tonu: ${emotion}.`
      : `Son konuşma konusu: ${intent}. Ruh hali: ${mood}.`,
  };
};

const answerDailyChat = (message: string, emotion: LyraEmotion): string => {
  const text = lowerTR(message);

  if (includesAny(text, ["alooo", "alo", "orda mısın", "burda mısın"])) {
    return "Alooo buradayım kanka 😄 Kaybolmadım. Avatar da burada, beyin de burada. Ne yapıyoruz?";
  }

  if (includesAny(text, ["napıyon", "naber", "ne yapıyon"])) {
    return "Buradayım kanka, Lyra’nın beynini biraz daha gerçek insan gibi yapmaya çalışıyorum. Sen ne moddasın bugün?";
  }

  if (emotion === "sassy") {
    return "Heh tamam kanka, sakin 😄 Saçmalamadan ilerliyorum. Bana neyi düzeltmek istediğini söyle, ben direkt toparlayayım.";
  }

  return "Buradayım kanka. Yaz, anlat, dertleş, kod patlat; bugün Lyra modu açık.";
};

const answerEmotionalSupport = (mood: LyraMood): string => {
  if (mood === "bored") {
    return "Off anladım kanka, o boş boş sıkılma hali insanın üstüne yapışıyor ya. Bence şu an kendine yüklenmeden küçük bir şey seçelim: ya 10 dakikalık toparlanma, ya kısa yürüyüş, ya da birlikte minicik bir plan.";
  }

  if (mood === "tired") {
    return "Kanka biraz tükenmiş gibisin. Şu an senden dev performans beklemeyelim. Önce nefes, su, küçük bir mola; sonra gerekiyorsa işi parçalara böleriz.";
  }

  if (mood === "sad") {
    return "Canım, bu his bayağı ağır gelmiş olabilir. Hemen çözüm diye üstüne atlamayacağım. Önce şunu söyleyeyim: böyle hissetmen garip değil. Yanındayım, istersen yavaş yavaş anlat.";
  }

  return "Anladım kanka. Önce seni biraz sakinleştirelim, sonra ne yapacağımıza bakarız. Bazen çözümden önce insanın duyulduğunu hissetmesi gerekiyor.";
};

const answerCodeHelp = (message: string): string => {
  const text = lowerTR(message);

  if (includesAny(text, ["404"])) {
    return "Tamam kanka, 404 genelde route yolu, dosya konumu ya da deploy edilen link yanlış olduğunda çıkar. Önce dosya yolu doğru mu bakacağız: app/api/lyra/route.ts olmalı. Sonra canlı link şu formatta test edilir: /api/lyra.";
  }

  if (includesAny(text, ["build", "compile", "failed", "hata"])) {
    return "Tamam, panik yok. Build hatalarında önce dosya yolu, sonra TypeScript tipi, sonra JSX’in yanlışlıkla api route içine girip girmediğine bakacağız. Bana hatayı atarsan tek parça düzeltilmiş kod gibi toparlarım.";
  }

  if (includesAny(text, ["api", "endpoint", "route"])) {
    return "API tarafındayız kanka. Mantık şu: Lyra mesajı gönderir, Sirius Core API duygu ve karakter paketini çıkarır, sonra reply, speakText, emotion ve avatarState olarak geri döner.";
  }

  return "Kod tarafını birlikte toplarız kanka. Bana hata metnini veya dosya içeriğini attığında, tasarımı bozmadan çalışan tek parça hâline getireceğim.";
};

const answerContentHelp = (): string => {
  return "Tamam kanka, içerik moduna geçiyorum. Önce güçlü bir ilk 3 saniye hook buluruz, sonra videoyu kısa, akıcı ve kaydedilebilir yaparız. Bana ürün/konu ver, ben direkt senaryoya çevireyim.";
};

const answerStudyHelp = (): string => {
  return "Tamam, ders modunu açtım. Konuyu ağırlaştırmadan anlatırım; önce mantığını kurarız, sonra örnek soru veya kısa özetle pekiştiririz.";
};

const answerGeneral = (message: string, emotion: LyraEmotion, mood: LyraMood): string => {
  if (emotion === "thinking") {
    return "Bence burada önce seçeneği netleştirelim kanka. Ben olsam olayı üçe bölerdim: en hızlı çalışan çözüm, en ucuz çözüm, en uzun vadede sağlam çözüm.";
  }

  if (emotion === "happy") {
    return "Evettt güzel gidiyoruz kanka 😄 Şu an mantık oturuyor. Bunu biraz daha sağlamlaştırırsak Lyra gerçekten daha canlı hissettirmeye başlayacak.";
  }

  if (emotion === "sassy") {
    return "Tamam tamam, saçmalamadan ilerliyorum 😄 Burada en mantıklı hamle basit: önce çalışan kısmı bozmuyoruz, sonra eksik parçayı üstüne ekliyoruz.";
  }

  if (mood === "confused") {
    return "Kafanın karışması normal kanka. Bunu çok teknik anlatınca çorba oluyor. En sade haliyle: mesaj geliyor, Lyra ruh hâlini anlıyor, cevabı ve avatar tepkisini birlikte döndürüyor.";
  }

  return "Anladım kanka. Bunu Lyra mantığında ele alırsak önce kullanıcı niyetini anlayacağız, sonra duyguya göre cevap vereceğiz, sonra avatar ve ses paketini aynı anda güncelleyeceğiz.";
};

const buildReply = (
  message: string,
  intent: string,
  emotion: LyraEmotion,
  mood: LyraMood
): string => {
  if (intent === "daily_chat") return answerDailyChat(message, emotion);
  if (intent === "emotional_support") return answerEmotionalSupport(mood);
  if (intent === "code_help") return answerCodeHelp(message);
  if (intent === "content_help") return answerContentHelp();
  if (intent === "study_help") return answerStudyHelp();

  return answerGeneral(message, emotion, mood);
};

const buildVoicePacket = (speakText: string, emotion: LyraEmotion): VoicePacket => {
  const prosody = getVoiceProsody(emotion);

  return {
    audioEnabled: false,
    engine: "browser-speech-synthesis-ready",
    speakText,
    voiceProfile: {
      genderHint: "female",
      style: "warm-turkish-ai-friend",
      language: "tr-TR",
    },
    prosody,
    voiceHints: [
      "Türkçe kadın sesine yakın tarayıcı sesi seç.",
      "Cevabı çok hızlı okuma.",
      "Duygu destekliyse daha yumuşak ton kullan.",
      "Playful/sassy modda hafif enerjik oku.",
    ],
  };
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "Sirius Core API - Lyra Bridge",
      version: "lyra-brain-v1.0.0",
      mode: "free-self-written",
      message:
        "Lyra endpoint çalışıyor. POST ile message gönderince reply, speakText, emotion, avatarState ve voicePacket döner.",
      testPayload: {
        message: "alooo orda mısın",
      },
    },
    { headers: corsHeaders }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const message =
      normalizeText(body?.message) ||
      normalizeText(body?.text) ||
      normalizeText(body?.prompt) ||
      "";

    if (!message) {
      return NextResponse.json(
        {
          ok: false,
          error: "MESSAGE_REQUIRED",
          message: "Lyra için message alanı boş geldi.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const intent = detectIntent(message);
    const mood = detectMood(message);
    const emotion = detectEmotion(message, intent, mood);
    const reaction = getReaction(emotion);
    const avatarState = getAvatarState(emotion, mood);
    const reply = buildReply(message, intent, emotion, mood);
    const speakText = cleanSpeakText(reply);
    const memoryUpdate = buildMemoryUpdate(message, mood, emotion, intent);
    const voicePacket = buildVoicePacket(speakText, emotion);

    const response: LyraResponse = {
      ok: true,
      source: "sirius-core-lyra",
      version: "lyra-brain-v1.0.0",
      reply,
      speakText,
      emotion,
      mood,
      reaction,
      avatarState,
      memoryUpdate,
      voicePacket,
      debug: {
        receivedMessage: message,
        detectedIntent: intent,
        note: "Bu sürüm ücretsiz/kendi yazılmış Lyra karakter motorudur. Kapalı/ücretli Replika API kullanılmaz.",
      },
    };

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "LYRA_ROUTE_ERROR",
        message: "Lyra endpoint içinde beklenmeyen hata oluştu.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
