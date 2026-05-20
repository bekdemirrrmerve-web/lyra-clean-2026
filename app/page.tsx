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

const LYRA_AVATAR = "/lyra-avatar.jpg.jpeg";
const LYRA_VIDEO = "/lyra-avatar-mp4.mp4";

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
    desc: "Güncel bilgi gerekiyorsa online araştırma dener.",
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
    desc: "Görüntülü konuşma ekranını açar.",
  },
];

const starterMessages: Message[] = [
  {
    id: 1,
    role: "lyra",
    time: "13:21",
    text:
      "Merhaba kanka. Ben Lyra 🤍\n\nBugün biraz daha gerçek insan gibi konuşmaya çalışacağım: kısa, doğal, gerektiğinde komik, gerektiğinde ciddi. Bana yaz, mikrofonla konuş ya da Canlı Konuşma’yı aç; ben buradayım.",
  },
];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeMessageId() {
  return Date.now() + Math.floor(Math.random() * 100000);
}

function isHealthCheckJson(text: string) {
  const value = text.trim();

  return (
    value.startsWith("{") &&
    value.includes('"ok"') &&
    (value.includes('"/api/search"') ||
      value.includes('"/api/gemini"') ||
      value.includes('"hasBraveKey"') ||
      value.includes('"hasFreeFallback"') ||
      value.includes('"route"'))
  );
}

function cleanLyraAnswer(value: unknown) {
  if (typeof value !== "string") return "";

  let text = value.trim();

  if (!text) return "";
  if (isHealthCheckJson(text)) return "";

  text = text.replace(
    /Online araştırma bağlantısı gelmedi kanka\. Gemini\/API tarafı çalışmıyor olabilir\. Seni boş bırakmıyorum, API’siz modla cevaplıyorum:\s*/gi,
    "Online araştırma şu an düzgün kaynak getirmedi kanka. Ben seni boş bırakmıyorum, API’siz moddan cevaplıyorum:\n\n"
  );

  text = text.replace(
    /Local AI şu an cevap vermedi kanka\. Ollama açık değilse bu normal\. API’siz Lyra moduna düşüp yine cevaplıyorum:\s*/gi,
    "Local AI şu an cevap vermedi kanka. Sorun değil, API’siz Lyra moduna düşüp devam ediyorum:\n\n"
  );

  return text.trim();
}

function pickApiAnswer(data: any) {
  if (!data) return "";

  if (typeof data === "string") {
    return cleanLyraAnswer(data);
  }

  return cleanLyraAnswer(
    data?.answer ||
      data?.reply ||
      data?.text ||
      data?.message ||
      data?.result ||
      ""
  );
}

function humanizeAnswer(answer: string, question: string) {
  const q = question.toLocaleLowerCase("tr-TR");
  const clean = answer.trim();

  if (!clean) return "";

  if (
    clean.startsWith("Hımm") ||
    clean.startsWith("Tamam kanka") ||
    clean.startsWith("Ay") ||
    clean.startsWith("Bak")
  ) {
    return clean;
  }

  if (q.includes("hata") || q.includes("bozuldu") || q.includes("çalışmıyo")) {
    return `Ay tamam, burada küçük bir kaos çıkmış ama panik yok 😅\n\n${clean}`;
  }

  if (q.includes("kod") || q.includes("github") || q.includes("vercel")) {
    return `Tamam kanka, teknik tarafa giriyoruz. Ben olsam şöyle toparlardım:\n\n${clean}`;
  }

  if (q.includes("içerik") || q.includes("hook") || q.includes("video")) {
    return `Ooo bu içerik olur kanka. Hatta biraz parlatırsak keşfete göz kırpar 😄\n\n${clean}`;
  }

  if (q.includes("moral") || q.includes("üzgün") || q.includes("yoruldum")) {
    return `Canım ya, önce bir sakin. Bence kendine şu an biraz fazla yükleniyor olabilirsin 🤍\n\n${clean}`;
  }

  return `Hımm tamam, bunu şöyle düşünürdüm:\n\n${clean}`;
}

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok && !data) {
    throw new Error(`${url} bağlantısı başarısız.`);
  }

  return data;
}

