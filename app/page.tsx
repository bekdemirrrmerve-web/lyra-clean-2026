"use client";

import React, { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

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
      "Kanka geldim. Ne sorarsan direkt cevaplayacağım; içerik, kimya, kozmetik, ders, plan, araştırma, uygulama hatası… ne varsa birlikte toparlarız.",
  },
];

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [status, setStatus] = useState("Hazır");
  const [speechRate, setSpeechRate] = useState(1.02);
  const [voiceMode, setVoiceMode] = useState<"phone" | "realistic">("phone");
  const [memory, setMemory] = useState<string[]>([
    "kozmetik / formül / cilt bakımı",
    "içerik üretimi",
  ]);

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    recognitionRef.current = null;
    setIsListening(false);
    setStatus("Hazır");
  };

  const addMemory = (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    const short = clean.length > 56 ? clean.slice(0, 56) + "..." : clean;

    setMemory((prev) => {
      const exists = prev.some(
        (item) => item.toLowerCase() === short.toLowerCase()
      );
      if (exists) return prev;
      return [short, ...prev].slice(0, 6);
    });
  };

  const speak = (text: string) => {
    if (isMuted) return;
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = speechRate;
    utterance.pitch = voiceMode === "realistic" ? 1.08 : 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const selectedVoice =
      voices.find((v) => v.lang?.toLowerCase().includes("tr")) ||
      voices.find((v) => v.name?.toLowerCase().includes("turkish")) ||
      voices[0];

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const getLyraReply = async (userText: string, history: ChatMessage[]) => {
    const cleanHistory = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: userText,
        messages: cleanHistory,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return (
        data?.message ||
        data?.error ||
        "Kanka Lyra cevap motoruna bağlanırken takıldı. API key, model adı veya Vercel environment ayarında sorun olabilir."
      );
    }

    return (
      data?.message ||
      data?.content ||
      data?.reply ||
      "Kanka cevap geldi ama ekrana düzgün aktarılamadı. Response alanını yakalayamadım."
    );
  };

  const sendMessage = async (forcedText?: string) => {
    const userText = (forcedText ?? input).trim();
    if (!userText || isLoading) return;

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
    addMemory(userText);

    try {
      const replyText = await getLyraReply(userText, nextMessages);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: replyText,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStatus("Hazır");
      speak(replyText);
    } catch (error) {
      console.error("Lyra mesaj hatası:", error);

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Kanka bağlantıda bir kopma oldu. Şu an frontend /api/chat route’una ulaşamıyor olabilir. Vercel redeploy ve OPENAI_API_KEY ayarını kontrol edelim.",
        },
      ]);

      setStatus("Bağlantı hatası");
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = (mode: "send" | "write") => {
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
            "Kanka bu tarayıcı ses algılamayı desteklemiyor gibi. Chrome’da açarsan genelde çalışıyor.",
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

    recognitionRef.current = recognition;
    setIsListening(true);
    setStatus(mode === "send" ? "Dinliyorum..." : "Sesini yazıya çeviriyorum...");

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      const currentText = (finalTranscript || interim).trim();

      if (mode === "write") {
        setInput(currentText);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Ses algılama hatası:", event);
      setIsListening(false);
      setStatus("Ses algılama hatası");
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatus("Hazır");

      const cleanText = finalTranscript.trim();

      if (!cleanText) return;

      if (mode === "write") {
        setInput(cleanText);
      }

      if (mode === "send") {
        sendMessage(cleanText);
      }
    };

    recognition.start();
  };

  const clearChat = () => {
    stopSpeaking();
    stopListening();
    setMessages(initialMessages);
    setInput("");
    setStatus("Hazır");
  };

  const clearMemory = () => {
    setMemory([]);
  };

  const toggleMute = () => {
    if (!isMuted) {
      stopSpeaking();
    }

    setIsMuted((prev) => !prev);
  };

  const quickPrompts = [
    "Cilt bakımında dünyada şu ara ilgi çeken alanlar neler?",
    "Bana keşfete düşecek 10 kozmetik içerik fikri ver.",
    "Ev tipi bariyer onarıcı krem mantığını anlat.",
    "DGS için bugünlük çalışma planı çıkar.",
  ];

  return (
    <>
      <main className="lyra-page">
        <div className="lyra-shell">
          <header className="top-card">
            <div className="brand-area">
              <div className="brand-icon">L</div>
              <div>
                <h1>Lyra Clean 2026</h1>
                <p>Lyra ile konuş, üret, planla, araştır, hatırla.</p>
              </div>
            </div>

            <div className="top-actions">
              <button onClick={() => startListening("send")}>
                {isListening ? "Dinliyor" : "Canlı Konuş"}
              </button>
              <button onClick={() => startListening("write")}>Sesle Yaz</button>
              <button
                onClick={() => {
                  stopSpeaking();
                  stopListening();
                }}
              >
                Sustur
              </button>
              <span>AI Mod Açık</span>
              <button onClick={toggleMute}>{isMuted ? "Sessiz" : "Ses Açık"}</button>
              <button
                className={voiceMode === "phone" ? "active" : ""}
                onClick={() => setVoiceMode("phone")}
              >
                Telefon Sesi
              </button>
              <button
                className={voiceMode === "realistic" ? "active" : ""}
                onClick={() => setVoiceMode("realistic")}
              >
                Gerçekçi Ses
              </button>
            </div>
          </header>

          <section className="main-grid">
            <div className="left-panel">
              <div className="avatar-zone">
                <div className={`avatar-orb ${isListening ? "pulse" : ""}`}>
                  <div className="orb-blur"></div>
                  <div className="orb-core">L</div>
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
              </div>

              <div className="input-card">
                <div className="input-head">
                  <strong>Lyra ile sohbet et</strong>
                  <span>{status}</span>
                </div>

                <div className="input-row">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Bana normal mesaj yaz..."
                  />

                  <button
                    onClick={() => sendMessage()}
                    disabled={isLoading || !input.trim()}
                    className="send-button"
                  >
                    Gönder
                  </button>
                </div>

                <div className="small-actions">
                  <button onClick={() => startListening("write")}>Sesle Yaz</button>
                  <button onClick={clearChat}>Sohbeti Temizle</button>
                  <button onClick={clearMemory}>Hafızayı Temizle</button>
                </div>
              </div>
            </div>

            <div className="right-panel">
              <div className="chat-card">
                <div className="section-head">
                  <h2>Sohbet</h2>
                  <span>{messages.length} mesaj</span>
                </div>

                <div className="chat-window">
                  {messages.map((message) => {
                    const isUser = message.role === "user";

                    return (
                      <div
                        key={message.id}
                        className={`message-line ${isUser ? "user-line" : "assistant-line"}`}
                      >
                        <div className={`message-bubble ${isUser ? "user" : "assistant"}`}>
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
              </div>

              <div className="memory-card">
                <div className="section-head">
                  <h2>Kısa Hafıza</h2>
                  <span>{memory.length} kayıt</span>
                </div>

                {memory.length === 0 ? (
                  <p className="empty-memory">
                    Hafıza şu an boş. Konuştukça kısa notları burada tutacağım.
                  </p>
                ) : (
                  <div className="memory-list">
                    {memory.map((item, index) => (
                      <div key={`${item}-${index}`} className="memory-item">
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="quick-card">
                <h2>Hızlı Test</h2>
                <div className="quick-list">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      disabled={isLoading}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          min-height: 100%;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #fff7fb;
          color: #2b2238;
        }

        button,
        textarea,
        input {
          font-family: inherit;
        }

        button {
          cursor: pointer;
          border: none;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .lyra-page {
          min-height: 100vh;
          padding: 32px 20px;
          background:
            radial-gradient(circle at top left, #ffeaf4 0, #fff7fb 32%, #eef7ff 72%, #f9fbff 100%);
        }

        .lyra-shell {
          width: min(1480px, 100%);
          margin: 0 auto;
        }

        .top-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 26px;
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.74);
          box-shadow: 0 24px 80px rgba(119, 91, 140, 0.13);
          backdrop-filter: blur(18px);
        }

        .brand-area {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .brand-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          border-radius: 20px;
          background: linear-gradient(135deg, #ffe1ef, #e7ddff, #dff5ff);
          color: #8a4fff;
          font-size: 28px;
          font-weight: 950;
          box-shadow: inset 0 0 24px rgba(255, 255, 255, 0.75);
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        .brand-area h1 {
          font-size: clamp(26px, 3vw, 38px);
          line-height: 1.05;
          letter-spacing: -0.05em;
          font-weight: 950;
        }

        .brand-area p {
          margin-top: 6px;
          color: #6e627c;
          font-size: 14px;
        }

        .top-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 10px;
        }

        .top-actions button,
        .top-actions span,
        .small-actions button,
        .quick-list button {
          min-height: 42px;
          padding: 0 18px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.86);
          color: #30243d;
          font-size: 14px;
          font-weight: 850;
          box-shadow: 0 10px 28px rgba(119, 91, 140, 0.08);
          transition: transform 0.18s ease, background 0.18s ease;
        }

        .top-actions button:hover,
        .small-actions button:hover,
        .quick-list button:hover {
          transform: translateY(-1px);
          background: #ffffff;
        }

        .top-actions span,
        .top-actions .active {
          background: linear-gradient(90deg, #f4b6ff, #9dd8ff);
        }

        .main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 24px;
          margin-top: 24px;
        }

        .left-panel,
        .right-panel {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .left-panel,
        .chat-card,
        .memory-card,
        .quick-card {
          border-radius: 34px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.64);
          box-shadow: 0 24px 80px rgba(119, 91, 140, 0.12);
          backdrop-filter: blur(18px);
        }

        .left-panel {
          padding: 26px;
        }

        .avatar-zone {
          min-height: 520px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .avatar-orb {
          position: relative;
          width: 286px;
          height: 286px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background:
            radial-gradient(circle at 38% 34%, rgba(255, 255, 255, 0.95), transparent 10%),
            linear-gradient(135deg, #a6f4d6, #9dd8ff, #d7b7ff, #ff9fce, #ffe6ad);
          box-shadow: 0 26px 90px rgba(162, 111, 214, 0.24);
        }

        .avatar-orb::before {
          content: "";
          position: absolute;
          inset: -18px;
          border-radius: inherit;
          background: conic-gradient(from 140deg, #ffe7f1, #dff7ff, #e9dcff, #fff2d0, #ffe7f1);
          opacity: 0.55;
          filter: blur(4px);
          z-index: -1;
        }

        .avatar-orb.pulse {
          animation: pulse 1.2s ease-in-out infinite;
        }

        .orb-blur {
          position: absolute;
          inset: 50px;
          border-radius: inherit;
          background: rgba(255, 255, 255, 0.22);
          filter: blur(10px);
        }

        .orb-core {
          position: relative;
          width: 132px;
          height: 132px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: linear-gradient(135deg, #a6f4d6, #77cbff, #ed74c7);
          color: white;
          font-size: 64px;
          font-weight: 950;
          box-shadow: inset 0 0 30px rgba(255, 255, 255, 0.25);
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.035);
          }
        }

        .status-text {
          margin-top: 42px;
          font-weight: 950;
          font-size: 18px;
        }

        .speed-box {
          width: min(330px, 100%);
          margin-top: 32px;
        }

        .speed-box label {
          display: block;
          margin-bottom: 12px;
          font-size: 14px;
          font-weight: 900;
        }

        .speed-box input {
          width: 100%;
          accent-color: #ff6b1a;
        }

        .input-card {
          padding: 20px;
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 14px 44px rgba(119, 91, 140, 0.1);
        }

        .input-head,
        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .input-head strong,
        .section-head h2,
        .quick-card h2 {
          font-size: 18px;
          font-weight: 950;
        }

        .input-head span,
        .section-head span {
          color: #6e627c;
          font-size: 14px;
        }

        .input-row {
          display: flex;
          gap: 12px;
        }

        textarea {
          width: 100%;
          min-height: 58px;
          resize: none;
          border-radius: 18px;
          border: 1px solid #e7dceb;
          outline: none;
          padding: 16px 16px;
          background: #ffffff;
          color: #30243d;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.45;
          transition: border 0.2s ease, box-shadow 0.2s ease;
        }

        textarea:focus {
          border-color: #c59cff;
          box-shadow: 0 0 0 5px rgba(197, 156, 255, 0.17);
        }

        .send-button {
          min-width: 108px;
          border-radius: 18px;
          background: linear-gradient(90deg, #f4b6ff, #9dd8ff);
          color: #241a2f;
          font-size: 15px;
          font-weight: 950;
          box-shadow: 0 12px 28px rgba(119, 91, 140, 0.12);
        }

        .small-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 14px;
        }

        .small-actions button {
          background: #fff0f7;
        }

        .chat-card,
        .memory-card,
        .quick-card {
          padding: 22px;
        }

        .chat-window {
          height: 520px;
          overflow-y: auto;
          padding: 18px;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.56);
        }

        .message-line {
          display: flex;
          margin-bottom: 16px;
        }

        .assistant-line {
          justify-content: flex-start;
        }

        .user-line {
          justify-content: flex-end;
        }

        .message-bubble {
          width: fit-content;
          max-width: 84%;
          padding: 16px 18px;
          border-radius: 24px;
          box-shadow: 0 10px 34px rgba(119, 91, 140, 0.09);
        }

        .message-bubble strong {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 950;
        }

        .message-bubble p {
          white-space: pre-wrap;
          color: #3d3448;
          font-size: 15px;
          line-height: 1.65;
        }

        .message-bubble.assistant {
          background: #ffffff;
        }

        .message-bubble.user {
          background: linear-gradient(90deg, #ffe2f0, #eee2ff);
        }

        .memory-list {
          display: grid;
          gap: 10px;
        }

        .memory-item,
        .empty-memory {
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.82);
          color: #3d3448;
          font-size: 14px;
          font-weight: 850;
          box-shadow: 0 8px 22px rgba(119, 91, 140, 0.06);
        }

        .empty-memory {
          color: #6e627c;
          font-weight: 600;
        }

        .quick-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 14px;
        }

        .quick-list button {
          min-height: 44px;
          text-align: left;
        }

        @media (max-width: 980px) {
          .top-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .top-actions {
            justify-content: flex-start;
          }

          .main-grid {
            grid-template-columns: 1fr;
          }

          .chat-window {
            height: 460px;
          }
        }

        @media (max-width: 620px) {
          .lyra-page {
            padding: 16px 10px;
          }

          .top-card,
          .left-panel,
          .chat-card,
          .memory-card,
          .quick-card {
            border-radius: 24px;
          }

          .brand-area h1 {
            font-size: 26px;
          }

          .top-actions button,
          .top-actions span,
          .small-actions button,
          .quick-list button {
            padding: 0 13px;
            font-size: 13px;
          }

          .avatar-zone {
            min-height: 410px;
          }

          .avatar-orb {
            width: 220px;
            height: 220px;
          }

          .orb-core {
            width: 102px;
            height: 102px;
            font-size: 50px;
          }

          .input-row {
            flex-direction: column;
          }

          .send-button {
            min-height: 52px;
          }

          .message-bubble {
            max-width: 94%;
          }
        }
      `}</style>
    </>
  );
}
