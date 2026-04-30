"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "lyra";

type Message = {
  role: Role;
  text: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  onresult: ((event: any) => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

export default function LyraPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "lyra",
      text: "Ben buradayım Merve. Bugün sesi, tasarımı ve o gerçek Lyra hissini birlikte toparlıyoruz.",
    },
  ]);

  const [input, setInput] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [rate, setRate] = useState(0.95);
  const [pitch, setPitch] = useState(1.08);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [avatarOk, setAvatarOk] = useState(true);
  const [error, setError] = useState("");

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedVoice = localStorage.getItem("lyra_voice_uri");
    if (savedVoice) setSelectedVoiceURI(savedVoice);

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (selectedVoiceURI) {
      localStorage.setItem("lyra_voice_uri", selectedVoiceURI);
    }
  }, [selectedVoiceURI]);

  const bestVoice = useMemo(() => {
    if (!voices.length) return null;

    const selected = voices.find((voice) => voice.voiceURI === selectedVoiceURI);
    if (selected) return selected;

    const softFemaleHints = [
      "female",
      "woman",
      "zira",
      "seda",
      "ayşe",
      "turkish",
      "türkçe",
      "google",
      "microsoft",
      "enhanced",
    ];

    return (
      voices.find(
        (voice) =>
          voice.lang.toLowerCase().startsWith("tr") &&
          softFemaleHints.some((hint) =>
            `${voice.name} ${voice.lang}`.toLowerCase().includes(hint)
          )
      ) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("tr")) ||
      voices.find((voice) =>
        softFemaleHints.some((hint) =>
          `${voice.name} ${voice.lang}`.toLowerCase().includes(hint)
        )
      ) ||
      voices[0]
    );
  }, [voices, selectedVoiceURI]);

  function speak(text: string) {
    if (typeof window === "undefined") return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang || "tr-TR";
    } else {
      utterance.lang = "tr-TR";
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setError("Ses başlatılamadı. Telefonda bir kez ekrana dokunup tekrar dene.");
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  async function askLyra(forcedText?: string) {
    const userText = (forcedText || input).trim();
    if (!userText) return;

    setError("");
    setInput("");

    const nextMessages: Message[] = [
      ...messages,
      {
        role: "user",
        text: userText,
      },
    ];

    setMessages(nextMessages);

    let lyraReply =
      "Seni duydum kankam. Şu an ücretsiz ses ve yeni tasarım modundayım. API bağlantısı varsa daha akıllı cevap vereceğim, yoksa da tasarım ve ses sistemi bozulmadan çalışmaya devam eder.";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        lyraReply =
          data.reply ||
          data.text ||
          data.message ||
          data.content ||
          lyraReply;
      }
    } catch {
      lyraReply =
        "Bağlantı tarafı şu an cevap vermedi ama merak etme, Lyra'nın ücretsiz ses ve arayüz kısmı çalışıyor. Önce görünüşü oturtalım, sonra beyni bağlarız.";
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "lyra",
        text: lyraReply,
      },
    ]);

    speak(lyraReply);
  }

  function startListening() {
    if (typeof window === "undefined") return;

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setError(
        "Bu tarayıcı ses tanımayı desteklemiyor. Chrome veya Edge ile dene kankam."
      );
      return;
    }

    stopSpeaking();

    const recognition = new Recognition();
    recognitionRef.current = recognition;

    recognition.lang = "tr-TR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setError("");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setError("Mikrofon dinleyemedi. Tarayıcıdan mikrofon iznini kontrol et.");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setInput(transcript);
      askLyra(transcript);
    };

    recognition.start();
  }

  const voiceOptions = voices.filter(Boolean);

  return (
    <main className="lyra-page">
      <div className="sun-glow sun-glow-one" />
      <div className="sun-glow sun-glow-two" />
      <div className="leaf leaf-one">✦</div>
      <div className="leaf leaf-two">❧</div>
      <div className="leaf leaf-three">✧</div>

      <section className="lyra-topbar">
        <div>
          <p className="eyebrow">LYRA CLEAN / REBORN</p>
          <h1>Lyra</h1>
        </div>

        <div className="status-pill">
          <span className={isSpeaking ? "dot active" : "dot"} />
          {isSpeaking ? "Konuşuyor" : isListening ? "Dinliyor" : "Hazır"}
        </div>
      </section>

      <section className="lyra-shell">
        <aside className="avatar-card">
          <div className="avatar-stage">
            <div className="halo" />

            {avatarOk ? (
              <img
                src="/lyra-avatar.png"
                alt="Lyra Avatar"
                className={isSpeaking ? "lyra-avatar speaking" : "lyra-avatar"}
                onError={() => setAvatarOk(false)}
              />
            ) : (
              <div className={isSpeaking ? "avatar-fallback speaking" : "avatar-fallback"}>
                <div className="hair" />
                <div className="face">
                  <span className="eye left-eye" />
                  <span className="eye right-eye" />
                  <span className="mouth" />
                </div>
              </div>
            )}
          </div>

          <div className="avatar-caption">
            <h2>Beyaz mistik asistan modu</h2>
            <p>
              Ücretsiz tarayıcı sesiyle çalışır. Kadın sesi cihazında varsa onu
              seçer; yoksa en doğal sesi kullanır.
            </p>
          </div>

          <div className="quick-actions">
            <button onClick={startListening} className="primary-button">
              {isListening ? "Dinliyorum..." : "Seslen"}
            </button>

            <button onClick={() => speak("Ben buradayım Merve. Sesim artık ücretsiz tarayıcı sesinden geliyor.")}>
              Sesi dene
            </button>

            <button onClick={stopSpeaking}>Sesi durdur</button>
          </div>
        </aside>

        <section className="chat-card">
          <div className="chat-header">
            <div>
              <p className="eyebrow">SOHBET MODU</p>
              <h2>Lyra ile konuş</h2>
            </div>
            <span className="mini-badge">Web Speech API</span>
          </div>

          <div className="messages">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "lyra"
                    ? "message message-lyra"
                    : "message message-user"
                }
              >
                <span>{message.role === "lyra" ? "Lyra" : "Sen"}</span>
                <p>{message.text}</p>
              </div>
            ))}
          </div>

          {error && <div className="soft-error">{error}</div>}

          <div className="input-row">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") askLyra();
              }}
              placeholder="Lyra'ya yaz veya seslen..."
            />
            <button onClick={() => askLyra()} className="send-button">
              Gönder
            </button>
          </div>

          <div className="settings-grid">
            <label>
              Ses seç
              <select
                value={selectedVoiceURI}
                onChange={(event) => setSelectedVoiceURI(event.target.value)}
              >
                <option value="">Otomatik en iyi sesi seç</option>
                {voiceOptions.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} / {voice.lang}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Hız: {rate.toFixed(2)}
              <input
                type="range"
                min="0.75"
                max="1.2"
                step="0.01"
                value={rate}
                onChange={(event) => setRate(Number(event.target.value))}
              />
            </label>

            <label>
              Ton: {pitch.toFixed(2)}
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.01"
                value={pitch}
                onChange={(event) => setPitch(Number(event.target.value))}
              />
            </label>
          </div>
        </section>
      </section>

      <section className="feature-dock">
        <div>PDF Özet</div>
        <div>Araştırma</div>
        <div>Kimya Lab</div>
        <div>Astroloji</div>
        <div>Not Defteri</div>
        <div>Görsel</div>
      </section>
    </main>
  );
}
