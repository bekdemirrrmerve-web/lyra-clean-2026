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
      text: "Merhaba Merve 💜 Buradayım, konuşmaya hazırım.",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [interimText, setInterimText] = useState("");

  const [avatarIndex, setAvatarIndex] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);
  const [avatarVisible, setAvatarVisible] = useState(true);
  const [bgVisible, setBgVisible] = useState(true);

  const recognitionRef = useRef<any>(null);
  const liveRef = useRef(false);
  const speakingRef = useRef(false);
  const thinkingRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const lastNudgeRef = useRef(0);

  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    liveRef.current = isLive;
  }, [isLive]);

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
    setMessages((prev) => [...prev, { role: "user", text }].slice(-14));
  }

  function addLyra(text: string) {
    setMessages((prev) => [...prev, { role: "lyra", text }].slice(-14));
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
      addLyra(
        "Bu tarayıcı mikrofonla konuşmayı desteklemiyor kanka. Chrome’dan dene."
      );
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
        sendMessage(clean);
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

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

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

      if (liveRef.current) {
        startListening();
      }
    }
  }

  async function askGemini(text: string) {
    const history = messages.slice(-8).map((m) => ({
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

  async function sendMessage(value?: string) {
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

      speak(finalReply);
    } catch {
      const fallback =
        "Gemini bağlantısında küçük bir takılma oldu kanka. Ekran çalışıyor, bağlantıyı birazdan birlikte düzeltiriz.";

      addLyra(fallback);
      setIsThinking(false);
      thinkingRef.current = false;
      speak(fallback);
    }
  }

  function toggleLive() {
    if (typeof window === "undefined") return;

    if (isLive) {
      setIsLive(false);
      liveRef.current = false;
      stopListening();
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsLive(true);
    liveRef.current = true;
    lastActivityRef.current = Date.now();

    const intro = "Canlı mod açıldı Merve. Seni dinliyorum.";
    addLyra(intro);
    speak(intro);
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
    : isLive
    ? "Hazır"
    : "Canlı değil";

  const captionText = interimText
    ? interimText
    : isThinking
    ? "Düşünüyorum..."
    : lastMessage?.text || "Buradayım.";

  return (
    <main className="screen">
      <div className="room-art" />

      {bgVisible && (
        <img
          className="room-photo"
          src={bgSources[bgIndex]}
          alt=""
          onError={handleBgError}
        />
      )}

      <div className="dark-layer" />

      <div className="phone-status">
        <span>9:41</span>
        <div className="phone-icons">
          <span className="signal">▮▮▮</span>
          <span>⌁</span>
          <span className="battery" />
        </div>
      </div>

      <header className="top">
        <div className={isLive ? "live-pill on" : "live-pill"}>
          <span />
          {isLive ? "CANLI" : "HAZIR"}
        </div>

        <div className="title">
          <h1>
            Lyra <b>✦</b>
          </h1>
          <p>{statusText}</p>
        </div>

        <button className="menu-btn" aria-label="Menü">
          •••
        </button>
      </header>

      <section className="avatar-wrap">
        <div
          className={[
            "avatar-light",
            isListening ? "listening" : "",
            isSpeaking ? "speaking" : "",
          ].join(" ")}
        />

        {avatarVisible ? (
          <img
            className={[
              "avatar",
              isSpeaking ? "talking" : "",
              isListening ? "hearing" : "",
            ].join(" ")}
            src={avatarSources[avatarIndex]}
            alt="Lyra"
            onError={handleAvatarError}
          />
        ) : (
          <div
            className={[
              "avatar",
              "fallback-avatar",
              isSpeaking ? "talking" : "",
              isListening ? "hearing" : "",
            ].join(" ")}
          >
            <div className="fallback-face">
              <span>Lyra</span>
            </div>
          </div>
        )}
      </section>

      <aside className="side-controls">
        <button onClick={() => setVoiceOn((v) => !v)}>
          <span>{voiceOn ? "🔊" : "🔇"}</span>
          <small>Ses</small>
        </button>

        <button>
          <span>▣</span>
          <small>Kamera</small>
        </button>

        <button onClick={isListening ? stopListening : startListening}>
          <span>{isListening ? "🎙️" : "🎤"}</span>
          <small>{isListening ? "Dinliyor" : "Sessize al"}</small>
        </button>
      </aside>

      <section className="speech-card">
        <strong>{lastMessage?.role === "user" ? "Sen" : "Lyra"}</strong>
        <p>{captionText}</p>
      </section>

      <section className="wave-area">
        <div
          className={[
            "wave",
            isListening || isSpeaking || isThinking ? "active" : "",
          ].join(" ")}
        >
          <span />
          <i />
          <span />
          <i />
          <span />
          <i />
          <span />
          <i />
          <span />
        </div>

        <p>
          {isThinking
            ? "Düşünüyorum..."
            : isSpeaking
            ? "Cevap veriyorum..."
            : isListening
            ? "Dinliyorum..."
            : "Hazırım..."}
        </p>
      </section>

      {showChat && (
        <section className="chat-panel">
          <div className="chat-list">
            {messages.slice(-6).map((msg, index) => (
              <div
                key={`${msg.role}-${index}-${msg.text}`}
                className={msg.role === "user" ? "bubble user" : "bubble lyra"}
              >
                <b>{msg.role === "user" ? "Sen" : "Lyra"}</b>
                <span>{msg.text}</span>
              </div>
            ))}
          </div>

          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Lyra'ya yaz..."
            />

            <button onClick={() => sendMessage()}>Gönder</button>
          </div>
        </section>
      )}

      <footer className="bottom-controls">
        <button onClick={() => setShowChat((v) => !v)}>
          <span>💬</span>
          <small>Yazış</small>
        </button>

        <button
          className={isLive ? "end-btn live" : "end-btn"}
          onClick={toggleLive}
        >
          <span>{isLive ? "☎" : "▶"}</span>
          <small>{isLive ? "Bitir" : "Başlat"}</small>
        </button>

        <button>
          <span>✦</span>
          <small>Konular</small>
        </button>
      </footer>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: #100b08;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .screen {
          position: relative;
          width: 100vw;
          height: 100dvh;
          overflow: hidden;
          color: white;
          background: #120c08;
        }

        .room-photo {
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

        .room-art {
          position: absolute;
          inset: 0;
          z-index: 0;
          background: radial-gradient(
              circle at 18% 38%,
              rgba(255, 177, 76, 0.4),
              transparent 18%
            ),
            radial-gradient(
              circle at 86% 48%,
              rgba(255, 183, 96, 0.24),
              transparent 20%
            ),
            radial-gradient(
              circle at 72% 20%,
              rgba(255, 221, 174, 0.14),
              transparent 20%
            ),
            linear-gradient(
              90deg,
              rgba(26, 15, 10, 1),
              rgba(82, 56, 39, 0.7),
              rgba(16, 10, 8, 1)
            );
        }

        .room-art::before {
          content: "";
          position: absolute;
          left: -92px;
          top: 145px;
          width: 280px;
          height: 520px;
          border-radius: 999px;
          border: 18px solid rgba(255, 181, 82, 0.44);
          filter: blur(1px);
          opacity: 0.78;
        }

        .room-art::after {
          content: "";
          position: absolute;
          right: 40px;
          top: 345px;
          width: 132px;
          height: 340px;
          border-radius: 26px;
          background: radial-gradient(
              circle at 50% 25%,
              rgba(255, 202, 112, 0.92),
              transparent 12%
            ),
            radial-gradient(
              circle at 50% 65%,
              rgba(255, 202, 112, 0.82),
              transparent 13%
            ),
            linear-gradient(
              rgba(255, 255, 255, 0.08),
              rgba(255, 255, 255, 0.03)
            );
          border: 1px solid rgba(255, 255, 255, 0.08);
          filter: blur(0.4px);
          opacity: 0.68;
        }

        .dark-layer {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.24),
              transparent 24%,
              rgba(0, 0, 0, 0.28) 65%,
              rgba(0, 0, 0, 0.82)
            ),
            radial-gradient(
              circle at 50% 42%,
              transparent 26%,
              rgba(0, 0, 0, 0.16) 58%,
              rgba(0, 0, 0, 0.7)
            );
          pointer-events: none;
        }

        .phone-status {
          position: absolute;
          z-index: 10;
          top: max(18px, env(safe-area-inset-top));
          left: 34px;
          right: 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.03em;
          text-shadow: 0 6px 18px rgba(0, 0, 0, 0.36);
        }

        .phone-icons {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
        }

        .signal {
          font-size: 15px;
          letter-spacing: -4px;
          transform: translateY(1px);
        }

        .battery {
          width: 30px;
          height: 15px;
          border: 2px solid rgba(255, 255, 255, 0.92);
          border-radius: 4px;
          position: relative;
        }

        .battery::before {
          content: "";
          position: absolute;
          right: -5px;
          top: 3px;
          width: 3px;
          height: 7px;
          border-radius: 0 2px 2px 0;
          background: rgba(255, 255, 255, 0.92);
        }

        .battery::after {
          content: "";
          position: absolute;
          inset: 2px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.92);
        }

        .top {
          position: absolute;
          z-index: 10;
          top: max(78px, calc(env(safe-area-inset-top) + 60px));
          left: 32px;
          right: 32px;
          display: grid;
          grid-template-columns: 120px 1fr 62px;
          align-items: start;
        }

        .live-pill {
          justify-self: start;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 38px;
          padding: 0 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.8);
          font-weight: 800;
          font-size: 15px;
          backdrop-filter: blur(18px);
        }

        .live-pill span {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.46);
        }

        .live-pill.on {
          color: #5eff92;
          background: rgba(67, 120, 64, 0.35);
        }

        .live-pill.on span {
          background: #5eff92;
          box-shadow: 0 0 0 0 rgba(94, 255, 146, 0.55);
          animation: greenPulse 1.3s infinite;
        }

        .title {
          justify-self: center;
          text-align: center;
          margin-top: -6px;
        }

        .title h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 800;
          text-shadow: 0 10px 26px rgba(0, 0, 0, 0.34);
        }

        .title h1 b {
          color: #a855ff;
          font-weight: 900;
        }

        .title p {
          margin: 9px 0 0;
          color: rgba(255, 255, 255, 0.76);
          font-size: 18px;
          text-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .menu-btn {
          justify-self: end;
          width: 58px;
          height: 58px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.13);
          color: white;
          font-size: 24px;
          letter-spacing: 2px;
          backdrop-filter: blur(18px);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
        }

        .avatar-wrap {
          position: absolute;
          z-index: 3;
          inset: 160px 0 190px;
          display: flex;
          justify-content: center;
          align-items: center;
          pointer-events: none;
        }

        .avatar-light {
          position: absolute;
          width: min(88vw, 560px);
          height: min(88vw, 560px);
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(255, 222, 177, 0.25),
            transparent 68%
          );
          filter: blur(8px);
          opacity: 0.84;
          transform: translateY(-16px);
        }

        .avatar-light.listening {
          background: radial-gradient(
            circle,
            rgba(173, 255, 221, 0.24),
            transparent 68%
          );
        }

        .avatar-light.speaking {
          animation: avatarGlow 1.1s ease-in-out infinite;
        }

        .avatar {
          position: relative;
          z-index: 3;
          width: min(84vw, 520px);
          height: auto;
          max-height: 78dvh;
          object-fit: contain;
          object-position: center bottom;
          filter: drop-shadow(0 30px 70px rgba(0, 0, 0, 0.5))
            saturate(1.04) contrast(1.02);
          transform-origin: center bottom;
          animation: idleMove 6s ease-in-out infinite;
        }

        .avatar.talking {
          animation: talkingMove 1.05s ease-in-out infinite;
        }

        .avatar.hearing {
          filter: drop-shadow(0 30px 70px rgba(0, 0, 0, 0.5))
            drop-shadow(0 0 22px rgba(178, 111, 255, 0.22)) saturate(1.04)
            contrast(1.02);
        }

        .fallback-avatar {
          width: min(78vw, 430px);
          aspect-ratio: 0.72;
          display: grid;
          place-items: center;
          border-radius: 46% 46% 28% 28%;
          background: radial-gradient(
            circle at 50% 24%,
            rgba(255, 228, 200, 1),
            rgba(225, 178, 140, 0.9) 32%,
            rgba(20, 20, 20, 1) 33%,
            rgba(8, 8, 8, 1) 80%
          );
        }

        .fallback-face {
          width: 160px;
          height: 160px;
          border-radius: 999px;
          background: linear-gradient(145deg, #ffe4c7, #e5b18d);
          display: grid;
          place-items: center;
          color: #332117;
          font-weight: 900;
          font-size: 28px;
          margin-top: -180px;
        }

        .side-controls {
          position: absolute;
          z-index: 11;
          right: 24px;
          top: 228px;
          width: 80px;
          padding: 14px 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
          border-radius: 38px;
          background: rgba(18, 12, 9, 0.52);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(22px);
          box-shadow: 0 26px 80px rgba(0, 0, 0, 0.28);
        }

        .side-controls button {
          height: 82px;
          border: 0;
          background: transparent;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
        }

        .side-controls span {
          font-size: 26px;
          line-height: 1;
        }

        .side-controls small {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.86);
        }

        .speech-card {
          position: absolute;
          z-index: 12;
          left: 50%;
          bottom: 260px;
          width: min(560px, calc(100vw - 48px));
          transform: translateX(-50%);
          padding: 20px 24px;
          border-radius: 26px;
          background: rgba(18, 12, 9, 0.64);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(22px);
          box-shadow: 0 22px 80px rgba(0, 0, 0, 0.34);
        }

        .speech-card strong {
          display: block;
          margin-bottom: 8px;
          color: #b45cff;
          font-size: 18px;
        }

        .speech-card p {
          margin: 0;
          color: rgba(255, 255, 255, 0.94);
          font-size: 22px;
          line-height: 1.34;
          letter-spacing: -0.02em;
        }

        .wave-area {
          position: absolute;
          z-index: 12;
          left: 50%;
          bottom: 180px;
          transform: translateX(-50%);
          text-align: center;
          width: min(520px, calc(100vw - 50px));
        }

        .wave {
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          filter: drop-shadow(0 0 16px rgba(158, 78, 255, 0.88));
        }

        .wave span,
        .wave i {
          display: block;
          width: 7px;
          border-radius: 999px;
          background: rgba(185, 112, 255, 0.96);
        }

        .wave i {
          width: 5px;
          height: 5px;
          opacity: 0.72;
        }

        .wave span:nth-child(1) {
          height: 8px;
        }

        .wave span:nth-child(3) {
          height: 34px;
        }

        .wave span:nth-child(5) {
          height: 56px;
        }

        .wave span:nth-child(7) {
          height: 30px;
        }

        .wave span:nth-child(9) {
          height: 26px;
        }

        .wave.active span {
          animation: waveDance 0.86s ease-in-out infinite;
        }

        .wave.active span:nth-child(3) {
          animation-delay: 0.08s;
        }

        .wave.active span:nth-child(5) {
          animation-delay: 0.16s;
        }

        .wave.active span:nth-child(7) {
          animation-delay: 0.24s;
        }

        .wave.active span:nth-child(9) {
          animation-delay: 0.32s;
        }

        .wave-area p {
          margin: 5px 0 0;
          color: #b45cff;
          font-size: 18px;
          font-weight: 700;
          text-shadow: 0 0 20px rgba(180, 92, 255, 0.7);
        }

        .bottom-controls {
          position: absolute;
          z-index: 13;
          left: 0;
          right: 0;
          bottom: max(22px, env(safe-area-inset-bottom));
          display: flex;
          align-items: end;
          justify-content: space-around;
          padding: 0 42px;
        }

        .bottom-controls button {
          border: 0;
          background: transparent;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .bottom-controls button > span {
          width: 74px;
          height: 74px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.13);
          backdrop-filter: blur(20px);
          font-size: 28px;
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.28);
        }

        .bottom-controls small {
          font-size: 17px;
          color: rgba(255, 255, 255, 0.9);
        }

        .bottom-controls .end-btn > span {
          width: 86px;
          height: 86px;
          background: #ff443b;
          color: white;
          font-size: 34px;
          box-shadow: 0 18px 70px rgba(255, 68, 59, 0.34);
        }

        .bottom-controls .end-btn:not(.live) > span {
          background: linear-gradient(145deg, #9e4eff, #6d2cff);
          box-shadow: 0 18px 70px rgba(158, 78, 255, 0.36);
        }

        .chat-panel {
          position: absolute;
          z-index: 20;
          left: 16px;
          right: 16px;
          bottom: 128px;
          padding: 12px;
          border-radius: 26px;
          background: rgba(15, 10, 8, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(22px);
          box-shadow: 0 28px 100px rgba(0, 0, 0, 0.45);
        }

        .chat-list {
          max-height: 210px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 4px 2px 12px;
          scrollbar-width: none;
        }

        .chat-list::-webkit-scrollbar {
          display: none;
        }

        .bubble {
          max-width: 84%;
          padding: 10px 12px;
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .bubble b {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.62;
        }

        .bubble span {
          font-size: 14px;
          line-height: 1.34;
        }

        .bubble.lyra {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.86);
          color: #17110e;
        }

        .bubble.user {
          align-self: flex-end;
          background: rgba(196, 120, 255, 0.9);
          color: white;
        }

        .chat-input {
          display: flex;
          gap: 8px;
        }

        .chat-input input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          border-radius: 999px;
          padding: 13px 15px;
          background: rgba(255, 255, 255, 0.9);
          color: #16110e;
        }

        .chat-input button {
          border: 0;
          border-radius: 999px;
          padding: 0 16px;
          background: #a855ff;
          color: white;
          font-weight: 800;
        }

        @keyframes greenPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(94, 255, 146, 0.55);
          }

          80% {
            box-shadow: 0 0 0 12px rgba(94, 255, 146, 0);
          }

          100% {
            box-shadow: 0 0 0 0 rgba(94, 255, 146, 0);
          }
        }

        @keyframes idleMove {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }

          50% {
            transform: translateY(-5px) scale(1.006);
          }
        }

        @keyframes talkingMove {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }

          45% {
            transform: translateY(-4px) scale(1.012);
          }
        }

        @keyframes avatarGlow {
          0%,
          100% {
            transform: translateY(-16px) scale(1);
            opacity: 0.75;
          }

          50% {
            transform: translateY(-16px) scale(1.06);
            opacity: 1;
          }
        }

        @keyframes waveDance {
          0%,
          100% {
            transform: scaleY(0.55);
          }

          50% {
            transform: scaleY(1.15);
          }
        }

        @media (min-width: 760px) {
          .screen {
            max-width: 460px;
            margin: 0 auto;
            border-radius: 32px;
            height: min(100dvh, 960px);
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08),
              0 30px 100px rgba(0, 0, 0, 0.55);
          }

          body {
            display: grid;
            place-items: center;
          }
        }

        @media (max-width: 430px) {
          .phone-status {
            left: 26px;
            right: 26px;
            font-size: 20px;
          }

          .top {
            left: 20px;
            right: 20px;
            grid-template-columns: 102px 1fr 54px;
          }

          .live-pill {
            height: 34px;
            padding: 0 13px;
            font-size: 13px;
          }

          .title h1 {
            font-size: 30px;
          }

          .title p {
            font-size: 16px;
          }

          .menu-btn {
            width: 52px;
            height: 52px;
          }

          .avatar-wrap {
            inset: 150px 0 184px;
          }

          .avatar {
            width: min(92vw, 430px);
            max-height: 76dvh;
          }

          .side-controls {
            right: 12px;
            top: 220px;
            width: 70px;
          }

          .side-controls button {
            height: 74px;
          }

          .side-controls span {
            font-size: 22px;
          }

          .side-controls small {
            font-size: 12px;
          }

          .speech-card {
            bottom: 248px;
            width: calc(100vw - 42px);
            padding: 17px 19px;
          }

          .speech-card p {
            font-size: 20px;
          }

          .wave-area {
            bottom: 174px;
          }

          .bottom-controls {
            padding: 0 28px;
          }

          .bottom-controls button > span {
            width: 66px;
            height: 66px;
            font-size: 24px;
          }

          .bottom-controls .end-btn > span {
            width: 78px;
            height: 78px;
          }

          .bottom-controls small {
            font-size: 15px;
          }
        }

        @media (max-height: 760px) {
          .avatar-wrap {
            inset: 128px 0 154px;
          }

          .avatar {
            max-height: 70dvh;
          }

          .speech-card {
            bottom: 216px;
          }

          .wave-area {
            bottom: 146px;
          }

          .bottom-controls button > span {
            width: 62px;
            height: 62px;
          }

          .bottom-controls .end-btn > span {
            width: 72px;
            height: 72px;
          }
        }
      `}</style>
    </main>
  );
}
