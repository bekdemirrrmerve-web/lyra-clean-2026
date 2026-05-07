"use client";

import React, { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

type ListenMode = "write" | "send" | "live";

type VoiceMode = "phone" | "realistic";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Kanka geldim. Burası ana sohbet alanı. İstersen yaz, istersen alttaki canlı konuşmadan sesle devam et.",
  },
];

const quickPrompts = [
  "PDF Özet",
  "İçerik Fikri",
  "Teleprompter",
  "DGS Planı",
  "Kozmetik",
  "Foto Analiz",
  "Araştır",
  "Notlar",
];

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState("Hazır");

  const [speechRate, setSpeechRate] = useState(1.02);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("realistic");

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const liveModeRef = useRef(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    liveModeRef.current = liveMode;
  }, [liveMode]);

  useEffect(() => {
    loadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, []);

  function stopSpeaking() {
    try {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    } catch {}

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop?.();
    } catch {}

    recognitionRef.current = null;
    setIsListening(false);

    if (!liveModeRef.current) {
      setStatus("Hazır");
    }
  }

  function fallbackBrowserVoice(text: string, onEnd?: () => void) {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const clean = text
      .replace(/[*_`#>]/g, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "tr-TR";
    utterance.rate = speechRate;
    utterance.pitch = voiceMode === "realistic" ? 1.08 : 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const selectedVoice =
      voices.find((v) => v.lang?.toLowerCase() === "tr-tr") ||
      voices.find((v) => v.lang?.toLowerCase().includes("tr")) ||
      voices.find((v) => v.name?.toLowerCase().includes("turkish")) ||
      voices[0];

    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onstart = () => {
      setStatus("Konuşuyor...");
    };

    utterance.onend = () => {
      setStatus(liveModeRef.current ? "Tekrar dinliyorum..." : "Hazır");
      onEnd?.();
    };

    utterance.onerror = () => {
      setStatus("Hazır");
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  async function speak(text: string, force = false, onEnd?: () => void) {
    if (!force && isMuted) {
      onEnd?.();
      return;
    }

    if (!text.trim()) {
      onEnd?.();
      return;
    }

    stopSpeaking();

    if (voiceMode === "phone") {
      fallbackBrowserVoice(text, onEnd);
      return;
    }

    try {
      setStatus("Ses hazırlanıyor...");

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voiceName: "Kore",
        }),
      });

      if (!response.ok) {
        fallbackBrowserVoice(text, onEnd);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audioRef.current = audio;

      audio.onplay = () => {
        setStatus("Konuşuyor...");
      };

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setStatus(liveModeRef.current ? "Tekrar dinliyorum..." : "Hazır");
        onEnd?.();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        fallbackBrowserVoice(text, onEnd);
      };

      await audio.play();
    } catch {
      fallbackBrowserVoice(text, onEnd);
    }
  }

  async function getLyraReply(userText: string, history: ChatMessage[]) {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userText,
          messages: history.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return (
          data?.message ||
          data?.error ||
          "Kanka cevap motoruna bağlanırken takıldım. /api/chat route’unu veya API key ayarını kontrol edelim."
        );
      }

      return (
        data?.message ||
        data?.reply ||
        data?.content ||
        data?.answer ||
        "Kanka cevap geldi ama ekrana düzgün aktarılamadı."
      );
    } catch {
      return "Kanka bağlantı kopmuş gibi. Tasarım sağlam, sorun büyük ihtimalle /api/chat tarafında.";
    }
  }

  async function sendMessage(forcedText?: string, fromLive = false) {
    const userText = (forcedText ?? input).trim();

    if (!userText || loadingRef.current) return;

    setInput("");
    setIsLoading(true);
    setStatus("Düşünüyor...");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userText,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);

    const replyText = await getLyraReply(userText, nextMessages);

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: replyText,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);

    speak(replyText, false, () => {
      if (fromLive && liveModeRef.current) {
        setTimeout(() => startListening("live"), 450);
      }
    });
  }

  function startListening(mode: ListenMode) {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        {
          id: `speech-error-${Date.now()}`,
          role: "assistant",
          content:
            "Kanka bu tarayıcı ses algılamayı desteklemiyor olabilir. Chrome’da açarsan daha iyi çalışır.",
        },
      ]);
      return;
    }

    stopSpeaking();
    stopListening();

    const recognition = new SpeechRecognition();

    recognition.lang = "tr-TR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    let finalTranscript = "";

    recognition.onstart = () => {
      setIsListening(true);
      setStatus(
        mode === "write"
          ? "Sesini yazıya çeviriyorum..."
          : mode === "live"
          ? "Canlı mod dinliyor..."
          : "Dinliyorum..."
      );
    };

    recognition.onresult = (event: any) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript || "";

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      const visibleText = (finalTranscript || interim).trim();

      if (mode === "write" || mode === "live") {
        setInput(visibleText);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatus("Ses algılama hatası");

      if (mode === "live" && liveModeRef.current) {
        setTimeout(() => startListening("live"), 800);
      }
    };

    recognition.onend = () => {
      setIsListening(false);

      const cleanText = finalTranscript.trim();

      if (!cleanText) {
        setStatus(liveModeRef.current ? "Tekrar dinliyorum..." : "Hazır");

        if (mode === "live" && liveModeRef.current) {
          setTimeout(() => startListening("live"), 650);
        }

        return;
      }

      if (mode === "write") {
        setInput(cleanText);
        setStatus("Hazır");
        return;
      }

      if (mode === "send") {
        sendMessage(cleanText, false);
        return;
      }

      if (mode === "live") {
        sendMessage(cleanText, true);
      }
    };

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setStatus("Ses başlatılamadı");
    }
  }

  function toggleLiveMode() {
    if (liveMode) {
      setLiveMode(false);
      liveModeRef.current = false;
      stopListening();
      stopSpeaking();
      setStatus("Hazır");
      return;
    }

    setLiveMode(true);
    liveModeRef.current = true;
    startListening("live");
  }

  function clearChat() {
    stopListening();
    stopSpeaking();
    setMessages(initialMessages);
    setInput("");
    setStatus("Hazır");
  }

  function handleQuickPrompt(label: string) {
    const promptMap: Record<string, string> = {
      "PDF Özet": "PDF özetleme alanını açalım. Bana PDF içeriğini yüklediğinde kısa ve net özet çıkar.",
      "İçerik Fikri":
        "Bana keşfete düşebilecek 10 içerik fikri ver. Hook, akış ve CTA ile yaz.",
      Teleprompter:
        "Bana 40 saniyelik teleprompter metni yaz. İlk 3 saniyesi güçlü hook olsun.",
      "DGS Planı": "Bugün için 1 günlük DGS çalışma planı oluştur.",
      Kozmetik:
        "Kimyager gözüyle kozmetik içerik fikri üret. INCI ve bilimsel mantığı sade anlat.",
      "Foto Analiz": "Fotoğraf analizi için neye bakmam gerektiğini anlat.",
      Araştır: "Bu konuyu araştırma modunda sade ve güncel şekilde açıkla.",
      Notlar: "Bu konuşmadan kısa not çıkar ve yapılacaklara çevir.",
    };

    sendMessage(promptMap[label] || label);
  }

  return (
    <main className="lyra-page">
      <div className="lyra-shell">
        <header className="top-card">
          <div className="brand-area">
            <div className="brand-icon">L</div>
            <div>
              <h1>Lyra Clean 2026</h1>
              <p>Beyaz tasarım · geniş sohbet alanı · canlı konuşma hazır</p>
            </div>
          </div>

          <div className="top-status">
            <span className={isListening ? "dot active" : "dot"} />
            <strong>{status}</strong>
          </div>
        </header>

        <section className="main-grid">
          <aside className="left-panel">
            <div className="avatar-zone">
              <div
                className={`avatar-video-frame ${
                  isListening ? "pulse" : ""
                } ${liveMode ? "live" : ""}`}
              >
                <video
                  className="avatar-video"
                  src="/avatar/lyra-avatar.mp4"
                  poster="/avatar/lyra-avatar.jpg"
                  autoPlay
                  loop
                  muted
                  playsInline
                />

                <div className="avatar-fallback">L</div>
                <div className="avatar-glow" />

                <div className="avatar-badge">
                  {isListening
                    ? "Dinliyorum"
                    : status === "Konuşuyor..."
                    ? "Konuşuyorum"
                    : liveMode
                    ? "Canlı Mod"
                    : "Hazırım"}
                </div>
              </div>

              <p className="status-text">{status}</p>

              <div className="speed-box">
                <label>Ses hızı: {speechRate.toFixed(2)}</label>
                <input
                  type="range"
                  min="0.75"
                  max="1.35"
                  step="0.01"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(Number(e.target.value))}
                />
              </div>

              <div className="voice-row">
                <button
                  className={voiceMode === "phone" ? "selected" : ""}
                  onClick={() => setVoiceMode("phone")}
                >
                  Telefon Sesi
                </button>
                <button
                  className={voiceMode === "realistic" ? "selected" : ""}
                  onClick={() => setVoiceMode("realistic")}
                >
                  Gerçekçi Ses
                </button>
              </div>
            </div>
          </aside>

          <section className="chat-card">
            <div className="chat-head">
              <div>
                <h2>Lyra Mesajlaşma Alanı</h2>
                <p>Yazışma, sesle yazma ve canlı konuşma aynı ekranda.</p>
              </div>

              <span>{messages.length} mesaj</span>
            </div>

            <div className="chat-window">
              {messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={message.id}
                    className={`message-line ${
                      isUser ? "user-line" : "assistant-line"
                    }`}
                  >
                    <div
                      className={`message-bubble ${
                        isUser ? "user" : "assistant"
                      }`}
                    >
                      <strong>{isUser ? "Sen" : "Lyra"}</strong>
                      <p>{message.content}</p>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="message-line assistant-line">
                  <div className="message-bubble assistant">
                    <strong>Lyra</strong>
                    <p>Düşünüyorum kanka, cevabı toparlıyorum...</p>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div className="composer-card">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isListening
                    ? "Konuş, buraya yazıyorum..."
                    : "Lyra’ya yaz veya alttan sesle konuş..."
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <button
                className="send-button"
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
              >
                Gönder
              </button>
            </div>
          </section>
        </section>

        <nav className="bottom-actions">
          <button
            className={liveMode ? "live-on" : ""}
            onClick={toggleLiveMode}
          >
            {liveMode ? "Canlı Açık" : "Canlı Konuş"}
          </button>

          <button onClick={() => startListening("write")}>
            {isListening ? "Dinliyor" : "Sesle Yaz"}
          </button>

          <button
            onClick={() => {
              stopListening();
              stopSpeaking();
              setLiveMode(false);
              liveModeRef.current = false;
              setStatus("Hazır");
            }}
          >
            Sustur
          </button>

          <button
            onClick={() => {
              setIsMuted((prev) => !prev);
              if (!isMuted) stopSpeaking();
            }}
          >
            {isMuted ? "Sessiz" : "Ses Açık"}
          </button>

          <button onClick={clearChat}>Temizle</button>

          {quickPrompts.map((item) => (
            <button key={item} onClick={() => handleQuickPrompt(item)}>
              {item}
            </button>
          ))}
        </nav>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          min-height: 100%;
          background: #f8f8fb;
        }

        button,
        textarea,
        input {
          font-family: inherit;
        }

        .lyra-page {
          width: 100vw;
          height: 100dvh;
          overflow: hidden;
          color: #27232f;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background:
            radial-gradient(circle at 10% -10%, rgba(255, 214, 238, 0.9), transparent 30%),
            radial-gradient(circle at 90% 0%, rgba(217, 230, 255, 0.95), transparent 34%),
            radial-gradient(circle at 50% 120%, rgba(225, 255, 240, 0.82), transparent 38%),
            linear-gradient(135deg, #ffffff 0%, #f7f7fb 46%, #eef1f8 100%);
        }

        .lyra-shell {
          height: 100%;
          width: 100%;
          padding: 18px;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          gap: 14px;
        }

        .top-card {
          min-height: 78px;
          border-radius: 30px;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.92);
          box-shadow:
            0 24px 70px rgba(124, 111, 160, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(24px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .brand-area {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .brand-icon {
          width: 52px;
          height: 52px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          font-size: 25px;
          font-weight: 950;
          color: #fff;
          background:
            linear-gradient(135deg, #d9ddff, #ffcce8 45%, #d6fff0);
          box-shadow:
            0 14px 32px rgba(171, 148, 220, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        h1 {
          font-size: clamp(24px, 2.4vw, 34px);
          letter-spacing: -0.055em;
          color: #2b2638;
        }

        .brand-area p {
          margin-top: 4px;
          color: #817a91;
          font-weight: 650;
          font-size: 13px;
        }

        .top-status {
          height: 40px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          gap: 9px;
          border-radius: 999px;
          color: #686076;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(226, 222, 239, 0.9);
          box-shadow: 0 12px 28px rgba(136, 126, 165, 0.08);
          white-space: nowrap;
        }

        .dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #a3e4c3;
        }

        .dot.active {
          background: #ff9acb;
          box-shadow: 0 0 0 7px rgba(255, 154, 203, 0.18);
        }

        .main-grid {
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(230px, 310px) minmax(0, 1fr);
          gap: 14px;
        }

        .left-panel,
        .chat-card {
          min-height: 0;
          border-radius: 34px;
          background: rgba(255, 255, 255, 0.68);
          border: 1px solid rgba(255, 255, 255, 0.94);
          box-shadow:
            0 28px 80px rgba(118, 105, 155, 0.13),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(24px);
        }

        .left-panel {
          overflow: hidden;
          padding: 16px;
        }

        .avatar-zone {
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .avatar-video-frame {
          position: relative;
          width: min(220px, 100%);
          aspect-ratio: 1;
          border-radius: 42px;
          overflow: hidden;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.92), transparent 34%),
            linear-gradient(135deg, #fff, #f1edff 42%, #fff0f7 100%);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow:
            0 22px 58px rgba(143, 125, 182, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.94);
        }

        .avatar-video-frame.pulse {
          animation: softPulse 1.4s ease-in-out infinite;
        }

        .avatar-video-frame.live {
          box-shadow:
            0 0 0 8px rgba(255, 154, 203, 0.12),
            0 24px 70px rgba(143, 125, 182, 0.25);
        }

        @keyframes softPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.025);
          }
        }

        .avatar-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 2;
        }

        .avatar-fallback {
          position: relative;
          z-index: 1;
          width: 96px;
          height: 96px;
          border-radius: 35px;
          display: grid;
          place-items: center;
          font-size: 52px;
          font-weight: 950;
          color: #fff;
          background:
            linear-gradient(135deg, #c9cfff, #ffc3e3 55%, #d1ffef);
        }

        .avatar-glow {
          position: absolute;
          inset: auto 18px 12px 18px;
          height: 34px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.68);
          filter: blur(14px);
          z-index: 3;
        }

        .avatar-badge {
          position: absolute;
          left: 50%;
          bottom: 14px;
          transform: translateX(-50%);
          z-index: 4;
          min-width: 108px;
          height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 950;
          color: #62596f;
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 12px 24px rgba(118, 105, 155, 0.14);
        }

        .status-text {
          width: 100%;
          min-height: 42px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 10px;
          color: #6d647a;
          font-weight: 850;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(234, 231, 244, 0.86);
        }

        .speed-box {
          width: 100%;
          padding: 13px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.58);
          border: 1px solid rgba(234, 231, 244, 0.9);
        }

        .speed-box label {
          display: block;
          margin-bottom: 8px;
          color: #686076;
          font-size: 13px;
          font-weight: 900;
        }

        .speed-box input {
          width: 100%;
          accent-color: #c7b8ff;
        }

        .voice-row {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .voice-row button {
          min-height: 40px;
          border: 0;
          border-radius: 16px;
          cursor: pointer;
          font-weight: 950;
          color: #6d647a;
          background: rgba(255, 255, 255, 0.64);
          border: 1px solid rgba(234, 231, 244, 0.9);
        }

        .voice-row button.selected {
          color: #fff;
          background: linear-gradient(135deg, #b8c1ff, #ffb7dd);
        }

        .chat-card {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          overflow: hidden;
        }

        .chat-head {
          padding: 17px 18px 12px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(234, 231, 244, 0.72);
        }

        .chat-head h2 {
          font-size: clamp(20px, 2vw, 27px);
          letter-spacing: -0.045em;
          color: #2d2838;
        }

        .chat-head p {
          margin-top: 4px;
          color: #817a91;
          font-size: 13px;
          font-weight: 650;
        }

        .chat-head span {
          height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          white-space: nowrap;
          color: #726987;
          font-size: 12px;
          font-weight: 950;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(234, 231, 244, 0.9);
        }

        .chat-window {
          min-height: 0;
          overflow-y: auto;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .chat-window::-webkit-scrollbar {
          width: 9px;
        }

        .chat-window::-webkit-scrollbar-thumb {
          background: rgba(187, 178, 213, 0.55);
          border-radius: 999px;
        }

        .message-line {
          width: 100%;
          display: flex;
        }

        .assistant-line {
          justify-content: flex-start;
        }

        .user-line {
          justify-content: flex-end;
        }

        .message-bubble {
          max-width: min(78%, 820px);
          padding: 13px 15px;
          border-radius: 24px;
          box-shadow: 0 14px 34px rgba(124, 111, 160, 0.1);
        }

        .message-bubble strong {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          letter-spacing: 0.02em;
        }

        .message-bubble p {
          color: inherit;
          font-size: 15px;
          line-height: 1.52;
          white-space: pre-wrap;
        }

        .message-bubble.assistant {
          color: #362f42;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(234, 231, 244, 0.9);
          border-bottom-left-radius: 8px;
        }

        .message-bubble.assistant strong {
          color: #9b83d7;
        }

        .message-bubble.user {
          color: #3a3148;
          background: linear-gradient(135deg, #ffe4f2, #ebe5ff 55%, #e4fff6);
          border: 1px solid rgba(255, 255, 255, 0.92);
          border-bottom-right-radius: 8px;
        }

        .message-bubble.user strong {
          color: #9c5f93;
        }

        .composer-card {
          padding: 12px;
          border-top: 1px solid rgba(234, 231, 244, 0.72);
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          background: rgba(255, 255, 255, 0.45);
        }

        .composer-card textarea {
          width: 100%;
          height: 62px;
          resize: none;
          outline: none;
          border: 1px solid rgba(226, 222, 239, 0.96);
          border-radius: 22px;
          padding: 14px 15px;
          color: #332c3f;
          font-size: 15px;
          line-height: 1.35;
          background: rgba(255, 255, 255, 0.8);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .composer-card textarea:focus {
          border-color: rgba(183, 171, 255, 0.9);
          box-shadow: 0 0 0 5px rgba(199, 184, 255, 0.16);
        }

        .send-button {
          width: 112px;
          border: 0;
          border-radius: 22px;
          cursor: pointer;
          color: white;
          font-weight: 950;
          font-size: 15px;
          background: linear-gradient(135deg, #aeb8ff, #ffaad5);
          box-shadow: 0 14px 30px rgba(184, 157, 220, 0.22);
        }

        .send-button:disabled {
          opacity: 0.48;
          cursor: not-allowed;
          box-shadow: none;
        }

        .bottom-actions {
          min-height: 62px;
          border-radius: 30px;
          padding: 10px;
          display: grid;
          grid-template-columns: repeat(13, minmax(0, 1fr));
          gap: 8px;
          background: rgba(255, 255, 255, 0.64);
          border: 1px solid rgba(255, 255, 255, 0.94);
          box-shadow:
            0 24px 70px rgba(124, 111, 160, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(24px);
        }

        .bottom-actions button {
          min-height: 42px;
          border: 0;
          border-radius: 18px;
          cursor: pointer;
          color: #655d74;
          font-size: 12px;
          font-weight: 950;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(234, 231, 244, 0.9);
          box-shadow: 0 10px 24px rgba(124, 111, 160, 0.07);
          transition:
            transform 0.14s ease,
            background 0.14s ease,
            color 0.14s ease;
        }

        .bottom-actions button:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.95);
        }

        .bottom-actions button.live-on {
          color: #fff;
          background: linear-gradient(135deg, #aeb8ff, #ffaad5);
          border-color: transparent;
        }

        @media (max-width: 1100px) {
          .bottom-actions {
            grid-template-columns: repeat(7, minmax(0, 1fr));
          }

          .main-grid {
            grid-template-columns: 250px minmax(0, 1fr);
          }

          .avatar-video-frame {
            width: 190px;
          }
        }

        @media (max-width: 820px) {
          .lyra-shell {
            padding: 10px;
            gap: 10px;
          }

          .top-card {
            min-height: auto;
            border-radius: 24px;
            align-items: flex-start;
            flex-direction: column;
          }

          .top-status {
            width: 100%;
            justify-content: center;
          }

          .main-grid {
            grid-template-columns: 1fr;
          }

          .left-panel {
            display: none;
          }

          .chat-card {
            border-radius: 26px;
          }

          .chat-head {
            padding: 14px;
          }

          .chat-head p {
            display: none;
          }

          .chat-window {
            padding: 13px;
          }

          .message-bubble {
            max-width: 92%;
          }

          .composer-card {
            grid-template-columns: 1fr;
          }

          .composer-card textarea {
            height: 58px;
          }

          .send-button {
            width: 100%;
            min-height: 46px;
          }

          .bottom-actions {
            border-radius: 24px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            max-height: 150px;
            overflow-y: auto;
          }

          .bottom-actions button {
            min-height: 38px;
            border-radius: 15px;
            font-size: 11.5px;
          }
        }
      `}</style>
    </main>
  );
}
