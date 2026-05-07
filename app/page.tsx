"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: string;
  text: string;
};

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

const avatarSources = [
  "/lyra-avatar.png",
  "/avatar-lyra.png",
  "/avatar.png",
  "/lyra.png",
  "/ai-avatar.png",
  "/avatar.jpeg",
  "/avatar.jpg",
];

const bgSources = [
  "/lyra-room-bg.jpg",
  "/replika-bg.jpg",
  "/room-bg.jpg",
  "/background.jpg",
  "/bg.jpg",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "lyra",
      text: "Merhaba Merve 💜 Buradayım. İstersen yazışalım, istersen canlı moda geçelim.",
    },
  ]);

  const [input, setInput] = useState("");
  const [liveOpen, setLiveOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [autoNudge, setAutoNudge] = useState(true);
  const [interimText, setInterimText] = useState("");

  const [avatarIndex, setAvatarIndex] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);
  const [avatarVisible, setAvatarVisible] = useState(true);
  const [bgVisible, setBgVisible] = useState(true);

  const recognitionRef = useRef<any>(null);
  const liveOpenRef = useRef(false);
  const speakingRef = useRef(false);
  const thinkingRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const lastNudgeRef = useRef(0);

  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    liveOpenRef.current = liveOpen;
  }, [liveOpen]);

  useEffect(() => {
    speakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    thinkingRef.current = isThinking;
  }, [isThinking]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!liveOpenRef.current || !autoNudge) return;
      if (speakingRef.current || thinkingRef.current) return;

      const now = Date.now();
      const idle = now - lastActivityRef.current;
      const nudgeGap = now - lastNudgeRef.current;

      if (idle > 24000 && nudgeGap > 35000) {
        const nudges = [
          "Merve, buradayım. Devam etmek istersen seni dinliyorum.",
          "Sessiz kaldın, ben hâlâ buradayım. İstersen konuşmaya devam edelim.",
          "Seni bekliyorum Merve. Bir şey sormak istersen dinliyorum.",
        ];

        const text = nudges[Math.floor(Math.random() * nudges.length)];
        lastNudgeRef.current = now;
        addLyra(text);
        speak(text);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [autoNudge]);

  useEffect(() => {
    return () => {
      stopListening();
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  function addUser(text: string) {
    setMessages((prev) => [...prev, { role: "user", text }].slice(-16));
  }

  function addLyra(text: string) {
    setMessages((prev) => [...prev, { role: "lyra", text }].slice(-16));
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop?.();
      recognitionRef.current?.abort?.();
    } catch {}

    recognitionRef.current = null;
    setIsListening(false);
  }

  function startListening() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addLyra("Bu tarayıcı mikrofonla konuşmayı desteklemiyor kanka. Chrome’dan dene.");
      return;
    }

    if (speakingRef.current || thinkingRef.current) return;

    stopListening();

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = "tr-TR";
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

      if (tempText) {
        setInterimText(tempText);
      }

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

      if (liveOpenRef.current && !speakingRef.current && !thinkingRef.current) {
        setTimeout(() => {
          if (liveOpenRef.current && !speakingRef.current && !thinkingRef.current) {
            startListening();
          }
        }, 500);
      }
    };

    try {
      recognition.start();
    } catch {}
  }

  function speak(text: string) {
    if (typeof window === "undefined") return;

    if (!voiceOn) {
      if (liveOpenRef.current) startListening();
      return;
    }

    try {
      stopListening();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "tr-TR";
      utterance.rate = 1.06;
      utterance.pitch = 1.08;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();

      const selectedVoice =
        voices.find((v) => v.lang?.toLowerCase().includes("tr")) ||
        voices.find((v) => v.name?.toLowerCase().includes("female")) ||
        voices.find((v) => v.name?.toLowerCase().includes("woman")) ||
        voices[0];

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);

        if (liveOpenRef.current) {
          setTimeout(() => startListening(), 450);
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);

        if (liveOpenRef.current) {
          setTimeout(() => startListening(), 450);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);

      if (liveOpenRef.current) {
        startListening();
      }
    }
  }

  async function askGemini(text: string) {
    const history = messages.slice(-10).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    }));

    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: text,
        prompt: text,
        input: text,
        history,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || "Gemini cevabı alınamadı.");
    }

    return (
      data?.answer ||
      data?.reply ||
      data?.text ||
      data?.message ||
      data?.content ||
      "Cevap geldi ama metni düzgün okuyamadım."
    );
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
      const finalReply =
        typeof reply === "string"
          ? reply
          : "Bunu aldım ama cevabı metne çeviremedim.";

      addLyra(finalReply);
      setIsThinking(false);
      thinkingRef.current = false;

      if (liveOpenRef.current || fromVoice) {
        speak(finalReply);
      }
    } catch {
      const fallback =
        "Gemini bağlantısında küçük bir takılma oldu kanka. Ekran çalışıyor, bağlantıyı birazdan birlikte düzeltiriz.";

      addLyra(fallback);
      setIsThinking(false);
      thinkingRef.current = false;

      if (liveOpenRef.current || fromVoice) {
        speak(fallback);
      }
    }
  }

  function openLiveCall() {
    setLiveOpen(true);
    liveOpenRef.current = true;
    lastActivityRef.current = Date.now();

    const intro = "Canlı mod açıldı Merve. Seni dinliyorum.";
    addLyra(intro);

    setTimeout(() => {
      speak(intro);
    }, 250);
  }

  function closeLiveCall() {
    setLiveOpen(false);
    liveOpenRef.current = false;
    stopListening();

    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }

    setIsSpeaking(false);
    setInterimText("");
  }

  function handleAvatarError() {
    if (avatarIndex < avatarSources.length - 1) {
      setAvatarIndex((i) => i + 1);
    } else {
      setAvatarVisible(false);
    }
  }

  function handleBgError() {
    if (bgIndex < bgSources.length - 1) {
      setBgIndex((i) => i + 1);
    } else {
      setBgVisible(false);
    }
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
    <main className="lyra-main">
      <div className="main-bg" />
      <div className="main-shell">
        <header className="main-header">
          <div>
            <p className="eyebrow">LYRA CLEAN 2026</p>
            <h1>Lyra</h1>
            <span>{statusText}</span>
          </div>

          <button className="small-pill" onClick={openLiveCall}>
            Canlı Mod
          </button>
        </header>

        <section className="hero-card">
          <div className="hero-orb">
            {avatarVisible ? (
              <img
                src={avatarSources[avatarIndex]}
                alt="Lyra"
                onError={handleAvatarError}
              />
            ) : (
              <div className="orb-fallback">L</div>
            )}
          </div>

          <div className="hero-text">
            <p>Bugün ne yapıyoruz?</p>
            <h2>Yaz, konuş, fikir al.</h2>
          </div>
        </section>

        <section className="chat-card">
          <div className="chat-list">
            {messages.slice(-7).map((msg, index) => (
              <div
                key={`${msg.role}-${index}-${msg.text}`}
                className={msg.role === "user" ? "bubble user" : "bubble lyra"}
              >
                <b>{msg.role === "user" ? "Sen" : "Lyra"}</b>
                <span>{msg.text}</span>
              </div>
            ))}
          </div>

          <div className="input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Lyra'ya yaz..."
            />
            <button onClick={() => sendMessage()} disabled={isThinking}>
              Gönder
            </button>
          </div>
        </section>

        <section className="quick-actions">
          <button onClick={openLiveCall}>
            <span>🎙️</span>
            <b>Canlı Konuşma</b>
            <small>Tam ekran görüntülü mod</small>
          </button>

          <button>
            <span>📄</span>
            <b>PDF Özet</b>
            <small>Dosya alanı</small>
          </button>

          <button>
            <span>✨</span>
            <b>İçerik Fikri</b>
            <small>Hook ve metin</small>
          </button>
        </section>
      </div>

      {liveOpen && (
        <section className="live-overlay">
          <div className="live-art-bg" />

          {bgVisible && (
            <img
              className="live-bg-photo"
              src={bgSources[bgIndex]}
              alt=""
              onError={handleBgError}
            />
          )}

          <div className="live-shade" />

          <header className="live-header">
            <button className="live-back" onClick={closeLiveCall}>
              ‹
            </button>

            <div className="live-title">
              <h2>Lyra</h2>
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
                "live-avatar-glow",
                isListening ? "listen" : "",
                isSpeaking ? "speak" : "",
              ].join(" ")}
            />

            {avatarVisible ? (
              <img
                className={[
                  "live-avatar",
                  isSpeaking ? "talking" : "",
                  isListening ? "listening" : "",
                ].join(" ")}
                src={avatarSources[avatarIndex]}
                alt="Lyra avatar"
                onError={handleAvatarError}
              />
            ) : (
              <div
                className={[
                  "live-avatar",
                  "fallback-live-avatar",
                  isSpeaking ? "talking" : "",
                ].join(" ")}
              >
                <span>Lyra</span>
              </div>
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
              className="live-main-btn"
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else {
                  startListening();
                }
              }}
            >
              <span>{isListening ? "🎙️" : "🎤"}</span>
              <small>{isListening ? "Dinliyor" : "Konuş"}</small>
            </button>

            <button onClick={() => setAutoNudge((v) => !v)}>
              <span>{autoNudge ? "✦" : "○"}</span>
              <small>Seslen</small>
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
          min-height: 100%;
          background: #f5f2ee;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .lyra-main {
          position: relative;
          min-height: 100dvh;
          overflow: hidden;
          color: #191713;
          background: #f5f2ee;
        }

        .main-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 10%, rgba(255, 255, 255, 0.95), transparent 28%),
            radial-gradient(circle at 88% 22%, rgba(213, 207, 198, 0.75), transparent 28%),
            radial-gradient(circle at 50% 100%, rgba(230, 224, 216, 0.96), transparent 45%),
            linear-gradient(135deg, #fffdfb, #ebe6df);
        }

        .main-shell {
          position: relative;
          z-index: 2;
          width: min(980px, calc(100vw - 28px));
          margin: 0 auto;
          padding: 24px 0 28px;
        }

        .main-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .eyebrow {
          margin: 0 0 5px;
          color: #9b9287;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.18em;
        }

        .main-header h1 {
          margin: 0;
          font-size: clamp(38px, 7vw, 72px);
          letter-spacing: -0.07em;
          line-height: 0.92;
          color: #1d1a17;
        }

        .main-header span {
          display: inline-block;
          margin-top: 8px;
          color: #8b8379;
          font-weight: 650;
        }

        .small-pill {
          border: 0;
          padding: 13px 18px;
          border-radius: 999px;
          color: #24201c;
          background: rgba(255, 255, 255, 0.76);
          box-shadow:
            0 18px 60px rgba(61, 53, 43, 0.12),
            inset 0 0 0 1px rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(18px);
          font-weight: 800;
        }

        .hero-card {
          min-height: 260px;
          border-radius: 36px;
          padding: 24px;
          display: grid;
          grid-template-columns: minmax(160px, 260px) 1fr;
          align-items: center;
          gap: 24px;
          background: rgba(255, 255, 255, 0.68);
          border: 1px solid rgba(255, 255, 255, 0.88);
          box-shadow: 0 28px 90px rgba(65, 56, 46, 0.12);
          backdrop-filter: blur(22px);
        }

        .hero-orb {
          position: relative;
          width: min(240px, 52vw);
          aspect-ratio: 1;
          margin: 0 auto;
          border-radius: 999px;
          display: grid;
          place-items: center;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 30%, #ffffff, transparent 38%),
            linear-gradient(145deg, #f8f5ef, #cfc8bd);
          box-shadow:
            0 24px 70px rgba(70, 61, 50, 0.16),
            inset 0 0 0 1px rgba(255, 255, 255, 0.9);
        }

        .hero-orb::after {
          content: "";
          position: absolute;
          inset: 10px;
          border-radius: inherit;
          border: 1px solid rgba(255, 255, 255, 0.72);
        }

        .hero-orb img {
          position: relative;
          z-index: 2;
          width: 112%;
          height: 112%;
          object-fit: cover;
          object-position: center top;
        }

        .orb-fallback {
          width: 86px;
          height: 86px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #1f1b17;
          color: white;
          font-size: 42px;
          font-weight: 900;
        }

        .hero-text p {
          margin: 0 0 8px;
          color: #92887d;
          font-weight: 750;
          font-size: 18px;
        }

        .hero-text h2 {
          margin: 0;
          font-size: clamp(32px, 6vw, 64px);
          line-height: 0.96;
          letter-spacing: -0.07em;
          color: #211e1a;
        }

        .chat-card {
          margin-top: 14px;
          border-radius: 32px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.66);
          border: 1px solid rgba(255, 255, 255, 0.88);
          box-shadow: 0 26px 80px rgba(65, 56, 46, 0.1);
          backdrop-filter: blur(20px);
        }

        .chat-list {
          max-height: 280px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 4px 3px 14px;
          scrollbar-width: none;
        }

        .chat-list::-webkit-scrollbar {
          display: none;
        }

        .bubble {
          max-width: 84%;
          padding: 12px 14px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .bubble b {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.55;
        }

        .bubble span {
          font-size: 15px;
          line-height: 1.38;
        }

        .bubble.lyra {
          align-self: flex-start;
          background: rgba(246, 243, 238, 0.9);
          color: #1d1915;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.65);
        }

        .bubble.user {
          align-self: flex-end;
          background: linear-gradient(145deg, #ffffff, #ddd6cd);
          color: #171411;
          box-shadow: 0 16px 40px rgba(65, 56, 46, 0.12);
        }

        .input-row {
          display: flex;
          gap: 10px;
        }

        .input-row input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          border-radius: 999px;
          padding: 15px 17px;
          color: #181511;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: inset 0 0 0 1px rgba(55, 48, 40, 0.08);
        }

        .input-row button {
          border: 0;
          border-radius: 999px;
          padding: 0 18px;
          color: white;
          background: #1f1b17;
          font-weight: 800;
        }

        .input-row button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .quick-actions {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .quick-actions button {
          min-height: 118px;
          border: 0;
          border-radius: 28px;
          padding: 16px;
          text-align: left;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.82);
          box-shadow: 0 22px 70px rgba(65, 56, 46, 0.1);
          color: #1d1915;
          backdrop-filter: blur(18px);
        }

        .quick-actions span {
          display: block;
          font-size: 24px;
          margin-bottom: 10px;
        }

        .quick-actions b {
          display: block;
          font-size: 17px;
          margin-bottom: 5px;
        }

        .quick-actions small {
          color: #8b8379;
          font-size: 13px;
        }

        .live-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          overflow: hidden;
          color: white;
          background: #120c08;
        }

        .live-bg-photo {
          position: absolute;
          inset: 0;
          z-index: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transform: scale(1.04);
          filter: saturate(1.08) contrast(1.05) blur(0.2px);
        }

        .live-art-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(circle at 18% 35%, rgba(255, 180, 82, 0.38), transparent 18%),
            radial-gradient(circle at 86% 48%, rgba(255, 195, 116, 0.24), transparent 22%),
            linear-gradient(90deg, #150d09, #5a3a25 48%, #100a08);
        }

        .live-art-bg::before {
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

        .live-art-bg::after {
          content: "";
          position: absolute;
          right: 8%;
          top: 34%;
          width: 125px;
          height: 330px;
          border-radius: 28px;
          background:
            radial-gradient(circle at 50% 25%, rgba(255, 205, 119, 0.95), transparent 13%),
            radial-gradient(circle at 50% 65%, rgba(255, 205, 119, 0.8), transparent 14%),
            rgba(255, 255, 255, 0.05);
          opacity: 0.62;
        }

        .live-shade {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(to bottom, rgba(0, 0, 0, 0.2), transparent 28%, rgba(0, 0, 0, 0.78)),
            radial-gradient(circle at 50% 42%, transparent 25%, rgba(0, 0, 0, 0.56));
          pointer-events: none;
        }

        .live-header {
          position: absolute;
          z-index: 5;
          top: max(24px, env(safe-area-inset-top));
          left: 22px;
          right: 22px;
          display: grid;
          grid-template-columns: 54px 1fr 86px;
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
          font-size: 34px;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .live-title p {
          margin: 7px 0 0;
          color: rgba(255, 255, 255, 0.78);
          font-size: 15px;
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
          font-weight: 800;
          font-size: 13px;
          backdrop-filter: blur(18px);
        }

        .live-pill span {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #72ff9c;
          box-shadow: 0 0 0 0 rgba(114, 255, 156, 0.6);
          animation: livePulse 1.25s infinite;
        }

        .live-avatar-stage {
          position: absolute;
          z-index: 2;
          inset: 94px 0 190px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .live-avatar-glow {
          position: absolute;
          width: min(86vw, 560px);
          height: min(86vw, 560px);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255, 225, 181, 0.28), transparent 68%);
          filter: blur(10px);
        }

        .live-avatar-glow.listen {
          background: radial-gradient(circle, rgba(178, 255, 225, 0.25), transparent 68%);
        }

        .live-avatar-glow.speak {
          animation: liveGlow 1.1s ease-in-out infinite;
        }

        .live-avatar {
          position: relative;
          z-index: 2;
          width: min(88vw, 500px);
          max-height: 78dvh;
          object-fit: contain;
          object-position: center bottom;
          filter: drop-shadow(0 32px 70px rgba(0, 0, 0, 0.55));
          transform-origin: center bottom;
          animation: liveIdle 5s ease-in-out infinite;
        }

        .live-avatar.talking {
          animation: liveTalking 0.95s ease-in-out infinite;
        }

        .live-avatar.listening {
          filter:
            drop-shadow(0 32px 70px rgba(0, 0, 0, 0.55))
            drop-shadow(0 0 20px rgba(168, 85, 247, 0.26));
        }

        .fallback-live-avatar {
          width: min(78vw, 430px);
          aspect-ratio: 0.72;
          border-radius: 46% 46% 28% 28%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 50% 24%, #ffe4c7, #e5b18d 30%, #111 31%, #050505 80%);
        }

        .fallback-live-avatar span {
          width: 150px;
          height: 150px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: linear-gradient(145deg, #ffe4c7, #e5b18d);
          color: #2b1c14;
          font-size: 30px;
          font-weight: 900;
          margin-top: -180px;
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
          font-weight: 700;
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

        .live-main-btn span {
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

        @media (max-width: 720px) {
          .main-shell {
            width: calc(100vw - 22px);
            padding-top: 16px;
          }

          .hero-card {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 14px;
            padding: 20px;
          }

          .quick-actions {
            grid-template-columns: 1fr;
          }

          .chat-list {
            max-height: 250px;
          }
        }

        @media (max-width: 430px) {
          .main-header {
            align-items: flex-start;
          }

          .small-pill {
            padding: 12px 15px;
          }

          .hero-orb {
            width: min(220px, 70vw);
          }

          .input-row {
            gap: 8px;
          }

          .input-row input {
            padding: 14px;
          }

          .input-row button {
            padding: 0 15px;
          }

          .live-header {
            left: 16px;
            right: 16px;
            grid-template-columns: 48px 1fr 76px;
          }

          .live-back {
            width: 46px;
            height: 46px;
          }

          .live-title h2 {
            font-size: 30px;
          }

          .live-pill {
            height: 34px;
            font-size: 12px;
          }

          .live-avatar-stage {
            inset: 86px 0 180px;
          }

          .live-avatar {
            width: min(96vw, 450px);
            max-height: 76dvh;
          }

          .live-caption {
            bottom: 238px;
            width: calc(100vw - 34px);
          }

          .live-caption p {
            font-size: 19px;
          }

          .live-wave-box {
            bottom: 162px;
          }

          .live-controls {
            padding: 0 24px;
          }

          .live-controls span {
            width: 62px;
            height: 62px;
          }

          .live-main-btn span {
            width: 78px;
            height: 78px;
          }
        }

        @media (max-height: 760px) {
          .live-avatar-stage {
            inset: 76px 0 150px;
          }

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

          .live-main-btn span {
            width: 72px;
            height: 72px;
          }
        }
      `}</style>
    </main>
  );
}
