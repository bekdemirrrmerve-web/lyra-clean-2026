"use client";

import { useEffect, useRef, useState } from "react";

type Role = "user" | "lyra";

type Message = {
  id: number;
  role: Role;
  text: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "lyra",
      text: "Merhaba kanka, ben Lyra ✨ Sesli konuşma ekranım geri geldi. Yazabilir ya da mikrofona basıp konuşabilirsin.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [status, setStatus] = useState("Hazır");
  const [lastHeard, setLastHeard] = useState("");

  const endRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const fallbackAnswer = (text: string) => {
    const q = text.toLowerCase();

    if (q.includes("mer") || q.includes("merhaba")) {
      return "Buradayım kanka ✨ Sarı avatarlı sesli ekran geri geldi. Şimdi beni test edebilirsin.";
    }

    if (q.includes("içerik") || q.includes("hook") || q.includes("reels")) {
      return "Tamam kanka. İçerik için en güzel akış: ilk 3 saniye güçlü hook, sonra problem, sonra mini bilimsel açıklama, en sonda kaydet çağrısı. İstersen bana ürününü söyle, direkt teleprompter metni yazayım.";
    }

    if (q.includes("ses") || q.includes("konuş")) {
      return "Ses tarafı açık. Mikrofon butonuna basınca seni dinliyorum, cevap verince de sesli okuyorum. Telefonda çalışmazsa tarayıcı mikrofon iznini kontrol etmen gerekir.";
    }

    if (q.includes("pdf")) {
      return "PDF alanını da bağlayabiliriz kanka. Şimdilik PDF metnini buraya yapıştırırsan sana özet, önemli noktalar ve çalışma notu çıkarırım.";
    }

    return "Cevabı Gemini’den alamadım kanka ama Lyra ekranı çalışıyor. Büyük ihtimalle /api/gemini route’unu veya POST dönüş alanını kontrol etmemiz gerekiyor. Test için /api/gemini?test=merhaba adresini aç.";
  };

  const speak = (text: string) => {
    if (!voiceEnabled) return;
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = 1;
    utterance.pitch = 1.08;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const turkishVoice =
      voices.find((v) => v.lang.toLowerCase().includes("tr")) ||
      voices.find((v) => v.name.toLowerCase().includes("female")) ||
      voices[0];

    if (turkishVoice) {
      utterance.voice = turkishVoice;
    }

    utterance.onstart = () => {
      setSpeaking(true);
      setStatus("Konuşuyor");
    };

    utterance.onend = () => {
      setSpeaking(false);
      setStatus(liveMode ? "Canlı mod açık" : "Hazır");
    };

    utterance.onerror = () => {
      setSpeaking(false);
      setStatus(liveMode ? "Canlı mod açık" : "Hazır");
    };

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
            "Sen Lyra adında sıcak, doğal, Türkçe konuşan bir yapay zeka asistansın. Kullanıcıya yakın arkadaş gibi cevap ver. Sesli konuşma ekranındasın. Cevapların kısa, doğal, akıllı ve destekleyici olsun.",
        }),
      });

      if (!res.ok) return "";

      const data = await res.json();

      const answer =
        data.answer ||
        data.reply ||
        data.text ||
        data.result ||
        data.message ||
        data.output ||
        "";

      return typeof answer === "string" ? answer : "";
    } catch {
      return "";
    }
  };

  const sendMessage = async (forcedText?: string, fromVoice = false) => {
    const text = (forcedText || input).trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);
    setStatus("Düşünüyor");

    if (fromVoice) {
      setLastHeard(text);
    }

    addMessage("user", text);

    const geminiAnswer = await askGemini(text);
    const finalAnswer = geminiAnswer || fallbackAnswer(text);

    addMessage("lyra", finalAnswer);
    setLoading(false);

    speak(finalAnswer);
    if (!voiceEnabled) {
      setStatus(liveMode ? "Canlı mod açık" : "Hazır");
    }
  };

  const startListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionImpl =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      const msg =
        "Bu tarayıcı mikrofonla konuşmayı desteklemiyor kanka. Chrome’da açıp mikrofon iznini vererek tekrar dene.";
      addMessage("lyra", msg);
      speak(msg);
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = "tr-TR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setStatus("Dinliyorum");
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      setListening(false);

      if (transcript) {
        setStatus("Duydum");
        sendMessage(transcript, true);
      } else {
        setStatus(liveMode ? "Canlı mod açık" : "Hazır");
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setStatus(liveMode ? "Canlı mod açık" : "Hazır");
      addMessage(
        "lyra",
        "Mikrofonu alamadım kanka. Tarayıcıdan mikrofon iznini açıp tekrar dene."
      );
    };

    recognition.onend = () => {
      setListening(false);
      if (!loading && !speaking) {
        setStatus(liveMode ? "Canlı mod açık" : "Hazır");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopAllVoice = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setListening(false);
    setSpeaking(false);
    setStatus(liveMode ? "Canlı mod açık" : "Hazır");
  };

  const toggleLiveMode = () => {
    setLiveMode((prev) => {
      const next = !prev;

      if (next) {
        setStatus("Canlı mod açık");
        const msg =
          "Canlı mod açıldı kanka. Mikrofona basınca seni dinleyip sesli cevap vereceğim.";
        addMessage("lyra", msg);
        speak(msg);
      } else {
        stopAllVoice();
        setStatus("Hazır");
      }

      return next;
    });
  };

  const quickPrompts = [
    "Lyra çalışıyor musun?",
    "Bana bugün için içerik fikri ver.",
    "Sesli konuşmayı test edelim.",
    "30 saniyelik reels metni yaz.",
  ];

  return (
    <main className="page">
      <section className="phoneShell">
        <header className="topArea">
          <div>
            <p className="miniTitle">Sirius AI Assistant</p>
            <h1>Lyra</h1>
          </div>

          <div className="statusBox">
            <span
              className={
                listening || speaking || loading ? "statusDot active" : "statusDot"
              }
            />
            <div>
              <small>Durum</small>
              <strong>{status}</strong>
            </div>
          </div>
        </header>

        <section className="avatarStage">
          <div
            className={
              liveMode
                ? "avatarAura live"
                : listening || speaking
                ? "avatarAura active"
                : "avatarAura"
            }
          >
            <div className="halo one" />
            <div className="halo two" />
            <div className="halo three" />

            <div
              className={
                listening
                  ? "avatar listening"
                  : speaking
                  ? "avatar speaking"
                  : loading
                  ? "avatar thinking"
                  : "avatar"
              }
            >
              <div className="hair hairLeft" />
              <div className="hair hairRight" />

              <div className="head">
                <div className="shine" />

                <div className="eyes">
                  <span />
                  <span />
                </div>

                <div className="cheeks">
                  <i />
                  <i />
                </div>

                <div className={speaking || loading ? "mouth moving" : "mouth"} />
              </div>

              <div className="neck" />
              <div className="body">
                <div className="collar" />
              </div>
            </div>
          </div>

          <div className="waveArea">
            <span className={listening || speaking ? "bar on" : "bar"} />
            <span className={listening || speaking ? "bar on" : "bar"} />
            <span className={listening || speaking ? "bar on" : "bar"} />
            <span className={listening || speaking ? "bar on" : "bar"} />
            <span className={listening || speaking ? "bar on" : "bar"} />
          </div>

          <div className="avatarText">
            <h2>{liveMode ? "Canlı konuşma açık" : "Sesli Lyra ekranı"}</h2>
            <p>
              {listening
                ? "Seni dinliyorum kanka..."
                : speaking
                ? "Cevabımı sesli okuyorum..."
                : "Mikrofona bas, konuşalım. Yazılı sohbet de aşağıda açık."}
            </p>
          </div>

          {lastHeard && (
            <div className="heard">
              <small>Senden duyduğum son cümle</small>
              <p>{lastHeard}</p>
            </div>
          )}

          <div className="voiceButtons">
            <button
              className={listening ? "mainVoice pulse" : "mainVoice"}
              onClick={startListening}
            >
              {listening ? "Dinliyorum..." : "Konuş"}
            </button>

            <button
              className={liveMode ? "ghost liveOn" : "ghost"}
              onClick={toggleLiveMode}
            >
              {liveMode ? "Live açık" : "Live mod"}
            </button>

            <button className="ghost" onClick={stopAllVoice}>
              Durdur
            </button>
          </div>
        </section>

        <section className="chatArea">
          <div className="quick">
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
                <span>{message.role === "user" ? "Sen" : "Lyra"}</span>
                <p>{message.text}</p>
              </div>
            ))}

            {loading && (
              <div className="msg lyra">
                <span>Lyra</span>
                <p>Cevabı hazırlıyorum...</p>
              </div>
            )}

            <div ref={endRef} />
          </div>

          <div className="composer">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Lyra’ya yaz..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />

            <button onClick={() => sendMessage()} disabled={loading}>
              {loading ? "..." : "Gönder"}
            </button>
          </div>

          <div className="bottomControls">
            <button
              className={voiceEnabled ? "smallToggle on" : "smallToggle"}
              onClick={() => setVoiceEnabled((prev) => !prev)}
            >
              Sesli cevap: {voiceEnabled ? "Açık" : "Kapalı"}
            </button>

            <button className="smallToggle" onClick={startListening}>
              Mikrofon
            </button>

            <button className="smallToggle" onClick={stopAllVoice}>
              Sesi kes
            </button>
          </div>
        </section>
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: stretch;
          padding: 24px;
          color: #2b2114;
          background:
            radial-gradient(circle at top left, rgba(255, 236, 153, 0.9), transparent 28%),
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.9), transparent 24%),
            radial-gradient(circle at bottom, rgba(255, 196, 87, 0.45), transparent 34%),
            linear-gradient(135deg, #fff8df 0%, #fffdf7 45%, #f7d774 100%);
        }

        .phoneShell {
          width: min(1180px, 100%);
          min-height: calc(100vh - 48px);
          display: grid;
          grid-template-columns: 430px minmax(0, 1fr);
          gap: 20px;
        }

        .topArea {
          grid-column: 1 / -1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 22px;
          border-radius: 34px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.75);
          box-shadow: 0 24px 70px rgba(155, 113, 23, 0.16);
          backdrop-filter: blur(20px);
        }

        .miniTitle {
          margin: 0 0 4px;
          color: #a37012;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        h1 {
          color: #21170c;
          font-size: 42px;
          line-height: 1;
          letter-spacing: -1.6px;
        }

        h2 {
          color: #2b2114;
          font-size: 22px;
          letter-spacing: -0.4px;
        }

        p {
          color: #7c6131;
          line-height: 1.55;
        }

        .statusBox {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 150px;
          padding: 12px 14px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(224, 169, 45, 0.22);
        }

        .statusBox small {
          display: block;
          color: #b28422;
          font-size: 11px;
          font-weight: 900;
        }

        .statusBox strong {
          display: block;
          color: #3a2a14;
          font-size: 14px;
        }

        .statusDot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #c9b37d;
          box-shadow: 0 0 0 5px rgba(201, 179, 125, 0.18);
        }

        .statusDot.active {
          background: #22c55e;
          box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.16);
        }

        .avatarStage,
        .chatArea {
          border-radius: 38px;
          background: rgba(255, 255, 255, 0.68);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 28px 80px rgba(155, 113, 23, 0.16);
          backdrop-filter: blur(22px);
        }

        .avatarStage {
          position: relative;
          overflow: hidden;
          padding: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          min-height: 720px;
        }

        .avatarStage::before {
          content: "";
          position: absolute;
          inset: -80px;
          background:
            radial-gradient(circle at 50% 18%, rgba(255,255,255,0.95), transparent 18%),
            radial-gradient(circle at 50% 45%, rgba(255, 210, 82, 0.62), transparent 28%),
            radial-gradient(circle at 40% 72%, rgba(255, 244, 188, 0.75), transparent 28%);
          filter: blur(10px);
        }

        .avatarAura {
          position: relative;
          width: 310px;
          height: 310px;
          display: grid;
          place-items: center;
          z-index: 1;
          margin-top: 10px;
        }

        .avatarAura.active,
        .avatarAura.live {
          animation: auraPulse 1.7s ease-in-out infinite;
        }

        .halo {
          position: absolute;
          border-radius: 999px;
          border: 1px solid rgba(255, 189, 46, 0.25);
          background: rgba(255, 225, 125, 0.12);
        }

        .halo.one {
          width: 300px;
          height: 300px;
          animation: spin 12s linear infinite;
        }

        .halo.two {
          width: 245px;
          height: 245px;
          animation: spin 9s linear infinite reverse;
        }

        .halo.three {
          width: 190px;
          height: 190px;
          background: rgba(255, 255, 255, 0.28);
          box-shadow: inset 0 0 35px rgba(255, 255, 255, 0.9);
        }

        .avatar {
          position: relative;
          width: 190px;
          height: 240px;
          z-index: 2;
          animation: float 4s ease-in-out infinite;
        }

        .avatar.listening,
        .avatar.speaking,
        .avatar.thinking {
          animation: floatFast 1.2s ease-in-out infinite;
        }

        .hair {
          position: absolute;
          top: 36px;
          width: 78px;
          height: 130px;
          background: linear-gradient(180deg, #f6c357, #b97917);
          border-radius: 60px 60px 70px 70px;
          z-index: 1;
        }

        .hairLeft {
          left: 21px;
          transform: rotate(9deg);
        }

        .hairRight {
          right: 21px;
          transform: rotate(-9deg);
        }

        .head {
          position: absolute;
          top: 34px;
          left: 50%;
          transform: translateX(-50%);
          width: 128px;
          height: 142px;
          border-radius: 48% 48% 45% 45%;
          background: linear-gradient(180deg, #ffe1b8, #f6b982);
          box-shadow:
            inset 0 9px 20px rgba(255, 255, 255, 0.45),
            0 20px 40px rgba(135, 83, 10, 0.24);
          z-index: 3;
          overflow: hidden;
        }

        .shine {
          position: absolute;
          top: 20px;
          left: 23px;
          width: 28px;
          height: 18px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.34);
          filter: blur(2px);
        }

        .eyes {
          position: absolute;
          top: 68px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 28px;
        }

        .eyes span {
          width: 10px;
          height: 15px;
          border-radius: 999px;
          background: #3b2615;
          animation: blink 5s infinite;
        }

        .cheeks {
          position: absolute;
          top: 92px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 48px;
        }

        .cheeks i {
          width: 18px;
          height: 9px;
          border-radius: 999px;
          background: rgba(255, 117, 117, 0.28);
        }

        .mouth {
          position: absolute;
          top: 104px;
          left: 50%;
          transform: translateX(-50%);
          width: 28px;
          height: 8px;
          border-radius: 0 0 999px 999px;
          background: #8a3e2c;
        }

        .mouth.moving {
          animation: mouthTalk 0.55s ease-in-out infinite;
        }

        .neck {
          position: absolute;
          top: 164px;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 34px;
          border-radius: 0 0 18px 18px;
          background: #eaa873;
          z-index: 2;
        }

        .body {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 150px;
          height: 82px;
          border-radius: 58px 58px 28px 28px;
          background: linear-gradient(135deg, #fff7d6, #f7c948, #f59e0b);
          box-shadow: 0 18px 34px rgba(135, 83, 10, 0.2);
          z-index: 1;
        }

        .collar {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: 68px;
          height: 26px;
          border-radius: 0 0 32px 32px;
          background: rgba(255, 255, 255, 0.56);
        }

        .waveArea {
          position: relative;
          z-index: 1;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 8px;
        }

        .bar {
          width: 7px;
          height: 12px;
          border-radius: 999px;
          background: rgba(184, 128, 22, 0.35);
        }

        .bar.on {
          background: linear-gradient(180deg, #facc15, #f97316);
          animation: soundBars 0.9s ease-in-out infinite;
        }

        .bar:nth-child(2) {
          animation-delay: 0.12s;
        }

        .bar:nth-child(3) {
          animation-delay: 0.24s;
        }

        .bar:nth-child(4) {
          animation-delay: 0.36s;
        }

        .bar:nth-child(5) {
          animation-delay: 0.48s;
        }

        .avatarText {
          position: relative;
          z-index: 1;
          max-width: 330px;
          margin-top: 6px;
        }

        .avatarText h2 {
          margin-bottom: 8px;
        }

        .heard {
          position: relative;
          z-index: 1;
          width: 100%;
          margin-top: 18px;
          text-align: left;
          padding: 15px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(255, 207, 89, 0.4);
        }

        .heard small {
          color: #b28422;
          font-weight: 900;
        }

        .heard p {
          color: #3a2a14;
          margin-top: 5px;
          font-size: 14px;
        }

        .voiceButtons {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr;
          gap: 10px;
          width: 100%;
          margin-top: 22px;
        }

        button {
          font-family: inherit;
        }

        .mainVoice,
        .ghost,
        .quick button,
        .composer button,
        .smallToggle {
          border: none;
          cursor: pointer;
          border-radius: 20px;
          padding: 14px 16px;
          font-weight: 900;
          transition: 0.2s ease;
        }

        .mainVoice {
          color: #281707;
          background: linear-gradient(135deg, #fde047, #f59e0b);
          box-shadow: 0 16px 34px rgba(245, 158, 11, 0.35);
        }

        .ghost,
        .quick button,
        .smallToggle {
          color: #6d4b16;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(224, 169, 45, 0.24);
        }

        .ghost.liveOn,
        .smallToggle.on {
          color: white;
          background: linear-gradient(135deg, #f59e0b, #b45309);
          border-color: transparent;
        }

        .mainVoice:hover,
        .ghost:hover,
        .quick button:hover,
        .composer button:hover,
        .smallToggle:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(155, 113, 23, 0.15);
        }

        .pulse {
          animation: buttonPulse 1s infinite;
        }

        .chatArea {
          padding: 22px;
          display: flex;
          flex-direction: column;
          min-height: 720px;
        }

        .quick {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }

        .quick button {
          padding: 10px 13px;
          border-radius: 999px;
          font-size: 13px;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px 4px 16px;
          max-height: calc(100vh - 290px);
          min-height: 420px;
        }

        .msg {
          width: fit-content;
          max-width: 80%;
          border-radius: 24px;
          padding: 13px 15px;
          box-shadow: 0 12px 26px rgba(155, 113, 23, 0.08);
        }

        .msg span {
          display: block;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .msg p {
          white-space: pre-wrap;
        }

        .msg.lyra {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(224, 169, 45, 0.18);
        }

        .msg.lyra span {
          color: #b28422;
        }

        .msg.lyra p {
          color: #4a3517;
        }

        .msg.user {
          align-self: flex-end;
          background: linear-gradient(135deg, #3a2a14, #7c4a03);
          color: white;
        }

        .msg.user span,
        .msg.user p {
          color: white;
        }

        .composer {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          padding-top: 14px;
          border-top: 1px solid rgba(224, 169, 45, 0.18);
        }

        textarea {
          width: 100%;
          min-height: 76px;
          max-height: 150px;
          resize: vertical;
          box-sizing: border-box;
          border-radius: 24px;
          border: 1px solid rgba(224, 169, 45, 0.24);
          background: rgba(255, 255, 255, 0.78);
          outline: none;
          padding: 16px 17px;
          color: #3a2a14;
          font-size: 15px;
          line-height: 1.5;
        }

        textarea:focus {
          border-color: rgba(245, 158, 11, 0.55);
          box-shadow: 0 0 0 5px rgba(245, 158, 11, 0.13);
        }

        .composer button {
          color: #281707;
          background: linear-gradient(135deg, #fde047, #f59e0b);
          min-width: 105px;
          box-shadow: 0 14px 28px rgba(245, 158, 11, 0.25);
        }

        .composer button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .bottomControls {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 12px;
        }

        .smallToggle {
          padding: 10px 13px;
          border-radius: 999px;
          font-size: 13px;
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

        @keyframes floatFast {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-7px) scale(1.025);
          }
        }

        @keyframes auraPulse {
          0%,
          100% {
            transform: scale(1);
            filter: drop-shadow(0 0 0 rgba(245, 158, 11, 0));
          }
          50% {
            transform: scale(1.025);
            filter: drop-shadow(0 0 28px rgba(245, 158, 11, 0.38));
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
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

        @keyframes mouthTalk {
          0%,
          100% {
            width: 24px;
            height: 7px;
          }
          50% {
            width: 34px;
            height: 16px;
            border-radius: 999px;
          }
        }

        @keyframes soundBars {
          0%,
          100% {
            height: 12px;
          }
          50% {
            height: 38px;
          }
        }

        @keyframes buttonPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.03);
          }
        }

        @media (max-width: 980px) {
          .page {
            padding: 14px;
          }

          .phoneShell {
            grid-template-columns: 1fr;
            min-height: auto;
          }

          .topArea {
            flex-direction: column;
            align-items: flex-start;
          }

          .avatarStage,
          .chatArea {
            min-height: auto;
          }

          .messages {
            max-height: 520px;
          }
        }

        @media (max-width: 560px) {
          h1 {
            font-size: 34px;
          }

          .avatarAura {
            width: 270px;
            height: 270px;
          }

          .voiceButtons {
            grid-template-columns: 1fr;
          }

          .composer {
            grid-template-columns: 1fr;
          }

          .composer button {
            width: 100%;
          }

          .msg {
            max-width: 92%;
          }
        }
      `}</style>
    </main>
  );
}
