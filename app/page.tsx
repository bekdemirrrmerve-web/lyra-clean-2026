"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

type Role = "user" | "lyra";
type AiMode = "offline" | "local" | "online";
type NavAction =
  | "new"
  | "chats"
  | "modes"
  | "tools"
  | "reminders"
  | "settings";

type Message = {
  id: number;
  role: Role;
  text: string;
  time: string;
};

type LyraResponse = {
  ok?: boolean;
  reply?: string;
  answer?: string;
  text?: string;
  result?: string;
  speakText?: string;
  emotion?: string;
  mood?: string;
  reaction?: string;
  avatarState?: string;
  memoryUpdate?: any;
  voicePacket?: any;
  voiceHints?: any;
};

const LYRA_AVATAR = "/lyra-avatar.jpg.jpeg";
const LYRA_VIDEO = "/lyra-avatar-mp4.mp4";

// Önce Sirius Core API'ye gider. İstersen Vercel adresini .env.local içinden değiştirebilirsin:
// NEXT_PUBLIC_LYRA_API_URL=https://sirius-core-apii.vercel.app/api/lyra
const LYRA_API_URL =
  process.env.NEXT_PUBLIC_LYRA_API_URL?.trim() ||
  "https://sirius-core-apii.vercel.app/api/lyra";

const navItems: { icon: string; label: string; action: NavAction }[] = [
  { icon: "+", label: "Yeni Sohbet", action: "new" },
  { icon: "▢", label: "Sohbetler", action: "chats" },
  { icon: "⌘", label: "Modlar", action: "modes" },
  { icon: "▤", label: "Araçlar", action: "tools" },
  { icon: "♢", label: "Hatırlatıcılar", action: "reminders" },
  { icon: "⚙", label: "Ayarlar", action: "settings" },
];

const features = [
  {
    icon: "⌕",
    title: "Araştırma Modu",
    desc: "Güncel bilgi gerektiğinde daha derin cevaplar dener.",
  },
  {
    icon: "✎",
    title: "İçerik Üretme",
    desc: "Hook, başlık, Reels/TikTok metni çıkarır.",
  },
  {
    icon: "▰",
    title: "Ders Modu",
    desc: "Konuyu sade anlatır, mini test hazırlar.",
  },
  {
    icon: "▧",
    title: "Görsel Üretme",
    desc: "Görsel fikri ve prompt oluşturur.",
  },
  {
    icon: "◌",
    title: "Görselle Okut",
    desc: "Görsel, ekran ve belge analizi için hazır mod.",
  },
  {
    icon: "▤",
    title: "PDF Özeti",
    desc: "Metin/PDF içeriğini özet formatına çevirir.",
  },
  {
    icon: "≋",
    title: "Canlı Mod",
    desc: "Canlı konuşma ekranını açar.",
  },
];

const starterMessages: Message[] = [
  {
    id: 1,
    role: "lyra",
    time: "13:21",
    text:
      "Merhaba kanka. Ben Lyra 🤍\n\nBugün daha canlı, daha doğal ve daha yakın arkadaş gibi buradayım. Bana yaz, mikrofonla konuş ya da Canlı Konuşma’yı aç; beraber toparlayalım.",
  },
];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeMessageId() {
  return Date.now() + Math.floor(Math.random() * 100000);
}

function safeClassName(value: unknown, fallback: string) {
  const clean = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return clean || fallback;
}

function isHealthCheckJson(text: string) {
  const value = text.trim();

  return (
    value.startsWith("{") &&
    value.includes('"ok"') &&
    (value.includes('"route"') ||
      value.includes('"service"') ||
      value.includes('"version"') ||
      value.includes('"testPayload"') ||
      value.includes('"voicePacket"') ||
      value.includes('"avatarState"'))
  );
}

