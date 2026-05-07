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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "lyra",
      text: 'Harika! "Test" konusuyla sosyal medyayı sallayacak bir içerik paketi hazırlayalım hemen, kanka. Bak bakalım beğenecek misin:',
    },
    {
      role: "user",
      text: "nasılsın kanka",
    },
    {
      role: "lyra",
      text: "Selam kanka! Ben süperim, her zamanki gibi enerjiyim ve sana yardımcı olmak için hazırım. Senin nasıl geçti günün?",
    },
  ]);

  const [input, setInput] = useState("");
  const [liveOpen, setLiveOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [interimText, setInterimText] = useState("");
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [avatarVisible, setAvatarVisible] = useState(true);

  const recognitionRef = useRef<any>(null);
  const liveRef = useRef(false);
  const speakingRef = useRef(false);
  const thinkingRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const lastNudgeRef = useRef(0);

  const lastMessage = messages[messages.length - 1];

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
    const timer = setInterval(() => {
      if (!liveRef.current) return;
      if (speakingRef.current || thinkingRef.current) return;

      const now = Date.now();
      const idle = now - lastActivityRef.current;
      const nudgeGap = now - lastNudgeRef.current;

      if (idle > 24000 && nudgeGap > 35000) {
        const text = "Merve, buradayım. Devam etmek istersen seni dinliyorum.";
        lastNudgeRef.current = now;
        addLyra(text);
        speak(text);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function addUser(text: string) {
    setMessages((prev) => [...prev, { role: "user", text }].slice(-16));
  }

  function addLyra(text: string) {
    setMessages((prev) => [...prev, { role: "lyra", text }].slice(-16));
  }

  function handleAvatarError() {
    if (avatarIndex < avatarSources.length - 1) {
      setAvatarIndex((i) => i + 1);
    } else {
      setAvatarVisible(false);
    }
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
          if (liveRef.current && !speakingRef.current && !thinkingRef.current) {
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
      if (liveRef.current) startListening();
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

      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        if (liveRef.current) {
          setTimeout(() => startListening(), 450);
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        if (liveRef.current) {
          setTimeout(() => startListening(), 450);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
      if (liveRef.current) startListening();
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

      if (liveRef.current || fromVoice) {
        speak(finalReply);
      }
    } catch {
      const fallback =
        "Gemini bağlantısında küçük bir takılma oldu kanka. Ekran çalışıyor, bağlantıyı sonra birlikte düzeltiriz.";

      addLyra(fallback);
      setIsThinking(false);
      thinkingRef.current = false;

      if (liveRef.current || fromVoice) {
        speak(fallback);
      }
    }
  }

  function openLiveCall() {
    setLiveOpen(true);
    liveRef.current = true;
    lastActivityRef.current = Date.now();

    const intro = "Canlı mod açıldı Merve. Seni dinliyorum.";
    addLyra(intro);

    setTimeout(() => {
      speak(intro);
    }, 250);
  }

  function closeLiveCall() {
    setLiveOpen(false);
    liveRef.current = false;
    stopListening();
    window.speechSynthesis?.cancel();
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
      <div className="brand">
        <div className="brand-icon">✦</div>
        <h1>LYRA</h1>
      </div>

      <div className="layout">
        <aside className="sidebar">
          <h2>✦ LYRA</h2>

          {["＋ Yeni Sohbet", "▢ Sohbetler", "⌘ Modlar", "▤ Araçlar", "♢ Hatırlatıcılar", "⚙ Ayarlar"].map(
            (item) => (
              <button key={item}>{item}</button>
            )
          )}
        </aside>

        <section className="center-card">
          <div className="top-actions">
            <h2>LYRA AI ASİSTANINIZ</h2>

            <div className="mini-actions">
              <button>ⓘ Lyra Hakkında</button>
              <button>♢</button>
            </div>
          </div>

          <div className="avatar-card">
            {avatarVisible ? (
              <img
                src={avatarSources[avatarIndex]}
                alt="Lyra"
                onError={handleAvatarError}
              />
            ) : (
              <div className="avatar-fallback">Lyra</div>
            )}
          </div>

          <div className="mode-row">
            <button>≋ Ses: Gemini Live⌄</button>
            <button>♫ Sessize Al</button>
            <button>♙ Kadın</button>
            <button>♟ Erkek</button>
            <button onClick={openLiveCall}>≋ Canlı Konuşma</button>
          </div>

          <div className="chat-panel">
            <div className="messages">
              {messages.slice(-5).map((msg, index) => (
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
              placeholder="Araştırılacak konuyu yaz."
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

              <button className="send" onClick={() => sendMessage()}>
                ▶
              </button>
            </div>
          </div>
        </section>

        <aside className="phone-preview">
          <div className="phone-shell">
            <div className="phone-top">
              <button>☰</button>
              <h2>✦ LYRA</h2>
              <button>♢</button>
            </div>

            <div className="phone-avatar">
              {avatarVisible ? (
                <img
                  src={avatarSources[avatarIndex]}
                  alt="Lyra"
                  onError={handleAvatarError}
                />
              ) : (
                <div className="avatar-fallback">Lyra</div>
              )}
            </div>

            <div className="phone-grid">
              <button>≋ Ses: Gemini Live</button>
              <button>Sessize Al</button>
              <button>Kadın</button>
              <button>Erkek</button>
            </div>

            <button className="phone-live" onClick={openLiveCall}>
              ≋ Canlı Konuşma ›
            </button>

            <div className="phone-input">
              <span>Lyra’ya bir şey sor veya yaz...</span>
              <button>▶</button>
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
              <div className="live-avatar live-fallback">Lyra</div>
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
          min-height: 100%;
          background: #eef0f1;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #080b10;
        }

        button,
        textarea {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .page {
          min-height: 100dvh;
          position: relative;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 44% 35%, rgba(255, 255, 255, 0.98), transparent 28%),
            radial-gradient(circle at 55% 50%, rgba(216, 219, 222, 0.75), transparent 28%),
            linear-gradient(135deg, #ffffff, #e9ecee);
          padding: 28px 28px 40px;
        }

        .brand {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 22px;
        }

        .brand-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: #ffd4ce;
          font-size: 28px;
        }

        .brand h1 {
          margin: 0;
          font-size: 35px;
          letter-spacing: 0.18em;
          line-height: 1;
        }

        .layout {
          width: min(1680px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 240px minmax(560px, 1fr) 390px;
          gap: 24px;
          align-items: center;
        }

        .sidebar,
        .center-card,
        .phone-shell {
          background: rgba(255, 255, 255, 0.58);
          border: 1px solid rgba(188, 192, 197, 0.75);
          box-shadow:
            0 28px 80px rgba(73, 78, 86, 0.14),
            inset 0 0 0 1px rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(22px);
        }

        .sidebar {
          min-height: 560px;
          border-radius: 34px;
          padding: 28px 18px;
        }

        .sidebar h2 {
          margin: 0 0 24px;
          font-size: 29px;
          letter-spacing: 0.08em;
        }

        .sidebar button {
          width: 100%;
          height: 48px;
          border: 1px solid rgba(170, 176, 184, 0.75);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.48);
          margin-bottom: 13px;
          text-align: left;
          padding: 0 18px;
          font-weight: 800;
          color: #111318;
        }

        .center-card {
          position: relative;
          min-height: 630px;
          border-radius: 34px;
          padding: 34px 34px 28px;
        }

        .top-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .top-actions h2 {
          margin: 0;
          flex: 1;
          text-align: center;
          font-size: 31px;
          letter-spacing: 0.2em;
        }

        .mini-actions {
          display: flex;
          gap: 10px;
        }

        .mini-actions button {
          height: 36px;
          border-radius: 999px;
          border: 1px solid rgba(191, 196, 201, 0.8);
          background: rgba(255, 255, 255, 0.72);
          padding: 0 16px;
          font-weight: 800;
        }

        .avatar-card {
          width: 250px;
          height: 300px;
          margin: 26px auto 0;
          border-radius: 25px;
          overflow: hidden;
          background: #e9ecef;
          border: 1px solid rgba(173, 179, 186, 0.75);
          display: grid;
          place-items: center;
        }

        .avatar-card img,
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
          font-weight: 900;
          background: linear-gradient(145deg, #f4ede6, #cfc7bd);
        }

        .mode-row {
          margin: 0 auto;
          margin-top: -2px;
          position: relative;
          z-index: 3;
          display: grid;
          grid-template-columns: 1.2fr 1fr 0.75fr 0.75fr 1.2fr;
          gap: 12px;
          width: min(870px, 100%);
        }

        .mode-row button {
          height: 55px;
          border-radius: 18px;
          border: 1px solid rgba(190, 196, 202, 0.78);
          background: rgba(255, 255, 255, 0.76);
          box-shadow: 0 16px 36px rgba(74, 78, 84, 0.1);
          font-weight: 900;
        }

        .chat-panel {
          margin-top: 22px;
          border-radius: 28px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.58);
          border: 1px solid rgba(190, 196, 202, 0.78);
        }

        .messages {
          max-height: 150px;
          overflow-y: auto;
          padding-right: 6px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .msg {
          padding: 12px 14px;
          border-radius: 16px;
          font-weight: 750;
          line-height: 1.35;
          font-size: 14px;
        }

        .msg.lyra {
          align-self: flex-start;
          max-width: 86%;
          background: white;
          color: #111318;
          border: 1px solid rgba(214, 218, 222, 0.9);
        }

        .msg.user {
          align-self: flex-end;
          max-width: 55%;
          color: white;
          background: #0e1117;
        }

        textarea {
          width: 100%;
          min-height: 88px;
          margin-top: 14px;
          resize: none;
          border: 0;
          outline: 0;
          background: transparent;
          color: #15181f;
          font-size: 20px;
          font-weight: 850;
        }

        textarea::placeholder {
          color: #5d646d;
        }

        .chat-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .chat-bottom div {
          display: flex;
          gap: 10px;
        }

        .chat-bottom button {
          height: 42px;
          min-width: 42px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 10px 28px rgba(73, 78, 86, 0.12);
          font-weight: 900;
        }

        .chat-bottom .send {
          width: 48px;
          height: 48px;
        }

        .phone-preview {
          display: flex;
          justify-content: center;
        }

        .phone-shell {
          width: 365px;
          min-height: 620px;
          border-radius: 42px;
          padding: 30px 24px;
          border-width: 8px;
          border-color: rgba(183, 188, 194, 0.8);
        }

        .phone-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .phone-top button {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid #d4d7dc;
          background: white;
        }

        .phone-top h2 {
          margin: 0;
          font-size: 27px;
          letter-spacing: 0.12em;
        }

        .phone-avatar {
          width: 130px;
          height: 190px;
          overflow: hidden;
          border-radius: 22px;
          margin: 26px auto 10px;
          border: 1px solid rgba(190, 196, 202, 0.8);
        }

        .phone-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .phone-grid button,
        .phone-live,
        .phone-input {
          min-height: 48px;
          border-radius: 15px;
          border: 1px solid rgba(190, 196, 202, 0.78);
          background: rgba(255, 255, 255, 0.75);
          font-weight: 900;
        }

        .phone-live {
          width: 100%;
          margin-top: 10px;
        }

        .phone-input {
          margin-top: 14px;
          padding: 0 10px 0 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }

        .phone-input button {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid #d4d7dc;
          background: white;
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
          background:
            radial-gradient(circle at 18% 35%, rgba(255, 180, 82, 0.38), transparent 18%),
            radial-gradient(circle at 86% 48%, rgba(255, 195, 116, 0.24), transparent 22%),
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
          background:
            radial-gradient(circle at 50% 25%, rgba(255, 205, 119, 0.95), transparent 13%),
            radial-gradient(circle at 50% 65%, rgba(255, 205, 119, 0.8), transparent 14%),
            rgba(255, 255, 255, 0.05);
          opacity: 0.62;
        }

        .live-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to bottom, rgba(0, 0, 0, 0.18), transparent 28%, rgba(0, 0, 0, 0.78)),
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
          background: radial-gradient(circle, rgba(255, 225, 181, 0.28), transparent 68%);
          filter: blur(10px);
        }

        .live-glow.listen {
          background: radial-gradient(circle, rgba(178, 255, 225, 0.25), transparent 68%);
        }

        .live-glow.speak {
          animation: liveGlow 1.1s ease-in-out infinite;
        }

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

        .live-avatar.talking {
          animation: liveTalking 0.95s ease-in-out infinite;
        }

        .live-avatar.listening {
          filter:
            drop-shadow(0 32px 70px rgba(0, 0, 0, 0.55))
            drop-shadow(0 0 22px rgba(168, 85, 247, 0.3));
        }

        .live-fallback {
          width: min(80vw, 430px);
          aspect-ratio: 0.74;
          display: grid;
          place-items: center;
          border-radius: 44% 44% 28% 28%;
          background: linear-gradient(145deg, #f4ddc5, #111);
          font-size: 40px;
          font-weight: 900;
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

        @media (max-width: 1250px) {
          .layout {
            grid-template-columns: 220px minmax(520px, 1fr);
          }

          .phone-preview {
            display: none;
          }
        }

        @media (max-width: 850px) {
          .page {
            padding: 18px 12px 28px;
          }

          .layout {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: none;
          }

          .center-card {
            padding: 22px 14px;
          }

          .top-actions {
            flex-direction: column;
          }

          .top-actions h2 {
            font-size: 22px;
          }

          .avatar-card {
            width: 170px;
            height: 230px;
          }

          .mode-row {
            grid-template-columns: 1fr 1fr;
          }

          .mode-row button:last-child {
            grid-column: 1 / -1;
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

          .live-main span {
            width: 72px;
            height: 72px;
          }
        }
      `}</style>
    </main>
  );
}
