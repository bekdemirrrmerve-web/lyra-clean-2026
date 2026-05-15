"use client";

import React, { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

type Role = "user" | "lyra";

type Message = {
  id: number;
  role: Role;
  text: string;
  time: string;
};

const LYRA_AVATAR = "/lyra-avatar.jpg.jpeg";
const LYRA_VIDEO = "/lyra-avatar-mp4.mp4";

const navItems = [
  { icon: "+", label: "Yeni Sohbet" },
  { icon: "▢", label: "Sohbetler" },
  { icon: "⌘", label: "Modlar" },
  { icon: "▤", label: "Araçlar" },
  { icon: "♢", label: "Hatırlatıcılar" },
  { icon: "⚙", label: "Ayarlar" },
];

const features = [
  {
    icon: "⌕",
    title: "Araştırma Modu",
    desc: "Bilgi bul, analiz et ve net cevaplar üret.",
  },
  {
    icon: "✎",
    title: "İçerik Üretme",
    desc: "Hook, başlık, video metni ve teleprompter hazırla.",
  },
  {
    icon: "▰",
    title: "Ders Modu",
    desc: "Konu anlat, test üret, yanlış açıkla.",
  },
  {
    icon: "▧",
    title: "Görsel Üretme",
    desc: "Görsel promptu ve konsept hazırla.",
  },
  {
    icon: "◌",
    title: "Görselle Okut",
    desc: "Görsel, belge ve ekranları analiz et.",
  },
  {
    icon: "▤",
    title: "PDF Özeti",
    desc: "PDF yükle, özetle ve not çıkar.",
  },
  {
    icon: "≋",
    title: "Canlı Mod",
    desc: "Gerçek zamanlı konuşma alanı.",
  },
];

const starterMessages: Message[] = [
  {
    id: 1,
    role: "lyra",
    time: "13:21",
    text:
      "Teleprompter Metni:\n“Bugün sana kanka bana cilt bakım toniği formülasyonunu atsana konusunu çok basit anlatacağım. Çünkü çoğu kişi burada yanlış noktaya odaklanıyor. Aslında işin özü çok daha net. Önce problemi anlayacağız, sonra doğru adımı seçeceğiz ve sonunda bunu nasıl uygulayacağımı konuşacağız.”\n\nCTA:\n“Kaydet, sonra birlikte tekrar bakalım.”",
  },
  {
    id: 2,
    role: "user",
    time: "13:22",
    text: "çalışıyo musun",
  },
  {
    id: 3,
    role: "lyra",
    time: "13:22",
    text:
      "Harika! “Çalışıyor musun?” sorusuna öyle bir cevap verelim ki, sadece soruyu geçiştirmekle kalmasın, aynı zamanda değer kattığını hissettirsin.",
  },
];

export default function Page() {
  const cameraRef = useRef<HTMLVideoElement | null>(null);
  const lyraVideoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [input, setInput] = useState("");
  const [gender, setGender] = useState<"Kadın" | "Erkek">("Kadın");
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [liveOpen, setLiveOpen] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [liveText, setLiveText] = useState("Canlı konuşma beklemede.");

  function now() {
    return new Date().toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function sendMessage(customText?: string) {
    const clean = (customText ?? input).trim();
    if (!clean || loading) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        text: clean,
        time: now(),
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: clean,
          mode: liveOpen ? "live" : "chat",
        }),
      });

      const data = await res.json().catch(() => null);

      const answer =
        data?.answer ||
        data?.reply ||
        data?.text ||
        "Cevabı alamadım kanka. Gemini route çalışıyor ama answer, reply veya text alanı dönmüyor olabilir.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "lyra",
          text: answer,
          time: now(),
        },
      ]);

      if (!muted && typeof window !== "undefined") {
        const utter = new SpeechSynthesisUtterance(answer);
        utter.lang = "tr-TR";
        utter.rate = 1;
        utter.pitch = gender === "Kadın" ? 1.08 : 0.92;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }

      lyraVideoRef.current?.play().catch(() => {});
    } catch {
      const fallback =
        "Gemini bağlantısı gelmedi kanka. Tasarım aktif; /api/gemini route’unu ve GEMINI_API_KEY ayarını kontrol etmemiz gerekiyor.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "lyra",
          text: fallback,
          time: now(),
        },
      ]);

      if (!muted && typeof window !== "undefined") {
        const utter = new SpeechSynthesisUtterance(fallback);
        utter.lang = "tr-TR";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleCamera() {
    if (cameraOn) {
      stream?.getTracks().forEach((track) => track.stop());
      setStream(null);
      setCameraOn(false);
      if (cameraRef.current) cameraRef.current.srcObject = null;
      return;
    }

    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      setStream(cameraStream);
      setCameraOn(true);

      setTimeout(() => {
        if (cameraRef.current) {
          cameraRef.current.srcObject = cameraStream;
        }
      }, 50);
    } catch {
      setLiveText(
        "Kamera izni alınamadı. Tarayıcı ayarlarından kamera iznini açmalısın."
      );
    }
  }

  function toggleMic() {
    if (micOn) {
      recognitionRef.current?.stop?.();
      setMicOn(false);
      setLiveText("Mikrofon kapalı.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setLiveText("Bu tarayıcı ses algılamayı desteklemiyor. Chrome ile dene kanka.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "tr-TR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setMicOn(true);
      setLiveText("Dinliyorum...");
    };

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text;
        else interimText += text;
      }

      if (interimText.trim()) setLiveText(interimText.trim());

      if (finalText.trim()) {
        setLiveText(finalText.trim());
        sendMessage(finalText.trim());
      }
    };

    recognition.onerror = () => {
      setMicOn(false);
      setLiveText("Mikrofon bağlantısı kesildi.");
    };

    recognition.onend = () => {
      setMicOn(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function openLive() {
    setLiveOpen(true);

    setTimeout(() => {
      lyraVideoRef.current?.play().catch(() => {});
    }, 100);
  }

  function closeLive() {
    setLiveOpen(false);
    recognitionRef.current?.stop?.();
    setMicOn(false);

    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setCameraOn(false);

    if (cameraRef.current) cameraRef.current.srcObject = null;
    lyraVideoRef.current?.pause();

    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel?.();
    }
  }

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.stop?.();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel?.();
    };
  }, [stream]);

  return (
    <main className="lyra-page">
      <aside className="sidebar">
        <div className="brand">LYRA</div>

        <nav className="nav">
          {navItems.map((item) => (
            <button className="nav-btn" key={item.label}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="pro-card">
            <b>LYRA PRO</b>
            <p>AI Asistan</p>
          </div>

          <div className="profile-card">
            <div className="profile-avatar">M</div>
            <div>
              <b>Merve</b>
              <p>Pro Üye</p>
            </div>
            <span>∨</span>
          </div>

          <div className="usage-card">
            <div className="usage-head">
              <b>Aylık</b>
              <strong>%68</strong>
            </div>
            <div className="usage-bar">
              <i />
            </div>
            <p>Kalan: 32% / 10 gün</p>
          </div>

          <div className="weather">
            <span>☀</span>
            <div>
              <b>19°C</b>
              <p>Güneşli</p>
            </div>
          </div>
        </div>
      </aside>

      <section className="main-shell">
        <header className="topbar">
          <h1>LYRA AI ASİSTANINIZ</h1>
          <button className="about-btn">Lyra Hakkında</button>
          <button className="round-btn">∨</button>
        </header>

        <section className="avatar-area">
          <div className="halo">
            <div className="avatar-card">
              <img src={LYRA_AVATAR} alt="Lyra Avatar" />
            </div>
          </div>

          <div className="control-row">
            <button className="control-btn">
              ≋ Ses: Gemini Live <span>∨</span>
            </button>

            <button
              className={`control-btn ${muted ? "active" : ""}`}
              onClick={() => {
                setMuted((v) => !v);
                window.speechSynthesis?.cancel?.();
              }}
            >
              ♫ {muted ? "Ses Kapalı" : "Sessize Al"}
            </button>

            <button
              className={`control-btn small ${
                gender === "Kadın" ? "active-soft" : ""
              }`}
              onClick={() => setGender("Kadın")}
            >
              ♀ Kadın
            </button>

            <button
              className={`control-btn small ${
                gender === "Erkek" ? "active-soft" : ""
              }`}
              onClick={() => setGender("Erkek")}
            >
              ♂ Erkek
            </button>

            <button className="control-btn" onClick={openLive}>
              ≋ Canlı Konuşma
            </button>
          </div>
        </section>

        <section className="chat-panel">
          <div className="message-scroll">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`msg-row ${
                  message.role === "user" ? "user-row" : "lyra-row"
                } ${index === 0 ? "first-message" : ""}`}
              >
                <div className={`bubble ${message.role}`}>
                  <p>{message.text}</p>
                  {message.role === "user" && <span>{message.time}</span>}
                </div>
              </div>
            ))}

            {loading && (
              <div className="msg-row lyra-row">
                <div className="bubble lyra">
                  <p>Lyra düşünüyor...</p>
                </div>
              </div>
            )}
          </div>

          <p className="prompt-hint">
            Video konunu yaz. Sana başlık, hook ve teleprompter metni çıkarayım.
          </p>

          <div className="input-box">
            <button>◖</button>
            <button>▧</button>
            <button className="pdf-btn">PDF</button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Lyra'ya bir şey sor veya yaz..."
            />

            <button className="send-btn" onClick={() => sendMessage()}>
              ▶
            </button>
          </div>
        </section>

        <section className="feature-grid">
          {features.map((feature) => (
            <button
              key={feature.title}
              className="feature-card"
              onClick={feature.title === "Canlı Mod" ? openLive : undefined}
            >
              <span>{feature.icon}</span>
              <b>{feature.title}</b>
              <p>{feature.desc}</p>
              <em>∨</em>
            </button>
          ))}
        </section>
      </section>

      <aside className="phone-panel">
        <div className="phone">
          <div className="phone-screen">
            <div className="phone-status">
              <b>9:41</b>
              <div className="notch" />
              <span>▮▮▮</span>
            </div>

            <div className="phone-head">
              <button>☰</button>
              <b>LYRA</b>
              <button>∨</button>
            </div>

            <div className="phone-logo">
              <b>LYRA</b>
            </div>

            <div className="phone-controls">
              <button>≋ Ses: Gemini Live</button>
              <button>Sessize AI</button>
              <button>Kadın</button>
              <button>Erkek</button>
              <button className="wide" onClick={openLive}>
                ≋ Canlı Konuşma ›
              </button>
            </div>

            <div className="phone-input">
              <span>Lyra’ya bir şey sor veya yaz...</span>
              <button>▶</button>
            </div>

            <div className="phone-grid">
              {features.slice(0, 6).map((feature) => (
                <button key={feature.title}>
                  <span>{feature.icon}</span>
                  <b>{feature.title}</b>
                  <em>∨</em>
                </button>
              ))}

              <button className="single" onClick={openLive}>
                <span>≋</span>
                <b>Canlı Mod</b>
                <em>∨</em>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {liveOpen && (
        <div className="live-overlay">
          <section className="live-modal">
            <div className="live-left">
              <div className="live-top">
                <b>LYRA CANLI KONUŞMA</b>
                <button onClick={closeLive}>×</button>
              </div>

              <div className="live-avatar">
                <video
                  ref={lyraVideoRef}
                  src={LYRA_VIDEO}
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster={LYRA_AVATAR}
                />

                <div className="live-ring one" />
                <div className="live-ring two" />

                <span>{loading ? "Cevap hazırlıyor..." : "Konuşmaya hazır"}</span>
              </div>

              <div className="live-actions">
                <button className={cameraOn ? "on" : ""} onClick={toggleCamera}>
                  ◉ {cameraOn ? "Kamera Açık" : "Kamera Aç"}
                </button>

                <button className={micOn ? "on" : ""} onClick={toggleMic}>
                  ♫ {micOn ? "Dinliyorum" : "Mikrofon"}
                </button>

                <button
                  className={muted ? "on" : ""}
                  onClick={() => {
                    setMuted((v) => !v);
                    window.speechSynthesis?.cancel?.();
                  }}
                >
                  {muted ? "Ses Kapalı" : "Ses Açık"}
                </button>
              </div>
            </div>

            <aside className="live-side">
              <div className="camera-box">
                {cameraOn ? (
                  <video ref={cameraRef} autoPlay playsInline muted />
                ) : (
                  <div>
                    <span>◉</span>
                    <p>Kamera kapalı</p>
                  </div>
                )}
              </div>

              <div className="transcript-box">
                <b>Canlı Algılama</b>
                <p>{liveText}</p>
              </div>

              <div className="live-mini-chat">
                <b>Son Konuşmalar</b>
                <div>
                  {messages.slice(-3).map((m) => (
                    <p key={m.id} className={m.role}>
                      {m.text}
                    </p>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        </div>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background:
            radial-gradient(
              circle at 50% -15%,
              rgba(255, 255, 255, 1),
              rgba(255, 255, 255, 0) 30%
            ),
            linear-gradient(135deg, #f8fafc 0%, #e8edf1 100%);
          color: #111;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          border: 0;
          cursor: pointer;
        }

        .lyra-page {
          min-height: 100vh;
          padding: 14px;
          display: grid;
          grid-template-columns: 235px minmax(780px, 1fr) 330px;
          gap: 14px;
          overflow-x: hidden;
        }

        .sidebar,
        .main-shell,
        .phone-panel {
          border: 1px solid #cfd3d8;
          background: linear-gradient(145deg, #ffffff 0%, #edf1f4 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 18px 44px rgba(0, 0, 0, 0.055);
        }

        .sidebar {
          border-radius: 26px;
          padding: 26px 16px 18px;
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 28px);
        }

        .brand {
          margin: 0 0 22px 12px;
          font-size: 34px;
          font-weight: 950;
          letter-spacing: 5px;
          line-height: 1;
        }

        .nav {
          display: grid;
          gap: 12px;
        }

        .nav-btn,
        .control-btn,
        .about-btn,
        .round-btn,
        .feature-card,
        .input-box button,
        .phone-controls button,
        .phone-grid button,
        .phone-input,
        .pro-card,
        .profile-card,
        .usage-card,
        .weather,
        .live-actions button {
          border: 1px solid #c9ced4;
          background: linear-gradient(145deg, #ffffff 0%, #eef1f4 100%);
          color: #111;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.96),
            inset 0 -8px 18px rgba(0, 0, 0, 0.035),
            0 9px 22px rgba(0, 0, 0, 0.045);
          font-weight: 950;
        }

        .nav-btn {
          height: 52px;
          border-radius: 17px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          text-align: left;
          font-size: 15px;
        }

        .nav-btn span {
          width: 18px;
          display: inline-grid;
          place-items: center;
          font-size: 17px;
        }

        .sidebar-bottom {
          margin-top: auto;
          display: grid;
          gap: 12px;
        }

        .pro-card,
        .profile-card,
        .usage-card,
        .weather {
          border-radius: 18px;
          padding: 15px;
        }

        .pro-card b,
        .profile-card b,
        .usage-card b,
        .weather b {
          display: block;
          font-size: 14px;
        }

        .pro-card p,
        .profile-card p,
        .usage-card p,
        .weather p {
          margin: 3px 0 0;
          color: #4b5563;
          font-size: 12px;
          font-weight: 850;
        }

        .profile-card,
        .weather {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .profile-card > span {
          margin-left: auto;
          font-weight: 950;
        }

        .profile-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at 30% 20%, #a7adb5, #111);
          color: white;
          font-weight: 950;
        }

        .usage-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .usage-head strong {
          font-size: 15px;
        }

        .usage-bar {
          height: 8px;
          border-radius: 999px;
          background: #d8dde3;
          overflow: hidden;
          margin: 12px 0 6px;
        }

        .usage-bar i {
          display: block;
          width: 68%;
          height: 100%;
          background: #111;
          border-radius: inherit;
        }

        .weather span {
          font-size: 24px;
        }

        .main-shell {
          min-height: calc(100vh - 28px);
          border-radius: 26px;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .main-shell::before {
          content: "";
          width: 620px;
          height: 620px;
          border-radius: 999px;
          position: absolute;
          left: 50%;
          top: -300px;
          transform: translateX(-50%);
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 1),
            rgba(217, 222, 228, 0.58),
            transparent 68%
          );
          pointer-events: none;
        }

        .topbar {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .topbar h1 {
          margin: 0;
          font-size: clamp(25px, 3vw, 34px);
          letter-spacing: 8px;
          font-weight: 950;
          text-align: center;
        }

        .about-btn {
          position: absolute;
          right: 52px;
          top: 0;
          height: 42px;
          border-radius: 18px;
          padding: 0 18px;
          font-size: 14px;
        }

        .round-btn {
          position: absolute;
          right: 0;
          top: 0;
          width: 42px;
          height: 42px;
          border-radius: 50%;
        }

        .avatar-area {
          position: relative;
          z-index: 2;
          display: grid;
          place-items: center;
          margin-top: 4px;
        }

        .halo {
          width: 226px;
          height: 226px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 1) 0%,
              rgba(233, 237, 241, 0.95) 52%,
              transparent 69%
            ),
            conic-gradient(
              from 160deg,
              rgba(200, 205, 211, 0.8),
              rgba(255, 255, 255, 1),
              rgba(200, 205, 211, 0.8)
            );
        }

        .avatar-card {
          width: 150px;
          height: 205px;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid #c9ced4;
          background: #fff;
          box-shadow: 0 16px 35px rgba(0, 0, 0, 0.07);
        }

        .avatar-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .control-row {
          margin-top: -2px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .control-btn {
          min-height: 52px;
          min-width: 138px;
          padding: 0 22px;
          border-radius: 18px;
          font-size: 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          white-space: nowrap;
        }

        .control-btn.small {
          min-width: 110px;
        }

        .control-btn.active,
        .control-btn.active-soft {
          background: linear-gradient(145deg, #f8fafc 0%, #dfe4e8 100%);
          border-color: #b9c0c8;
        }

        .chat-panel {
          position: relative;
          z-index: 2;
          margin-top: 12px;
          min-height: 355px;
          border-radius: 25px;
          border: 1px solid #cfd3d8;
          background: linear-gradient(145deg, #ffffff 0%, #edf1f4 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 16px 36px rgba(0, 0, 0, 0.055);
          padding: 18px;
        }

        .message-scroll {
          height: 225px;
          overflow-y: auto;
          padding-right: 8px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .message-scroll::-webkit-scrollbar {
          width: 11px;
        }

        .message-scroll::-webkit-scrollbar-track {
          background: #eef1f4;
          border-radius: 999px;
        }

        .message-scroll::-webkit-scrollbar-thumb {
          background: #8e949b;
          border-radius: 999px;
          border: 3px solid #eef1f4;
        }

        .msg-row {
          display: flex;
          width: 100%;
        }

        .lyra-row {
          justify-content: flex-start;
        }

        .user-row {
          justify-content: flex-end;
        }

        .bubble {
          border-radius: 17px;
          padding: 12px 14px;
          font-weight: 950;
          line-height: 1.45;
          white-space: pre-line;
          font-size: 13.5px;
        }

        .first-message .bubble {
          width: min(1000px, 91%);
          min-height: 138px;
        }

        .bubble p {
          margin: 0;
        }

        .bubble.lyra {
          background: #ffffff;
          border: 1px solid #d7dbe0;
          color: #111;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .bubble.user {
          background: #111;
          color: #fff;
          border-radius: 15px;
          max-width: 260px;
        }

        .bubble span {
          display: block;
          margin-top: 6px;
          text-align: right;
          font-size: 11px;
          opacity: 0.7;
        }

        .prompt-hint {
          margin: 15px 0 16px;
          color: #4b5563;
          font-size: 18px;
          font-weight: 950;
        }

        .input-box {
          height: 55px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .input-box button {
          height: 42px;
          min-width: 42px;
          padding: 0 12px;
          border-radius: 999px;
        }

        .input-box .pdf-btn {
          min-width: 58px;
        }

        .input-box input {
          flex: 1;
          height: 42px;
          border: 0;
          outline: none;
          background: transparent;
          font-weight: 850;
          color: #111;
        }

        .input-box input::placeholder {
          color: transparent;
        }

        .send-btn {
          margin-left: auto;
          width: 46px;
        }

        .feature-grid {
          position: relative;
          z-index: 2;
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(7, minmax(112px, 1fr));
          gap: 10px;
        }

        .feature-card {
          min-height: 140px;
          border-radius: 19px;
          padding: 17px 11px 10px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }

        .feature-card span {
          height: 30px;
          font-size: 24px;
          display: grid;
          place-items: center;
        }

        .feature-card b {
          margin-top: 6px;
          font-size: 13.5px;
          line-height: 1.15;
        }

        .feature-card p {
          margin: 7px 0 6px;
          font-size: 11px;
          line-height: 1.25;
          font-weight: 850;
        }

        .feature-card em {
          margin-top: auto;
          font-style: normal;
          font-size: 14px;
          font-weight: 950;
        }

        .phone-panel {
          min-height: calc(100vh - 28px);
          border-radius: 26px;
          display: grid;
          place-items: center;
          padding: 18px;
        }

        .phone {
          width: 292px;
          height: 645px;
          border-radius: 42px;
          padding: 9px;
          background: linear-gradient(145deg, #111, #3b414a);
          box-shadow: 0 26px 68px rgba(0, 0, 0, 0.2);
        }

        .phone-screen {
          height: 100%;
          border-radius: 34px;
          background: linear-gradient(180deg, #ffffff, #edf1f4);
          padding: 16px 13px;
          overflow: hidden;
        }

        .phone-status {
          height: 27px;
          display: grid;
          grid-template-columns: 1fr 75px 1fr;
          align-items: center;
          font-size: 13px;
          font-weight: 950;
        }

        .phone-status span {
          justify-self: end;
        }

        .notch {
          justify-self: center;
          width: 74px;
          height: 24px;
          border-radius: 999px;
          background: #050505;
        }

        .phone-head {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .phone-head button {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid #d4d8dd;
          background: #fff;
          font-weight: 950;
        }

        .phone-head b {
          font-size: 22px;
          letter-spacing: 4px;
          font-weight: 950;
        }

        .phone-logo {
          width: 136px;
          height: 168px;
          margin: 14px auto 10px;
          border-radius: 21px;
          border: 1px solid #d4d8dd;
          background: linear-gradient(145deg, #ffffff, #edf1f4);
          display: grid;
          place-items: center;
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.07);
        }

        .phone-logo b {
          font-size: 24px;
          letter-spacing: 6px;
          font-weight: 950;
        }

        .phone-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .phone-controls button {
          min-height: 40px;
          border-radius: 14px;
          font-size: 11px;
          padding: 0 7px;
        }

        .phone-controls .wide {
          grid-column: 1 / -1;
        }

        .phone-input {
          height: 50px;
          margin: 12px 0;
          border-radius: 17px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
        }

        .phone-input span {
          font-size: 11px;
          color: #111;
          font-weight: 900;
        }

        .phone-input button {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #fff;
          border: 1px solid #d4d8dd;
          font-weight: 950;
        }

        .phone-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .phone-grid button {
          min-height: 80px;
          border-radius: 14px;
          padding: 6px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }

        .phone-grid span {
          font-size: 18px;
          line-height: 1;
        }

        .phone-grid b {
          font-size: 10px;
          line-height: 1.05;
        }

        .phone-grid em {
          font-style: normal;
          font-size: 11px;
        }

        .phone-grid .single {
          grid-column: 1 / 2;
        }

        .live-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(17, 24, 39, 0.38);
          backdrop-filter: blur(12px);
        }

        .live-modal {
          width: min(930px, 96vw);
          min-height: 560px;
          border-radius: 30px;
          border: 1px solid #cfd3d8;
          background: linear-gradient(145deg, #ffffff, #edf1f4);
          box-shadow: 0 32px 90px rgba(0, 0, 0, 0.22);
          padding: 18px;
          display: grid;
          grid-template-columns: 1fr 310px;
          gap: 16px;
        }

        .live-left,
        .live-side {
          border-radius: 24px;
          border: 1px solid #cfd3d8;
          background: linear-gradient(145deg, #ffffff, #eef1f4);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 12px 28px rgba(0, 0, 0, 0.055);
        }

        .live-left {
          padding: 16px;
          position: relative;
          display: grid;
          grid-template-rows: auto 1fr auto;
        }

        .live-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 950;
          letter-spacing: 2px;
        }

        .live-top button {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #111;
          color: white;
          font-size: 22px;
        }

        .live-avatar {
          position: relative;
          display: grid;
          place-items: center;
          min-height: 410px;
        }

        .live-avatar::before {
          content: "";
          width: 420px;
          height: 420px;
          max-width: 80%;
          max-height: 80%;
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 1),
            rgba(217, 222, 228, 0.75),
            transparent 70%
          );
        }

        .live-avatar video {
          position: relative;
          z-index: 2;
          width: 230px;
          height: 330px;
          object-fit: cover;
          border-radius: 30px;
          border: 1px solid #c9ced4;
          background: white;
          box-shadow: 0 22px 50px rgba(0, 0, 0, 0.12);
          display: block;
        }

        .live-avatar span {
          position: absolute;
          z-index: 3;
          bottom: 24px;
          padding: 10px 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid #d4d8dd;
          font-weight: 950;
        }

        .live-ring {
          position: absolute;
          z-index: 1;
          width: 260px;
          height: 350px;
          border-radius: 38px;
          border: 1px solid rgba(17, 17, 17, 0.18);
          animation: livePulse 2.2s infinite;
        }

        .live-ring.two {
          animation-delay: 1.1s;
        }

        @keyframes livePulse {
          0% {
            opacity: 0.75;
            transform: scale(0.93);
          }
          100% {
            opacity: 0;
            transform: scale(1.18);
          }
        }

        .live-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .live-actions button {
          height: 48px;
          border-radius: 16px;
        }

        .live-actions button.on {
          background: #111;
          color: #fff;
          border-color: #111;
        }

        .live-side {
          padding: 14px;
          display: grid;
          gap: 12px;
          align-content: start;
        }

        .camera-box {
          height: 250px;
          border-radius: 22px;
          overflow: hidden;
          background: #111;
          border: 1px solid #cfd3d8;
        }

        .camera-box video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
          display: block;
        }

        .camera-box > div {
          height: 100%;
          color: #fff;
          display: grid;
          place-items: center;
          text-align: center;
          font-weight: 950;
        }

        .camera-box span {
          display: block;
          font-size: 42px;
        }

        .camera-box p {
          margin: 8px 0 0;
        }

        .transcript-box,
        .live-mini-chat {
          border-radius: 20px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid #d4d8dd;
        }

        .transcript-box {
          min-height: 130px;
        }

        .transcript-box b,
        .live-mini-chat b {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .transcript-box p {
          margin: 0;
          color: #4b5563;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.45;
        }

        .live-mini-chat {
          max-height: 165px;
          overflow: auto;
        }

        .live-mini-chat p {
          margin: 0 0 8px;
          padding: 8px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 850;
          line-height: 1.35;
        }

        .live-mini-chat p.lyra {
          background: #fff;
          border: 1px solid #d4d8dd;
          color: #111;
        }

        .live-mini-chat p.user {
          background: #111;
          color: #fff;
        }

        @media (max-width: 1420px) {
          .lyra-page {
            grid-template-columns: 225px minmax(700px, 1fr);
          }

          .phone-panel {
            display: none;
          }

          .feature-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 980px) {
          .lyra-page {
            grid-template-columns: 1fr;
            padding: 10px;
          }

          .sidebar {
            min-height: auto;
          }

          .sidebar-bottom {
            display: none;
          }

          .nav {
            grid-template-columns: repeat(2, 1fr);
          }

          .topbar h1 {
            font-size: 22px;
            letter-spacing: 4px;
          }

          .about-btn,
          .round-btn {
            display: none;
          }

          .control-row {
            gap: 8px;
          }

          .control-btn {
            min-height: 45px;
            min-width: auto;
            padding: 0 14px;
            font-size: 13px;
          }

          .chat-panel {
            min-height: 430px;
          }

          .message-scroll {
            height: 285px;
          }

          .first-message .bubble {
            width: 100%;
          }

          .feature-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .live-modal {
            grid-template-columns: 1fr;
          }

          .live-actions {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .nav {
            grid-template-columns: 1fr;
          }

          .feature-grid {
            grid-template-columns: 1fr;
          }

          .prompt-hint {
            font-size: 15px;
          }

          .bubble {
            max-width: 94%;
          }

          .input-box {
            flex-wrap: wrap;
            height: auto;
          }

          .input-box input {
            order: -1;
            flex-basis: 100%;
            height: 45px;
          }

          .live-avatar video {
            width: 190px;
            height: 275px;
          }
        }
      `}</style>
    </main>
  );
}
