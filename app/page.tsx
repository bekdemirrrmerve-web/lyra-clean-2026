"use client";

import React, { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
};

const ENDPOINTS = ["/api/chat", "/api/gemini", "/api/lyra"];

const quickTools = [
  "PDF Özet",
  "İçerik Fikri",
  "Teleprompter",
  "Ders Modu",
  "Foto Analiz",
  "Araştır",
];

function getTime() {
  return new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function localFallbackAnswer(prompt: string) {
  const lower = prompt.toLowerCase();

  if (lower.includes("dgs")) {
    return "Tabii kanka. Bugün için mini ama etkili bir DGS planı yapalım: 35 dakika Temel Kavramlar, 10 dakika mola, 30 dakika problem çözümü, sonra 15 dakika yanlış analizi. En önemlisi bugün konuyu bitirmeye değil, masaya oturma ritmini geri kazanmaya odaklan.";
  }

  if (lower.includes("içerik") || lower.includes("video")) {
    return "Bence bunu içerik olarak şöyle kurabiliriz: İlk 3 saniyede merak uyandıran bir cümle, sonra kısa bir bilimsel açıklama, ardından net çözüm. Mesela: ‘Cildin kuru değil, bariyerin bozulmuş olabilir.’ Bu tarz cümleler hem dikkat çeker hem de seni uzman gösterir.";
  }

  if (lower.includes("formül") || lower.includes("inci")) {
    return "Formül tarafında önce ürün tipini, hedef etkiyi ve kullanılacak aktifleri netleştirmek lazım. INCI mantığında da her içerik; çözücü, nemlendirici, emülgatör, koruyucu, aktif veya kıvam verici gibi görev alır. İstersen ürünü söyle, sana mantıklı bir başlangıç formülü kurayım.";
  }

  return "Duydum kanka. Bunu şöyle toparlayabiliriz: Önce ne istediğini netleştirip sonra adım adım çözeriz. Ben olsam burada işi büyütmeden, en pratik ve çalışan versiyondan başlardım.";
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Merhaba kanka, ben Lyra. İstersen yaz, istersen canlı moddan konuş. Bu alan artık ana sohbet alanın.",
      time: getTime(),
    },
  ]);

  const [input, setInput] = useState("");
  const [liveMode, setLiveMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const liveModeRef = useRef(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    liveModeRef.current = liveMode;
  }, [liveMode]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    setSpeechSupported(Boolean(SpeechRecognition));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function callAI(userText: string) {
    const history = messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.text,
    }));

    for (const endpoint of ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userText,
            prompt: userText,
            messages: history,
          }),
        });

        if (!res.ok) continue;

        const data = await res.json();

        const answer =
          data?.answer ||
          data?.reply ||
          data?.response ||
          data?.text ||
          data?.message ||
          data?.content;

        if (typeof answer === "string" && answer.trim()) {
          return answer.trim();
        }
      } catch {
        continue;
      }
    }

    return localFallbackAnswer(userText);
  }

  function speak(text: string) {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = 1.02;
    utterance.pitch = 1.08;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const trVoice =
      voices.find((v) => v.lang?.toLowerCase().includes("tr")) ||
      voices.find((v) => v.name?.toLowerCase().includes("female")) ||
      voices[0];

    if (trVoice) utterance.voice = trVoice;

    window.speechSynthesis.speak(utterance);
  }

  async function sendMessage(customText?: string, shouldSpeak = false) {
    const text = cleanText(customText ?? input);

    if (!text || loadingRef.current) return;

    setInput("");
    setLoading(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      time: getTime(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const answer = await callAI(text);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: answer,
        time: getTime(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (shouldSpeak || liveModeRef.current) {
        speak(answer);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Kanka bağlantıda bir sorun oldu ama ekran bozulmadı. API tarafını kontrol edip tekrar deneyelim.",
          time: getTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop?.();
    } catch {}

    recognitionRef.current = null;
    setListening(false);
  }

  function startListening() {
    if (!speechSupported) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Kanka bu tarayıcı ses algılamayı desteklemiyor olabilir. Chrome’dan açarsan daha iyi çalışır.",
          time: getTime(),
        },
      ]);
      return;
    }

    if (recognitionRef.current) {
      stopListening();
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();

    recognition.lang = "tr-TR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);

      if (liveModeRef.current && !loadingRef.current) {
        setTimeout(() => {
          try {
            startListening();
          } catch {}
        }, 350);
      }
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript || "";

        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }

      const visibleText = cleanText(finalText || interim);

      if (visibleText) {
        setInput(visibleText);
      }

      if (finalText && liveModeRef.current) {
        const finalClean = cleanText(finalText);

        if (finalClean.length > 1) {
          stopListening();
          sendMessage(finalClean, true);
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {}
  }

  function toggleLiveMode() {
    const next = !liveMode;

    setLiveMode(next);

    if (next) {
      startListening();
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Canlı mod açık kanka. Konuş, seni yazıya döküp buradan cevaplayacağım.",
          time: getTime(),
        },
      ]);
    } else {
      stopListening();
      window.speechSynthesis?.cancel?.();
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Canlı modu kapattım. İstersen yazılı sohbetten devam edebiliriz.",
          time: getTime(),
        },
      ]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className="lyraPage">
      <section className="lyraShell">
        <header className="topBar">
          <div className="brandBlock">
            <div className="avatarOrb">
              <div className="avatarFace">L</div>
            </div>

            <div>
              <h1>Lyra Clean</h1>
              <p>
                {liveMode
                  ? "Canlı mod aktif — aynı ekrandayız"
                  : "Yazılı sohbet ve canlı konuşma hazır"}
              </p>
            </div>
          </div>

          <div className={`statusPill ${listening ? "active" : ""}`}>
            <span />
            {listening ? "Dinliyor" : loading ? "Cevaplıyor" : "Hazır"}
          </div>
        </header>

        <section className="chatPanel">
          <div className="chatHeader">
            <div>
              <h2>Sohbet Alanı</h2>
              <p>Konuşmalar burada akacak. Canlı mod da bu alanın içinde.</p>
            </div>

            <button
              type="button"
              className={`liveButton ${liveMode ? "on" : ""}`}
              onClick={toggleLiveMode}
            >
              {liveMode ? "Canlı Mod Açık" : "Canlı Mod"}
            </button>
          </div>

          <div className="messagesArea">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`messageRow ${message.role === "user" ? "user" : "assistant"}`}
              >
                <div className="messageBubble">
                  <p>{message.text}</p>
                  <small>{message.time}</small>
                </div>
              </div>
            ))}

            {loading && (
              <div className="messageRow assistant">
                <div className="messageBubble typingBubble">
                  <div className="typingDots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="inputArea">
            <button
              type="button"
              className={`micButton ${listening ? "active" : ""}`}
              onClick={listening ? stopListening : startListening}
            >
              {listening ? "Durdur" : "Ses"}
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                liveMode
                  ? "Konuşman burada yazıya dökülür..."
                  : "Lyra’ya yaz veya sesle söyle..."
              }
            />

            <button
              type="button"
              className="sendButton"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              Gönder
            </button>
          </div>
        </section>

        <nav className="bottomTools">
          {quickTools.map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() =>
                setMessages((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    text: `${tool} alanını açabiliriz kanka. Şimdilik ana sohbet bozulmasın diye bu butonları küçük tuttum.`,
                    time: getTime(),
                  },
                ])
              }
            >
              {tool}
            </button>
          ))}
        </nav>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .lyraPage {
          width: 100vw;
          height: 100dvh;
          overflow: hidden;
          background:
            radial-gradient(circle at top left, rgba(246, 215, 137, 0.35), transparent 34%),
            radial-gradient(circle at bottom right, rgba(126, 176, 132, 0.25), transparent 32%),
            linear-gradient(135deg, #fffdf8 0%, #f8f3e8 48%, #eef5ec 100%);
          color: #2a241c;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .lyraShell {
          width: 100%;
          height: 100%;
          padding: 14px;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          gap: 10px;
        }

        .topBar {
          width: 100%;
          min-height: 74px;
          border: 1px solid rgba(132, 105, 56, 0.16);
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(18px);
          border-radius: 26px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 16px 45px rgba(93, 70, 31, 0.08);
        }

        .brandBlock {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .avatarOrb {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          padding: 3px;
          background:
            linear-gradient(135deg, rgba(227, 178, 87, 0.95), rgba(121, 169, 123, 0.9));
          box-shadow: 0 12px 30px rgba(113, 132, 81, 0.22);
          flex: 0 0 auto;
        }

        .avatarFace {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background:
            radial-gradient(circle at 35% 25%, #ffffff, #f5ead8 58%, #d7b76e);
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 22px;
          color: #7a5b1f;
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        h1 {
          font-size: clamp(20px, 2.4vw, 30px);
          letter-spacing: -0.04em;
          color: #292117;
        }

        .brandBlock p {
          margin-top: 3px;
          color: rgba(42, 36, 28, 0.62);
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .statusPill {
          height: 36px;
          padding: 0 13px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(132, 105, 56, 0.16);
          color: rgba(42, 36, 28, 0.68);
          font-size: 13px;
          font-weight: 650;
          flex: 0 0 auto;
        }

        .statusPill span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #8fa072;
        }

        .statusPill.active span {
          background: #d8a539;
          box-shadow: 0 0 0 7px rgba(216, 165, 57, 0.17);
        }

        .chatPanel {
          min-height: 0;
          border-radius: 30px;
          border: 1px solid rgba(132, 105, 56, 0.16);
          background: rgba(255, 255, 255, 0.64);
          backdrop-filter: blur(22px);
          box-shadow: 0 22px 60px rgba(86, 67, 31, 0.11);
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          overflow: hidden;
        }

        .chatHeader {
          padding: 15px 16px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(132, 105, 56, 0.1);
        }

        .chatHeader h2 {
          font-size: 17px;
          letter-spacing: -0.02em;
        }

        .chatHeader p {
          margin-top: 3px;
          font-size: 12.5px;
          color: rgba(42, 36, 28, 0.58);
        }

        .liveButton {
          border: 0;
          border-radius: 999px;
          padding: 11px 15px;
          cursor: pointer;
          background: rgba(143, 160, 114, 0.16);
          color: #586743;
          font-weight: 750;
          white-space: nowrap;
          transition:
            transform 0.15s ease,
            background 0.15s ease,
            color 0.15s ease;
        }

        .liveButton:hover {
          transform: translateY(-1px);
        }

        .liveButton.on {
          background: linear-gradient(135deg, #d9a83c, #8fa072);
          color: white;
          box-shadow: 0 12px 24px rgba(137, 127, 63, 0.24);
        }

        .messagesArea {
          min-height: 0;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scroll-behavior: smooth;
        }

        .messagesArea::-webkit-scrollbar {
          width: 8px;
        }

        .messagesArea::-webkit-scrollbar-thumb {
          background: rgba(126, 103, 57, 0.2);
          border-radius: 999px;
        }

        .messageRow {
          width: 100%;
          display: flex;
        }

        .messageRow.user {
          justify-content: flex-end;
        }

        .messageRow.assistant {
          justify-content: flex-start;
        }

        .messageBubble {
          max-width: min(78%, 760px);
          padding: 12px 13px 9px;
          border-radius: 22px;
          line-height: 1.45;
          font-size: 14.5px;
          box-shadow: 0 10px 28px rgba(73, 57, 25, 0.08);
        }

        .messageRow.assistant .messageBubble {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(132, 105, 56, 0.11);
          color: #2c241b;
          border-bottom-left-radius: 7px;
        }

        .messageRow.user .messageBubble {
          background: linear-gradient(135deg, #2f3428, #6c7b56);
          color: white;
          border-bottom-right-radius: 7px;
        }

        .messageBubble small {
          display: block;
          margin-top: 6px;
          font-size: 10.5px;
          opacity: 0.55;
          text-align: right;
        }

        .typingBubble {
          width: 72px;
        }

        .typingDots {
          display: flex;
          gap: 5px;
          align-items: center;
          height: 18px;
        }

        .typingDots span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(88, 103, 67, 0.55);
          animation: bounce 0.85s infinite ease-in-out;
        }

        .typingDots span:nth-child(2) {
          animation-delay: 0.12s;
        }

        .typingDots span:nth-child(3) {
          animation-delay: 0.24s;
        }

        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: translateY(0);
            opacity: 0.45;
          }
          40% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }

        .inputArea {
          padding: 12px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 9px;
          border-top: 1px solid rgba(132, 105, 56, 0.1);
          background: rgba(255, 255, 255, 0.47);
        }

        .inputArea input {
          width: 100%;
          min-width: 0;
          height: 46px;
          border: 1px solid rgba(132, 105, 56, 0.16);
          border-radius: 999px;
          padding: 0 15px;
          outline: none;
          background: rgba(255, 255, 255, 0.9);
          color: #2a241c;
          font-size: 14px;
        }

        .inputArea input:focus {
          border-color: rgba(143, 160, 114, 0.72);
          box-shadow: 0 0 0 4px rgba(143, 160, 114, 0.13);
        }

        .micButton,
        .sendButton {
          height: 46px;
          border: 0;
          border-radius: 999px;
          padding: 0 16px;
          font-weight: 800;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            opacity 0.15s ease;
        }

        .micButton:hover,
        .sendButton:hover {
          transform: translateY(-1px);
        }

        .micButton {
          background: rgba(143, 160, 114, 0.16);
          color: #586743;
        }

        .micButton.active {
          background: #d9a83c;
          color: white;
        }

        .sendButton {
          background: #2f3428;
          color: white;
        }

        .sendButton:disabled {
          opacity: 0.42;
          cursor: not-allowed;
          transform: none;
        }

        .bottomTools {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 8px;
        }

        .bottomTools button {
          height: 42px;
          border: 1px solid rgba(132, 105, 56, 0.13);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.66);
          backdrop-filter: blur(14px);
          color: rgba(42, 36, 28, 0.78);
          font-size: 12.5px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(70, 54, 26, 0.06);
        }

        .bottomTools button:hover {
          background: rgba(255, 255, 255, 0.92);
        }

        @media (max-width: 760px) {
          .lyraShell {
            padding: 9px;
            gap: 8px;
          }

          .topBar {
            min-height: 66px;
            border-radius: 22px;
            padding: 10px;
          }

          .avatarOrb {
            width: 44px;
            height: 44px;
          }

          h1 {
            font-size: 20px;
          }

          .brandBlock p {
            max-width: 190px;
            font-size: 12px;
          }

          .statusPill {
            height: 32px;
            padding: 0 10px;
            font-size: 12px;
          }

          .chatPanel {
            border-radius: 24px;
          }

          .chatHeader {
            padding: 12px 12px 8px;
          }

          .chatHeader p {
            display: none;
          }

          .liveButton {
            padding: 10px 12px;
            font-size: 12.5px;
          }

          .messagesArea {
            padding: 12px;
            gap: 10px;
          }

          .messageBubble {
            max-width: 88%;
            font-size: 14px;
          }

          .inputArea {
            padding: 9px;
            gap: 7px;
            grid-template-columns: auto minmax(0, 1fr) auto;
          }

          .inputArea input {
            height: 43px;
            padding: 0 12px;
          }

          .micButton,
          .sendButton {
            height: 43px;
            padding: 0 12px;
            font-size: 12px;
          }

          .bottomTools {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
          }

          .bottomTools button {
            height: 36px;
            border-radius: 14px;
            font-size: 11.5px;
          }
        }
      `}</style>
    </main>
  );
}