function sanitizeUserFacingText(value: unknown) {
  if (typeof value !== "string") return "";

  let text = value.trim();
  if (!text) return "";
  if (isHealthCheckJson(text)) return "";

  text = text
    .replace(/Sirius Core API beynime bağlandım:?/gi, "")
    .replace(/Sirius Core bağlı\.?/gi, "")
    .replace(/API beynime bağlandı\.?/gi, "")
    .replace(/Duygu:\s*[^·\n]+/gi, "")
    .replace(/Avatar:\s*[^\n]+/gi, "")
    .replace(/source:\s*["']?sirius-core-lyra["']?/gi, "")
    .replace(/version:\s*["']?[^,\n]+["']?/gi, "")
    .replace(/voicePacket/gi, "")
    .replace(/avatarState/gi, "")
    .replace(/memoryUpdate/gi, "")
    .replace(/debug/gi, "")
    .replace(/emotion/gi, "")
    .replace(/mood/gi, "")
    .replace(/reaction/gi, "")
    .replace(
      /Lyra endpoint çalışıyor\. POST ile message gönderince.*$/gi,
      ""
    )
    .replace(
      /Sirius Core API şu an cevap vermedi kanka\.\s*/gi,
      "Lyra bağlantısı şu an gecikti kanka. "
    )
    .replace(
      /Online araştırma bağlantısı gelmedi kanka\. Gemini\/API tarafı çalışmıyor olabilir\. Seni boş bırakmıyorum, API’siz modla cevaplıyorum:\s*/gi,
      ""
    )
    .replace(
      /Local AI şu an cevap vermedi kanka\. Ollama açık değilse bu normal\. API’siz Lyra moduna düşüp yine cevaplıyorum:\s*/gi,
      ""
    )
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return text;
}

function cleanLyraAnswer(value: unknown) {
  const text = sanitizeUserFacingText(value);
  if (!text) return "";

  const lower = text.toLocaleLowerCase("tr-TR");

  const blockedTechnicalTexts = [
    "endpoint çalışıyor",
    "post ile message",
    "source",
    "debug",
    "voicepacket",
    "avatarstate",
    "sirius core bağlı",
    "api beynime",
  ];

  if (blockedTechnicalTexts.some((item) => lower.includes(item))) {
    return "";
  }

  return text;
}

function pickApiAnswer(data: any) {
  if (!data) return "";

  if (typeof data === "string") {
    return cleanLyraAnswer(data);
  }

  return cleanLyraAnswer(
    data?.reply || data?.answer || data?.text || data?.result || ""
  );
}


function normalizeLoopCheckText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[ıİ]/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ğüşöç\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeStuckLyraAnswer(answer: string, question: string) {
  const a = normalizeLoopCheckText(answer);
  const q = normalizeLoopCheckText(question);

  if (!a) return true;

  const stuckHints = [
    "tamam kanka icerik moduna geciyorum",
    "once guclu bir ilk 3 saniye hook buluruz",
    "bana urun konu ver ben direkt senaryoya cevireyim",
    "api siz lyra moduna dusup yine cevapliyorum",
    "local ai su an cevap vermedi",
    "online arastirma baglantisi gelmedi",
  ];

  if (stuckHints.some((hint) => a.includes(hint))) return true;

  // API bazen kısa ve genel bir cevap döndürürse, kullanıcının mesajından hiç iz taşımıyorsa
  // onu güvenilir cevap saymıyoruz. Böylece ekranda aynı kalıp cevaba kilitlenmiyor.
  const meaningfulQuestionWords = q
    .split(" ")
    .filter((word) => word.length >= 4)
    .slice(0, 8);

  const hasQuestionTrace = meaningfulQuestionWords.some((word) => a.includes(word));

  if (a.length < 90 && meaningfulQuestionWords.length >= 2 && !hasQuestionTrace) {
    return true;
  }

  return false;
}

function pickReliableApiAnswer(data: any, question: string) {
  const answer = pickApiAnswer(data);
  if (!answer) return "";
  if (looksLikeStuckLyraAnswer(answer, question)) return "";
  return answer;
}

function mapLyraMode(aiMode: AiMode, message: string) {
  const q = message.toLocaleLowerCase("tr-TR");

  if (aiMode === "online") return "research";

  if (
    q.includes("formül") ||
    q.includes("inci") ||
    q.includes("kozmetik") ||
    q.includes("kimya") ||
    q.includes("serum") ||
    q.includes("titrasyon") ||
    q.includes("konsantrasyon")
  ) {
    return "lab";
  }

  if (
    q.includes("video") ||
    q.includes("hook") ||
    q.includes("reels") ||
    q.includes("tiktok") ||
    q.includes("içerik") ||
    q.includes("metin") ||
    q.includes("seslendirme")
  ) {
    return "content";
  }

  if (
    q.includes("ses") ||
    q.includes("konuş") ||
    q.includes("mikrofon") ||
    q.includes("canlı")
  ) {
    return "voice";
  }

  return "chat";
}

async function askLyra(message: string, aiMode: AiMode): Promise<LyraResponse> {
  const mode = mapLyraMode(aiMode, message);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(LYRA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        // Backend hangi alanı bekliyorsa boş düşmesin diye hepsini gönderiyoruz.
        message,
        text: message,
        prompt: message,
        userMessage: message,
        userId: "merve",
        sessionId: "lyra-clean-2026",
        mode,
        aiMode,
        source: "lyra-clean-page",
        sentAt: new Date().toISOString(),
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Lyra bağlantısı cevap vermedi.");
    }

    return data;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function createOfflineAnswer(question: string) {
  const cleanQuestion = question.replace(/\s+/g, " ").trim();
  const q = cleanQuestion.toLocaleLowerCase("tr-TR").trim();

  if (q === "test") {
    return "Test başarılı kanka. Lyra ayakta 😄";
  }

  if (
    q.includes("merhaba") ||
    q.includes("selam") ||
    q.includes("naber") ||
    q.includes("nasılsın") ||
    q.includes("orda mısın") ||
    q.includes("orada mısın") ||
    q.includes("burda mısın") ||
    q.includes("burada mısın") ||
    q.includes("duyuyor musun") ||
    q.includes("sesim geliyor mu")
  ) {
    return "Buradayım kanka 🤍 Duyuyorum, görüyorum; hatta şu an yazılımın içinden sana minik bir el sallıyorum gibi düşün 😄 Ne yapıyoruz?";
  }

  if (
    q.includes("canım sıkıldı") ||
    q.includes("sıkıldım") ||
    q.includes("moralim bozuk") ||
    q.includes("yoruldum")
  ) {
    return "Off anladım kanka. O boş boş sıkılma hali insanın üstüne yapışıyor ya. Bence şu an kendine yüklenmeden minicik bir şey seçelim: ya 10 dakikalık toparlanma, ya kısa yürüyüş, ya da beraber bir plan yapalım.";
  }

  if (
    q.includes("hook") ||
    q.includes("içerik") ||
    q.includes("reels") ||
    q.includes("tiktok") ||
    q.includes("video metni") ||
    q.includes("teleprompter")
  ) {
    return `Şunu içerik formatına çevirelim kanka:

KONU:
${cleanQuestion}

HOOK:
“Bunu çoğu kişi yanlış biliyor ama işin asıl mantığı burada başlıyor…”

GİRİŞ:
Bugün bunu sade, net ve izleyenin kaydedebileceği şekilde anlatıyoruz. Önce merak uyandırıyoruz, sonra problemi gösteriyoruz.

GELİŞME:
1. İnsanların yanlış bildiği kısmı söyle.
2. Neden öyle olmadığını kısa açıkla.
3. Doğru kullanım/uygulama mantığını ver.

KAPANIŞ:
Yani olay sadece “ne yapayım?” değil; “neden, ne zaman ve nasıl yapayım?” sorusu.

CTA:
Kaydet kanka, sonra bunun devamını daha detaylı anlatacağım.`;
  }

  if (
    q.includes("formül") ||
    q.includes("krem") ||
    q.includes("serum") ||
    q.includes("tonik") ||
    q.includes("şampuan") ||
    q.includes("kozmetik") ||
    q.includes("inci")
  ) {
    return `Kozmetik/lab mantığıyla bunu şöyle ele alırdım kanka:

KONU:
${cleanQuestion}

1. Ürün tipi ve hedef netleşir.
2. Baz sistem seçilir.
3. Aktiflerin yüzde aralığı kontrol edilir.
4. pH aralığı ve uyumluluk düşünülür.
5. Koruyucu sistemi ve stabilite kontrolü planlanır.

Ben olsam önce hedefi seçer, sonra formülü faz faz kurardım. Yoksa formül dediğin şey biraz “her güzel şeyi aynı kaba koydum” kaosuna dönüyor 😅`;
  }

  if (
    q.includes("ders") ||
    q.includes("öğren") ||
    q.includes("anlat") ||
    q.includes("test")
  ) {
    return `Tamam, bunu ders modunda şöyle çalışırız:

Önce konuyu 5 cümlede sade anlatırım.
Sonra 3 örnek veririm.
Sonra 5 soruluk mini test yaparız.
Yanlış olursa da “neden yanlış?” kısmını açıklarım.

Bence en iyi öğrenme şekli bu: az bilgi, bol tekrar, azıcık da “haa tamam şimdi oturdu” hissi.`;
  }

  if (q.includes("pdf") || q.includes("özet") || q.includes("belge")) {
    return `PDF ya da metin özeti için bana içeriği verirsen şunları çıkarırım:

- kısa özet
- önemli başlıklar
- teknik terimler
- aksiyon listesi
- içerik fikrine dönüşebilecek noktalar

Metni yapıştırırsan ben onu tertemiz toparlarım.`;
  }

  if (
    q.includes("görsel") ||
    q.includes("prompt") ||
    q.includes("fotoğraf") ||
    q.includes("tasarım")
  ) {
    return `Görsel için ben olsam promptu şöyle kurardım:

“Modern, temiz, beyaz-gümüş tonlarda, premium yapay zeka asistan arayüzü, soft ışık, cam efektli kartlar, yuvarlak butonlar, gerçekçi UI mockup, minimal ve estetik görünüm.”

Konuya göre bunu Lyra, InciLab, kozmetik laboratuvarı ya da içerik odası gibi ayrı ayrı parlatırız.`;
  }

  return `Bunu aldım kanka:

“${cleanQuestion}”

Ben olsam önce niyeti ayırırdım: bu bir bilgi sorusu mu, içerik üretimi mi, kod düzeltme mi, yoksa araştırma mı istiyor? Ona göre direkt kullanılabilir cevaba çevirelim.`;
}

function saveLyraMemory(memoryUpdate: any) {
  if (typeof window === "undefined" || !memoryUpdate) return;

  try {
    const oldRaw = localStorage.getItem("lyra_memory_v1");
    const oldList = oldRaw ? JSON.parse(oldRaw) : [];

    const nextList = [
      ...(Array.isArray(oldList) ? oldList : []),
      {
        ...memoryUpdate,
        savedAt: new Date().toISOString(),
      },
    ].slice(-40);

    localStorage.setItem("lyra_memory_v1", JSON.stringify(nextList));
    localStorage.setItem("lyra_last_memory", JSON.stringify(memoryUpdate));
  } catch {
    // sessiz geç
  }
}

export default function Page() {
  const cameraRef = useRef<HTMLVideoElement | null>(null);
  const lyraVideoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const micWantedRef = useRef(false);
  const featureRef = useRef<HTMLElement | null>(null);

  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [input, setInput] = useState("");
  const [aiMode, setAiMode] = useState<AiMode>("offline");
  const [activeNav, setActiveNav] = useState<NavAction>("new");
  const [gender, setGender] = useState<"Kadın" | "Erkek">("Kadın");
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [liveOpen, setLiveOpen] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [liveText, setLiveText] = useState("Canlı konuşma beklemede.");
  const [showLiveChat, setShowLiveChat] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  const [currentEmotion, setCurrentEmotion] = useState("calm");
  const [currentAvatarState, setCurrentAvatarState] = useState("idle");

  function now() {
    return new Date().toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function modeLabel() {
    if (aiMode === "offline") return "Sohbet";
    if (aiMode === "local") return "Cihaz Modu";
    return "Araştırma";
  }

  function getLoadingText() {
    if (aiMode === "offline") return "Lyra cevap hazırlıyor...";
    if (aiMode === "local") return "Cihaz modu hazırlanıyor...";
    return "Araştırma modu hazırlanıyor...";
  }

  function getPromptHint() {
    if (aiMode === "offline") {
      return "Lyra hazır. Sesli konuşma ve canlı ekran aktif.";
    }

    if (aiMode === "local") {
      return "Cihaz modu kişisel çalışma alanı için hazır.";
    }

    return "Araştırma modu açık. Daha güncel ve kaynaklı cevaplar için hazırlanıyor.";
  }

  function pushLyraMessage(text: string) {
    const finalText = sanitizeUserFacingText(text);
    if (!finalText) return;

    const msg: Message = {
      id: makeMessageId(),
      role: "lyra",
      text: finalText,
      time: now(),
    };

    setMessages((prev) => [...prev, msg]);
    if (liveOpen) setLiveText(finalText);
    speakHuman(finalText);
  }

  function getBestTurkishVoice() {
    if (typeof window === "undefined") return null;

    const voices = window.speechSynthesis?.getVoices?.() || [];

    return (
      voices.find((voice) => voice.lang?.toLowerCase().startsWith("tr")) ||
      voices.find((voice) =>
        voice.name?.toLowerCase().includes("turkish")
      ) ||
      voices.find((voice) => voice.lang?.toLowerCase().includes("tr")) ||
      null
    );
  }

  function speakHuman(text: string, voicePacket?: any) {
    if (muted || typeof window === "undefined") return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    const finalText = sanitizeUserFacingText(text);
    if (!finalText) return;

    synth.cancel();

    const clean = finalText
      .replace(/\n+/g, ". ")
      .replace(/🤍|😄|😅|😌|✨|🔥/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) return;

    const parts = clean
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 8);

    const voice = getBestTurkishVoice();

    const tone = String(
      voicePacket?.voiceProfile?.tone ||
        voicePacket?.voiceHints?.tone ||
        voicePacket?.prosody?.tone ||
        ""
    );

    const pace = String(
      voicePacket?.voiceProfile?.pace || voicePacket?.prosody?.pace || ""
    );

    const rate =
      pace.includes("fast") || tone.includes("alert")
        ? 0.98
        : pace.includes("slow") || tone.includes("supportive")
          ? 0.84
          : gender === "Kadın"
            ? 0.92
            : 0.88;

    const pitch =
      tone.includes("sassy") ||
      tone.includes("alert") ||
      tone.includes("excited")
        ? 1.1
        : tone.includes("supportive")
          ? 1.0
          : gender === "Kadın"
            ? 1.07
            : 0.88;

    function speakPart(index: number) {
      if (index >= parts.length) return;

      const utter = new SpeechSynthesisUtterance(parts[index]);
      utter.lang = "tr-TR";
      utter.voice = voice || null;
      utter.rate = rate;
      utter.pitch = pitch;
      utter.volume = 1;

      utter.onend = () => {
        window.setTimeout(() => speakPart(index + 1), 120);
      };

      utter.onerror = () => {
        window.setTimeout(() => speakPart(index + 1), 120);
      };

      synth.speak(utter);
    }

    speakPart(0);
  }

  async function sendMessage(customText?: string) {
    const clean = (customText ?? input).trim();
    if (!clean || loading) return;

    const userMessage: Message = {
      id: makeMessageId(),
      role: "user",
      text: clean,
      time: now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      let data: LyraResponse | null = null;

      try {
        data = await askLyra(clean, aiMode);
        console.log("LYRA API DATA:", data);
      } catch (error) {
        console.error("LYRA API HATASI:", error);

        data = {
          ok: false,
          reply: "",
          speakText: "",
          emotion: "supportive",
          reaction: "soft",
          avatarState: "supportive",
        };
      }

      const apiAnswer = pickReliableApiAnswer(data, clean);
      const apiSpeak = cleanLyraAnswer(data?.speakText || "");
      const safeApiSpeak =
        apiSpeak && !looksLikeStuckLyraAnswer(apiSpeak, clean) ? apiSpeak : "";

      const finalAnswer = apiAnswer || safeApiSpeak || createOfflineAnswer(clean);

      const cleanFinal = sanitizeUserFacingText(finalAnswer);
      const cleanSpeak = sanitizeUserFacingText(safeApiSpeak || cleanFinal);

      setCurrentEmotion(safeClassName(data?.emotion, "calm"));
      setCurrentAvatarState(safeClassName(data?.avatarState, "idle"));
      saveLyraMemory(data?.memoryUpdate);

      const lyraMessage: Message = {
        id: makeMessageId(),
        role: "lyra",
        text: cleanFinal,
        time: now(),
      };

      setMessages((prev) => [...prev, lyraMessage]);
      if (liveOpen) setLiveText(cleanFinal);
      speakHuman(cleanSpeak || cleanFinal, data?.voicePacket || data?.voiceHints);
      lyraVideoRef.current?.play().catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  async function toggleCamera() {
    if (cameraOn) {
      stream?.getTracks().forEach((track) => track.stop());
      setStream(null);
      setCameraOn(false);
      if (cameraRef.current) cameraRef.current.srcObject = null;
      return;
    }

    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      setStream(cameraStream);
      setCameraOn(true);

      setTimeout(() => {
        if (cameraRef.current) {
          cameraRef.current.srcObject = cameraStream;
        }
      }, 50);
    } catch {
      setLiveText(
        "Kamera izni alınamadı. Tarayıcı ayarlarından kamera iznini açman gerekebilir."
      );
    }
  }

  function toggleMic() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (micOn || micWantedRef.current) {
      micWantedRef.current = false;
      recognitionRef.current?.stop?.();
      setMicOn(false);
      setLiveText("Mikrofon kapalı.");
      return;
    }

    if (!SpeechRecognition) {
      setLiveText(
        "Bu tarayıcı ses algılamayı desteklemiyor. Chrome ile dene kanka."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "tr-TR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    micWantedRef.current = true;

    recognition.onstart = () => {
      setMicOn(true);
      setLiveText("Dinliyorum...");
    };

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text;
        else interimText += text;
      }

      if (interimText.trim()) setLiveText(interimText.trim());

      if (finalText.trim()) {
        const spoken = finalText.trim();
        setLiveText(spoken);
        sendMessage(spoken);
      }
    };

    recognition.onerror = (event: any) => {
      setMicOn(false);

      if (
        event?.error === "not-allowed" ||
        event?.error === "service-not-allowed"
      ) {
        micWantedRef.current = false;
        setLiveText(
          "Mikrofon izni alınamadı. Tarayıcı adres çubuğundaki kilitten mikrofon iznini açman gerekebilir."
        );
        return;
      }

      if (event?.error === "no-speech") {
        setLiveText("Ses alamadım kanka, tekrar konuşabilirsin.");
        return;
      }

      setLiveText("Mikrofon bağlantısı kısa süreli kesildi.");
    };

    recognition.onend = () => {
      setMicOn(false);

      if (!micWantedRef.current) return;

      window.setTimeout(() => {
        try {
          recognition.start();
        } catch {
          // Bazı tarayıcılar peş peşe start çağrısını sevmez, sessiz geçiyoruz.
        }
      }, 350);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      micWantedRef.current = false;
      setMicOn(false);
      setLiveText("Mikrofon başlatılamadı. Sayfayı yenileyip tekrar dene kanka.");
    }
  }
  function openLive() {
    setLiveOpen(true);
    setShowLiveChat(true);
    setLiveText("Canlı konuşma hazır. Mikrofonu açınca dinlemeye başlarım.");
    setVideoReady(false);

    setTimeout(() => {
      const video = lyraVideoRef.current;
      if (!video) return;

      if (video.readyState >= 2) setVideoReady(true);
      video.play().catch(() => {});
    }, 100);
  }

  function closeLive() {
    setLiveOpen(false);
    micWantedRef.current = false;
    recognitionRef.current?.stop?.();
    setMicOn(false);

    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setCameraOn(false);
    setVideoReady(false);

    if (cameraRef.current) cameraRef.current.srcObject = null;
    lyraVideoRef.current?.pause();

    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel?.();
    }
  }

  function handleFeature(title: string) {
    if (title === "Canlı Mod") {
      openLive();
      return;
    }

    if (title === "Araştırma Modu") {
      setAiMode("online");
      setInput("Bu konuyu güncel kaynaklarla araştır: ");
      return;
    }

    if (title === "İçerik Üretme") {
      setAiMode("offline");
      setInput("Bana şu konu için hook, başlık ve teleprompter metni hazırla: ");
      return;
    }

    if (title === "Ders Modu") {
      setAiMode("offline");
      setInput("Bana şu konuyu ders gibi anlat ve mini test hazırla: ");
      return;
    }

    if (title === "Görsel Üretme") {
      setAiMode("offline");
      setInput("Şu konu için görsel üretim promptu hazırla: ");
      return;
    }

    if (title === "PDF Özeti") {
      setAiMode("offline");
      setInput("Şu metni/PDF içeriğini özetle: ");
      return;
    }

    setInput(`${title} için bana yardımcı ol: `);
  }

  function handleNav(action: NavAction) {
    setActiveNav(action);

    if (action === "new") {
      setMessages(starterMessages);
      setInput("");
      setAiMode("offline");
      if (typeof window !== "undefined") window.speechSynthesis?.cancel?.();
      return;
    }

    if (action === "chats") {
      pushLyraMessage(
        "Sohbetler alanı açıldı kanka. Şimdilik aktif sohbeti gösteriyorum. Bir sonraki aşamada buraya eski sohbet kayıtları, tarih ve arama sistemi ekleyebiliriz."
      );
      return;
    }

    if (action === "modes") {
      featureRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      pushLyraMessage(
        "Modlar burada kanka. Araştırma, içerik, ders, PDF ve canlı modları aşağıdan seçebilirsin. Ben olsam Canlı Mod’u ayrı parlatırdım, çünkü en havalı görünen o 😄"
      );
      return;
    }

    if (action === "tools") {
      pushLyraMessage(
        "Araçlar aktif: içerik üretme, araştırma, PDF özeti, görsel prompt, ders modu ve canlı konuşma. Şimdilik hepsini buradan yönetiyoruz."
      );
      return;
    }

    if (action === "reminders") {
      pushLyraMessage(
        "Hatırlatıcılar alanı hazır. Şimdilik sana plan ve hatırlatma metni hazırlayabilirim. Gerçek bildirim için sonra takvim ya da bildirim sistemi bağlarız."
      );
      setInput("Bana şunu hatırlat: ");
      return;
    }

    if (action === "settings") {
      pushLyraMessage(
        "Ayarlar açıldı kanka. Buradan ses tonu, kadın/erkek ses, sessiz mod ve canlı konuşma tercihlerini yönetiyoruz."
      );
      return;
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.getVoices?.();
    }
  }, []);

  useEffect(() => {
    return () => {
      micWantedRef.current = false;
      stream?.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.stop?.();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel?.();
    };
  }, [stream]);

  return (
    <main className="lyra-page">
      <aside className="sidebar">
        <div className="brand">LYRA</div>

        <nav className="nav">
          {navItems.map((item) => (
            <button
              className={activeNav === item.action ? "nav-btn active" : "nav-btn"}
              key={item.label}
              onClick={() => handleNav(item.action)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="pro-card">
            <b>LYRA PRO</b>
            <p>AI Asistan</p>
          </div>

          <div className="profile-card">
            <div className="profile-avatar">M</div>
            <div>
              <b>Merve</b>
              <p>Pro Üye</p>
            </div>
            <span>∨</span>
          </div>

          <div className="usage-card">
            <div className="usage-head">
              <b>Aktif Mod</b>
              <strong>{modeLabel()}</strong>
            </div>
            <div className="usage-bar">
              <i />
            </div>
            <p>İnsan modu açık: daha doğal cevap verir.</p>
          </div>

          <div className="weather">
            <span>☀</span>
            <div>
              <b>19°C</b>
              <p>Güneşli</p>
            </div>
          </div>
        </div>
      </aside>

      <section className="main-shell">
        <header className="topbar clean-topbar">
          <div className="top-status">
            <span className="status-dot" />
            <div>
              <b>{modeLabel()}</b>
              <p>Lyra hazır, ne yapıyoruz kanka?</p>
            </div>
          </div>

          <button className="about-btn" onClick={() => handleNav("settings")}>
            Ayarlar
          </button>

          <button className="round-btn" onClick={openLive}>
            ≋
          </button>
        </header>

        <section className="mode-row">
          <button
            className={aiMode === "offline" ? "mode-btn active" : "mode-btn"}
            onClick={() => setAiMode("offline")}
          >
            Sohbet
          </button>

          <button
            className={aiMode === "local" ? "mode-btn active" : "mode-btn"}
            onClick={() => setAiMode("local")}
          >
            Cihaz
          </button>

          <button
            className={aiMode === "online" ? "mode-btn active" : "mode-btn"}
            onClick={() => setAiMode("online")}
          >
            Araştırma
          </button>
        </section>

        <section className="avatar-area">
          <div
            className={`halo lyra-avatar-state ${currentAvatarState} emotion-${currentEmotion}`}
          >
            <div className="avatar-card">
              <img src={LYRA_AVATAR} alt="Lyra Avatar" />
            </div>
          </div>

          <div className="control-row">
            <button className="control-btn">
              ≋ Ses: Gerçekçi <span>∨</span>
            </button>

            <button
              className={`control-btn ${muted ? "active" : ""}`}
              onClick={() => {
                setMuted((v) => !v);
                window.speechSynthesis?.cancel?.();
              }}
            >
              ♫ {muted ? "Ses Kapalı" : "Sessize Al"}
            </button>

            <button
              className={`control-btn small ${
                gender === "Kadın" ? "active-soft" : ""
              }`}
              onClick={() => setGender("Kadın")}
            >
              ♀ Kadın
            </button>

            <button
              className={`control-btn small ${
                gender === "Erkek" ? "active-soft" : ""
              }`}
              onClick={() => setGender("Erkek")}
            >
              ♂ Erkek
            </button>

            <button className="control-btn live-main-btn" onClick={openLive}>
              ≋ Canlı Konuşma
            </button>
          </div>
        </section>

        <section className="chat-panel">
          <div className="message-scroll">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`msg-row ${
                  message.role === "user" ? "user-row" : "lyra-row"
                } ${index === 0 ? "first-message" : ""}`}
              >
                <div className={`chat-bubble ${message.role}`}>
                  <p>{message.text}</p>
                  {message.role === "user" && <span>{message.time}</span>}
                </div>
              </div>
            ))}

            {loading && (
              <div className="msg-row lyra-row">
                <div className="chat-bubble lyra">
                  <p>{getLoadingText()}</p>
                </div>
              </div>
            )}
          </div>

          <p className="prompt-hint">{getPromptHint()}</p>

          <div className="input-box">
            <button onClick={openLive}>◖</button>
            <button className={micOn ? "active-mini" : ""} onClick={toggleMic}>♫</button>
            <button className="pdf-btn">PDF</button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Lyra'ya bir şey yaz..."
            />

            <button className="send-btn" onClick={() => sendMessage()}>
              ▶
            </button>
          </div>
        </section>

        <section className="feature-grid" ref={featureRef}>
          {features.map((feature) => (
            <button
              key={feature.title}
              className="feature-card"
              onClick={() => handleFeature(feature.title)}
            >
              <span>{feature.icon}</span>
              <b>{feature.title}</b>
              <p>{feature.desc}</p>
              <em>∨</em>
            </button>
          ))}
        </section>
      </section>

      <aside className="phone-panel">
        <div className="phone">
          <div className="phone-screen">
            <div className="phone-status">
              <b>9:41</b>
              <div className="notch" />
              <span>▮▮▮</span>
            </div>

            <div className="phone-head">
              <button onClick={() => handleNav("tools")}>☰</button>
              <b>LYRA</b>
              <button onClick={openLive}>≋</button>
            </div>

            <div className="phone-logo">
              <img src={LYRA_AVATAR} alt="Lyra mobile" />
            </div>

            <div className="phone-controls">
              <button onClick={() => setAiMode("offline")}>Sohbet</button>
              <button onClick={() => setAiMode("local")}>Cihaz</button>
              <button onClick={() => setAiMode("online")}>Araştırma</button>
              <button onClick={() => setMuted((v) => !v)}>Sessiz</button>
              <button className="wide" onClick={openLive}>
                ≋ Canlı Konuşma ›
              </button>
            </div>

            <div className="phone-input">
              <span>{modeLabel()}</span>
              <button onClick={() => sendMessage("Merhaba Lyra")}>▶</button>
            </div>

            <div className="phone-grid">
              {features.slice(0, 6).map((feature) => (
                <button
                  key={feature.title}
                  onClick={() => handleFeature(feature.title)}
                >
                  <span>{feature.icon}</span>
                  <b>{feature.title}</b>
                  <em>∨</em>
                </button>
              ))}

              <button className="single" onClick={openLive}>
                <span>≋</span>
                <b>Canlı Mod</b>
                <em>∨</em>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {liveOpen && (
        <div className="live-overlay">
          <section className="lyra-call">
            <div className="call-status">
              <span className={micOn ? "call-dot on" : "call-dot"} />
              <b>{micOn ? "Dinliyorum" : "Canlı konuşma"}</b>
            </div>

            <header className="call-head">
              <button className="call-icon" onClick={closeLive}>
                ‹
              </button>

              <div className="call-title">
                <p>Lyra ile canlı konuşma</p>
                <h2>Lyra</h2>
              </div>

              <button
                className="call-icon"
                onClick={() => setShowLiveChat((v) => !v)}
              >
                {showLiveChat ? "✦" : "☰"}
              </button>
            </header>

            <div className="call-avatar">
              <video
                ref={lyraVideoRef}
                src={LYRA_VIDEO}
                playsInline
                autoPlay
                muted
                loop
                preload="auto"
                className={`call-video ${videoReady ? "ready" : ""}`}
                onCanPlay={() => setVideoReady(true)}
                onLoadedData={() => setVideoReady(true)}
                onError={() => setVideoReady(false)}
              />

              {!videoReady && (
                <div className="avatar-fallback">
                  <img src={LYRA_AVATAR} alt="Lyra canlı avatar" />
                </div>
              )}
            </div>

            {cameraOn && (
              <video
                ref={cameraRef}
                autoPlay
                muted
                playsInline
                className="camera-preview"
              />
            )}

            {showLiveChat && (
              <div className="live-floating-chat">
                <div className="live-bubble">
                  <b>Lyra</b>
                  <p>{liveText}</p>
                </div>
              </div>
            )}

            <div className="call-dock">
              <button
                className={`call-control ${micOn ? "active" : ""}`}
                onClick={toggleMic}
              >
                <span>🎙️</span>
                <b>{micOn ? "Dinliyor" : "Mikrofon"}</b>
              </button>

              <button
                className={`call-control ${cameraOn ? "active" : ""}`}
                onClick={toggleCamera}
              >
                <span>📷</span>
                <b>{cameraOn ? "Kamera Açık" : "Kamera"}</b>
              </button>

              <button
                className={`call-control ${muted ? "active" : ""}`}
                onClick={() => {
                  setMuted((v) => !v);
                  window.speechSynthesis?.cancel?.();
                }}
              >
                <span>🔇</span>
                <b>{muted ? "Sessiz" : "Ses"}</b>
              </button>

              <button className="call-control danger" onClick={closeLive}>
                <span>✕</span>
                <b>Kapat</b>
              </button>
            </div>
          </section>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background:
            radial-gradient(circle at top left, rgba(255, 255, 255, 0.96), transparent 32%),
            radial-gradient(circle at 70% 20%, rgba(214, 225, 255, 0.74), transparent 32%),
            radial-gradient(circle at 18% 78%, rgba(255, 231, 247, 0.88), transparent 34%),
            linear-gradient(135deg, #f8f8fb 0%, #eceef5 48%, #ffffff 100%);
          color: #171923;
        }

        button,
        input {
          font-family: inherit;
        }

        button {
          cursor: pointer;
        }

        .lyra-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr) 360px;
          gap: 22px;
          padding: 22px;
          color: #191923;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .sidebar,
        .main-shell,
        .phone {
          border: 1px solid rgba(255, 255, 255, 0.76);
          box-shadow: 0 24px 80px rgba(68, 74, 110, 0.16);
          backdrop-filter: blur(26px);
        }

        .sidebar {
          min-height: calc(100vh - 44px);
          border-radius: 34px;
          padding: 22px;
          background: rgba(255, 255, 255, 0.58);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .brand {
          font-size: 26px;
          letter-spacing: 0.34em;
          font-weight: 900;
          color: #14141c;
          margin: 4px 0 24px;
        }

        .nav {
          display: grid;
          gap: 10px;
        }

        .nav-btn {
          height: 48px;
          border: 0;
          border-radius: 17px;
          background: transparent;
          color: #686a78;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 14px;
          font-weight: 800;
          transition: 0.2s ease;
        }

        .nav-btn span {
          width: 26px;
          height: 26px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.78);
        }

        .nav-btn:hover,
        .nav-btn.active {
          background: rgba(255, 255, 255, 0.88);
          color: #181823;
          box-shadow: 0 10px 30px rgba(84, 88, 130, 0.12);
        }

        .sidebar-bottom {
          display: grid;
          gap: 14px;
        }

        .pro-card,
        .profile-card,
        .usage-card,
        .weather {
          border-radius: 22px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.78);
        }

        .pro-card b,
        .profile-card b,
        .usage-card b,
        .weather b {
          color: #14141c;
        }

        .pro-card p,
        .profile-card p,
        .usage-card p,
        .weather p {
          margin: 4px 0 0;
          color: #777988;
          font-size: 13px;
          font-weight: 700;
        }

        .profile-card,
        .weather {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .profile-avatar,
        .weather span {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, #ffffff, #e8eaf3);
          font-weight: 900;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.86);
        }

        .profile-card > span {
          margin-left: auto;
          color: #7c7e8a;
        }

        .usage-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .usage-head strong {
          font-size: 13px;
          padding: 7px 9px;
          border-radius: 999px;
          background: #15151f;
          color: white;
        }

        .usage-bar {
          height: 8px;
          border-radius: 999px;
          margin: 13px 0 8px;
          background: #e5e7ef;
          overflow: hidden;
        }

        .usage-bar i {
          display: block;
          width: 76%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #171923, #aeb4c8);
        }

        .main-shell {
          min-height: calc(100vh - 44px);
          border-radius: 38px;
          padding: 24px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.52)),
            radial-gradient(circle at 50% 8%, rgba(255, 255, 255, 0.98), transparent 30%);
          overflow: hidden;
        }

        .topbar {
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 14px;
        }

        .top-status {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 99px;
          background: #89f0b2;
          box-shadow: 0 0 0 8px rgba(137, 240, 178, 0.18);
        }

        .top-status b {
          font-size: 18px;
          color: #171923;
        }

        .top-status p {
          margin: 3px 0 0;
          color: #7c7e89;
          font-size: 13px;
          font-weight: 700;
        }

        .about-btn,
        .round-btn,
        .mode-btn,
        .control-btn,
        .input-box button,
        .feature-card,
        .phone button,
        .call-icon,
        .call-control {
          border: 1px solid rgba(255, 255, 255, 0.82);
          background: rgba(255, 255, 255, 0.74);
          box-shadow: 0 12px 34px rgba(74, 80, 120, 0.1);
          color: #191923;
          transition: 0.2s ease;
        }

        .about-btn {
          height: 42px;
          padding: 0 18px;
          border-radius: 15px;
          font-weight: 850;
        }

        .round-btn {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          font-size: 20px;
        }

        .about-btn:hover,
        .round-btn:hover,
        .mode-btn:hover,
        .control-btn:hover,
        .feature-card:hover,
        .phone button:hover,
        .input-box button:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.95);
        }

        .mode-row {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin: 16px 0 8px;
        }

        .mode-btn {
          height: 40px;
          padding: 0 16px;
          border-radius: 999px;
          font-weight: 850;
          color: #696b78;
        }

        .mode-btn.active {
          background: #15151f;
          color: #fff;
        }

        .avatar-area {
          min-height: 312px;
          display: grid;
          place-items: center;
          padding: 18px 0 8px;
        }

        .halo {
          width: min(330px, 70vw);
          aspect-ratio: 1;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle, rgba(255, 255, 255, 0.98) 0 44%, rgba(235, 238, 250, 0.66) 45% 60%, transparent 61%),
            conic-gradient(from 90deg, #ffffff, #dfe4f2, #ffffff, #eef1fb, #ffffff);
          box-shadow:
            inset 0 0 60px rgba(255, 255, 255, 0.8),
            0 38px 95px rgba(104, 112, 150, 0.18);
          position: relative;
        }

        .halo::before,
        .halo::after {
          content: "";
          position: absolute;
          inset: 15px;
          border-radius: inherit;
          border: 1px solid rgba(255, 255, 255, 0.8);
        }

        .halo::after {
          inset: -10px;
          border: 1px solid rgba(220, 224, 237, 0.75);
          filter: blur(0.2px);
        }

        .halo.emotion-happy,
        .halo.emotion-playful,
        .halo.emotion-sassy {
          animation: softPulse 2.2s ease-in-out infinite;
        }

        .halo.emotion-supportive,
        .halo.emotion-sad {
          animation: slowGlow 3.3s ease-in-out infinite;
        }

        .avatar-card {
          width: 64%;
          aspect-ratio: 1;
          border-radius: 50%;
          overflow: hidden;
          position: relative;
          z-index: 2;
          box-shadow:
            0 20px 48px rgba(78, 82, 120, 0.2),
            inset 0 0 0 10px rgba(255, 255, 255, 0.8);
          background: #fff;
        }

        .avatar-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .control-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-top: 18px;
        }

        .control-btn {
          min-height: 42px;
          border-radius: 999px;
          padding: 0 16px;
          font-weight: 850;
          color: #5f6170;
        }

        .control-btn.small {
          padding: 0 13px;
        }

        .control-btn.active,
        .control-btn.active-soft,
        .live-main-btn {
          background: #15151f;
          color: white;
        }

        .chat-panel {
          min-height: 370px;
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.8);
          padding: 18px;
          box-shadow: inset 0 0 35px rgba(255, 255, 255, 0.54);
        }

        .message-scroll {
          height: 245px;
          overflow: auto;
          padding-right: 4px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .message-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .message-scroll::-webkit-scrollbar-thumb {
          border-radius: 99px;
          background: rgba(150, 155, 176, 0.42);
        }

        .msg-row {
          display: flex;
        }

        .lyra-row {
          justify-content: flex-start;
        }

        .user-row {
          justify-content: flex-end;
        }

        .chat-bubble {
          max-width: 78%;
          border-radius: 23px;
          padding: 13px 15px;
          white-space: pre-wrap;
          line-height: 1.48;
          font-weight: 700;
          font-size: 14px;
        }

        .chat-bubble p {
          margin: 0;
        }

        .chat-bubble span {
          display: block;
          margin-top: 8px;
          font-size: 11px;
          opacity: 0.72;
          text-align: right;
        }

        .chat-bubble.lyra {
          background: rgba(255, 255, 255, 0.92);
          color: #20202a;
          border-bottom-left-radius: 8px;
          box-shadow: 0 14px 32px rgba(71, 77, 115, 0.09);
        }

        .chat-bubble.user {
          background: #15151f;
          color: #fff;
          border-bottom-right-radius: 8px;
        }

        .first-message .chat-bubble {
          max-width: 92%;
        }

        .prompt-hint {
          margin: 13px 2px 12px;
          color: #777986;
          font-size: 13px;
          font-weight: 750;
        }

        .input-box {
          min-height: 58px;
          display: grid;
          grid-template-columns: 46px 46px 54px 1fr 52px;
          gap: 9px;
          align-items: center;
          border-radius: 23px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(255, 255, 255, 0.86);
        }

        .input-box button {
          height: 40px;
          border-radius: 15px;
          font-weight: 900;
        }

        .pdf-btn {
          font-size: 12px;
        }

        .input-box input {
          height: 42px;
          border: 0;
          outline: 0;
          background: transparent;
          font-weight: 750;
          color: #191923;
          min-width: 0;
        }

        .input-box input::placeholder {
          color: #9a9ca8;
        }

        .input-box button.active-mini {
          background: #15151f;
          color: white;
        }

        .send-btn {
          background: #15151f !important;
          color: white !important;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(90px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .feature-card {
          min-height: 118px;
          border-radius: 24px;
          padding: 15px 12px;
          display: grid;
          align-content: start;
          gap: 7px;
          text-align: left;
        }

        .feature-card span {
          width: 34px;
          height: 34px;
          border-radius: 14px;
          background: #15151f;
          color: white;
          display: grid;
          place-items: center;
          font-weight: 900;
        }

        .feature-card b {
          font-size: 13px;
        }

        .feature-card p {
          margin: 0;
          font-size: 11px;
          line-height: 1.35;
          color: #757784;
          font-weight: 700;
        }

        .feature-card em {
          margin-left: auto;
          color: #9a9ca8;
          font-style: normal;
        }

        .phone-panel {
          min-height: calc(100vh - 44px);
          display: grid;
          place-items: center;
        }

        .phone {
          width: 330px;
          height: 690px;
          border-radius: 46px;
          padding: 12px;
          background: rgba(18, 18, 26, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.7);
        }

        .phone-screen {
          height: 100%;
          border-radius: 36px;
          overflow: hidden;
          padding: 14px;
          background:
            radial-gradient(circle at top, rgba(255, 255, 255, 0.95), transparent 36%),
            linear-gradient(180deg, #f7f8fc, #eef0f7);
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .phone-status,
        .phone-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .phone-status {
          font-size: 12px;
          font-weight: 900;
        }

        .notch {
          width: 92px;
          height: 23px;
          border-radius: 0 0 15px 15px;
          background: #171923;
          margin-top: -14px;
        }

        .phone-head b {
          letter-spacing: 0.2em;
          font-size: 14px;
        }

        .phone-head button,
        .phone-controls button,
        .phone-input button,
        .phone-grid button {
          border-radius: 16px;
          min-height: 36px;
          font-weight: 850;
        }

        .phone-head button {
          width: 38px;
        }

        .phone-logo {
          width: 165px;
          height: 165px;
          border-radius: 50%;
          margin: 8px auto 0;
          overflow: hidden;
          box-shadow: 0 20px 55px rgba(99, 104, 145, 0.24);
          background: white;
        }

        .phone-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .phone-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .phone-controls .wide {
          grid-column: 1 / -1;
          background: #15151f;
          color: white;
        }

        .phone-input {
          display: grid;
          grid-template-columns: 1fr 42px;
          gap: 8px;
          align-items: center;
          padding: 10px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.76);
          font-size: 13px;
          font-weight: 850;
          color: #686a78;
        }

        .phone-input button {
          background: #15151f;
          color: white;
        }

        .phone-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          overflow: auto;
          padding-bottom: 4px;
        }

        .phone-grid button {
          min-height: 72px;
          padding: 10px;
          text-align: left;
          display: grid;
          gap: 4px;
          align-content: start;
        }

        .phone-grid span {
          font-weight: 900;
        }

        .phone-grid b {
          font-size: 12px;
        }

        .phone-grid em {
          justify-self: end;
          font-style: normal;
          color: #9a9ca8;
        }

        .phone-grid .single {
          grid-column: 1 / -1;
          background: #15151f;
          color: white;
        }

        .live-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          background:
            radial-gradient(circle at top, rgba(255, 255, 255, 0.2), transparent 40%),
            rgba(10, 11, 18, 0.78);
          display: grid;
          place-items: center;
          padding: 22px;
          backdrop-filter: blur(20px);
        }

        .lyra-call {
          width: min(520px, 100%);
          height: min(920px, 97vh);
          border-radius: 42px;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at top, rgba(255, 255, 255, 0.22), transparent 38%),
            linear-gradient(180deg, #15151f 0%, #252635 55%, #12121a 100%);
          color: white;
          box-shadow: 0 35px 120px rgba(0, 0, 0, 0.42);
        }

        .call-status {
          position: absolute;
          top: 18px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.18);
          font-size: 12px;
        }

        .call-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #bcc1cf;
        }

        .call-dot.on {
          background: #8af1b6;
          box-shadow: 0 0 0 7px rgba(138, 241, 182, 0.16);
        }

        .call-head {
          position: relative;
          z-index: 3;
          height: 112px;
          padding: 30px 24px 0;
          display: grid;
          grid-template-columns: 54px 1fr 54px;
          align-items: center;
          gap: 10px;
        }

        .call-icon {
          width: 54px;
          height: 54px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.14);
          color: white;
          font-size: 22px;
        }

        .call-title {
          text-align: center;
        }

        .call-title p {
          margin: 0;
          color: rgba(255, 255, 255, 0.68);
          font-size: 13px;
          font-weight: 750;
        }

        .call-title h2 {
          margin: 3px 0 0;
          font-size: 34px;
          letter-spacing: 0.03em;
        }

        .call-avatar {
          position: absolute;
          inset: 0;
          display: block;
          overflow: hidden;
        }

        .call-avatar::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(180deg, rgba(8, 8, 14, 0.42) 0%, rgba(8, 8, 14, 0.05) 34%, rgba(8, 8, 14, 0.22) 72%, rgba(8, 8, 14, 0.66) 100%),
            radial-gradient(circle at 50% 34%, rgba(255, 255, 255, 0.16), transparent 42%);
          pointer-events: none;
        }

        .call-video,
        .avatar-fallback {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border-radius: 0;
          overflow: hidden;
          box-shadow: none;
          background: #12121a;
        }

        .call-video {
          object-fit: cover;
          object-position: center center;
          opacity: 0;
          transform: scale(1.04);
          transition:
            opacity 0.35s ease,
            transform 0.45s ease;
        }

        .call-video.ready {
          opacity: 1;
          transform: scale(1.08);
        }

        .avatar-fallback {
          display: block;
        }

        .avatar-fallback img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          transform: scale(1.08);
        }

        .camera-preview {
          position: absolute;
          right: 18px;
          bottom: 155px;
          width: 116px;
          height: 154px;
          object-fit: cover;
          border-radius: 24px;
          border: 2px solid rgba(255, 255, 255, 0.55);
          z-index: 4;
          box-shadow: 0 16px 42px rgba(0, 0, 0, 0.35);
        }

        .live-floating-chat {
          position: absolute;
          left: 26px;
          right: 26px;
          bottom: 150px;
          z-index: 5;
          display: flex;
          justify-content: flex-start;
          pointer-events: none;
        }

        .live-bubble {
          max-width: 86%;
          min-width: 220px;
          border-radius: 24px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(18px);
        }

        .live-bubble b {
          display: block;
          margin-bottom: 5px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.74);
        }

        .live-bubble p {
          margin: 0;
          line-height: 1.42;
          font-weight: 750;
        }

        .call-dock {
          position: absolute;
          left: 22px;
          right: 22px;
          bottom: 24px;
          min-height: 112px;
          padding: 14px;
          border-radius: 32px;
          background: rgba(255, 255, 255, 0.13);
          border: 1px solid rgba(255, 255, 255, 0.18);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          z-index: 6;
          backdrop-filter: blur(20px);
        }

        .call-control {
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.11);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.16);
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 7px;
          box-shadow: none;
        }

        .call-control span {
          width: 48px;
          height: 48px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.14);
          font-size: 20px;
        }

        .call-control b {
          font-size: 11px;
        }

        .call-control.active span {
          background: rgba(138, 241, 182, 0.25);
        }

        .call-control.danger span {
          background: rgba(255, 96, 96, 0.34);
        }

        @keyframes softPulse {
          0%,
          100% {
            transform: scale(1);
            filter: saturate(1);
          }
          50% {
            transform: scale(1.025);
            filter: saturate(1.08);
          }
        }

        @keyframes slowGlow {
          0%,
          100% {
            box-shadow:
              inset 0 0 60px rgba(255, 255, 255, 0.8),
              0 38px 95px rgba(104, 112, 150, 0.18);
          }
          50% {
            box-shadow:
              inset 0 0 70px rgba(255, 255, 255, 0.9),
              0 42px 115px rgba(170, 178, 215, 0.26);
          }
        }

        @media (max-width: 1180px) {
          .lyra-page {
            grid-template-columns: 220px 1fr;
          }

          .phone-panel {
            display: none;
          }

          .feature-grid {
            grid-template-columns: repeat(4, minmax(110px, 1fr));
          }
        }

        @media (max-width: 760px) {
          .lyra-page {
            display: block;
            padding: 0;
          }

          .sidebar,
          .phone-panel {
            display: none;
          }

          .main-shell {
            min-height: 100vh;
            border-radius: 0;
            border: 0;
            padding: 16px;
          }

          .topbar {
            grid-template-columns: 1fr auto auto;
          }

          .top-status b {
            font-size: 16px;
          }

          .top-status p {
            font-size: 12px;
          }

          .halo {
            width: min(270px, 78vw);
          }

          .chat-panel {
            min-height: 340px;
          }

          .chat-bubble {
            max-width: 92%;
          }

          .input-box {
            grid-template-columns: 42px 42px 48px 1fr 48px;
            padding: 10px;
          }

          .feature-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .feature-card {
            min-height: 98px;
          }

          .live-overlay {
            padding: 0;
          }

          .lyra-call {
            width: 100vw;
            height: 100vh;
            border-radius: 0;
          }

          .call-head {
            padding: 30px 18px 0;
          }

          .call-icon {
            width: 50px;
            height: 50px;
            border-radius: 18px;
          }

          .call-title h2 {
            font-size: 28px;
          }

          .call-video,
          .avatar-fallback {
            inset: 0;
            width: 100%;
            height: 100%;
          }

          .live-floating-chat {
            left: 22px;
            right: 22px;
            bottom: 148px;
          }

          .live-bubble {
            max-width: 88%;
            min-width: 205px;
          }

          .call-dock {
            left: 16px;
            right: 16px;
            bottom: 38px;
          }

          .call-control span {
            width: 57px;
            height: 57px;
          }
        }

        @media (max-width: 420px) {
          .control-row {
            justify-content: flex-start;
          }

          .input-box {
            grid-template-columns: 40px 40px 1fr 44px;
          }

          .pdf-btn {
            display: none;
          }

          .live-bubble p {
            font-size: 15px;
          }

          .call-dock {
            min-height: 108px;
          }

          .call-control span {
            width: 52px;
            height: 52px;
            font-size: 20px;
          }

          .call-control b {
            font-size: 12px;
          }
        }
      `}</style>
    </main>
  );
}

