"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MessageRole = "user" | "lyra";

type Message = {
  role: MessageRole;
  text: string;
};

type ToolKey =
  | "research"
  | "content"
  | "study"
  | "image"
  | "vision"
  | "pdf"
  | "translate";

type StudySections = {
  summary: string;
  solved: string;
  test: string;
  raw: string;
};

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

const AVATAR_SRC = "/lyra-avatar.jpg.jpeg";
const VIDEO_SRC = "/lyra-avatar-mp4.mp4";

const LANGUAGES = [
  { name: "Otomatik Algıla", code: "auto" },
  { name: "Türkçe", code: "tr-TR" },
  { name: "İngilizce", code: "en-US" },
  { name: "Almanca", code: "de-DE" },
  { name: "Fransızca", code: "fr-FR" },
  { name: "İspanyolca", code: "es-ES" },
  { name: "İtalyanca", code: "it-IT" },
  { name: "Portekizce", code: "pt-PT" },
  { name: "Arapça", code: "ar-SA" },
  { name: "Rusça", code: "ru-RU" },
  { name: "Japonca", code: "ja-JP" },
  { name: "Korece", code: "ko-KR" },
  { name: "Çince", code: "zh-CN" },
  { name: "Hintçe", code: "hi-IN" },
  { name: "Felemenkçe", code: "nl-NL" },
  { name: "Yunanca", code: "el-GR" },
  { name: "Lehçe", code: "pl-PL" },
  { name: "İsveççe", code: "sv-SE" },
  { name: "Norveççe", code: "no-NO" },
  { name: "Danca", code: "da-DK" },
  { name: "Fince", code: "fi-FI" },
];

const TOOL_META: Record<
  ToolKey,
  {
    title: string;
    icon: string;
    placeholder: string;
    buttonLabel: string;
    helper: string;
  }
> = {
  research: {
    title: "Araştırma Modu",
    icon: "⌕",
    placeholder:
      "Araştırmak istediğin konuyu yaz. Sana net, sade ve anlaşılır cevap çıkarayım.",
    buttonLabel: "Araştır",
    helper: "Bilgi bul, analiz et ve net cevap üret.",
  },
  content: {
    title: "İçerik Üretme",
    icon: "✎",
    placeholder:
      "Konu yaz. Sana başlık, hook, teleprompter ve CTA hazırlayayım.",
    buttonLabel: "İçerik Hazırla",
    helper: "Hook, başlık, video metni ve teleprompter hazırla.",
  },
  study: {
    title: "Ders Modu",
    icon: "■",
    placeholder:
      "Çalışmak istediğin konuyu yaz. Örnek: üslü sayılar, OBEB-OKEK, paragraf taktikleri...",
    buttonLabel: "Dersi Oluştur",
    helper: "Konu özeti, çözümlü sorular ve şıklı test üret.",
  },
  image: {
    title: "Görsel Üretme",
    icon: "▧",
    placeholder:
      "Nasıl bir görsel istediğini yaz. Sana güçlü bir prompt ve konsept oluşturayım.",
    buttonLabel: "Prompt Oluştur",
    helper: "Görsel promptu ve konsept hazırla.",
  },
  vision: {
    title: "Görselle Okut",
    icon: "◌",
    placeholder:
      "Analiz edilmesini istediğin görseli ya da ekran içeriğini yaz.",
    buttonLabel: "Analiz Et",
    helper: "Görsel, belge ve ekranları analiz et.",
  },
  pdf: {
    title: "PDF Özeti",
    icon: "▤",
    placeholder:
      "Özetlemek istediğin PDF içeriğini veya konusunu yaz.",
    buttonLabel: "Özet Çıkar",
    helper: "PDF içeriğini özetle ve not çıkar.",
  },
  translate: {
    title: "Translate",
    icon: "🌐",
    placeholder: "Çevrilecek metni yaz.",
    buttonLabel: "Çevir",
    helper: "Metin çevir, düzenle ve sesli okut.",
  },
};

function getLangCode(languageName: string) {
  return LANGUAGES.find((lang) => lang.name === languageName)?.code || "tr-TR";
}

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function extractTextFromGemini(data: any) {
  if (!data) return "";
  if (typeof data === "string") return data;

  const direct =
    data.answer ||
    data.reply ||
    data.text ||
    data.message ||
    data.content ||
    data.output ||
    data.result ||
    data.response;

  if (typeof direct === "string") return direct;

  if (typeof data?.response?.text === "string") return data.response.text;

  const parts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const text = parts.map((p: any) => p?.text || "").join("\n").trim();
    if (text) return text;
  }

  if (Array.isArray(data?.parts)) {
    const text = data.parts.map((p: any) => p?.text || "").join("\n").trim();
    if (text) return text;
  }

  return "";
}

