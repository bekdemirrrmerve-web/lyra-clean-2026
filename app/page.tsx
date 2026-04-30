"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Message = {
  role: "user" | "lyra";
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
  onerror: ((event: unknown) => void) | null;
  onresult: ((event: any) => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

const avatars = [
  "/ChatGPT Image 28 Nis 2026 23_23_18.png",
  "/ChatGPT Image 28 Nis 2026 23_24_10.png",
  "/ChatGPT Image 28 Nis 2026 23_24_16.png",
  "/ChatGPT Image 28 Nis 2026 23_24_28.png",
  "/ChatGPT Image 28 Nis 2026 23_24_34.png",
  "/ChatGPT Image 28 Nis 2026 23_24_39.png",
  "/ChatGPT Image 28 Nis 2026 23_25_00.png",
  "/ChatGPT Image 28 Nis 2026 23_25_08.png",
  "/ChatGPT Image 28 Nis 2026 23_25_27.png",
  "/ChatGPT Image 28 Nis 2026 23_25_34.png",
];

export default function LyraPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "lyra",
      text: "Ben buradayım Merve. Artık daha beyaz, mistik, gerçekçi ve sesli Lyra modundayım.",
    },
  ]);

  const [input, setInput] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    const savedAvatar = localStorage.getItem("lyra_avatar");
    const savedVoice = localStorage.getItem("lyra_voice");

    if (savedAvatar) setSelectedAvatar(savedAvatar);
    if (savedVoice) setSelectedVoiceURI(savedVoice);

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("lyra_avatar", selectedAvatar);
  }, [selectedAvatar]);

  useEffect(() => {
    if (selectedVoiceURI) {
      localStorage.setItem("lyra_voice", selectedVoiceURI);
    }
  }, [selectedVoiceURI]);

  const bestVoice = useMemo(() => {
    if (!voices.length) return null;

    const selected = voices.find((voice) => voice.voiceURI === selectedVoiceURI);
    if (selected) return selected;

    const hints = [
      "tr",
      "turkish",
      "türkçe",
      "female",
      "woman",
      "zira",
      "seda",
      "google",
      "microsoft",
      "enhanced",
    ];

    return (
      voices.find(
        (voice) =>
          voice.lang.toLowerCase().startsWith("tr") &&
          hints.some((hint) =>
            `${voice.name} ${voice.lang}`.toLowerCase().includes(hint)
          )
      ) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("tr")) ||
      voices.find((voice) =>
        hints.some((hint) =>
          `${voice.name} ${voice.lang}`.toLowerCase().includes(hint)
        )
      ) ||
      voices[0]
    );
  }, [voices, selectedVoiceURI]);

  function speak(text: string) {
    setError("");

    if (!("speechSynthesis" in window)) {
      setError("Bu tarayıcı sesli konuşmayı desteklemiyor.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = bestVoice;
    utterance.lang = bestVoice?.lang || "tr-TR";
    utterance.rate = 0.94;
    utterance.pitch = 1.08;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setError("Ses başlamadıysa ekrana bir kez tıklayıp tekrar dene kankam.");
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  async function sendMessage(forcedText?: string) {
    const text = (forcedText || input).trim();
    if (!text) return;

    setInput("");
    setError("");

    const userMessage: Message = { role: "user", text };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);

    let reply =
      "Seni duydum kankam. Şu an ücretsiz tarayıcı sesiyle konuşuyorum. Tasarımım da artık bizim istediğimiz beyaz mistik Lyra havasına geçti.";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (response.ok) {
        const data = await response.json();
        reply =
          data.reply ||
          data.text ||
          data.message ||
          data.content ||
          reply;
      }
    } catch {
      reply =
        "Şu an sunucu tarafı cevap vermedi ama panik yok. Benim arayüzüm, avatarım ve ücretsiz ses sistemim çalışıyor.";
    }

    const lyraMessage: Message = { role: "lyra", text: reply };

    setMessages((prev) => [...prev, lyraMessage]);
    speak(reply);
  }

  function startListening() {
    setError("");
    stopSpeaking();

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setError("Ses tanıma bu tarayıcıda yok. Chrome veya Edge ile dene.");
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;

    recognition.lang = "tr-TR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onerror = () => {
      setIsListening(false);
      setError("Mikrofon çalışmadı. Tarayıcı mikrofon iznini kontrol et.");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setInput(transcript);
      sendMessage(transcript);
    };

    recognition.start();
  }

  return (
    <main className="lyraPage">
      <div className="glow glowOne" />
      <div className="glow glowTwo" />
      <div className="sparkle sparkleOne">✦</div>
      <div className="sparkle sparkleTwo">❧</div>
      <div className="sparkle sparkleThree">✧</div>

      <header className="topbar">
        <div>
          <p className="eyebrow">LYRA CLEAN 2026</p>
          <h1>Lyra</h1>
          <p className="subtitle">
            Gerçekçi avatarlı, beyaz mistik, ücretsiz sesli asistan.
          </p>
        </div>

        <div className="status">
          <span className={isSpeaking || isListening ? "dot active" : "dot"} />
          {isSpeaking ? "Konuşuyor" : isListening ? "Dinliyor" : "Hazır"}
        </div>
      </header>

      <section className="layout">
        <aside className="avatarPanel">
          <div className="avatarStage">
            <div className="halo" />
            <img
              src={selectedAvatar}
              alt="Lyra avatar"
              className={isSpeaking ? "avatar speaking" : "avatar"}
            />
          </div>

          <div className="avatarText">
            <p className="eyebrow">AVATAR MODU</p>
            <h2>Hayal ettiğimiz Lyra’ya yaklaşıyoruz.</h2>
            <p>
              Avatarını aşağıdan değiştir. Konuşurken hafif canlılık efekti
              verir, arayüz beyaz ve mistik kalır.
            </p>
          </div>

          <div className="avatarGrid">
            {avatars.map((avatar, index) => (
              <button
                key={avatar}
                className={
                  selectedAvatar === avatar
                    ? "avatarOption selected"
                    : "avatarOption"
                }
                onClick={() => setSelectedAvatar(avatar)}
              >
                <img src={avatar} alt={`Avatar ${index + 1}`} />
              </button>
            ))}
          </div>
        </aside>

        <section className="chatPanel">
          <div className="chatHeader">
            <div>
              <p className="eyebrow">SOHBET</p>
              <h2>Lyra ile konuş</h2>
            </div>

            <button className="ghostButton" onClick={() => speak("Ben buradayım Merve. Ses sistemim ücretsiz tarayıcı sesinden geliyor.")}>
              Sesi dene
            </button>
          </div>

          <div className="messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "lyra"
                    ? "message lyraMessage"
                    : "message userMessage"
                }
              >
                <strong>{message.role === "lyra" ? "Lyra" : "Sen"}</strong>
                <p>{message.text}</p>
              </div>
            ))}
          </div>

          {error && <div className="error">{error}</div>}

          <div className="inputArea">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendMessage();
              }}
              placeholder="Lyra’ya yaz veya seslen..."
            />

            <button onClick={() => sendMessage()} className="sendButton">
              Gönder
            </button>

            <button onClick={startListening} className="micButton">
              {isListening ? "Dinliyorum" : "Seslen"}
            </button>
          </div>

          <div className="settings">
            <label>
              Ses seç
              <select
                value={selectedVoiceURI}
                onChange={(event) => setSelectedVoiceURI(event.target.value)}
              >
                <option value="">Otomatik en iyi ses</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} / {voice.lang}
                  </option>
                ))}
              </select>
            </label>

            <button onClick={stopSpeaking} className="stopButton">
              Sesi durdur
            </button>
          </div>
        </section>
      </section>

      <section className="dock">
        <div>PDF Özet</div>
        <div>Araştırma</div>
        <div>Kimya Lab</div>
        <div>Astroloji</div>
        <div>Not Defteri</div>
        <div>Görsel</div>
      </section>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background: #fffaf1;
          color: #2f261d;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          border: 0;
          cursor: pointer;
        }

        .lyraPage {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          padding: 28px;
          background:
            radial-gradient(circle at 12% 10%, rgba(255, 219, 151, 0.88), transparent 28%),
            radial-gradient(circle at 92% 12%, rgba(195, 228, 180, 0.7), transparent 26%),
            linear-gradient(135deg, #fffdf8 0%, #fff5df 46%, #f7fff0 100%);
        }

        .glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(18px);
          pointer-events: none;
        }

        .glowOne {
          width: 330px;
          height: 330px;
          left: -90px;
          bottom: -90px;
          background: rgba(255, 198, 90, 0.38);
        }

        .glowTwo {
          width: 260px;
          height: 260px;
          right: -60px;
          top: 160px;
          background: rgba(174, 220, 162, 0.44);
        }

        .sparkle {
          position: absolute;
          color: rgba(110, 139, 80, 0.42);
          font-size: 34px;
          pointer-events: none;
        }

        .sparkleOne {
          left: 7%;
          top: 25%;
        }

        .sparkleTwo {
          right: 7%;
          bottom: 22%;
        }

        .sparkleThree {
          right: 22%;
          top: 8%;
        }

        .topbar {
          position: relative;
          z-index: 2;
          max-width: 1180px;
          margin: 0 auto 24px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .eyebrow {
          margin: 0 0 7px;
          color: #9a743a;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        h1,
        h2,
        p {
          margin-top: 0;
        }

        h1 {
          margin-bottom: 8px;
          font-size: clamp(50px, 9vw, 96px);
          line-height: 0.9;
          letter-spacing: -0.08em;
          color: #2e2419;
        }

        .subtitle {
          margin: 0;
          color: #765e3e;
          font-weight: 600;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border: 1px solid rgba(165, 125, 62, 0.2);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(18px);
          box-shadow: 0 14px 40px rgba(88, 59, 24, 0.08);
          color: #6f532a;
          font-weight: 800;
          white-space: nowrap;
        }

        .dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #c7b28a;
        }

        .dot.active {
          background: #d99d2c;
          box-shadow: 0 0 0 8px rgba(217, 157, 44, 0.16);
        }

        .layout {
          position: relative;
          z-index: 2;
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 0.92fr 1.08fr;
          gap: 22px;
        }

        .avatarPanel,
        .chatPanel {
          border: 1px solid rgba(156, 119, 63, 0.18);
          border-radius: 34px;
          background: rgba(255, 255, 255, 0.58);
          backdrop-filter: blur(24px);
          box-shadow: 0 28px 90px rgba(93, 67, 29, 0.13);
        }

        .avatarPanel {
          padding: 22px;
        }

        .avatarStage {
          position: relative;
          min-height: 500px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 28px;
          background:
            radial-gradient(circle at center, rgba(255, 232, 178, 0.95), transparent 36%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(248, 255, 239, 0.76));
        }

        .halo {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 999px;
          border: 1px solid rgba(212, 159, 60, 0.35);
          box-shadow:
            0 0 80px rgba(221, 169, 72, 0.25),
            inset 0 0 60px rgba(255, 255, 255, 0.75);
          animation: pulseHalo 4s ease-in-out infinite;
        }

        .avatar {
          position: relative;
          z-index: 2;
          max-width: 96%;
          max-height: 470px;
          object-fit: contain;
          filter: drop-shadow(0 34px 45px rgba(69, 44, 13, 0.22));
          animation: breathe 4.5s ease-in-out infinite;
        }

        .avatar.speaking {
          animation:
            breathe 2.4s ease-in-out infinite,
            speaking 0.42s ease-in-out infinite;
        }

        .avatarText {
          padding: 20px 4px 8px;
        }

        .avatarText h2 {
          margin-bottom: 8px;
          font-size: 26px;
          letter-spacing: -0.04em;
        }

        .avatarText p {
          margin-bottom: 0;
          color: #765f3e;
          line-height: 1.58;
        }

        .avatarGrid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 9px;
        }

        .avatarOption {
          height: 72px;
          padding: 4px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(164, 124, 62, 0.16);
          overflow: hidden;
        }

        .avatarOption.selected {
          border: 2px solid #d6a34a;
          box-shadow: 0 12px 26px rgba(157, 104, 24, 0.18);
        }

        .avatarOption img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 14px;
        }

        .chatPanel {
          min-height: 720px;
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .chatHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }

        .chatHeader h2 {
          margin-bottom: 0;
          font-size: 36px;
          letter-spacing: -0.05em;
        }

        .ghostButton,
        .stopButton {
          min-height: 44px;
          padding: 0 15px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.76);
          color: #67491f;
          font-weight: 900;
          box-shadow: 0 12px 28px rgba(87, 61, 25, 0.08);
        }

        .messages {
          flex: 1;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 13px;
          padding: 16px;
          border-radius: 24px;
          background: rgba(255, 250, 240, 0.62);
        }

        .message {
          max-width: 88%;
          padding: 14px 16px;
          border-radius: 22px;
          box-shadow: 0 12px 30px rgba(68, 44, 15, 0.07);
        }

        .message strong {
          display: block;
          margin-bottom: 5px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .message p {
          margin: 0;
          line-height: 1.55;
        }

        .lyraMessage {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.9);
          color: #4a3925;
        }

        .lyraMessage strong {
          color: #a87926;
        }

        .userMessage {
          align-self: flex-end;
          background: linear-gradient(135deg, #e8c36b, #fff0b6);
          color: #332516;
        }

        .userMessage strong {
          color: #70501f;
        }

        .error {
          margin-top: 12px;
          padding: 12px 14px;
          border-radius: 18px;
          background: rgba(255, 226, 217, 0.86);
          color: #8c3c2f;
          font-weight: 800;
        }

        .inputArea {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 10px;
          margin-top: 14px;
        }

        .inputArea input {
          width: 100%;
          min-height: 54px;
          border: 1px solid rgba(156, 119, 63, 0.18);
          outline: none;
          border-radius: 18px;
          padding: 0 16px;
          background: rgba(255, 255, 255, 0.78);
          color: #332619;
        }

        .sendButton,
        .micButton {
          min-height: 54px;
          padding: 0 18px;
          border-radius: 18px;
          background: linear-gradient(135deg, #e7b75e, #fff1bf);
          color: #332413;
          font-weight: 950;
          box-shadow: 0 12px 32px rgba(87, 61, 25, 0.08);
        }

        .micButton {
          background: linear-gradient(135deg, #d8eecb, #fffef3);
        }

        .settings {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          margin-top: 14px;
          align-items: end;
        }

        .settings label {
          display: grid;
          gap: 8px;
          padding: 12px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.57);
          color: #70542f;
          font-size: 13px;
          font-weight: 900;
        }

        .settings select {
          width: 100%;
          min-height: 42px;
          border: 1px solid rgba(156, 119, 63, 0.22);
          border-radius: 14px;
          padding: 0 10px;
          background: #fffdf8;
          color: #4e3921;
        }

        .dock {
          position: relative;
          z-index: 2;
          max-width: 1180px;
          margin: 22px auto 0;
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }

        .dock div {
          min-height: 72px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(156, 119, 63, 0.18);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.58);
          backdrop-filter: blur(18px);
          box-shadow: 0 20px 50px rgba(84, 58, 21, 0.08);
          color: #644927;
          font-weight: 950;
        }

        @keyframes breathe {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }

          50% {
            transform: translateY(-8px) scale(1.015);
          }
        }

        @keyframes speaking {
          0%,
          100% {
            filter: drop-shadow(0 34px 45px rgba(69, 44, 13, 0.22));
          }

          50% {
            filter: drop-shadow(0 40px 58px rgba(196, 135, 45, 0.34));
          }
        }

        @keyframes pulseHalo {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.66;
          }

          50% {
            transform: scale(1.06);
            opacity: 1;
          }
        }

        @media (max-width: 920px) {
          .lyraPage {
            padding: 18px;
          }

          .topbar {
            flex-direction: column;
          }

          .layout {
            grid-template-columns: 1fr;
          }

          .avatarStage {
            min-height: 390px;
          }

          .chatPanel {
            min-height: 650px;
          }

          .dock {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 560px) {
          .avatarPanel,
          .chatPanel {
            border-radius: 28px;
            padding: 18px;
          }

          .avatarGrid {
            grid-template-columns: repeat(3, 1fr);
          }

          .inputArea {
            grid-template-columns: 1fr;
          }

          .settings {
            grid-template-columns: 1fr;
          }

          .dock {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
