"use client";

import React, { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

type ListenMode = "write" | "send" | "live";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const starterMessages: ChatMessage[] = [
  {
    id: "starter-1",
    role: "assistant",
    content:
      "Merhaba kanka, ben Lyra. Burası beyaz-gümüş ana sohbet alanın. İstersen yaz, istersen canlı konuşmayı aç.",
  },
];

const tools = [
  "Canlı Konuş",
  "Sesle Yaz",
  "PDF Özet",
  "İçerik Fikri",
  "Teleprompter",
  "DGS Planı",
  "Kozmetik",
  "Foto Analiz",
  "Araştır",
  "Notlar",
];

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Hazır");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [muted, setMuted] = useState(false);

  const recognitionRef = useRef<any>(null);
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
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function speak(text: string, afterEnd?: () => void) {
    if (muted) {
      afterEnd?.();
      return;
    }

    if (typeof window === "undefined") {
      afterEnd?.();
      return;
    }

    if (!("speechSynthesis" in window)) {
      afterEnd?.();
      return;
    }

    stopSpeaking();

    const cleanText = text
      .replace(/[*_`#>]/g, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      afterEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);

    utterance.lang = "tr-TR";
    utterance.rate = 1.02;
    utterance.pitch = 1.08;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const trVoice =
      voices.find((v) => v.lang?.toLowerCase() === "tr-tr") ||
      voices.find((v) => v.lang?.toLowerCase().includes("tr")) ||
      voices.find((v) => v.name?.toLowerCase().includes("turkish")) ||
      voices[0];

    if (trVoice) utterance.voice = trVoice;

    utterance.onstart = () => {
      setStatus("Lyra konuşuyor...");
    };

    utterance.onend = () => {
      setStatus(liveModeRef.current ? "Tekrar dinliyorum..." : "Hazır");
      afterEnd?.();
    };

    utterance.onerror = () => {
      setStatus("Hazır");
      afterEnd?.();
    };

    window.speechSynthesis.speak(utterance);
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

  function startListening(mode: ListenMode) {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content:
            "Kanka bu tarayıcı ses algılamayı desteklemiyor olabilir. Chrome’da denersen daha sağlıklı çalışır.",
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

      if (mode === "live") setStatus("Canlı mod dinliyor...");
      else if (mode === "write") setStatus("Sesini yazıya çeviriyorum...");
      else setStatus("Dinliyorum...");
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

      const visible = (finalTranscript || interim).trim();

      if (mode === "write" || mode === "live") {
        setInput(visible);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatus("Ses algılama hatası");

      if (mode === "live" && liveModeRef.current) {
        setTimeout(() => startListening("live"), 700);
      }
    };

    recognition.onend = () => {
      setIsListening(false);

      const clean = finalTranscript.trim();

      if (!clean) {
        setStatus(liveModeRef.current ? "Tekrar dinliyorum..." : "Hazır");

        if (mode === "live" && liveModeRef.current) {
          setTimeout(() => startListening("live"), 650);
        }

        return;
      }

      if (mode === "write") {
        setInput(clean);
        setStatus("Hazır");
        return;
      }

      if (mode === "send") {
        sendMessage(clean, false);
        return;
      }

      if (mode === "live") {
        sendMessage(clean, true);
      }
    };

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setStatus("Ses başlatılamadı");
    }
  }

  async function getReply(userText: string, history: ChatMessage[]) {
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
          "Kanka cevap motoruna bağlanırken takıldım. /api/chat tarafını kontrol edelim."
        );
      }

      return (
        data?.message ||
        data?.reply ||
        data?.answer ||
        data?.content ||
        "Kanka cevap geldi ama ekrana düzgün aktarılamadı."
      );
    } catch {
      return "Kanka bağlantı tarafında takıldım. Tasarım sağlam; sorun büyük ihtimalle /api/chat route’unda.";
    }
  }

  async function sendMessage(forcedText?: string, fromLive = false) {
    const text = (forcedText ?? input).trim();

    if (!text || loadingRef.current) return;

    setInput("");
    setIsLoading(true);
    setStatus("Lyra düşünüyor...");

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: text,
    };

    const newHistory = [...messages, userMessage];

    setMessages(newHistory);

    const reply = await getReply(text, newHistory);

    const assistantMessage: ChatMessage = {
      id: makeId(),
      role: "assistant",
      content: reply,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);

    speak(reply, () => {
      if (fromLive && liveModeRef.current) {
        setTimeout(() => startListening("live"), 450);
      }
    });
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

  function handleTool(tool: string) {
    if (tool === "Canlı Konuş") {
      toggleLiveMode();
      return;
    }

    if (tool === "Sesle Yaz") {
      startListening("write");
      return;
    }

    const prompts: Record<string, string> = {
      "PDF Özet": "PDF özetleme alanını aç. PDF içeriğini kısa, net ve başlıklarla özetle.",
      "İçerik Fikri":
        "Bana keşfete düşebilecek 10 içerik fikri ver. Her biri için hook, kısa akış ve CTA yaz.",
      Teleprompter:
        "Bana 40 saniyelik teleprompter metni yaz. İlk 3 saniyesi güçlü hook olsun.",
      "DGS Planı": "Bugün için gerçekçi 1 günlük DGS çalışma planı oluştur.",
      Kozmetik:
        "Kimyager gözüyle kozmetik içerik fikri üret. INCI mantığını sade anlat.",
      "Foto Analiz":
        "Fotoğraf analizi yaparken ışık, renk, kadraj ve stil açısından nelere bakmam gerektiğini anlat.",
      Araştır:
        "Bu konuyu araştırma modunda açıkla; sade, net ve güncel olacak şekilde toparla.",
      Notlar:
        "Bu konuşmadan kısa not çıkar ve yapılacaklar listesine çevir.",
    };

    sendMessage(prompts[tool] || tool);
  }

  function clearChat() {
    stopListening();
    stopSpeaking();
    setMessages(starterMessages);
    setInput("");
    setLiveMode(false);
    liveModeRef.current = false;
    setStatus("Hazır");
  }

  return (
    <main className="page">
      <div className="shell">
        <header className="top">
          <div className="brand">
            <div className="mini-avatar">
              <span>L</span>
            </div>

            <div>
              <h1>Lyra Clean 2026</h1>
              <p>Beyaz-gümüş avatarlı ana sohbet ekranı</p>
            </div>
          </div>

          <div className="status-pill">
            <span className={isListening ? "status-dot listening" : "status-dot"} />
            {status}
          </div>
        </header>

        <section className="hero">
          <aside className="avatar-card">
            <div
              className={`avatar-frame ${isListening ? "listening" : ""} ${
                liveMode ? "live" : ""
              }`}
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

              <div className="avatar-placeholder">
                <div className="hair" />
                <div className="face">
                  <div className="eyes">
                    <i />
                    <i />
                  </div>
                  <div className="mouth" />
                </div>
              </div>

              <div className="silver-ring" />
              <div className="avatar-label">
                {liveMode
                  ? "Canlı Mod"
                  : isListening
                  ? "Dinliyorum"
                  : status.includes("konuşuyor")
                  ? "Konuşuyorum"
                  : "Hazırım"}
              </div>
            </div>

            <div className="avatar-info">
              <h2>Lyra</h2>
              <p>Sesli, yazılı ve canlı sohbet asistanın.</p>
            </div>

            <div className="avatar-buttons">
              <button
                className={liveMode ? "primary active" : "primary"}
                onClick={toggleLiveMode}
              >
                {liveMode ? "Canlı Açık" : "Canlı Konuş"}
              </button>

              <button onClick={() => startListening("write")}>
                {isListening ? "Dinliyor" : "Sesle Yaz"}
              </button>

              <button
                onClick={() => {
                  setMuted((prev) => !prev);
                  if (!muted) stopSpeaking();
                }}
              >
                {muted ? "Sessiz" : "Ses Açık"}
              </button>
            </div>
          </aside>

          <section className="chat-card">
            <div className="chat-top">
              <div>
                <h2>Mesajlaşma Alanı</h2>
                <p>Geniş sohbet ekranı burada. Yaz, sesle yaz veya canlı konuş.</p>
              </div>

              <button onClick={clearChat}>Temizle</button>
            </div>

            <div className="messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message-row ${
                    message.role === "user" ? "user-row" : "assistant-row"
                  }`}
                >
                  <div
                    className={`bubble ${
                      message.role === "user" ? "user" : "assistant"
                    }`}
                  >
                    <strong>{message.role === "user" ? "Sen" : "Lyra"}</strong>
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="message-row assistant-row">
                  <div className="bubble assistant typing">
                    <strong>Lyra</strong>
                    <p>Düşünüyorum kanka...</p>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div className="composer">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isListening
                    ? "Konuşuyorsun, buraya yazıyorum..."
                    : "Lyra’ya yaz..."
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
              >
                Gönder
              </button>
            </div>
          </section>
        </section>

        <nav className="bottom-bar">
          {tools.map((tool) => (
            <button
              key={tool}
              onClick={() => handleTool(tool)}
              className={
                tool === "Canlı Konuş" && liveMode
                  ? "tool active"
                  : tool === "Sesle Yaz" && isListening
                  ? "tool active"
                  : "tool"
              }
            >
              {tool === "Canlı Konuş" && liveMode ? "Canlı Açık" : tool}
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
          background: #f6f7fb;
        }

        button,
        textarea {
          font-family: inherit;
        }

        .page {
          width: 100vw;
          height: 100dvh;
          overflow: hidden;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          color: #26222f;
          background:
            radial-gradient(circle at 8% 0%, rgba(255, 255, 255, 1), transparent 24%),
            radial-gradient(circle at 24% 10%, rgba(226, 232, 255, 0.9), transparent 31%),
            radial-gradient(circle at 88% 12%, rgba(255, 231, 246, 0.95), transparent 34%),
            radial-gradient(circle at 50% 110%, rgba(229, 255, 248, 0.9), transparent 38%),
            linear-gradient(135deg, #ffffff 0%, #f7f8fc 42%, #eef1f8 100%);
        }

        .shell {
          width: 100%;
          height: 100%;
          padding: 16px;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          gap: 12px;
        }

        .top {
          min-height: 76px;
          border-radius: 30px;
          padding: 13px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.96);
          box-shadow:
            0 24px 70px rgba(115, 112, 140, 0.13),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(24px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .mini-avatar {
          width: 52px;
          height: 52px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          background:
            linear-gradient(135deg, #fefefe, #dfe5f4 38%, #ffffff 68%, #d2d6df);
          box-shadow:
            0 14px 34px rgba(113, 112, 138, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 1);
          border: 1px solid rgba(255, 255, 255, 0.9);
        }

        .mini-avatar span {
          width: 38px;
          height: 38px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          font-weight: 950;
          color: #fff;
          background: linear-gradient(135deg, #b7bfd4, #f1d7e7);
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        h1 {
          font-size: clamp(24px, 2.3vw, 34px);
          letter-spacing: -0.055em;
          color: #282431;
        }

        .brand p {
          margin-top: 3px;
          font-size: 13px;
          color: #817b8b;
          font-weight: 650;
        }

        .status-pill {
          height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 900;
          color: #6a6475;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(230, 231, 239, 0.95);
          box-shadow: 0 12px 28px rgba(115, 112, 140, 0.08);
        }

        .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #a6e9cc;
        }

        .status-dot.listening {
          background: #ff9dcc;
          box-shadow: 0 0 0 7px rgba(255, 157, 204, 0.18);
        }

        .hero {
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(250px, 330px) minmax(0, 1fr);
          gap: 12px;
        }

        .avatar-card,
        .chat-card,
        .bottom-bar {
          background: rgba(255, 255, 255, 0.68);
          border: 1px solid rgba(255, 255, 255, 0.96);
          box-shadow:
            0 28px 80px rgba(115, 112, 140, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(26px);
        }

        .avatar-card {
          min-height: 0;
          border-radius: 34px;
          padding: 16px;
          display: grid;
          grid-template-rows: minmax(0, 1fr) auto auto;
          gap: 14px;
          overflow: hidden;
        }

        .avatar-frame {
          position: relative;
          width: 100%;
          min-height: 260px;
          border-radius: 34px;
          overflow: hidden;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 28% 20%, rgba(255, 255, 255, 1), transparent 30%),
            linear-gradient(145deg, #ffffff 0%, #eef1f8 48%, #fdfcff 100%);
          border: 1px solid rgba(255, 255, 255, 0.92);
          box-shadow:
            0 22px 60px rgba(126, 126, 150, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 1);
        }

        .avatar-frame.listening {
          animation: avatarPulse 1.35s ease-in-out infinite;
        }

        .avatar-frame.live {
          box-shadow:
            0 0 0 8px rgba(255, 157, 204, 0.12),
            0 24px 70px rgba(126, 126, 150, 0.22);
        }

        @keyframes avatarPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.018);
          }
        }

        .avatar-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 4;
        }

        .avatar-placeholder {
          position: relative;
          z-index: 2;
          width: 170px;
          height: 210px;
          display: grid;
          place-items: center;
        }

        .hair {
          position: absolute;
          width: 145px;
          height: 180px;
          border-radius: 70px 70px 55px 55px;
          background:
            radial-gradient(circle at 34% 20%, rgba(255, 255, 255, 0.35), transparent 18%),
            linear-gradient(145deg, #9a6d5f, #d49b83 48%, #805548);
          box-shadow: 0 18px 46px rgba(129, 98, 124, 0.18);
        }

        .face {
          position: relative;
          width: 104px;
          height: 124px;
          margin-top: 18px;
          border-radius: 48px 48px 44px 44px;
          background: linear-gradient(145deg, #fff2e9, #f4c8b8);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .eyes {
          position: absolute;
          top: 44px;
          left: 23px;
          right: 23px;
          display: flex;
          justify-content: space-between;
        }

        .eyes i {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #65473d;
          display: block;
        }

        .mouth {
          position: absolute;
          left: 50%;
          bottom: 30px;
          width: 25px;
          height: 9px;
          border-radius: 0 0 18px 18px;
          border-bottom: 3px solid #a76473;
          transform: translateX(-50%);
        }

        .silver-ring {
          position: absolute;
          inset: 18px;
          z-index: 3;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.72);
          pointer-events: none;
        }

        .avatar-label {
          position: absolute;
          left: 50%;
          bottom: 14px;
          z-index: 6;
          transform: translateX(-50%);
          min-width: 116px;
          height: 35px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          padding: 0 13px;
          font-size: 12px;
          font-weight: 950;
          color: #625d6b;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 14px 30px rgba(115, 112, 140, 0.14);
        }

        .avatar-info {
          text-align: center;
        }

        .avatar-info h2 {
          font-size: 24px;
          letter-spacing: -0.045em;
          color: #2b2734;
        }

        .avatar-info p {
          margin-top: 5px;
          font-size: 13px;
          font-weight: 650;
          color: #817b8b;
        }

        .avatar-buttons {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .avatar-buttons button {
          min-height: 42px;
          border: 0;
          border-radius: 18px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 950;
          color: #635d70;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(230, 231, 239, 0.95);
        }

        .avatar-buttons button.primary,
        .avatar-buttons button.active {
          color: #fff;
          background: linear-gradient(135deg, #b9c1d4, #e9d7e6);
          border-color: transparent;
          box-shadow: 0 14px 30px rgba(150, 142, 165, 0.18);
        }

        .chat-card {
          min-height: 0;
          border-radius: 34px;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          overflow: hidden;
        }

        .chat-top {
          padding: 17px 18px 12px;
          border-bottom: 1px solid rgba(231, 232, 240, 0.82);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .chat-top h2 {
          font-size: clamp(22px, 2vw, 30px);
          letter-spacing: -0.05em;
          color: #2b2734;
        }

        .chat-top p {
          margin-top: 4px;
          font-size: 13px;
          color: #817b8b;
          font-weight: 650;
        }

        .chat-top button {
          height: 36px;
          padding: 0 13px;
          border: 0;
          border-radius: 999px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 950;
          color: #675f73;
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(230, 231, 239, 0.96);
        }

        .messages {
          min-height: 0;
          overflow-y: auto;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .messages::-webkit-scrollbar {
          width: 9px;
        }

        .messages::-webkit-scrollbar-thumb {
          background: rgba(186, 190, 204, 0.58);
          border-radius: 999px;
        }

        .message-row {
          width: 100%;
          display: flex;
        }

        .assistant-row {
          justify-content: flex-start;
        }

        .user-row {
          justify-content: flex-end;
        }

        .bubble {
          max-width: min(78%, 860px);
          padding: 13px 15px;
          border-radius: 24px;
          box-shadow: 0 14px 34px rgba(115, 112, 140, 0.1);
        }

        .bubble strong {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          letter-spacing: 0.02em;
        }

        .bubble p {
          white-space: pre-wrap;
          font-size: 15px;
          line-height: 1.52;
        }

        .bubble.assistant {
          color: #312c3b;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(231, 232, 240, 0.96);
          border-bottom-left-radius: 8px;
        }

        .bubble.assistant strong {
          color: #858da4;
        }

        .bubble.user {
          color: #2f2938;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(231, 235, 245, 0.96));
          border: 1px solid rgba(255, 255, 255, 0.98);
          border-bottom-right-radius: 8px;
        }

        .bubble.user strong {
          color: #a28aa0;
        }

        .typing {
          opacity: 0.85;
        }

        .composer {
          padding: 12px;
          border-top: 1px solid rgba(231, 232, 240, 0.82);
          display: grid;
          grid-template-columns: minmax(0, 1fr) 112px;
          gap: 10px;
          background: rgba(255, 255, 255, 0.42);
        }

        .composer textarea {
          width: 100%;
          height: 62px;
          resize: none;
          outline: none;
          border-radius: 23px;
          border: 1px solid rgba(226, 228, 238, 0.98);
          background: rgba(255, 255, 255, 0.82);
          color: #2f2938;
          padding: 14px 15px;
          font-size: 15px;
          line-height: 1.36;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.98);
        }

        .composer textarea:focus {
          border-color: rgba(188, 194, 212, 0.98);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.98),
            0 0 0 5px rgba(198, 204, 220, 0.2);
        }

        .composer button {
          border: 0;
          border-radius: 23px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 950;
          color: #fff;
          background: linear-gradient(135deg, #b8bfce, #ead6e4);
          box-shadow: 0 14px 30px rgba(150, 142, 165, 0.2);
        }

        .composer button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
          box-shadow: none;
        }

        .bottom-bar {
          min-height: 62px;
          border-radius: 30px;
          padding: 10px;
          display: grid;
          grid-template-columns: repeat(10, minmax(0, 1fr));
          gap: 8px;
        }

        .tool {
          min-height: 42px;
          border: 0;
          border-radius: 18px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 950;
          color: #665f72;
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid rgba(230, 231, 239, 0.96);
          box-shadow: 0 10px 24px rgba(115, 112, 140, 0.07);
          transition:
            transform 0.14s ease,
            background 0.14s ease;
        }

        .tool:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.96);
        }

        .tool.active {
          color: #fff;
          background: linear-gradient(135deg, #b9c1d4, #f0d2e4);
          border-color: transparent;
        }

        @media (max-width: 1050px) {
          .hero {
            grid-template-columns: 260px minmax(0, 1fr);
          }

          .bottom-bar {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .shell {
            padding: 10px;
            gap: 9px;
          }

          .top {
            border-radius: 24px;
            min-height: auto;
            align-items: flex-start;
            flex-direction: column;
          }

          .status-pill {
            width: 100%;
            justify-content: center;
          }

          .hero {
            grid-template-columns: 1fr;
            grid-template-rows: auto minmax(0, 1fr);
          }

          .avatar-card {
            border-radius: 26px;
            grid-template-columns: auto minmax(0, 1fr);
            grid-template-rows: auto auto;
            align-items: center;
            padding: 10px;
            gap: 10px;
          }

          .avatar-frame {
            width: 92px;
            min-height: 92px;
            border-radius: 26px;
          }

          .avatar-placeholder {
            width: 70px;
            height: 78px;
          }

          .hair {
            width: 58px;
            height: 70px;
          }

          .face {
            width: 44px;
            height: 50px;
            border-radius: 22px;
          }

          .eyes {
            top: 18px;
            left: 11px;
            right: 11px;
          }

          .eyes i {
            width: 4px;
            height: 4px;
          }

          .mouth {
            bottom: 12px;
            width: 11px;
            height: 4px;
            border-bottom-width: 2px;
          }

          .avatar-label {
            min-width: 74px;
            height: 24px;
            font-size: 9px;
            bottom: 6px;
          }

          .avatar-info {
            text-align: left;
          }

          .avatar-info h2 {
            font-size: 20px;
          }

          .avatar-info p {
            font-size: 12px;
          }

          .avatar-buttons {
            grid-column: 1 / -1;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .avatar-buttons button {
            min-height: 36px;
            border-radius: 15px;
            font-size: 11.5px;
          }

          .chat-card {
            border-radius: 26px;
          }

          .chat-top {
            padding: 14px;
          }

          .chat-top p {
            display: none;
          }

          .messages {
            padding: 13px;
          }

          .bubble {
            max-width: 92%;
          }

          .composer {
            grid-template-columns: 1fr;
          }

          .composer textarea {
            height: 58px;
          }

          .composer button {
            min-height: 46px;
          }

          .bottom-bar {
            border-radius: 24px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            max-height: 132px;
            overflow-y: auto;
          }

          .tool {
            min-height: 38px;
            border-radius: 15px;
            font-size: 11.5px;
          }
        }
      `}</style>
    </main>
  );
}
