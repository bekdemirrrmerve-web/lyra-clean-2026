"use client";

import { useEffect, useRef, useState } from "react";

type Role = "user" | "lyra";

type Message = {
  id: number;
  role: Role;
  text: string;
};

type ModuleKey = "chat" | "creator" | "pdf" | "study" | "settings";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "lyra",
      text: "Merhaba Merve ✨ Ben Lyra. Yazabilir, sesle konuşabilir ya da canlı moda geçebilirsin.",
    },
  ]);

  const [input, setInput] = useState("");
  const [activeModule, setActiveModule] = useState<ModuleKey>("chat");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [liveMode, setLiveMode] = useState(false);
  const [statusText, setStatusText] = useState("Hazır");
  const [lastHeard, setLastHeard] = useState("");

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const addMessage = (role: Role, text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        role,
        text,
      },
    ]);
  };

  const getLocalFallback = (text: string) => {
    const lower = text.toLowerCase();

    if (lower.includes("hook") || lower.includes("kanca") || lower.includes("içerik")) {
      return "Tabii kanka. İçerik için en iyi yapı şöyle: ilk 3 saniyede merak uyandıran bir cümle, sonra problemi göster, sonra küçük bir bilimsel açıklama ve en sonda kaydetme çağrısı. Mesela: “Bu içerik cildini mahveden ama herkesin masum sandığı şeyi anlatıyor…”";
    }

    if (lower.includes("pdf")) {
      return "PDF alanını açarsan metni özetleme, önemli yerleri çıkarma ve çalışma notuna çevirme şeklinde ilerleyebiliriz. Şu an bana PDF içeriğini ya da metni atarsan hızlıca toparlarım.";
    }

    if (lower.includes("ders") || lower.includes("çalış")) {
      return "Ders çalışma modunda sana konu özeti, soru-cevap, mini test ve tekrar planı hazırlayabilirim. Ben olsam 25 dakika odak + 5 dakika mola şeklinde başlatırdım.";
    }

    if (lower.includes("mer") || lower.includes("merhaba")) {
      return "Buradayım kanka ✨ Lyra ekranı geri geldi. Şimdi sakin sakin neyi güncelleyeceğimize bakalım.";
    }

    return "Cevabı alamadım kanka ama ekran çalışıyor. Gemini route bağlantısını kontrol etmek için /api/gemini?test=merhaba adresini aç. Orası ok ise sadece POST cevap alanı answer, reply veya text olarak dönmeli.";
  };

  const speakText = (text: string) => {
    if (!voiceEnabled) return;
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = 1;
    utterance.pitch = 1.05;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const trVoice =
      voices.find((voice) => voice.lang.toLowerCase().includes("tr")) ||
      voices.find((voice) => voice.name.toLowerCase().includes("female")) ||
      voices[0];

    if (trVoice) utterance.voice = trVoice;

    window.speechSynthesis.speak(utterance);
  };

  const askGemini = async (text: string) => {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          prompt: text,
          question: text,
          system:
            "Sen Lyra adında sıcak, doğal, Türkçe konuşan bir kişisel asistansın. Kullanıcıya yakın arkadaş gibi ama akıllı, net ve destekleyici cevap ver. Gerektiğinde içerik üretimi, kozmetik, kimya, günlük plan, PDF özet ve ders çalışma konularında yardım et.",
        }),
      });

      if (!res.ok) return "";

      const data = await res.json();

      const possibleAnswer =
        data.answer ||
        data.reply ||
        data.text ||
        data.result ||
        data.message ||
        data.output ||
        "";

      if (typeof possibleAnswer === "string") {
        return possibleAnswer;
      }

      return "";
    } catch {
      return "";
    }
  };

  const sendMessage = async (forcedText?: string, fromVoice = false) => {
    const text = (forcedText || input).trim();
    if (!text || loading) return;

    setInput("");
    setLastHeard(fromVoice ? text : "");
    addMessage("user", text);
    setLoading(true);
    setStatusText("Düşünüyor");

    const aiAnswer = await askGemini(text);
    const finalAnswer = aiAnswer || getLocalFallback(text);

    addMessage("lyra", finalAnswer);
    speakText(finalAnswer);

    setLoading(false);
    setStatusText(liveMode ? "Canlı mod açık" : "Hazır");
  };

  const startListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionImpl =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      const warning =
        "Bu tarayıcı ses tanımayı desteklemiyor kanka. Chrome kullanıyorsan mikrofon iznini kontrol et.";
      addMessage("lyra", warning);
      speakText(warning);
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = "tr-TR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setStatusText("Dinliyorum");
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      setListening(false);
      setStatusText("Duydum, cevaplıyorum");

      if (transcript) {
        sendMessage(transcript, true);
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setStatusText(liveMode ? "Canlı mod açık" : "Hazır");
      addMessage(
        "lyra",
        "Mikrofonu alamadım kanka. Tarayıcıdan mikrofon iznini açıp tekrar dene."
      );
    };

    recognition.onend = () => {
      setListening(false);
      if (!loading) {
        setStatusText(liveMode ? "Canlı mod açık" : "Hazır");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoice = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setListening(false);
    setStatusText(liveMode ? "Canlı mod açık" : "Hazır");
  };

  const toggleLiveMode = () => {
    setLiveMode((prev) => {
      const next = !prev;
      setStatusText(next ? "Canlı mod açık" : "Hazır");

      if (!next) {
        stopVoice();
      } else {
        const msg =
          "Canlı mod açıldı kanka. Konuş butonuna basınca seni dinleyip cevap vereceğim.";
        addMessage("lyra", msg);
        speakText(msg);
      }

      return next;
    });
  };

  const moduleTitle =
    activeModule === "chat"
      ? "Ana Sohbet"
      : activeModule === "creator"
      ? "İçerik Üretici Alanı"
      : activeModule === "pdf"
      ? "PDF Özet Alanı"
      : activeModule === "study"
      ? "Ders Çalışma Alanı"
      : "Ayarlar";

  const moduleDescription =
    activeModule === "chat"
      ? "Yazış, sesle konuş veya canlı moda geç."
      : activeModule === "creator"
      ? "Hook, video metni, teleprompter ve keşfet stratejisi üret."
      : activeModule === "pdf"
      ? "PDF veya uzun metinleri özetle, notlara çevir."
      : activeModule === "study"
      ? "Konu anlatımı, soru üretimi ve tekrar planı hazırla."
      : "Ses, canlı mod ve görünüm ayarlarını yönet.";

  const quickPrompts =
    activeModule === "creator"
      ? [
          "Bana 30 saniyelik kozmetik reels metni yaz.",
          "Bu video için ilk 3 saniye hook öner.",
          "Keşfete düşecek içerik fikri üret.",
        ]
      : activeModule === "pdf"
      ? [
          "Bu metni kısa özetle.",
          "Bunu madde madde çalışma notu yap.",
          "Bu içerikten sınav sorusu üret.",
        ]
      : activeModule === "study"
      ? [
          "Bugün için 45 dakikalık çalışma planı yap.",
          "Bu konudan mini test hazırla.",
          "Bana motive edici ama gerçekçi bir plan yap.",
        ]
      : [
          "Bugün ne yapmalıyım?",
          "Bana içerik fikri ver.",
          "Lyra çalışıyor mu test edelim.",
        ];

  return (
    <main className="lyra-page">
      <section className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="logoOrb">
              <span>L</span>
            </div>

            <div>
              <p className="eyebrow">Sirius Lyra AI</p>
              <h1>Lyra Clean 2026</h1>
            </div>
          </div>

          <div className="statusPill">
            <span className={loading || listening ? "dot active" : "dot"} />
            <div>
              <small>Durum</small>
              <strong>{statusText}</strong>
            </div>
          </div>
        </header>

        <section className="mainGrid">
          <aside className="avatarPanel">
            <div className={liveMode ? "avatarCard live" : "avatarCard"}>
              <div className="avatarGlow" />

              <div className={listening ? "avatarCircle listening" : "avatarCircle"}>
                <div className="face">
                  <div className="eyes">
                    <i />
                    <i />
                  </div>
                  <div className={loading ? "mouth thinking" : "mouth"} />
                </div>
              </div>

              <div className="avatarInfo">
                <h2>Lyra</h2>
                <p>
                  {liveMode
                    ? "Canlı konuşma modu açık. Mikrofonla konuşabilirsin."
                    : "Beyaz-gümüş ana ekran aktif. Yazılı ve sesli sohbet hazır."}
                </p>
              </div>

              {lastHeard && (
                <div className="heardBox">
                  <small>Seni son duyduğum:</small>
                  <p>{lastHeard}</p>
                </div>
              )}

              <div className="voiceControls">
                <button onClick={startListening} className={listening ? "control primary pulse" : "control primary"}>
                  {listening ? "Dinliyorum..." : "Ses ile konuş"}
                </button>

                <button onClick={toggleLiveMode} className={liveMode ? "control liveOn" : "control"}>
                  {liveMode ? "Live açık" : "Live mod"}
                </button>

                <button onClick={stopVoice} className="control">
                  Sesi durdur
                </button>
              </div>
            </div>

            <div className="miniPanel">
              <h3>Modüller</h3>

              <div className="moduleButtons">
                <button
                  className={activeModule === "chat" ? "module active" : "module"}
                  onClick={() => setActiveModule("chat")}
                >
                  Sohbet
                </button>
                <button
                  className={activeModule === "creator" ? "module active" : "module"}
                  onClick={() => setActiveModule("creator")}
                >
                  İçerik
                </button>
                <button
                  className={activeModule === "pdf" ? "module active" : "module"}
                  onClick={() => setActiveModule("pdf")}
                >
                  PDF
                </button>
                <button
                  className={activeModule === "study" ? "module active" : "module"}
                  onClick={() => setActiveModule("study")}
                >
                  Ders
                </button>
                <button
                  className={activeModule === "settings" ? "module active" : "module"}
                  onClick={() => setActiveModule("settings")}
                >
                  Ayar
                </button>
              </div>
            </div>
          </aside>

          <section className="chatPanel">
            <div className="moduleHeader">
              <div>
                <p className="eyebrow">Aktif alan</p>
                <h2>{moduleTitle}</h2>
                <p>{moduleDescription}</p>
              </div>

              <div className="geminiBadge">
                <small>API</small>
                <strong>/api/gemini</strong>
              </div>
            </div>

            {activeModule === "settings" ? (
              <div className="settingsBox">
                <h3>Lyra Ayarları</h3>

                <div className="settingRow">
                  <div>
                    <strong>Sesli cevap</strong>
                    <p>Lyra cevapları tarayıcı sesiyle okusun.</p>
                  </div>

                  <button
                    className={voiceEnabled ? "toggle on" : "toggle"}
                    onClick={() => setVoiceEnabled((prev) => !prev)}
                  >
                    {voiceEnabled ? "Açık" : "Kapalı"}
                  </button>
                </div>

                <div className="settingRow">
                  <div>
                    <strong>Canlı mod</strong>
                    <p>Konuşma ekranı Replika tarzı canlı his verir.</p>
                  </div>

                  <button
                    className={liveMode ? "toggle on" : "toggle"}
                    onClick={toggleLiveMode}
                  >
                    {liveMode ? "Açık" : "Kapalı"}
                  </button>
                </div>

                <div className="testBox">
                  <p>Gemini test için tarayıcıda şunu aç:</p>
                  <code>/api/gemini?test=merhaba</code>
                </div>
              </div>
            ) : (
              <>
                <div className="quickRow">
                  {quickPrompts.map((prompt) => (
                    <button key={prompt} onClick={() => setInput(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>

                <div className="messages">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={message.role === "user" ? "msg user" : "msg lyra"}
                    >
                      <div className="msgLabel">
                        {message.role === "user" ? "Sen" : "Lyra"}
                      </div>
                      <p>{message.text}</p>
                    </div>
                  ))}

                  {loading && (
                    <div className="msg lyra">
                      <div className="msgLabel">Lyra</div>
                      <p className="typing">Cevabı hazırlıyorum...</p>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                <div className="composer">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Lyra’ya yaz... Mesela: Bana bugün için içerik planı yap."
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                  />

                  <div className="composerActions">
                    <button onClick={startListening} className="iconBtn">
                      Mikrofon
                    </button>

                    <button onClick={() => sendMessage()} className="sendBtn" disabled={loading}>
                      {loading ? "Bekle..." : "Gönder"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </section>
      </section>

      <style jsx>{`
        .lyra-page {
          min-height: 100vh;
          padding: 28px;
          color: #111827;
          background:
            radial-gradient(circle at top left, rgba(255, 255, 255, 0.95), transparent 28%),
            radial-gradient(circle at top right, rgba(186, 230, 253, 0.45), transparent 30%),
            radial-gradient(circle at bottom left, rgba(232, 231, 255, 0.75), transparent 32%),
            linear-gradient(135deg, #f8fafc 0%, #eef2f7 48%, #ffffff 100%);
        }

        .shell {
          width: min(1320px, 100%);
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 20px 22px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 34px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(18px);
          margin-bottom: 22px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .logoOrb {
          width: 58px;
          height: 58px;
          border-radius: 22px;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 30% 20%, #ffffff, transparent 30%),
            linear-gradient(135deg, #dbeafe, #ffffff, #c4b5fd);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow:
            inset 0 0 24px rgba(255, 255, 255, 0.9),
            0 16px 34px rgba(99, 102, 241, 0.18);
        }

        .logoOrb span {
          font-size: 26px;
          font-weight: 950;
          color: #334155;
        }

        .eyebrow {
          margin: 0 0 4px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }

        h1,
        h2,
        h3,
        p {
          margin: 0;
        }

        h1 {
          font-size: 34px;
          letter-spacing: -1.2px;
          color: #0f172a;
        }

        h2 {
          font-size: 24px;
          letter-spacing: -0.5px;
          color: #0f172a;
        }

        h3 {
          font-size: 17px;
          color: #111827;
        }

        p {
          color: #64748b;
          line-height: 1.55;
        }

        .statusPill {
          min-width: 150px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.06);
        }

        .statusPill small {
          display: block;
          color: #94a3b8;
          font-weight: 800;
          font-size: 11px;
          margin-bottom: 2px;
        }

        .statusPill strong {
          display: block;
          color: #334155;
          font-size: 14px;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #94a3b8;
          box-shadow: 0 0 0 5px rgba(148, 163, 184, 0.14);
        }

        .dot.active {
          background: #22c55e;
          box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.15);
        }

        .mainGrid {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 22px;
        }

        .avatarPanel,
        .chatPanel {
          min-height: calc(100vh - 150px);
        }

        .avatarPanel {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .avatarCard,
        .miniPanel,
        .chatPanel {
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(255, 255, 255, 0.76);
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(18px);
        }

        .avatarCard {
          position: relative;
          overflow: hidden;
          border-radius: 36px;
          padding: 24px;
          min-height: 520px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .avatarCard.live {
          border-color: rgba(129, 140, 248, 0.45);
          box-shadow:
            0 24px 70px rgba(99, 102, 241, 0.14),
            inset 0 0 0 1px rgba(255, 255, 255, 0.65);
        }

        .avatarGlow {
          position: absolute;
          inset: -120px;
          background:
            radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 1), transparent 18%),
            radial-gradient(circle at 40% 40%, rgba(191, 219, 254, 0.72), transparent 26%),
            radial-gradient(circle at 60% 55%, rgba(221, 214, 254, 0.84), transparent 32%),
            radial-gradient(circle at 35% 75%, rgba(244, 244, 245, 1), transparent 30%);
          filter: blur(10px);
          opacity: 0.95;
        }

        .avatarCircle {
          position: relative;
          z-index: 1;
          width: 210px;
          height: 210px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 35% 28%, #ffffff, transparent 25%),
            linear-gradient(145deg, #e0f2fe, #ffffff 42%, #ddd6fe 100%);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow:
            inset 0 0 40px rgba(255, 255, 255, 0.95),
            0 25px 60px rgba(99, 102, 241, 0.22);
          animation: float 4.5s ease-in-out infinite;
        }

        .avatarCircle.listening {
          animation: pulseAvatar 1.2s ease-in-out infinite;
        }

        .face {
          width: 92px;
          height: 72px;
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.55);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          box-shadow: inset 0 0 24px rgba(255, 255, 255, 0.9);
        }

        .eyes {
          display: flex;
          gap: 24px;
        }

        .eyes i {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #334155;
          display: block;
          animation: blink 5s infinite;
        }

        .mouth {
          width: 32px;
          height: 8px;
          border-radius: 999px;
          background: #64748b;
        }

        .mouth.thinking {
          animation: mouthMove 0.7s ease-in-out infinite;
        }

        .avatarInfo {
          position: relative;
          z-index: 1;
          margin-top: 28px;
        }

        .avatarInfo h2 {
          font-size: 30px;
          margin-bottom: 8px;
        }

        .heardBox {
          position: relative;
          z-index: 1;
          width: 100%;
          margin-top: 18px;
          padding: 14px;
          border-radius: 22px;
          text-align: left;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .heardBox small {
          color: #94a3b8;
          font-weight: 800;
        }

        .heardBox p {
          color: #334155;
          margin-top: 5px;
          font-size: 14px;
        }

        .voiceControls {
          position: relative;
          z-index: 1;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 22px;
        }

        button {
          font-family: inherit;
        }

        .control,
        .module,
        .quickRow button,
        .iconBtn,
        .sendBtn,
        .toggle {
          cursor: pointer;
          border: 1px solid rgba(148, 163, 184, 0.26);
          background: rgba(255, 255, 255, 0.72);
          color: #334155;
          border-radius: 18px;
          padding: 12px 14px;
          font-weight: 850;
          transition: 0.2s ease;
        }

        .control:hover,
        .module:hover,
        .quickRow button:hover,
        .iconBtn:hover,
        .sendBtn:hover,
        .toggle:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
        }

        .control.primary,
        .sendBtn {
          color: #ffffff;
          background: linear-gradient(135deg, #0f172a, #334155);
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.22);
        }

        .control.liveOn,
        .toggle.on {
          color: #ffffff;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          border-color: transparent;
        }

        .pulse {
          animation: softPulse 1s infinite;
        }

        .miniPanel {
          border-radius: 30px;
          padding: 18px;
        }

        .miniPanel h3 {
          margin-bottom: 12px;
        }

        .moduleButtons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .module.active {
          color: #ffffff;
          background: linear-gradient(135deg, #64748b, #111827);
          border-color: transparent;
        }

        .chatPanel {
          border-radius: 36px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .moduleHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.16);
        }

        .moduleHeader p {
          margin-top: 6px;
        }

        .geminiBadge {
          min-width: 120px;
          border-radius: 20px;
          padding: 12px 14px;
          text-align: center;
          background: rgba(248, 250, 252, 0.85);
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .geminiBadge small {
          display: block;
          color: #94a3b8;
          font-weight: 850;
          font-size: 11px;
        }

        .geminiBadge strong {
          color: #334155;
          font-size: 13px;
        }

        .quickRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          padding: 16px 0;
        }

        .quickRow button {
          border-radius: 999px;
          font-size: 13px;
          padding: 10px 13px;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 4px 6px 16px;
          display: flex;
          flex-direction: column;
          gap: 13px;
          min-height: 410px;
          max-height: calc(100vh - 355px);
        }

        .msg {
          width: fit-content;
          max-width: 78%;
          border-radius: 24px;
          padding: 14px 16px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.05);
        }

        .msg.lyra {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.82);
        }

        .msg.user {
          align-self: flex-end;
          background: linear-gradient(135deg, #111827, #334155);
          color: #ffffff;
        }

        .msg.user p,
        .msg.user .msgLabel {
          color: #ffffff;
        }

        .msgLabel {
          font-size: 11px;
          font-weight: 950;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 5px;
        }

        .msg p {
          color: #334155;
          white-space: pre-wrap;
        }

        .typing {
          animation: fadeTyping 1s ease-in-out infinite;
        }

        .composer {
          border-top: 1px solid rgba(148, 163, 184, 0.16);
          padding-top: 16px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: end;
        }

        textarea {
          width: 100%;
          min-height: 78px;
          max-height: 160px;
          resize: vertical;
          border: 1px solid rgba(148, 163, 184, 0.26);
          outline: none;
          border-radius: 24px;
          padding: 16px 18px;
          color: #111827;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
          font-size: 15px;
          line-height: 1.5;
        }

        textarea:focus {
          border-color: rgba(99, 102, 241, 0.45);
          box-shadow: 0 0 0 5px rgba(99, 102, 241, 0.12);
        }

        .composerActions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sendBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .settingsBox {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .settingRow,
        .testBox {
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(255, 255, 255, 0.7);
          border-radius: 24px;
          padding: 18px;
        }

        .settingRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .settingRow strong {
          display: block;
          color: #111827;
          margin-bottom: 5px;
        }

        .testBox code {
          display: block;
          margin-top: 10px;
          padding: 12px;
          border-radius: 16px;
          background: #0f172a;
          color: #ffffff;
          overflow-x: auto;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulseAvatar {
          0%,
          100% {
            transform: scale(1);
            box-shadow:
              inset 0 0 40px rgba(255, 255, 255, 0.95),
              0 25px 60px rgba(99, 102, 241, 0.22);
          }

          50% {
            transform: scale(1.035);
            box-shadow:
              inset 0 0 40px rgba(255, 255, 255, 0.95),
              0 25px 78px rgba(99, 102, 241, 0.35);
          }
        }

        @keyframes blink {
          0%,
          92%,
          100% {
            transform: scaleY(1);
          }

          95% {
            transform: scaleY(0.1);
          }
        }

        @keyframes mouthMove {
          0%,
          100% {
            width: 26px;
            height: 7px;
          }

          50% {
            width: 38px;
            height: 12px;
          }
        }

        @keyframes softPulse {
          0%,
          100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.02);
          }
        }

        @keyframes fadeTyping {
          0%,
          100% {
            opacity: 0.45;
          }

          50% {
            opacity: 1;
          }
        }

        @media (max-width: 980px) {
          .lyra-page {
            padding: 16px;
          }

          .topbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .mainGrid {
            grid-template-columns: 1fr;
          }

          .avatarPanel,
          .chatPanel {
            min-height: auto;
          }

          .avatarCard {
            min-height: 440px;
          }

          .messages {
            max-height: 520px;
          }

          .composer {
            grid-template-columns: 1fr;
          }

          .composerActions {
            flex-direction: row;
          }

          .iconBtn,
          .sendBtn {
            flex: 1;
          }

          .msg {
            max-width: 92%;
          }
        }

        @media (max-width: 560px) {
          h1 {
            font-size: 27px;
          }

          .moduleHeader,
          .settingRow {
            flex-direction: column;
            align-items: stretch;
          }

          .avatarCircle {
            width: 180px;
            height: 180px;
          }

          .moduleButtons {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