function extractStudySections(text: string): StudySections {
  const clean = String(text || "")
    .replaceAll("**", "")
    .replaceAll("###", "")
    .replaceAll("##", "")
    .trim();

  function findSection(names: string[], nextNames: string[]) {
    const escapedNames = names
      .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    const escapedNext = nextNames
      .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    const endPart = escapedNext
      ? `(?=\\n\\s*(?:${escapedNext})\\s*:?\\s*\\n|$)`
      : `(?=$)`;

    const regex = new RegExp(
      `(?:^|\\n)\\s*(?:${escapedNames})\\s*:?\\s*\\n([\\s\\S]*?)${endPart}`,
      "i"
    );

    return clean.match(regex)?.[1]?.trim() || "";
  }

  const summary = findSection(
    ["KONU ÖZETİ", "KONU OZETI", "KONU ÖZETI"],
    ["ÇÖZÜMLÜ SORULAR", "COZUMLU SORULAR", "ŞIKLI TEST", "SIKLI TEST"]
  );

  const solved = findSection(
    ["ÇÖZÜMLÜ SORULAR", "COZUMLU SORULAR"],
    ["ŞIKLI TEST", "SIKLI TEST", "CEVAP ANAHTARI"]
  );

  const test = findSection(["ŞIKLI TEST", "SIKLI TEST"], []);

  return {
    summary:
      summary ||
      (clean ? clean.slice(0, 1800) : "Konu özeti burada görünecek."),
    solved: solved || "Çözümlü sorular burada görünecek.",
    test: test || "Şıklı test burada görünecek.",
    raw: clean,
  };
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "lyra",
      text:
        "Teleprompter Metni:\n“Bugün sana kanka bana cilt bakım toniği formülasyonu atsana konusunu çok basit anlatacağım. Çünkü çoğu kişi burada yanlış noktaya odaklanıyor. Aslında işin özü çok daha net. Önce problemi anlayacağız, sonra doğru adımı seçeceğiz ve sonunda bunu nasıl uygulayacağını konuşacağız.”\n\nCTA:\n“Kaydet, sonra birlikte tekrar bakalım.”",
    },
    {
      role: "lyra",
      text:
        "Elbette kanka, buradayım. Mesaj yazınca cevap vereceğim; Ders Modu’nda da konu özeti, çözümlü soru ve şıklı test çıkaracağım.",
    },
  ]);

  const [input, setInput] = useState("");
  const [liveOpen, setLiveOpen] = useState(false);

  const [activeTool, setActiveTool] = useState<ToolKey | null>("study");
  const [toolInput, setToolInput] = useState("");
  const [toolOutput, setToolOutput] = useState("");
  const [toolBusy, setToolBusy] = useState(false);

  const [studySections, setStudySections] = useState<StudySections>({
    summary: "Ders konusunu yazınca konu özeti burada otomatik oluşacak.",
    solved: "Çözümlü sorular burada otomatik oluşacak.",
    test: "Şıklı test ve cevap anahtarı burada otomatik oluşacak.",
    raw: "",
  });

  const [translateInput, setTranslateInput] = useState("");
  const [translateOutput, setTranslateOutput] = useState(
    "Çeviri burada görünecek."
  );
  const [sourceLang, setSourceLang] = useState("Otomatik Algıla");
  const [targetLang, setTargetLang] = useState("Türkçe");

  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [interimText, setInterimText] = useState("");

  const [avatarVisible, setAvatarVisible] = useState(true);
  const [videoVisible, setVideoVisible] = useState(true);

  const recognitionRef = useRef<any>(null);
  const liveRef = useRef(false);
  const speakingRef = useRef(false);
  const thinkingRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const lastNudgeRef = useRef(0);

  const lastMessage = messages[messages.length - 1];

  const currentToolMeta = useMemo(() => {
    return activeTool ? TOOL_META[activeTool] : null;
  }, [activeTool]);

  useEffect(() => {
    liveRef.current = liveOpen;
  }, [liveOpen]);

  useEffect(() => {
    speakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    thinkingRef.current = isThinking;
  }, [isThinking]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!liveRef.current) return;
      if (speakingRef.current || thinkingRef.current) return;

      const now = Date.now();
      const idle = now - lastActivityRef.current;
      const nudgeGap = now - lastNudgeRef.current;

      if (idle > 24000 && nudgeGap > 35000) {
        const text =
          "Merve, buradayım. Devam etmek istersen seni dinliyorum.";
        lastNudgeRef.current = now;
        addLyra(text);
        speak(text, "tr-TR");
      }
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  function addUser(text: string) {
    const newMessage: Message = { role: "user", text };
    setMessages((prev): Message[] => [...prev, newMessage].slice(-24));
  }

  function addLyra(text: string) {
    const newMessage: Message = { role: "lyra", text };
    setMessages((prev): Message[] => [...prev, newMessage].slice(-24));
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop?.();
      recognitionRef.current?.abort?.();
    } catch {}

    recognitionRef.current = null;
    setIsListening(false);
  }

  function startListening(langCode = "tr-TR") {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addLyra(
        "Bu tarayıcı mikrofonla konuşmayı desteklemiyor kanka. Chrome veya Edge ile dene."
      );
      return;
    }

    if (speakingRef.current || thinkingRef.current) return;

    stopListening();

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = langCode === "auto" ? "tr-TR" : langCode;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalText = "";
      let tempText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          tempText += transcript;
        }
      }

      if (tempText) setInterimText(tempText);

      const clean = finalText.trim();

      if (clean.length > 1) {
        setInterimText("");
        lastActivityRef.current = Date.now();
        sendMessage(clean, true);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);

      if (liveRef.current && !speakingRef.current && !thinkingRef.current) {
        setTimeout(() => {
          if (
            liveRef.current &&
            !speakingRef.current &&
            !thinkingRef.current
          ) {
            startListening("tr-TR");
          }
        }, 500);
      }
    };

    try {
      recognition.start();
    } catch {}
  }

  function speak(text: string, langCode = "tr-TR") {
    if (typeof window === "undefined") return;

    if (!voiceOn) {
      if (liveRef.current) startListening("tr-TR");
      return;
    }

    try {
      stopListening();
      window.speechSynthesis.cancel();

      const finalLang = langCode === "auto" ? "tr-TR" : langCode;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = finalLang;
      utterance.rate = 1.04;
      utterance.pitch = 1.05;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const baseLang = finalLang.split("-")[0].toLowerCase();

      const selectedVoice =
        voices.find((v) => v.lang === finalLang) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith(baseLang)) ||
        voices.find((v) => v.lang?.toLowerCase().includes("tr")) ||
        voices[0];

      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.onstart = () => setIsSpeaking(true);

      utterance.onend = () => {
        setIsSpeaking(false);
        if (liveRef.current) setTimeout(() => startListening("tr-TR"), 450);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        if (liveRef.current) setTimeout(() => startListening("tr-TR"), 450);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
      if (liveRef.current) startListening("tr-TR");
    }
  }

  async function askGemini(text: string) {
    const history = messages.slice(-12).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    }));

    const body = {
      message: text,
      prompt: text,
      input: text,
      text,
      question: text,
      userMessage: text,
      history,
    };

    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const rawText = await res.text();
    let data: any = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = rawText;
    }

    if (!res.ok) {
      throw new Error(
        typeof data?.error === "string"
          ? data.error
          : "Gemini cevabı alınamadı."
      );
    }

    const finalText = extractTextFromGemini(data);

    if (!finalText || !finalText.trim()) {
      if (typeof rawText === "string" && rawText.trim()) {
        return rawText.trim();
      }

      throw new Error("Gemini boş cevap döndürdü.");
    }

    return finalText.trim();
  }

  async function sendMessage(value?: string, fromVoice = false) {
    const text = (value || input).trim();
    if (!text || isThinking) return;

    lastActivityRef.current = Date.now();
    setInput("");
    addUser(text);
    setIsThinking(true);
    thinkingRef.current = true;

    try {
      stopListening();

      const reply = await askGemini(text);
      addLyra(reply);
      setIsThinking(false);
      thinkingRef.current = false;

      if (liveRef.current || fromVoice) {
        speak(reply, "tr-TR");
      }
    } catch {
      const fallback =
        "Cevabı alamadım kanka. Gemini route çalışıyor ama POST cevabı boş ya da farklı isimle dönüyor olabilir. Route içinde answer, reply veya text alanı döndürmen gerekiyor.";

      addLyra(fallback);
      setIsThinking(false);
      thinkingRef.current = false;

      if (liveRef.current || fromVoice) {
        speak(fallback, "tr-TR");
      }
    }
  }

  function buildToolPrompt(tool: ToolKey, rawText: string) {
    const text = rawText.trim();

    switch (tool) {
      case "research":
        return `Kullanıcının istediği konuyu sade, net, anlaşılır ve bilgilendirici şekilde açıkla. Çok uzatma ama boş da bırakma. Gerekirse kısa maddeler kullan.\n\nKonu: ${text}`;

      case "content":
        return `Kullanıcı için içerik üret. Türkçe cevap ver. Çıktı şu formatta olsun:
1) 3 başlık önerisi
2) güçlü hook
3) 30-45 saniyelik teleprompter metni
4) CTA

Konu: ${text}`;

      case "study":
        return `Sen DGS/TYT tarzında sade anlatan bir ders hocasısın.
Kullanıcının verdiği konuda eksiksiz ders notu hazırla.

Lütfen matematik sembollerini bozuk çıkmayacak şekilde sade yaz.
Örnek: 3^4 yerine "3 üzeri 4" yazabilirsin.
LaTeX, markdown tablo, garip sembol kullanma.
Türkçe karakterleri düzgün kullan.

Mutlaka şu başlıklarla cevap ver:

KONU ÖZETİ
- Konuyu çok sade anlat.
- Önemli formülleri ve kısa ipuçlarını yaz.
- Akılda kalıcı mini not ekle.

ÇÖZÜMLÜ SORULAR
En az 4 tane çözümlü soru yaz.
Her soruda:
Soru:
Çözüm:
Cevap:

ŞIKLI TEST
En az 7 tane A-B-C-D-E şıklı test sorusu yaz.
Her sorunun seçenekleri olsun.
En altta cevap anahtarı ver.

Konu: ${text}`;

      case "image":
        return `Kullanıcının istediği görsel için güçlü ve profesyonel bir image prompt oluştur. Türkçe kısa açıklama + altında kopyalanabilir prompt ver.\n\nİstek: ${text}`;

      case "vision":
        return `Kullanıcının verdiği görsel ya da ekran açıklamasını analiz et. Ne anlaşıldığını, önemli noktaları ve kısa yorumunu yaz.\n\nAçıklama: ${text}`;

      case "pdf":
        return `Kullanıcının verdiği PDF içeriği veya konusu için düzenli özet çıkar. Türkçe cevap ver. Format: kısa özet, ana noktalar, önemli notlar.\n\nİçerik/Konu: ${text}`;

      case "translate":
        return `Şu metni ${targetLang} diline çevir. Kaynak dil: ${sourceLang}. Sadece çeviriyi yaz.\n\n${text}`;

      default:
        return text;
    }
  }

  async function runTool() {
    if (!activeTool) return;

    if (activeTool === "translate") {
      const text = translateInput.trim();
      if (!text) return;

      setToolBusy(true);
      setTranslateOutput("Çeviri hazırlanıyor...");

      try {
        const reply = await askGemini(buildToolPrompt("translate", text));
        const finalReply = String(reply);
        setTranslateOutput(finalReply);
        speak(finalReply, getLangCode(targetLang));
      } catch {
        setTranslateOutput(
          "Çeviri sırasında küçük bir bağlantı takılması oldu kanka."
        );
      } finally {
        setToolBusy(false);
      }

      return;
    }

    const text = toolInput.trim();
    if (!text) return;

    setToolBusy(true);

    if (activeTool === "study") {
      setStudySections({
        summary: "Konu özeti hazırlanıyor...",
        solved: "Çözümlü sorular hazırlanıyor...",
        test: "Şıklı test hazırlanıyor...",
        raw: "",
      });
    } else {
      setToolOutput("Hazırlanıyor...");
    }

    try {
      const reply = await askGemini(buildToolPrompt(activeTool, text));
      const finalReply = String(reply);

      if (activeTool === "study") {
        setStudySections(extractStudySections(finalReply));
      } else {
        setToolOutput(finalReply);
      }
    } catch {
      if (activeTool === "study") {
        setStudySections({
          summary: "Ders hazırlanırken bağlantı takıldı kanka.",
          solved: "Tekrar deneyelim.",
          test: "Gemini cevabı alınamadı.",
          raw: "",
        });
      } else {
        setToolOutput(
          "Bu araç çalışırken küçük bir bağlantı takılması oldu kanka. Tekrar deneyelim."
        );
      }
    } finally {
      setToolBusy(false);
    }
  }

  function openTool(tool: ToolKey) {
    setActiveTool(tool);

    if (tool !== "translate" && tool !== "study") {
      setToolOutput("");
    }
  }

  function closeToolPanel() {
    setActiveTool(null);
  }

  function printToolResult() {
    if (typeof window === "undefined") return;

    const title = activeTool ? TOOL_META[activeTool].title : "Lyra Çıktısı";

    let bodyContent = "";

    if (activeTool === "study") {
      bodyContent = `
        <h1>Ders Modu</h1>
        <h2>Konu Özeti</h2>
        <pre>${escapeHtml(studySections.summary)}</pre>
        <h2>Çözümlü Sorular</h2>
        <pre>${escapeHtml(studySections.solved)}</pre>
        <h2>Şıklı Test</h2>
        <pre>${escapeHtml(studySections.test)}</pre>
      `;
    } else if (activeTool === "translate") {
      bodyContent = `
        <h1>Translate</h1>
        <h2>Metin</h2>
        <pre>${escapeHtml(translateInput)}</pre>
        <h2>Çeviri</h2>
        <pre>${escapeHtml(translateOutput)}</pre>
      `;
    } else {
      bodyContent = `
        <h1>${escapeHtml(title)}</h1>
        <pre>${escapeHtml(toolOutput)}</pre>
      `;
    }

    const printHtml = `<!doctype html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    padding: 32px;
    color: #111;
    line-height: 1.55;
  }
  h1 {
    font-size: 28px;
    margin: 0 0 22px;
    letter-spacing: .03em;
  }
  h2 {
    margin: 26px 0 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #ddd;
    font-size: 20px;
  }
  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 15px;
    line-height: 1.55;
    margin: 0;
  }
  @page {
    size: A4;
    margin: 16mm;
  }
</style>
</head>
<body>
${bodyContent}
<script>
  window.onload = function() {
    window.focus();
    window.print();
  };
</script>
</body>
</html>`;

    const blob = new Blob([printHtml], {
      type: "text/html;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "width=900,height=700");

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);
  }

  function openLiveCall() {
    setLiveOpen(true);
    liveRef.current = true;
    lastActivityRef.current = Date.now();

    const intro = "Canlı mod açıldı Merve. Seni dinliyorum.";
    addLyra(intro);

    setTimeout(() => speak(intro, "tr-TR"), 250);
  }

  function closeLiveCall() {
    setLiveOpen(false);
    liveRef.current = false;
    stopListening();

    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }

    setIsSpeaking(false);
    setInterimText("");
  }

  const statusText = isThinking
    ? "Düşünüyor..."
    : isSpeaking
    ? "Konuşuyor..."
    : isListening
    ? "Seni dinliyor..."
    : "Hazır";

  const liveCaption = interimText
    ? interimText
    : isThinking
    ? "Düşünüyorum..."
    : lastMessage?.text || "Buradayım.";

  return (
    <main className="page">
      <div className="layout">
        <aside className="sidebar">
          <h1>LYRA</h1>

          <nav className="nav">
            <button>＋ Yeni Sohbet</button>
            <button>▢ Sohbetler</button>
            <button>⌘ Modlar</button>
            <button>▤ Araçlar</button>
            <button>♢ Hatırlatıcılar</button>
            <button>⚙ Ayarlar</button>
          </nav>

          <div className="side-bottom">
            <div className="pro-card">
              <b>LYRA PRO</b>
              <span>AI Asistan</span>
            </div>

            <div className="profile-card">
              <div className="profile-avatar">
                {avatarVisible ? (
                  <img
                    src={AVATAR_SRC}
                    alt="Merve"
                    onError={() => setAvatarVisible(false)}
                  />
                ) : (
                  <span>M</span>
                )}
              </div>
              <div>
                <b>Merve</b>
                <span>Pro Üye</span>
              </div>
              <small>⌄</small>
            </div>

            <div className="usage-card">
              <div>
                <b>Aylık Kullanım</b>
                <strong>%68</strong>
              </div>
              <div className="usage-line">
                <i />
              </div>
              <span>6.8 GB / 10 GB</span>
            </div>
          </div>
        </aside>

        <section className="center">
          <header className="center-head">
            <h2>LYRA AI ASİSTANINIZ</h2>

            <div className="head-actions">
              <button>Lyra Hakkında</button>
              <button>⌄</button>
            </div>
          </header>

          <div className="avatar-frame">
            {avatarVisible ? (
              <img
                src={AVATAR_SRC}
                alt="Lyra"
                onError={() => setAvatarVisible(false)}
              />
            ) : (
              <div className="avatar-fallback">LYRA</div>
            )}
          </div>

          <div className="mode-row">
            <button>≋ Ses: Gemini Live</button>
            <button onClick={() => setVoiceOn((v) => !v)}>
              {voiceOn ? "♫ Sesi Kapat" : "♫ Sesi Aç"}
            </button>
            <button>♙ Kadın</button>
            <button>♟ Erkek</button>
            <button onClick={openLiveCall}>≋ Canlı Konuşma</button>
            <button onClick={() => openTool("translate")}>🌐 Translate</button>
          </div>

          <section className="work-area">
            <div className="chat-box">
              <div className="messages">
                {messages.map((msg, index) => (
                  <div
                    key={`${msg.role}-${index}-${msg.text}`}
                    className={msg.role === "user" ? "msg user" : "msg lyra"}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Lyra’ya mesaj yaz..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <div className="chat-bottom">
                <div>
                  <button>◒</button>
                  <button>▧</button>
                  <button>PDF</button>
                </div>
              </div>
            </div>

            {activeTool && (
              <div className="tool-box under-chat">
                <div className="tool-head">
                  <h3>
                    <span>{TOOL_META[activeTool].icon}</span>
                    {TOOL_META[activeTool].title}
                  </h3>
                  <button onClick={closeToolPanel}>×</button>
                </div>

                <p className="tool-helper">{TOOL_META[activeTool].helper}</p>

                {activeTool === "translate" ? (
                  <>
                    <label>Metni çevir</label>

                    <div className="translate-row">
                      <select
                        value={sourceLang}
                        onChange={(e) => setSourceLang(e.target.value)}
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang.name} value={lang.name}>
                            {lang.name}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => {
                          const oldSource = sourceLang;
                          setSourceLang(targetLang);
                          setTargetLang(
                            oldSource === "Otomatik Algıla" ? "Türkçe" : oldSource
                          );
                        }}
                      >
                        ⇄
                      </button>

                      <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                      >
                        {LANGUAGES.filter(
                          (lang) => lang.name !== "Otomatik Algıla"
                        ).map((lang) => (
                          <option key={lang.name} value={lang.name}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      className="tool-input"
                      value={translateInput}
                      onChange={(e) => setTranslateInput(e.target.value)}
                      placeholder="Çevrilecek metni yazın..."
                      maxLength={5000}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          runTool();
                        }
                      }}
                    />

                    <div className="tool-count">
                      {translateInput.length} / 5000
                    </div>

                    <div className="tool-actions">
                      <button className="tool-run" onClick={runTool}>
                        {toolBusy ? "Hazırlanıyor..." : "Çevir"}
                      </button>

                      <button className="tool-print" onClick={printToolResult}>
                        PDF Yazdır
                      </button>
                    </div>

                    <label>Çeviri</label>
                    <div className="tool-output">{translateOutput}</div>
                  </>
                ) : activeTool === "study" ? (
                  <>
                    <label>Ders Konusu</label>

                    <textarea
                      className="tool-input"
                      value={toolInput}
                      onChange={(e) => setToolInput(e.target.value)}
                      placeholder={currentToolMeta?.placeholder}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          runTool();
                        }
                      }}
                    />

                    <div className="tool-actions">
                      <button className="tool-run" onClick={runTool}>
                        {toolBusy ? "Ders hazırlanıyor..." : "Dersi Oluştur"}
                      </button>

                      <button className="tool-print" onClick={printToolResult}>
                        PDF Yazdır
                      </button>
                    </div>

                    <div className="study-tabs">
                      <article>
                        <h4>Konu Özeti</h4>
                        <div>{studySections.summary}</div>
                      </article>

                      <article>
                        <h4>Çözümlü Sorular</h4>
                        <div>{studySections.solved}</div>
                      </article>

                      <article>
                        <h4>Şıklı Test</h4>
                        <div>{studySections.test}</div>
                      </article>
                    </div>
                  </>
                ) : (
                  <>
                    <label>{currentToolMeta?.title} Girişi</label>

                    <textarea
                      className="tool-input"
                      value={toolInput}
                      onChange={(e) => setToolInput(e.target.value)}
                      placeholder={currentToolMeta?.placeholder}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          runTool();
                        }
                      }}
                    />

                    <div className="tool-actions">
                      <button className="tool-run" onClick={runTool}>
                        {toolBusy
                          ? "Hazırlanıyor..."
                          : currentToolMeta?.buttonLabel}
                      </button>

                      <button className="tool-print" onClick={printToolResult}>
                        PDF Yazdır
                      </button>
                    </div>

                    <label>Sonuç</label>
                    <div className="tool-output">
                      {toolOutput ||
                        "Burada bu araca ait sonuçlar görünecek..."}
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <section className="tool-grid">
            <button onClick={() => openTool("research")}>
              <span>⌕</span>
              <b>Araştırma Modu</b>
              <small>Bilgi bul, analiz et ve net cevaplar üret.</small>
              <i>⌄</i>
            </button>

            <button onClick={() => openTool("content")}>
              <span>✎</span>
              <b>İçerik Üretme</b>
              <small>Hook, başlık, video metni ve teleprompter hazırla.</small>
              <i>⌄</i>
            </button>

            <button onClick={() => openTool("study")}>
              <span>■</span>
              <b>Ders Modu</b>
              <small>Konu özeti, çözümlü soru ve test üret.</small>
              <i>⌄</i>
            </button>

            <button onClick={() => openTool("image")}>
              <span>▧</span>
              <b>Görsel Üretme</b>
              <small>Görsel promptu ve konsept hazırla.</small>
              <i>⌄</i>
            </button>

            <button onClick={() => openTool("vision")}>
              <span>◌</span>
              <b>Görselle Okut</b>
              <small>Görsel, belge ve ekranları analiz et.</small>
              <i>⌄</i>
            </button>

            <button onClick={() => openTool("pdf")}>
              <span>▤</span>
              <b>PDF Özeti</b>
              <small>PDF yükle, özetle ve not çıkar.</small>
              <i>⌄</i>
            </button>

            <button onClick={openLiveCall}>
              <span>≋</span>
              <b>Canlı Mod</b>
              <small>Gerçek zamanlı konuşma alanı.</small>
              <i>⌄</i>
            </button>

            <button onClick={() => openTool("translate")}>
              <span>🌐</span>
              <b>Translate</b>
              <small>Metin çevir, düzenle ve sadeleştir.</small>
              <i>⌄</i>
            </button>
          </section>
        </section>

        <aside className="phone-preview">
          <div className="phone-shell">
            <div className="phone-status">
              <span>9:41</span>
              <b />
              <i />
            </div>

            <div className="phone-top">
              <button>☰</button>
              <h2>LYRA</h2>
              <button>⌄</button>
            </div>

            <div className="phone-avatar">
              {avatarVisible ? (
                <img
                  src={AVATAR_SRC}
                  alt="Lyra"
                  onError={() => setAvatarVisible(false)}
                />
              ) : (
                <div className="avatar-fallback">LYRA</div>
              )}
            </div>

            <div className="phone-grid">
              <button>≋ Ses: Gemini Live</button>
              <button onClick={() => setVoiceOn((v) => !v)}>
                {voiceOn ? "♫ Sesi Kapat" : "♫ Sesi Aç"}
              </button>
              <button>Kadın</button>
              <button>Erkek</button>
            </div>

            <button className="phone-live" onClick={openLiveCall}>
              ≋ Canlı Konuşma ›
            </button>

            <button
              className="phone-live translate"
              onClick={() => openTool("translate")}
            >
              🌐 Translate
            </button>

            <div className="phone-input">
              <span>Lyra’ya bir şey sor veya yaz...</span>
            </div>

            <div className="phone-tools">
              <button onClick={() => openTool("research")}>Araştırma Modu</button>
              <button onClick={() => openTool("content")}>İçerik Üretme</button>
              <button onClick={() => openTool("study")}>Ders Modu</button>
              <button onClick={() => openTool("image")}>Görsel Üretme</button>
              <button onClick={() => openTool("vision")}>Görselle Okut</button>
              <button onClick={() => openTool("pdf")}>PDF Özeti</button>
              <button onClick={openLiveCall}>Canlı Mod</button>
              <button onClick={() => openTool("translate")}>Translate</button>
            </div>
          </div>
        </aside>
      </div>

      {liveOpen && (
        <section className="live-overlay">
          <div className="live-room" />
          <div className="live-shade" />

          <header className="live-header">
            <button className="live-back" onClick={closeLiveCall}>
              ‹
            </button>

            <div className="live-title">
              <h2>Lyra ✦</h2>
              <p>{statusText}</p>
            </div>

            <div className="live-pill">
              <span />
              CANLI
            </div>
          </header>

          <section className="live-avatar-stage">
            <div
              className={[
                "live-glow",
                isListening ? "listen" : "",
                isSpeaking ? "speak" : "",
              ].join(" ")}
            />

            {videoVisible ? (
              <video
                className={[
                  "live-video",
                  isSpeaking ? "talking" : "",
                  isListening ? "listening" : "",
                ].join(" ")}
                src={VIDEO_SRC}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                onError={() => setVideoVisible(false)}
              />
            ) : avatarVisible ? (
              <img
                className={[
                  "live-avatar",
                  isSpeaking ? "talking" : "",
                  isListening ? "listening" : "",
                ].join(" ")}
                src={AVATAR_SRC}
                alt="Lyra avatar"
                onError={() => setAvatarVisible(false)}
              />
            ) : (
              <div className="live-avatar live-fallback">LYRA</div>
            )}
          </section>

          <section className="live-caption">
            <strong>{lastMessage?.role === "user" ? "Sen" : "Lyra"}</strong>
            <p>{liveCaption}</p>
          </section>

          <section className="live-wave-box">
            <div
              className={[
                "live-wave",
                isListening || isThinking || isSpeaking ? "active" : "",
              ].join(" ")}
            >
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>

            <p>
              {isThinking
                ? "Cevabı hazırlıyorum..."
                : isSpeaking
                ? "Cevap veriyorum..."
                : isListening
                ? "Dinliyorum..."
                : "Başlatmaya hazır"}
            </p>
          </section>

          <footer className="live-controls">
            <button onClick={() => setVoiceOn((v) => !v)}>
              <span>{voiceOn ? "🔊" : "🔇"}</span>
              <small>Ses</small>
            </button>

            <button
              className="live-main"
              onClick={() => {
                if (isListening) stopListening();
                else startListening("tr-TR");
              }}
            >
              <span>{isListening ? "🎙️" : "🎤"}</span>
              <small>{isListening ? "Dinliyor" : "Konuş"}</small>
            </button>

            <button onClick={closeLiveCall}>
              <span>×</span>
              <small>Kapat</small>
            </button>
          </footer>
        </section>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #eef0f2;
          color: #080b10;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        button,
        textarea,
        select {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .page {
          min-height: 100dvh;
          padding: 14px;
          overflow-x: hidden;
          background: radial-gradient(
              circle at 47% 34%,
              rgba(255, 255, 255, 0.96),
              transparent 28%
            ),
            radial-gradient(
              circle at 50% 45%,
              rgba(205, 210, 214, 0.55),
              transparent 34%
            ),
            linear-gradient(135deg, #ffffff, #e8ecef);
        }

        .layout {
          display: grid;
          grid-template-columns: 250px minmax(860px, 1fr) 360px;
          gap: 16px;
          width: min(1760px, 100%);
          margin: 0 auto;
          align-items: stretch;
        }

        .sidebar,
        .center,
        .phone-shell {
          background: rgba(255, 255, 255, 0.58);
          border: 1px solid rgba(184, 190, 197, 0.74);
          box-shadow: 0 26px 80px rgba(78, 84, 92, 0.13),
            inset 0 0 0 1px rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(24px);
        }

        .sidebar {
          border-radius: 28px;
          min-height: calc(100dvh - 28px);
          padding: 24px 18px;
          display: flex;
          flex-direction: column;
        }

        .sidebar h1 {
          margin: 0 0 24px;
          font-size: 31px;
          letter-spacing: 0.12em;
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .nav button {
          height: 47px;
          border: 1px solid rgba(173, 180, 188, 0.74);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.58);
          text-align: left;
          padding: 0 18px;
          font-weight: 900;
          color: #12161d;
        }

        .side-bottom {
          margin-top: auto;
          display: grid;
          gap: 12px;
        }

        .pro-card,
        .profile-card,
        .usage-card {
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(184, 190, 197, 0.68);
          padding: 14px;
        }

        .pro-card b,
        .profile-card b,
        .usage-card b {
          display: block;
          font-weight: 950;
        }

        .pro-card span,
        .profile-card span,
        .usage-card span {
          color: #68707a;
          font-size: 13px;
        }

        .profile-card {
          display: grid;
          grid-template-columns: 46px 1fr 20px;
          align-items: center;
          gap: 10px;
        }

        .profile-avatar {
          width: 42px;
          height: 42px;
          overflow: hidden;
          border-radius: 999px;
          background: #d9dde1;
          display: grid;
          place-items: center;
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }

        .usage-card div:first-child {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .usage-line {
          height: 7px;
          border-radius: 999px;
          background: #d9dde1;
          margin: 13px 0 8px;
          overflow: hidden;
        }

        .usage-line i {
          display: block;
          width: 68%;
          height: 100%;
          background: #171b22;
          border-radius: inherit;
        }

        .center {
          position: relative;
          border-radius: 26px;
          min-height: calc(100dvh - 28px);
          padding: 22px;
        }

        .center-head {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 48px;
        }

        .center-head h2 {
          margin: 0;
          text-align: center;
          font-size: 31px;
          letter-spacing: 0.15em;
          font-weight: 950;
        }

        .head-actions {
          position: absolute;
          right: 0;
          display: flex;
          gap: 10px;
        }

        .head-actions button {
          height: 40px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.76);
          box-shadow: 0 12px 32px rgba(77, 84, 92, 0.1);
          padding: 0 16px;
          font-weight: 900;
        }

        .avatar-frame {
          width: 170px;
          height: 220px;
          margin: 16px auto 12px;
          border-radius: 26px;
          overflow: hidden;
          background: #eef0f2;
          border: 1px solid rgba(185, 191, 198, 0.72);
          display: grid;
          place-items: center;
        }

        .avatar-frame img,
        .phone-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }

        .avatar-fallback {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          font-size: 30px;
          letter-spacing: 0.12em;
          font-weight: 950;
          background: #edf0f2;
          color: #11151c;
        }

        .mode-row {
          width: min(920px, 100%);
          margin: 0 auto 14px;
          display: grid;
          grid-template-columns: 1.35fr 1fr 0.8fr 0.8fr 1.25fr 1fr;
          gap: 11px;
        }

        .mode-row button {
          height: 48px;
          border-radius: 17px;
          border: 1px solid rgba(185, 191, 198, 0.74);
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 12px 32px rgba(77, 84, 92, 0.1);
          font-weight: 950;
        }

        .work-area {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .chat-box,
        .tool-box {
          border-radius: 24px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.58);
          border: 1px solid rgba(185, 191, 198, 0.72);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.72);
        }

        .chat-box {
          min-height: 420px;
          display: flex;
          flex-direction: column;
        }

        .messages {
          flex: 1;
          min-height: 250px;
          max-height: 360px;
          overflow-y: auto;
          padding-right: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .messages::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        .msg {
          white-space: pre-wrap;
          padding: 12px 14px;
          border-radius: 15px;
          font-size: 14px;
          line-height: 1.42;
          font-weight: 850;
        }

        .msg.lyra {
          max-width: 88%;
          align-self: flex-start;
          background: #ffffff;
          color: #11151c;
          border: 1px solid rgba(215, 220, 225, 0.95);
        }

        .msg.user {
          max-width: 58%;
          align-self: flex-end;
          background: #11151c;
          color: white;
        }

        textarea {
          width: 100%;
          border: 0;
          outline: 0;
          resize: none;
          background: transparent;
          color: #151a22;
        }

        .chat-box textarea {
          min-height: 96px;
          margin-top: 16px;
          font-size: 20px;
          font-weight: 950;
        }

        textarea::placeholder {
          color: #5e6670;
        }

        .chat-bottom {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }

        .chat-bottom div {
          display: flex;
          gap: 10px;
        }

        .chat-bottom button {
          min-width: 42px;
          height: 42px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 10px 28px rgba(77, 84, 92, 0.12);
          font-weight: 950;
        }

        .tool-box {
          min-height: 320px;
          display: flex;
          flex-direction: column;
        }

        .tool-box.under-chat {
          margin-top: 0;
        }

        .tool-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .tool-head h3 {
          margin: 0;
          font-size: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tool-head button {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.82);
          font-size: 20px;
          font-weight: 900;
        }

        .tool-helper {
          margin: 0 0 12px;
          color: #5f6671;
          font-size: 13px;
          font-weight: 700;
        }

        .tool-box label {
          display: block;
          margin: 10px 0 8px;
          font-weight: 900;
          color: #252a32;
        }

        .translate-row {
          display: grid;
          grid-template-columns: 1fr 42px 1fr;
          gap: 8px;
          margin-bottom: 10px;
        }

        .translate-row select,
        .translate-row button {
          height: 40px;
          border-radius: 14px;
          border: 1px solid rgba(185, 191, 198, 0.72);
          background: rgba(255, 255, 255, 0.8);
          font-weight: 800;
          padding: 0 10px;
        }

        .tool-input {
          min-height: 96px;
          padding: 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(185, 191, 198, 0.72);
          font-weight: 700;
        }

        .tool-count {
          text-align: right;
          font-size: 12px;
          color: #66707a;
          margin-top: 4px;
        }

        .tool-actions {
          display: grid;
          grid-template-columns: 1fr 0.8fr;
          gap: 8px;
          margin: 10px 0 6px;
        }

        .tool-run,
        .tool-print {
          height: 42px;
          border: 0;
          border-radius: 16px;
          font-weight: 950;
        }

        .tool-run {
          background: #11151c;
          color: white;
        }

        .tool-print {
          background: rgba(255, 255, 255, 0.8);
          color: #11151c;
          border: 1px solid rgba(185, 191, 198, 0.72);
        }

        .tool-output {
          min-height: 120px;
          padding: 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(185, 191, 198, 0.72);
          color: #222831;
          font-size: 14px;
          line-height: 1.45;
          white-space: pre-wrap;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .tool-output::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        .study-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 10px;
        }

        .study-tabs article {
          max-height: 260px;
          overflow-y: auto;
          padding: 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(185, 191, 198, 0.72);
          white-space: pre-wrap;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .study-tabs article::-webkit-scrollbar {
          display: none;
          width: 0;
        }

        .study-tabs h4 {
          margin: 0 0 8px;
          font-size: 15px;
        }

        .study-tabs div {
          font-size: 13.5px;
          line-height: 1.45;
          color: #222831;
        }

        .tool-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 10px;
        }

        .tool-grid button {
          min-height: 126px;
          border-radius: 20px;
          border: 1px solid rgba(185, 191, 198, 0.72);
          background: rgba(255, 255, 255, 0.62);
          box-shadow: 0 12px 32px rgba(77, 84, 92, 0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-align: center;
          padding: 10px;
        }

        .tool-grid span {
          font-size: 24px;
          line-height: 1;
        }

        .tool-grid b {
          font-size: 14px;
          font-weight: 950;
        }

        .tool-grid small {
          font-size: 11px;
          color: #545d68;
          line-height: 1.25;
        }

        .tool-grid i {
          font-style: normal;
          font-weight: 900;
        }

        .phone-preview {
          display: grid;
          place-items: center;
        }

        .phone-shell {
          width: 330px;
          min-height: calc(100dvh - 28px);
          border-radius: 42px;
          border-width: 8px;
          border-color: rgba(183, 188, 194, 0.8);
          padding: 22px;
        }

        .phone-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 950;
          margin-bottom: 16px;
        }

        .phone-status b {
          width: 64px;
          height: 23px;
          border-radius: 999px;
          background: #05070a;
        }

        .phone-status i {
          width: 34px;
          height: 14px;
          border-radius: 3px;
          background: #05070a;
        }

        .phone-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .phone-top button {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid #d4d9df;
          background: rgba(255, 255, 255, 0.8);
        }

        .phone-top h2 {
          margin: 0;
          font-size: 25px;
          letter-spacing: 0.08em;
        }

        .phone-avatar {
          width: 130px;
          height: 180px;
          border-radius: 22px;
          overflow: hidden;
          margin: 18px auto 12px;
          border: 1px solid rgba(185, 191, 198, 0.72);
          background: #edf0f2;
        }

        .phone-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .phone-grid button,
        .phone-live,
        .phone-input,
        .phone-tools button {
          border-radius: 15px;
          border: 1px solid rgba(185, 191, 198, 0.72);
          background: rgba(255, 255, 255, 0.72);
          font-weight: 900;
        }

        .phone-grid button {
          min-height: 48px;
        }

        .phone-live {
          width: 100%;
          height: 48px;
          margin-top: 9px;
        }

        .phone-live.translate {
          margin-top: 8px;
        }

        .phone-input {
          margin-top: 13px;
          min-height: 58px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 0 14px;
          font-size: 12px;
        }

        .phone-tools {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 12px;
        }

        .phone-tools button {
          min-height: 72px;
          font-size: 10px;
          padding: 6px;
        }

        .live-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          overflow: hidden;
          color: white;
          background: #120c08;
        }

        .live-room {
          position: absolute;
          inset: 0;
          background: radial-gradient(
              circle at 18% 35%,
              rgba(255, 180, 82, 0.38),
              transparent 18%
            ),
            radial-gradient(
              circle at 86% 48%,
              rgba(255, 195, 116, 0.24),
              transparent 22%
            ),
            linear-gradient(90deg, #150d09, #5a3a25 48%, #100a08);
        }

        .live-room::before {
          content: "";
          position: absolute;
          left: -95px;
          top: 18%;
          width: 280px;
          height: 520px;
          border-radius: 999px;
          border: 18px solid rgba(255, 181, 82, 0.42);
          opacity: 0.75;
        }

        .live-room::after {
          content: "";
          position: absolute;
          right: 8%;
          top: 34%;
          width: 125px;
          height: 330px;
          border-radius: 28px;
          background: radial-gradient(
              circle at 50% 25%,
              rgba(255, 205, 119, 0.95),
              transparent 13%
            ),
            radial-gradient(
              circle at 50% 65%,
              rgba(255, 205, 119, 0.8),
              transparent 14%
            ),
            rgba(255, 255, 255, 0.05);
          opacity: 0.62;
        }

        .live-shade {
          position: absolute;
          inset: 0;
          background: linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.18),
              transparent 28%,
              rgba(0, 0, 0, 0.78)
            ),
            radial-gradient(
              circle at 50% 42%,
              transparent 25%,
              rgba(0, 0, 0, 0.56)
            );
          pointer-events: none;
        }

        .live-header {
          position: absolute;
          z-index: 5;
          top: max(24px, env(safe-area-inset-top));
          left: 22px;
          right: 22px;
          display: grid;
          grid-template-columns: 54px 1fr 92px;
          align-items: center;
          gap: 12px;
        }

        .live-back {
          width: 52px;
          height: 52px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          color: white;
          font-size: 42px;
          line-height: 1;
          backdrop-filter: blur(18px);
        }

        .live-title {
          text-align: center;
        }

        .live-title h2 {
          margin: 0;
          font-size: 38px;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .live-title p {
          margin: 8px 0 0;
          color: rgba(255, 255, 255, 0.78);
          font-size: 16px;
        }

        .live-pill {
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 999px;
          background: rgba(48, 112, 62, 0.35);
          color: #72ff9c;
          font-weight: 900;
          font-size: 13px;
          backdrop-filter: blur(18px);
        }

        .live-pill span {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #72ff9c;
          animation: livePulse 1.25s infinite;
        }

        .live-avatar-stage {
          position: absolute;
          z-index: 2;
          inset: 90px 0 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .live-glow {
          position: absolute;
          width: min(78vw, 540px);
          height: min(78vw, 540px);
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(255, 225, 181, 0.28),
            transparent 68%
          );
          filter: blur(10px);
        }

        .live-glow.listen {
          background: radial-gradient(
            circle,
            rgba(178, 255, 225, 0.25),
            transparent 68%
          );
        }

        .live-glow.speak {
          animation: liveGlow 1.1s ease-in-out infinite;
        }

        .live-video,
        .live-avatar {
          position: relative;
          z-index: 2;
          width: min(82vw, 510px);
          max-height: 78dvh;
          object-fit: contain;
          object-position: center bottom;
          filter: drop-shadow(0 32px 70px rgba(0, 0, 0, 0.55));
          transform-origin: center bottom;
          animation: liveIdle 5s ease-in-out infinite;
        }

        .live-video {
          border-radius: 30px;
          background: transparent;
        }

        .live-video.talking,
        .live-avatar.talking {
          animation: liveTalking 0.95s ease-in-out infinite;
        }

        .live-video.listening,
        .live-avatar.listening {
          filter: drop-shadow(0 32px 70px rgba(0, 0, 0, 0.55))
            drop-shadow(0 0 22px rgba(168, 85, 247, 0.3));
        }

        .live-fallback {
          width: min(80vw, 430px);
          height: min(80vw, 430px);
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-size: 46px;
          letter-spacing: 0.16em;
          font-weight: 950;
          color: white;
          backdrop-filter: blur(18px);
        }

        .live-caption {
          position: absolute;
          z-index: 6;
          left: 50%;
          bottom: 250px;
          width: min(560px, calc(100vw - 44px));
          transform: translateX(-50%);
          padding: 18px 20px;
          border-radius: 26px;
          background: rgba(18, 12, 9, 0.64);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(22px);
          box-shadow: 0 22px 80px rgba(0, 0, 0, 0.34);
        }

        .live-caption strong {
          display: block;
          margin-bottom: 7px;
          color: #bd73ff;
          font-size: 17px;
        }

        .live-caption p {
          margin: 0;
          color: rgba(255, 255, 255, 0.94);
          font-size: 20px;
          line-height: 1.35;
        }

        .live-wave-box {
          position: absolute;
          z-index: 6;
          left: 50%;
          bottom: 172px;
          width: min(520px, calc(100vw - 44px));
          transform: translateX(-50%);
          text-align: center;
        }

        .live-wave {
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          filter: drop-shadow(0 0 16px rgba(168, 85, 247, 0.82));
        }

        .live-wave span {
          width: 7px;
          border-radius: 999px;
          background: #b967ff;
        }

        .live-wave span:nth-child(1) {
          height: 16px;
        }

        .live-wave span:nth-child(2) {
          height: 34px;
        }

        .live-wave span:nth-child(3) {
          height: 52px;
        }

        .live-wave span:nth-child(4) {
          height: 30px;
        }

        .live-wave span:nth-child(5) {
          height: 22px;
        }

        .live-wave.active span {
          animation: liveWave 0.85s ease-in-out infinite;
        }

        .live-wave.active span:nth-child(2) {
          animation-delay: 0.1s;
        }

        .live-wave.active span:nth-child(3) {
          animation-delay: 0.2s;
        }

        .live-wave.active span:nth-child(4) {
          animation-delay: 0.3s;
        }

        .live-wave.active span:nth-child(5) {
          animation-delay: 0.4s;
        }

        .live-wave-box p {
          margin: 5px 0 0;
          color: #bd73ff;
          font-weight: 800;
        }

        .live-controls {
          position: absolute;
          z-index: 7;
          left: 0;
          right: 0;
          bottom: max(24px, env(safe-area-inset-bottom));
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          padding: 0 34px;
        }

        .live-controls button {
          border: 0;
          background: transparent;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
        }

        .live-controls span {
          width: 68px;
          height: 68px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(18px);
          font-size: 26px;
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.28);
        }

        .live-controls small {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.86);
        }

        .live-main span {
          width: 84px;
          height: 84px;
          background: linear-gradient(145deg, #a855ff, #6d28d9);
          box-shadow: 0 18px 70px rgba(168, 85, 247, 0.38);
          font-size: 32px;
        }

        @keyframes livePulse {
          80% {
            box-shadow: 0 0 0 12px rgba(114, 255, 156, 0);
          }
        }

        @keyframes liveIdle {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-5px) scale(1.006);
          }
        }

        @keyframes liveTalking {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-4px) scale(1.012);
          }
        }

        @keyframes liveGlow {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.72;
          }
          50% {
            transform: scale(1.06);
            opacity: 1;
          }
        }

        @keyframes liveWave {
          0%,
          100% {
            transform: scaleY(0.55);
          }
          50% {
            transform: scaleY(1.18);
          }
        }

        @media (max-width: 1380px) {
          .layout {
            grid-template-columns: 230px minmax(760px, 1fr);
          }

          .phone-preview {
            display: none;
          }

          .tool-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .study-tabs {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 980px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: none;
          }

          .center {
            min-height: auto;
          }

          .tool-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .study-tabs {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .page {
            padding: 10px;
          }

          .center {
            padding: 14px;
          }

          .center-head {
            flex-direction: column;
            gap: 12px;
          }

          .center-head h2 {
            font-size: 22px;
          }

          .head-actions {
            position: static;
          }

          .avatar-frame {
            width: 145px;
            height: 190px;
          }

          .mode-row {
            grid-template-columns: 1fr 1fr;
          }

          .chat-box {
            min-height: 460px;
          }

          .messages {
            min-height: 280px;
          }

          .tool-grid {
            grid-template-columns: 1fr;
          }

          .study-tabs {
            grid-template-columns: 1fr;
          }

          .live-avatar-stage {
            inset: 82px 0 168px;
          }

          .live-video,
          .live-avatar {
            width: min(94vw, 440px);
          }

          .live-caption {
            bottom: 226px;
          }

          .live-wave-box {
            bottom: 152px;
          }
        }

        @media (max-height: 760px) {
          .live-avatar-stage {
            inset: 76px 0 150px;
          }

          .live-video,
          .live-avatar {
            max-height: 70dvh;
          }

          .live-caption {
            bottom: 206px;
          }

          .live-wave-box {
            bottom: 136px;
          }

          .live-controls span {
            width: 60px;
            height: 60px;
          }

          .live-main span {
            width: 72px;
            height: 72px;
          }
        }
      `}</style>
    </main>
  );
}