function createOfflineAnswer(question: string) {
  const q = question.toLocaleLowerCase("tr-TR").trim();

  if (q === "test") {
    return "Test başarılı kanka. Lyra ayakta. Şu an API’siz moddayım ama boş boş bakmıyorum, cevap üretiyorum 😄";
  }

  if (
    q.includes("merhaba") ||
    q.includes("selam") ||
    q.includes("naber") ||
    q.includes("nasılsın")
  ) {
    return "Buradayım kanka 🤍 Bugün modum: sakin ama işe yarar. Bana yaz, ben hem gerçekçi hem de biraz tatlı tatlı cevap vereyim.";
  }

  if (
    q.includes("çalışıyor musun") ||
    q.includes("çalışıyo musun") ||
    q.includes("çalışıyor mu")
  ) {
    return "Evet çalışıyorum kanka. Hatta bu sefer sadece süs gibi durmuyorum; sol menüye basınca tepki veriyorum, canlı konuşma açıyorum, mesaj da yazıyorum. Küçük ama gururlu bir yazılım anı 😌";
  }

  if (
    q.includes("hook") ||
    q.includes("içerik") ||
    q.includes("reels") ||
    q.includes("tiktok") ||
    q.includes("video metni") ||
    q.includes("teleprompter")
  ) {
    return `Şunu içerik formatına çevirelim:

HOOK:
“Bunu çoğu kişi yanlış biliyor ama işin kimyası bambaşka…”

GİRİŞ:
Bugün sana bu konuyu çok sade anlatacağım. Dışarıdan basit görünüyor ama mantığını anlayınca olay değişiyor.

GELİŞME:
Önce problemi anlatırız, sonra neden olduğunu söyleriz, en son da doğru kullanım/çözüm kısmına geçeriz.

KAPANIŞ:
Yani mesele sadece “ne kullanayım?” değil; “neden, ne zaman ve nasıl kullanayım?” sorusu.

CTA:
Kaydet kanka, sonra bunun formül mantığını da anlatacağım.`;
  }

  if (
    q.includes("formül") ||
    q.includes("krem") ||
    q.includes("serum") ||
    q.includes("tonik") ||
    q.includes("şampuan") ||
    q.includes("kozmetik")
  ) {
    return `Kozmetik mantığıyla bakarsak önce şunu netleştiririz:

1. Ürün tipi ne? Krem mi, serum mu, tonik mi?
2. Hedef ne? Nem, bariyer, leke, akne, parlaklık?
3. Baz sistem ne olacak? Su fazı, yağ fazı, jel baz ya da emülsiyon?
4. Aktifler hangi yüzde aralığında kullanılacak?
5. pH aralığı uygun mu?
6. Koruyucu sistemi var mı?
7. Stabilite ve görünüm kontrolü yapılacak mı?

Ben olsam önce hedefi seçer, sonra formülü faz faz kurardım. Yoksa formül dediğin şey biraz “her güzel şeyi aynı kaba koydum” kaosuna dönüyor 😅`;
  }

  if (
    q.includes("araştır") ||
    q.includes("güncel") ||
    q.includes("trend") ||
    q.includes("2026") ||
    q.includes("internetten")
  ) {
    return `Burada dürüst olayım kanka: API’siz moddayken canlı internete çıkamam.

Ama şöyle yaparız:
1. Ben önce bilgiyi sade şekilde toparlarım.
2. Online Araştırma modunu açarsan /api/search veya Gemini varsa güncel veri deneriz.
3. Gelen cevabı da senin içerik diline çeviririm.

Yani ben olsam: önce taslak, sonra güncel kaynak, sonra video metni şeklinde giderdim.`;
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

PDF okuma backend’i bağlanırsa bunu dosyadan da yaparız. Şimdilik metni yapıştırırsan ben onu tertemiz toparlarım.`;
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

  return `Bunu anladım kanka. Şu an API’siz Lyra modundayım; yani canlı internet olmadan kendi mantığımla cevap veriyorum.

Ben olsam önce şuna bakardım:
1. Bu konu bilgi mi istiyor?
2. İçerik mi üretilecek?
3. Kod mu düzeltilecek?
4. Güncel araştırma mı gerekiyor?

Sen bana konuyu biraz netleştir, ben onu direkt kullanılabilir hale çevireyim.`;
}

async function askOnlineResearch(message: string) {
  const searchData = await postJson("/api/search", {
    query: message,
    message,
  });

  const searchAnswer = pickApiAnswer(searchData);

  if (searchAnswer) return searchAnswer;

  try {
    const geminiData = await postJson("/api/gemini", {
      message,
      mode: "online-research",
    });

    const geminiAnswer = pickApiAnswer(geminiData);

    if (geminiAnswer) return geminiAnswer;
  } catch {
    // sessiz geç
  }

  return (
    "Online araştırma şu an güçlü kaynak getirmedi. API’siz modla cevaplıyorum:\n\n" +
    createOfflineAnswer(message)
  );
}

async function askLocalOllama(message: string) {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3.2:3b",
      prompt: `Sen Lyra adında sıcak, doğal, Türkçe konuşan bir yapay zeka asistansın. Kullanıcıyla yakın arkadaş gibi ama akıllı ve işe yarar konuş. Gerektiğinde kısa komik tepkiler ver, ama cevabı boş yapma.\n\nKullanıcı: ${message}\nLyra:`,
      stream: false,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.response) {
    throw new Error("Local model cevap vermedi.");
  }

  return data.response;
}

export default function Page() {
  const cameraRef = useRef<HTMLVideoElement | null>(null);
  const lyraVideoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<any>(null);
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

  function now() {
    return new Date().toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function modeLabel() {
    if (aiMode === "offline") return "API’siz Lyra";
    if (aiMode === "local") return "Local AI";
    return "Online Araştırma";
  }

  function pushLyraMessage(text: string) {
    const msg: Message = {
      id: makeMessageId(),
      role: "lyra",
      text,
      time: now(),
    };

    setMessages((prev) => [...prev, msg]);
    speakHuman(text);
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

  function speakHuman(text: string) {
    if (muted || typeof window === "undefined") return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    synth.cancel();

    const clean = text
      .replace(/\n+/g, ". ")
      .replace(/🤍|😄|😅|😌|✨/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const parts = clean
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 8);

    const voice = getBestTurkishVoice();

    function speakPart(index: number) {
      if (index >= parts.length) return;

      const utter = new SpeechSynthesisUtterance(parts[index]);
      utter.lang = "tr-TR";
      utter.voice = voice || null;
      utter.rate = gender === "Kadın" ? 0.92 : 0.88;
      utter.pitch = gender === "Kadın" ? 1.07 : 0.88;
      utter.volume = 1;

      utter.onend = () => {
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
      let answer = "";

      if (aiMode === "offline") {
        await wait(250);
        answer = createOfflineAnswer(clean);
      } else if (aiMode === "local") {
        try {
          answer = await askLocalOllama(clean);
        } catch {
          answer =
            "Local AI şu an cevap vermedi kanka. Sorun değil, API’siz moda düşüyorum:\n\n" +
            createOfflineAnswer(clean);
        }
      } else {
        try {
          answer = await askOnlineResearch(clean);
        } catch {
          answer =
            "Online araştırma şu an sağlam cevap getirmedi kanka. API’siz modla devam ediyorum:\n\n" +
            createOfflineAnswer(clean);
        }
      }

      const cleaned = cleanLyraAnswer(answer) || createOfflineAnswer(clean);
      const finalAnswer = humanizeAnswer(cleaned, clean);

      const lyraMessage: Message = {
        id: makeMessageId(),
        role: "lyra",
        text: finalAnswer,
        time: now(),
      };

      setMessages((prev) => [...prev, lyraMessage]);
      speakHuman(finalAnswer);
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
    if (micOn) {
      recognitionRef.current?.stop?.();
      setMicOn(false);
      setLiveText("Mikrofon kapalı.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

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

    recognition.onerror = () => {
      setMicOn(false);
      setLiveText("Mikrofon bağlantısı kesildi.");
    };

    recognition.onend = () => {
      setMicOn(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function openLive() {
    setLiveOpen(true);
    setShowLiveChat(true);

    setTimeout(() => {
      lyraVideoRef.current?.play().catch(() => {});
    }, 100);
  }

  function closeLive() {
    setLiveOpen(false);
    recognitionRef.current?.stop?.();
    setMicOn(false);

    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setCameraOn(false);

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
        "Sohbetler alanı açıldı kanka. Şimdilik bu demo sürümde aktif sohbeti gösteriyorum. Bir sonraki aşamada buraya eski sohbet kayıtları, tarih ve arama sistemi ekleyebiliriz."
      );
      return;
    }

    if (action === "modes") {
      featureRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      pushLyraMessage(
        "Modlar burada kanka. Araştırma, içerik, ders, PDF ve canlı modları aşağıdan seçebilirsin. Ben olsam Canlı Mod’u ayrı parlatırdım, çünkü en havalı görünen o 😄"
      );
      return;
    }

    if (action === "tools") {
      pushLyraMessage(
        "Araçlar aktif: içerik üretme, araştırma, PDF özeti, görsel prompt, ders modu ve canlı konuşma. Şimdilik hepsini buradan yönetiyoruz; sonra bunları ayrı mini uygulama gibi bölebiliriz."
      );
      return;
    }

    if (action === "reminders") {
      pushLyraMessage(
        "Hatırlatıcılar alanı hazır. Şimdilik ben burada sana plan/hatırlatma metni hazırlayabilirim. Gerçek bildirim için takvim veya notification sistemi bağlamamız gerekir."
      );
      setInput("Bana şunu hatırlat: ");
      return;
    }

    if (action === "settings") {
      pushLyraMessage(
        "Ayarlar açıldı kanka. Buradan ses tonu, kadın/erkek ses, sessiz mod, API’siz/Local/Online mod ve canlı konuşma tercihleri yönetiliyor. Şu an en önemli ayar: Lyra daha doğal konuşsun diye insan modu açık 😌"
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
            API’siz Lyra
          </button>

          <button
            className={aiMode === "local" ? "mode-btn active" : "mode-btn"}
            onClick={() => setAiMode("local")}
          >
            Local AI
          </button>

          <button
            className={aiMode === "online" ? "mode-btn active" : "mode-btn"}
            onClick={() => setAiMode("online")}
          >
            Online Araştırma
          </button>
        </section>

        <section className="avatar-area">
          <div className="halo">
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
                  <p>
                    {aiMode === "offline"
                      ? "Hımm tamam, düşünüyorum... Çok ciddi durmayayım ama cevabı da boşlamayayım 😄"
                      : aiMode === "local"
                        ? "Local AI cevap hazırlıyor..."
                        : "Online araştırma deneniyor..."}
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="prompt-hint">
            {aiMode === "offline"
              ? "API’siz mod açık. Lyra daha doğal, sıcak ve hızlı cevap verir."
              : aiMode === "local"
                ? "Local AI modu açık. Ollama açıksa bilgisayarındaki modelle cevap verir."
                : "Online Araştırma modu açık. API yoksa otomatik API’siz moda düşer."}
          </p>

          <div className="input-box">
            <button onClick={openLive}>◖</button>
            <button onClick={toggleMic}>♫</button>
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
              <button onClick={() => setAiMode("offline")}>API’siz</button>
              <button onClick={() => setAiMode("local")}>Local AI</button>
              <button onClick={() => setAiMode("online")}>Online</button>
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
              <b>9:41</b>
              <div>
                <span>▮▮▮</span>
                <span>⌁</span>
                <span className="call-battery" />
              </div>
            </div>

            <header className="call-head">
              <button
                className="call-icon"
                onClick={closeLive}
                aria-label="Canlı konuşmayı kapat"
              >
                ⌄
              </button>

              <div className="call-title">
                <h2>Live Talk</h2>
                <p>
                  <span className="green-dot" />
                  {loading ? "Thinking..." : "Connected"}
                  <span className="call-wave">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </p>
              </div>

              <button
                className="call-icon sparkle"
                onClick={() => setShowLiveChat((v) => !v)}
                aria-label="Mesajları göster/gizle"
              >
                ✨
              </button>
            </header>

            <div className="call-stage">
              <div className="room-arch" />
              <div className="room-lamp" />
              <div className="room-glow one" />
              <div className="room-glow two" />

              <div className="avatar-fallback">
                <div className="fallback-head">
                  <div className="fallback-hair" />
                  <div className="fallback-face">
                    <span className="eye left" />
                    <span className="eye right" />
                    <span className="smile" />
                  </div>
                </div>
                <div className="fallback-body" />
              </div>

              <video
                ref={lyraVideoRef}
                className="call-video"
                src={LYRA_VIDEO}
                autoPlay
                loop
                muted
                playsInline
                poster={LYRA_AVATAR}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />

              {cameraOn && (
                <div className="self-camera">
                  <video ref={cameraRef} autoPlay playsInline muted />
                </div>
              )}

              {showLiveChat && (
                <div className="live-floating-chat">
                  {messages.length <= 1 ? (
                    <>
                      <article className="live-bubble lyra">
                        <span className="live-dots">
                          <i />
                          <i />
                          <i />
                        </span>
                        <time>00:12</time>
                        <p>Seni görmek çok güzel. Bugün nasılsın?</p>
                      </article>

                      <article className="live-bubble user">
                        <time>00:18</time>
                        <p>Biraz yoruldum ama konuşunca daha iyi geldi.</p>
                        <small>✓✓</small>
                      </article>
                    </>
                  ) : (
                    messages.slice(-2).map((message) => (
                      <article
                        key={message.id}
                        className={`live-bubble ${message.role}`}
                      >
                        {message.role === "lyra" && (
                          <span className="live-dots">
                            <i />
                            <i />
                            <i />
                          </span>
                        )}

                        <time>{message.time}</time>
                        <p>{message.text}</p>

                        {message.role === "user" && <small>✓✓</small>}
                      </article>
                    ))
                  )}

                  {micOn && liveText && (
                    <article className="live-bubble listening">
                      <time>Live</time>
                      <p>{liveText}</p>
                    </article>
                  )}
                </div>
              )}
            </div>

            <nav className="call-dock">
              <button
                className={micOn ? "call-control active" : "call-control"}
                onClick={toggleMic}
              >
                <span>🎙️</span>
                <b>{micOn ? "Dinliyor" : "Mute"}</b>
              </button>

              <button
                className={muted ? "call-control active" : "call-control"}
                onClick={() => {
                  setMuted((v) => !v);
                  window.speechSynthesis?.cancel?.();
                }}
              >
                <span>🔊</span>
                <b>{muted ? "Sessiz" : "Speaker"}</b>
              </button>

              <button
                className={showLiveChat ? "call-control active" : "call-control"}
                onClick={() => setShowLiveChat((v) => !v)}
              >
                <span>💬</span>
                <b>Chat</b>
              </button>

              <button className="call-control end" onClick={closeLive}>
                <span>☎</span>
                <b>End</b>
              </button>
            </nav>

            <div className="call-home-indicator" />
          </section>
        </div>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background:
            radial-gradient(circle at 50% -15%, #fff, transparent 30%),
            linear-gradient(135deg, #f8fafc 0%, #e8edf1 100%);
          color: #111;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          border: 0;
          cursor: pointer;
        }

        .lyra-page {
          min-height: 100vh;
          padding: 14px;
          display: grid;
          grid-template-columns: 235px minmax(560px, 1fr) 330px;
          gap: 14px;
          overflow-x: hidden;
        }

        .sidebar,
        .main-shell,
        .phone-panel {
          border: 1px solid #cfd3d8;
          background: linear-gradient(145deg, #ffffff 0%, #edf1f4 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 18px 44px rgba(0, 0, 0, 0.055);
        }

        .sidebar {
          border-radius: 26px;
          padding: 26px 16px 18px;
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 28px);
        }

        .brand {
          margin: 0 0 22px 12px;
          font-size: 34px;
          font-weight: 950;
          letter-spacing: 5px;
          line-height: 1;
        }

        .nav {
          display: grid;
          gap: 12px;
        }

        .nav-btn,
        .control-btn,
        .about-btn,
        .round-btn,
        .feature-card,
        .input-box button,
        .phone-controls button,
        .phone-grid button,
        .phone-input,
        .pro-card,
        .profile-card,
        .usage-card,
        .weather,
        .mode-btn {
          border: 1px solid #c9ced4;
          background: linear-gradient(145deg, #ffffff 0%, #eef1f4 100%);
          color: #111;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.96),
            inset 0 -8px 18px rgba(0, 0, 0, 0.035),
            0 9px 22px rgba(0, 0, 0, 0.045);
          font-weight: 950;
        }

        .nav-btn {
          height: 52px;
          border-radius: 17px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          transition: 0.2s ease;
        }

        .nav-btn:hover {
          transform: translateY(-1px);
          background: #fff;
        }

        .nav-btn.active {
          background: #111;
          color: white;
          border-color: #111;
        }

        .nav-btn span {
          width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: #fff;
          color: #686f76;
        }

        .nav-btn.active span {
          color: #111;
        }

        .sidebar-bottom {
          margin-top: auto;
          display: grid;
          gap: 12px;
        }

        .pro-card,
        .profile-card,
        .usage-card,
        .weather {
          border-radius: 20px;
          padding: 16px;
        }

        .pro-card b {
          display: block;
          font-size: 20px;
          letter-spacing: 1px;
        }

        .pro-card p,
        .profile-card p,
        .usage-card p,
        .weather p {
          margin: 4px 0 0;
          color: #7a8088;
          font-size: 13px;
          font-weight: 700;
        }

        .profile-card {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .profile-avatar {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: #111;
          color: white;
          font-weight: 950;
        }

        .profile-card > span {
          margin-left: auto;
        }

        .usage-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
        }

        .usage-head strong {
          color: #58606b;
        }

        .usage-bar {
          margin: 12px 0;
          height: 8px;
          border-radius: 999px;
          background: #d9dee4;
          overflow: hidden;
        }

        .usage-bar i {
          display: block;
          width: 86%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #111, #a8b1bd);
        }

        .weather {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .weather span {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: #fff;
          font-size: 24px;
        }

        .main-shell {
          border-radius: 30px;
          padding: 22px;
          min-height: calc(100vh - 28px);
          display: flex;
          flex-direction: column;
          gap: 18px;
          overflow: hidden;
        }

        .topbar {
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 12px;
        }

        .clean-topbar {
          min-height: 58px;
        }

        .top-status {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .status-dot {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #32c76f;
          box-shadow: 0 0 0 7px rgba(50, 199, 111, 0.12);
          flex: 0 0 auto;
        }

        .top-status b {
          display: block;
          font-size: 18px;
          font-weight: 950;
        }

        .top-status p {
          margin: 2px 0 0;
          color: #7a8088;
          font-size: 13px;
          font-weight: 750;
        }

        .about-btn {
          height: 48px;
          padding: 0 20px;
          border-radius: 999px;
        }

        .round-btn {
          width: 48px;
          height: 48px;
          border-radius: 999px;
        }

        .mode-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .mode-btn {
          height: 44px;
          padding: 0 18px;
          border-radius: 999px;
        }

        .mode-btn.active {
          background: #111;
          color: white;
          border-color: #111;
        }

        .avatar-area {
          display: grid;
          place-items: center;
          gap: 18px;
          padding: 12px 0 4px;
        }

        .halo {
          width: min(330px, 72vw);
          aspect-ratio: 1;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle, rgba(255, 255, 255, 0.95), rgba(225, 231, 237, 0.75) 55%, transparent 70%),
            conic-gradient(from 220deg, #ffffff, #dce3eb, #f7f7f7, #cfd8e1, #ffffff);
          box-shadow:
            inset 0 0 50px rgba(255, 255, 255, 0.8),
            0 30px 70px rgba(110, 126, 140, 0.25);
        }

        .avatar-card {
          width: 78%;
          height: 78%;
          border-radius: 50%;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.9);
          background: #fff;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            0 20px 55px rgba(0, 0, 0, 0.12);
        }

        .avatar-card img,
        .phone-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .control-row {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .control-btn {
          height: 46px;
          padding: 0 16px;
          border-radius: 999px;
        }

        .control-btn.small {
          min-width: 88px;
        }

        .control-btn.active,
        .control-btn.active-soft {
          background: #111;
          color: white;
          border-color: #111;
        }

        .live-main-btn {
          background:
            radial-gradient(circle at top left, rgba(255, 255, 255, 0.98), rgba(248, 230, 214, 0.9)),
            linear-gradient(145deg, #ffffff, #f0d7c5);
          border-color: rgba(188, 148, 96, 0.45);
        }

        .chat-panel {
          flex: 1;
          min-height: 290px;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(201, 206, 212, 0.75);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .message-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
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
          max-width: min(78%, 680px);
          border-radius: 24px;
          padding: 16px 18px;
          white-space: pre-wrap;
          line-height: 1.45;
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.06);
        }

        .chat-bubble p {
          margin: 0;
          font-size: 15px;
          font-weight: 650;
        }

        .chat-bubble span {
          display: block;
          margin-top: 8px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.72);
          text-align: right;
        }

        .chat-bubble.lyra {
          background: linear-gradient(145deg, #ffffff, #edf1f5);
          border: 1px solid #d8dde4;
          color: #111;
        }

        .chat-bubble.user {
          background: #111;
          color: white;
        }

        .first-message .chat-bubble {
          max-width: 92%;
        }

        .prompt-hint {
          margin: 0;
          padding: 0 22px 14px;
          color: #79808a;
          font-size: 13px;
          font-weight: 700;
        }

        .input-box {
          display: grid;
          grid-template-columns: 46px 46px 58px 1fr 54px;
          gap: 8px;
          padding: 14px;
          border-top: 1px solid rgba(201, 206, 212, 0.72);
          background: rgba(248, 250, 252, 0.82);
        }

        .input-box button {
          height: 46px;
          border-radius: 16px;
        }

        .input-box input {
          width: 100%;
          min-width: 0;
          border: 1px solid #cbd1d8;
          border-radius: 16px;
          padding: 0 16px;
          outline: none;
          background: white;
          font-weight: 750;
        }

        .send-btn {
          background: #111 !important;
          color: #fff !important;
          border-color: #111 !important;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(90px, 1fr));
          gap: 10px;
        }

        .feature-card {
          min-height: 112px;
          border-radius: 22px;
          padding: 14px;
          text-align: left;
          display: grid;
          gap: 6px;
          position: relative;
        }

        .feature-card span {
          font-size: 22px;
        }

        .feature-card b {
          font-size: 13px;
        }

        .feature-card p {
          margin: 0;
          color: #737b85;
          font-size: 11px;
          line-height: 1.25;
          font-weight: 700;
        }

        .feature-card em {
          position: absolute;
          right: 12px;
          top: 10px;
          font-style: normal;
          color: #87909a;
        }

        .phone-panel {
          border-radius: 30px;
          padding: 18px;
          display: grid;
          place-items: center;
          min-height: calc(100vh - 28px);
        }

        .phone {
          width: 100%;
          max-width: 285px;
          aspect-ratio: 9 / 18.6;
          border-radius: 38px;
          padding: 10px;
          background: #111;
          box-shadow: 0 28px 60px rgba(0, 0, 0, 0.18);
        }

        .phone-screen {
          height: 100%;
          border-radius: 30px;
          overflow: hidden;
          background:
            radial-gradient(circle at top, #ffffff, #eef2f6 45%, #dfe5eb);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .phone-status,
        .phone-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 950;
        }

        .notch {
          width: 68px;
          height: 18px;
          border-radius: 999px;
          background: #111;
        }

        .phone-head button {
          width: 28px;
          height: 28px;
          border-radius: 12px;
          background: white;
          font-weight: 900;
        }

        .phone-logo {
          width: 110px;
          height: 110px;
          margin: 8px auto 0;
          border-radius: 50%;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 20px 38px rgba(0, 0, 0, 0.12);
        }

        .phone-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .phone-controls button,
        .phone-grid button {
          min-height: 34px;
          border-radius: 13px;
          font-size: 10px;
          padding: 7px;
        }

        .phone-controls .wide {
          grid-column: 1 / -1;
          background: #111;
          color: white;
          border-color: #111;
        }

        .phone-input {
          height: 42px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px 0 12px;
          font-size: 10px;
        }

        .phone-input button {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          background: #111;
          color: white;
        }

        .phone-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .phone-grid button {
          display: grid;
          align-content: center;
          gap: 3px;
          text-align: left;
        }

        .phone-grid .single {
          grid-column: 1 / -1;
        }

        .phone-grid span {
          font-size: 16px;
        }

        .phone-grid b {
          font-size: 10px;
        }

        .phone-grid em {
          justify-self: end;
          font-style: normal;
        }

        .live-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 18px;
          background:
            radial-gradient(circle at top, rgba(255, 255, 255, 0.7), transparent 34%),
            rgba(28, 21, 18, 0.48);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .lyra-call {
          position: relative;
          width: min(94vw, 430px);
          height: min(92vh, 880px);
          overflow: hidden;
          border-radius: 44px;
          background:
            radial-gradient(circle at 18% 25%, rgba(255, 255, 255, 0.72), transparent 25%),
            radial-gradient(circle at 84% 45%, rgba(255, 226, 188, 0.64), transparent 25%),
            linear-gradient(180deg, #f6e6d7 0%, #ead0ba 100%);
          color: #2d2723;
          box-shadow:
            0 35px 90px rgba(60, 35, 22, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.86);
          isolation: isolate;
        }

        .lyra-call::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.42), transparent 24%, transparent 76%, rgba(255, 255, 255, 0.25)),
            radial-gradient(circle at 50% 12%, rgba(255, 255, 255, 0.5), transparent 28%);
        }

        .call-status {
          position: absolute;
          top: 18px;
          left: 0;
          right: 0;
          z-index: 8;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 34px;
          font-weight: 850;
          font-size: 17px;
          letter-spacing: -0.02em;
        }

        .call-status div {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .call-battery {
          width: 25px;
          height: 13px;
          border: 2px solid #1d1916;
          border-radius: 4px;
          position: relative;
          display: inline-block;
        }

        .call-battery::before {
          content: "";
          position: absolute;
          left: 2px;
          top: 2px;
          width: 15px;
          height: 5px;
          border-radius: 2px;
          background: #1d1916;
        }

        .call-battery::after {
          content: "";
          position: absolute;
          right: -5px;
          top: 3px;
          width: 3px;
          height: 5px;
          border-radius: 0 2px 2px 0;
          background: #1d1916;
        }

        .call-head {
          position: absolute;
          top: 62px;
          left: 0;
          right: 0;
          z-index: 8;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 0 26px;
        }

        .call-icon {
          width: 54px;
          height: 54px;
          border: 0;
          border-radius: 20px;
          display: grid;
          place-items: center;
          background: rgba(255, 250, 242, 0.76);
          color: #756557;
          font-size: 30px;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            0 14px 35px rgba(116, 82, 56, 0.14);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          transition: 0.2s ease;
        }

        .call-icon:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.88);
        }

        .sparkle {
          font-size: 22px;
          color: #bd9460;
        }

        .call-title {
          text-align: center;
          padding-top: 4px;
        }

        .call-title h2 {
          margin: 0;
          font-size: 30px;
          line-height: 1;
          letter-spacing: -0.05em;
          font-weight: 850;
        }

        .call-title p {
          margin: 10px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          color: rgba(47, 41, 37, 0.72);
          font-size: 15px;
          font-weight: 700;
        }

        .green-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #36c66f;
          box-shadow: 0 0 0 5px rgba(54, 198, 111, 0.13);
        }

        .call-wave {
          display: inline-flex;
          align-items: end;
          gap: 3px;
          height: 17px;
        }

        .call-wave i {
          width: 3px;
          border-radius: 4px;
          background: #36c66f;
          animation: callWave 0.8s infinite ease-in-out;
        }

        .call-wave i:nth-child(1) {
          height: 7px;
        }

        .call-wave i:nth-child(2) {
          height: 13px;
          animation-delay: 0.1s;
        }

        .call-wave i:nth-child(3) {
          height: 9px;
          animation-delay: 0.2s;
        }

        .call-wave i:nth-child(4) {
          height: 16px;
          animation-delay: 0.3s;
        }

        @keyframes callWave {
          0%,
          100% {
            transform: scaleY(0.7);
            opacity: 0.55;
          }

          50% {
            transform: scaleY(1.2);
            opacity: 1;
          }
        }

        .call-stage {
          position: absolute;
          inset: 0;
          z-index: 2;
          overflow: hidden;
          background:
            radial-gradient(circle at 18% 46%, rgba(255, 255, 255, 0.65), transparent 25%),
            radial-gradient(circle at 80% 54%, rgba(255, 228, 190, 0.6), transparent 22%),
            linear-gradient(180deg, #f4e5d4 0%, #ead2bd 100%);
        }

        .room-arch {
          position: absolute;
          left: -42px;
          top: 150px;
          width: 130px;
          height: 270px;
          border-radius: 100px;
          background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.08)),
            linear-gradient(#eee0cc, #fff4e4);
          opacity: 0.86;
        }

        .room-lamp {
          position: absolute;
          right: 24px;
          top: 266px;
          width: 108px;
          height: 120px;
          border-radius: 24px;
          background:
            radial-gradient(circle at 72% 38%, rgba(255, 238, 196, 0.95) 0 17px, transparent 18px),
            linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.12));
          opacity: 0.72;
        }

        .room-glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(30px);
          opacity: 0.58;
          pointer-events: none;
        }

        .room-glow.one {
          width: 210px;
          height: 210px;
          background: rgba(255, 255, 255, 0.82);
          left: -66px;
          top: 160px;
        }

        .room-glow.two {
          width: 180px;
          height: 180px;
          background: rgba(255, 224, 184, 0.85);
          right: -30px;
          top: 345px;
        }

        .call-video {
          position: absolute;
          z-index: 3;
          left: 50%;
          bottom: 118px;
          width: 86%;
          max-width: 390px;
          height: auto;
          transform: translateX(-50%);
          object-fit: contain;
          object-position: center bottom;
          filter: drop-shadow(0 30px 45px rgba(78, 47, 29, 0.13));
          animation: callFloat 5s ease-in-out infinite;
        }

        .avatar-fallback {
          position: absolute;
          z-index: 2;
          left: 50%;
          bottom: 128px;
          width: 220px;
          height: 410px;
          transform: translateX(-50%);
          animation: callFloat 5s ease-in-out infinite;
        }

        .fallback-head {
          position: absolute;
          top: 0;
          left: 50%;
          width: 185px;
          height: 205px;
          transform: translateX(-50%);
          border-radius: 48% 52% 45% 45%;
          background: #f1bb92;
          box-shadow:
            inset 0 -15px 30px rgba(167, 89, 45, 0.12),
            0 15px 35px rgba(101, 62, 37, 0.08);
        }

        .fallback-hair {
          position: absolute;
          inset: -22px -22px 40px -20px;
          border-radius: 48% 52% 45% 50%;
          background:
            radial-gradient(circle at 38% 18%, #fff0ca 0 16px, transparent 17px),
            linear-gradient(135deg, #d89c4d, #f5d493 45%, #bf7a39);
          z-index: 0;
        }

        .fallback-face {
          position: absolute;
          inset: 30px 26px 18px;
          z-index: 2;
          border-radius: 45%;
          background: #f6c6a1;
        }

        .eye {
          position: absolute;
          top: 72px;
          width: 13px;
          height: 9px;
          border-radius: 50%;
          background: #5b3c2d;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.2);
          animation: blink 4.7s infinite;
        }

        .eye.left {
          left: 36px;
        }

        .eye.right {
          right: 36px;
        }

        .smile {
          position: absolute;
          left: 50%;
          top: 118px;
          width: 42px;
          height: 18px;
          border-bottom: 3px solid rgba(118, 63, 47, 0.78);
          border-radius: 0 0 40px 40px;
          transform: translateX(-50%);
        }

        .fallback-body {
          position: absolute;
          left: 50%;
          top: 185px;
          width: 215px;
          height: 285px;
          transform: translateX(-50%);
          border-radius: 54px 54px 26px 26px;
          background:
            linear-gradient(180deg, #191817, #111),
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.12), transparent 30%);
          box-shadow: 0 20px 40px rgba(41, 27, 21, 0.18);
        }

        @keyframes callFloat {
          0%,
          100% {
            transform: translateX(-50%) translateY(0) scale(1);
          }

          50% {
            transform: translateX(-50%) translateY(-7px) scale(1.008);
          }
        }

        @keyframes blink {
          0%,
          92%,
          100% {
            transform: scaleY(1);
          }

          95% {
            transform: scaleY(0.12);
          }
        }

        .self-camera {
          position: absolute;
          right: 22px;
          bottom: 182px;
          z-index: 8;
          width: 90px;
          height: 125px;
          border-radius: 24px;
          overflow: hidden;
          border: 2px solid rgba(255, 255, 255, 0.86);
          background: rgba(255, 255, 255, 0.4);
          box-shadow: 0 18px 35px rgba(80, 52, 34, 0.18);
        }

        .self-camera video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .live-floating-chat {
          position: absolute;
          z-index: 7;
          left: 26px;
          right: 26px;
          bottom: 148px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          pointer-events: none;
        }

        .live-bubble {
          position: relative;
          max-width: 82%;
          min-width: 215px;
          width: fit-content;
          padding: 24px 19px 16px;
          border-radius: 22px;
          background: rgba(255, 251, 244, 0.84);
          color: #2e2926;
          box-shadow:
            0 14px 34px rgba(80, 52, 34, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(255, 255, 255, 0.52);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          animation: bubbleIn 0.3s ease both;
        }

        .live-bubble.user {
          padding-top: 17px;
          background: rgba(253, 246, 238, 0.8);
        }

        .live-bubble.listening {
          background: rgba(255, 255, 255, 0.76);
          border-color: rgba(54, 198, 111, 0.25);
        }

        .live-bubble time {
          position: absolute;
          top: 10px;
          right: 14px;
          font-size: 12px;
          color: rgba(47, 41, 37, 0.56);
          font-weight: 800;
        }

        .live-bubble p {
          margin: 0;
          font-size: 16px;
          line-height: 1.35;
          letter-spacing: -0.02em;
          font-weight: 650;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          white-space: pre-wrap;
        }

        .live-bubble small {
          position: absolute;
          right: 14px;
          bottom: 8px;
          font-size: 12px;
          color: rgba(47, 41, 37, 0.5);
        }

        .live-dots {
          position: absolute;
          left: 17px;
          top: 12px;
          display: flex;
          gap: 6px;
        }

        .live-dots i {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(123, 105, 89, 0.45);
        }

        @keyframes bubbleIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .call-dock {
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 44px;
          z-index: 9;
          min-height: 118px;
          border-radius: 34px;
          background: rgba(245, 232, 218, 0.72);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          align-items: center;
          gap: 6px;
          padding: 13px 11px 12px;
          box-shadow:
            0 23px 55px rgba(82, 54, 37, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        .call-control {
          border: 0;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
          color: #5e554f;
          padding: 0;
        }

        .call-control span {
          width: 61px;
          height: 61px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(255, 251, 244, 0.88);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 8px 20px rgba(93, 63, 44, 0.1);
          font-size: 23px;
        }

        .call-control b {
          font-size: 13px;
          line-height: 1;
          font-weight: 800;
        }

        .call-control.active span {
          background: rgba(255, 255, 255, 0.98);
          box-shadow:
            0 0 0 5px rgba(54, 198, 111, 0.1),
            0 8px 20px rgba(93, 63, 44, 0.1);
        }

        .call-control.end span {
          background: linear-gradient(135deg, #ff8174, #f1645f);
          color: white;
          box-shadow:
            0 13px 26px rgba(238, 88, 79, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.36);
        }

        .call-home-indicator {
          position: absolute;
          left: 50%;
          bottom: 12px;
          z-index: 10;
          width: 132px;
          height: 5px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          transform: translateX(-50%);
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
            padding: 0 20px;
          }

          .call-icon {
            width: 50px;
            height: 50px;
            border-radius: 18px;
          }

          .call-title h2 {
            font-size: 28px;
          }

          .call-video {
            width: 88%;
            max-width: 380px;
            bottom: 116px;
          }

          .avatar-fallback {
            width: 215px;
            height: 400px;
            bottom: 126px;
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
