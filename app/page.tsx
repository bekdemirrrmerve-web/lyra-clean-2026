"use client";

import React, { useMemo, useState } from "react";

type Message = {
  id: number;
  role: "user" | "lyra";
  text: string;
  time: string;
};

type Feature = {
  icon: string;
  title: string;
  desc: string;
};

const LYRA_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg width="360" height="520" viewBox="0 0 360 520" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="360" height="520" rx="42" fill="url(#bg)"/>
  <ellipse cx="180" cy="230" rx="118" ry="150" fill="#F1D0A8" opacity="0.15"/>
  <path d="M94 196C91 116 132 58 184 58C239 58 278 118 268 197C260 260 245 323 247 401H107C111 320 96 262 94 196Z" fill="url(#hair)"/>
  <path d="M116 192C109 123 140 75 183 75C226 75 256 124 248 192C243 238 231 270 212 288H154C135 270 121 238 116 192Z" fill="#F2C394"/>
  <path d="M135 185C134 176 127 171 121 173C114 176 113 191 121 202C127 211 134 209 137 205L135 185Z" fill="#E8B184"/>
  <path d="M225 185C226 176 233 171 239 173C246 176 247 191 239 202C233 211 226 209 223 205L225 185Z" fill="#E8B184"/>
  <path d="M132 129C146 98 178 82 208 96C236 109 251 140 248 178C238 160 221 137 200 129C180 120 155 125 132 129Z" fill="#C9893E"/>
  <path d="M118 190C123 154 133 117 162 101C147 137 145 176 137 218C130 252 121 294 115 356C96 308 91 242 118 190Z" fill="#B8752D"/>
  <path d="M242 184C238 150 229 116 199 101C218 132 218 171 224 218C229 255 237 303 245 357C265 305 270 239 242 184Z" fill="#B8752D"/>
  <path d="M135 161C142 155 151 155 158 161" stroke="#5B3A27" stroke-width="5" stroke-linecap="round"/>
  <path d="M202 161C209 155 218 155 225 161" stroke="#5B3A27" stroke-width="5" stroke-linecap="round"/>
  <circle cx="150" cy="182" r="5" fill="#2E221C"/>
  <circle cx="212" cy="182" r="5" fill="#2E221C"/>
  <path d="M181 181C177 195 174 207 181 209C185 210 188 208 190 206" stroke="#B8755E" stroke-width="4" stroke-linecap="round"/>
  <path d="M159 226C174 238 191 238 205 226" stroke="#A85A5A" stroke-width="5" stroke-linecap="round"/>
  <path d="M148 206C139 204 133 201 127 196" stroke="#E7A6A6" stroke-width="4" stroke-linecap="round" opacity="0.35"/>
  <path d="M214 206C223 204 229 201 235 196" stroke="#E7A6A6" stroke-width="4" stroke-linecap="round" opacity="0.35"/>
  <path d="M145 282C145 282 157 307 181 307C205 307 216 282 216 282L236 294C236 294 220 354 181 354C142 354 125 294 125 294L145 282Z" fill="#EFC29D"/>
  <path d="M103 520C107 426 129 326 160 306H202C232 326 254 426 258 520H103Z" fill="#111827"/>
  <path d="M151 306C158 338 166 364 181 364C196 364 204 338 211 306C201 315 191 320 181 320C171 320 161 315 151 306Z" fill="#F2C394"/>
  <path d="M101 520C106 430 130 345 155 315C159 354 166 390 181 390C196 390 203 354 207 315C232 345 255 430 260 520H101Z" fill="#0B0F18"/>
  <path d="M128 382C142 414 158 434 181 434C204 434 219 414 233 382" stroke="#202838" stroke-width="6" stroke-linecap="round" opacity="0.4"/>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="360" y2="520" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#EEF1F6"/>
    </linearGradient>
    <linearGradient id="hair" x1="90" y1="60" x2="270" y2="410" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F1C06B"/>
      <stop offset="0.45" stop-color="#C9893E"/>
      <stop offset="1" stop-color="#81511F"/>
    </linearGradient>
  </defs>
</svg>
`)}`;

const features: Feature[] = [
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
    desc: "Konu anlat, test üret, yanlışları açıkla.",
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
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [input, setInput] = useState("");
  const [voiceMode, setVoiceMode] = useState("Gemini Live");
  const [gender, setGender] = useState<"Kadın" | "Erkek">("Kadın");
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const now = useMemo(() => {
    return new Date().toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [messages.length]);

  async function sendMessage() {
    const clean = input.trim();
    if (!clean || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: clean,
      time: now,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: clean }),
      });

      const data = await res.json().catch(() => null);

      const answer =
        data?.answer ||
        data?.reply ||
        data?.text ||
        "Cevabı alamadım kanka. Gemini route çalışıyor ama cevap alanı answer, reply veya text olarak dönmüyor olabilir.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "lyra",
          text: answer,
          time: new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "lyra",
          text:
            "Gemini bağlantısı çalışmadı kanka. Şimdilik tasarım aktif; /api/gemini route’unu ve GEMINI_API_KEY ayarını kontrol edelim.",
          time: new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") sendMessage();
  }

  return (
    <main className="lyra-page">
      <aside className="sidebar">
        <div className="brand">LYRA</div>

        <nav className="nav">
          <button className="nav-item active">
            <span>＋</span>
            Yeni Sohbet
          </button>
          <button className="nav-item">
            <span>▢</span>
            Sohbetler
          </button>
          <button className="nav-item">
            <span>⌘</span>
            Modlar
          </button>
          <button className="nav-item">
            <span>▤</span>
            Araçlar
          </button>
          <button className="nav-item">
            <span>♢</span>
            Hatırlatıcılar
          </button>
          <button className="nav-item">
            <span>⚙</span>
            Ayarlar
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="pro-card">
            <span className="spark">✦</span>
            <div>
              <b>LYRA PRO</b>
              <p>AI Asistan</p>
            </div>
          </div>

          <div className="profile-card">
            <div className="avatar-mini">M</div>
            <div>
              <b>Merve</b>
              <p>Pro Üye</p>
            </div>
            <span className="chev">⌄</span>
          </div>

          <div className="usage-card">
            <div className="usage-top">
              <span>Aylık Kullanım</span>
              <b>%68</b>
            </div>
            <div className="bar">
              <div />
            </div>
            <p>Kalan: 32% / 10 gün</p>
          </div>

          <div className="weather-card">
            <span>☀</span>
            <div>
              <b>19°C</b>
              <p>Güneşli</p>
            </div>
            <span>›</span>
          </div>
        </div>
      </aside>

      <section className="desktop">
        <header className="topbar">
          <h1>LYRA AI ASİSTANINIZ</h1>
          <button className="about">ⓘ Lyra Hakkında ⌄</button>
        </header>

        <section className="hero">
          <div className="avatar-glow">
            <div className="avatar-frame">
              <img src={LYRA_AVATAR} alt="Lyra Avatar" />
            </div>
          </div>

          <div className="control-row">
            <button className="pill" onClick={() => setVoiceMode("Gemini Live")}>
              ≋ Ses: {voiceMode} <span>⌄</span>
            </button>
            <button
              className={`pill ${isMuted ? "selected" : ""}`}
              onClick={() => setIsMuted((v) => !v)}
            >
              {isMuted ? "🔇 Sessiz" : "♬ Sessize Al"}
            </button>
            <button
              className={`pill ${gender === "Kadın" ? "selected" : ""}`}
              onClick={() => setGender("Kadın")}
            >
              ♀ Kadın
            </button>
            <button
              className={`pill ${gender === "Erkek" ? "selected" : ""}`}
              onClick={() => setGender("Erkek")}
            >
              ♂ Erkek
            </button>
            <button
              className={`pill live ${isLive ? "selected-live" : ""}`}
              onClick={() => setIsLive((v) => !v)}
            >
              ≋ {isLive ? "Canlı Aktif" : "Canlı Konuşma"}
            </button>
          </div>
        </section>

        <section className="chat-card">
          <div className="messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-row ${
                  message.role === "user" ? "right" : "left"
                }`}
              >
                {message.role === "lyra" && <div className="lyra-icon">✦</div>}

                <div className={`bubble ${message.role}`}>
                  <p>{message.text}</p>
                  <span>{message.time}</span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message-row left">
                <div className="lyra-icon">✦</div>
                <div className="bubble lyra typing">
                  <p>Lyra düşünüyor...</p>
                </div>
              </div>
            )}
          </div>

          <div className="prompt-line">
            Video konunu yaz. Sana başlık, hook ve teleprompter metni çıkarayım.
          </div>

          <div className="input-area">
            <div className="input-tools">
              <button>📎</button>
              <button>☷</button>
              <button className="pdf">PDF</button>
            </div>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Lyra'ya bir şey sor veya yaz..."
            />

            <button className="send" onClick={sendMessage}>
              ▶
            </button>
          </div>
        </section>

        <section className="feature-grid">
          {features.map((feature) => (
            <button className="feature-card" key={feature.title}>
              <span className="feature-icon">{feature.icon}</span>
              <b>{feature.title}</b>
              <p>{feature.desc}</p>
              <small>⌄</small>
            </button>
          ))}
        </section>
      </section>

      <aside className="phone-wrap">
        <div className="phone">
          <div className="phone-screen">
            <div className="phone-status">
              <b>9:41</b>
              <span>▮▮▮</span>
            </div>

            <div className="phone-head">
              <button>☰</button>
              <b>LYRA</b>
              <button>⌄</button>
            </div>

            <div className="phone-logo-card">
              <img src={LYRA_AVATAR} alt="Lyra mobile avatar" />
            </div>

            <div className="phone-controls">
              <button>≋ Ses: Gemini Live</button>
              <button>♬ Sessize AI</button>
              <button>Kadın</button>
              <button>Erkek</button>
              <button className="wide">≋ Canlı Konuşma ›</button>
            </div>

            <div className="phone-input">
              <span>Lyra’ya bir şey sor veya yaz...</span>
              <button>▶</button>
            </div>

            <div className="phone-features">
              {features.slice(0, 6).map((f) => (
                <button key={f.title}>
                  <span>{f.icon}</span>
                  {f.title}
                </button>
              ))}
              <button className="wide">≋ Canlı Mod</button>
            </div>

            <div className="phone-bottom">
              <span>✦</span>
              <span>□</span>
              <span>◷</span>
              <span>♙</span>
            </div>
          </div>
        </div>
      </aside>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(180, 190, 255, 0.24),
              transparent 34%
            ),
            linear-gradient(135deg, #f7f8fb 0%, #edf0f5 100%);
          color: #111827;
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
          cursor: pointer;
          border: 0;
        }

        .lyra-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 260px minmax(760px, 1fr) 330px;
          gap: 18px;
          padding: 16px;
          overflow-x: hidden;
        }

        .sidebar,
        .desktop,
        .phone-wrap {
          border: 1px solid rgba(17, 24, 39, 0.08);
          background: rgba(255, 255, 255, 0.68);
          backdrop-filter: blur(22px);
          box-shadow:
            0 24px 70px rgba(15, 23, 42, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .sidebar {
          border-radius: 28px;
          padding: 26px 18px;
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 32px);
        }

        .brand {
          font-size: 34px;
          font-weight: 950;
          letter-spacing: 6px;
          margin: 0 0 22px 14px;
          color: #101827;
        }

        .nav {
          display: grid;
          gap: 12px;
        }

        .nav-item {
          height: 54px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid rgba(17, 24, 39, 0.08);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.04);
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 18px;
          color: #151922;
          font-weight: 850;
          transition: 0.2s ease;
        }

        .nav-item:hover,
        .nav-item.active {
          transform: translateY(-1px);
          background: #ffffff;
          box-shadow: 0 18px 34px rgba(98, 91, 255, 0.13);
        }

        .nav-item.active span {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: linear-gradient(135deg, #7068ff, #8e84ff);
          color: #fff;
          display: grid;
          place-items: center;
        }

        .sidebar-bottom {
          margin-top: auto;
          display: grid;
          gap: 12px;
        }

        .pro-card,
        .profile-card,
        .usage-card,
        .weather-card {
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(17, 24, 39, 0.08);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
          padding: 16px;
        }

        .pro-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #ffffff, #f1efff);
        }

        .spark {
          color: #766cff;
          font-size: 24px;
        }

        .pro-card b,
        .profile-card b {
          display: block;
          font-size: 15px;
        }

        .pro-card p,
        .profile-card p,
        .weather-card p,
        .usage-card p {
          margin: 2px 0 0;
          font-size: 13px;
          color: #667085;
          font-weight: 700;
        }

        .profile-card,
        .weather-card {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar-mini {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #4b5563, #111827);
          color: white;
          font-weight: 900;
        }

        .chev {
          margin-left: auto;
        }

        .usage-top {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 850;
        }

        .usage-top b {
          color: #6d63ff;
        }

        .bar {
          height: 8px;
          margin: 12px 0 8px;
          border-radius: 999px;
          background: #e6e9f1;
          overflow: hidden;
        }

        .bar div {
          width: 68%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #7068ff, #a39cff);
        }

        .weather-card span:first-child {
          font-size: 26px;
        }

        .weather-card span:last-child {
          margin-left: auto;
          font-size: 22px;
        }

        .desktop {
          min-height: calc(100vh - 32px);
          border-radius: 28px;
          padding: 22px 26px 18px;
          position: relative;
          overflow: hidden;
        }

        .desktop::before {
          content: "";
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          top: -180px;
          left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(
            circle,
            rgba(120, 112, 255, 0.16),
            transparent 67%
          );
          pointer-events: none;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
        }

        .topbar h1 {
          margin: 2px 0 10px;
          font-size: clamp(24px, 3vw, 36px);
          letter-spacing: 9px;
          text-align: center;
          font-weight: 950;
        }

        .about {
          position: absolute;
          right: 0;
          top: 0;
          height: 44px;
          padding: 0 18px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.8);
          color: #111827;
          font-weight: 900;
          border: 1px solid rgba(17, 24, 39, 0.08);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }

        .hero {
          display: grid;
          place-items: center;
          position: relative;
          z-index: 2;
          padding-top: 2px;
        }

        .avatar-glow {
          width: 235px;
          height: 235px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 1),
              rgba(230, 233, 241, 0.6) 55%,
              transparent 70%
            ),
            conic-gradient(
              from 120deg,
              rgba(120, 112, 255, 0.12),
              rgba(255, 255, 255, 0.9),
              rgba(120, 112, 255, 0.12)
            );
        }

        .avatar-frame {
          width: 150px;
          height: 205px;
          border-radius: 28px;
          border: 1px solid rgba(17, 24, 39, 0.12);
          background: linear-gradient(180deg, #ffffff, #eef1f6);
          overflow: hidden;
          position: relative;
          box-shadow:
            0 22px 60px rgba(15, 23, 42, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .avatar-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .control-row {
          margin-top: 8px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .pill {
          min-height: 48px;
          padding: 0 22px;
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(17, 24, 39, 0.08);
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.05);
          font-weight: 900;
          color: #121826;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: 0.2s ease;
        }

        .pill:hover {
          transform: translateY(-1px);
        }

        .pill.selected,
        .pill.selected-live {
          color: #5d55ff;
          background: #ffffff;
          box-shadow: 0 18px 34px rgba(98, 91, 255, 0.16);
        }

        .chat-card {
          margin-top: 18px;
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid rgba(17, 24, 39, 0.08);
          box-shadow:
            0 24px 70px rgba(15, 23, 42, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.78);
          padding: 18px;
          position: relative;
          z-index: 2;
        }

        .messages {
          height: 260px;
          overflow-y: auto;
          padding: 4px 6px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .message-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .message-row.right {
          justify-content: flex-end;
        }

        .lyra-icon {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #f3f1ff;
          color: #766cff;
          flex: 0 0 auto;
        }

        .bubble {
          max-width: 82%;
          border-radius: 18px;
          padding: 14px 16px;
          white-space: pre-line;
          font-weight: 760;
          line-height: 1.46;
          position: relative;
        }

        .bubble p {
          margin: 0;
        }

        .bubble span {
          display: block;
          margin-top: 8px;
          text-align: right;
          color: #667085;
          font-size: 12px;
          font-weight: 800;
        }

        .bubble.lyra {
          background: #ffffff;
          border: 1px solid rgba(17, 24, 39, 0.08);
        }

        .bubble.user {
          background: linear-gradient(135deg, #f4f1ff, #ffffff);
          border: 1px solid rgba(118, 108, 255, 0.16);
        }

        .typing {
          color: #667085;
        }

        .prompt-line {
          margin: 10px 0 16px;
          font-weight: 950;
          color: #4b5563;
        }

        .input-area {
          min-height: 76px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(17, 24, 39, 0.08);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
        }

        .input-tools {
          display: flex;
          gap: 8px;
        }

        .input-tools button,
        .send {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(17, 24, 39, 0.08);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
          font-weight: 950;
        }

        .input-tools .pdf {
          width: auto;
          padding: 0 14px;
        }

        .input-area input {
          flex: 1;
          height: 48px;
          border: 0;
          outline: 0;
          background: transparent;
          font-weight: 760;
          color: #111827;
        }

        .send {
          color: white;
          background: linear-gradient(135deg, #7068ff, #8f86ff);
          box-shadow: 0 18px 34px rgba(98, 91, 255, 0.28);
        }

        .feature-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(7, minmax(110px, 1fr));
          gap: 12px;
          position: relative;
          z-index: 2;
        }

        .feature-card {
          min-height: 150px;
          padding: 18px 12px 14px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(17, 24, 39, 0.08);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.06);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: 0.2s ease;
        }

        .feature-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 24px 52px rgba(98, 91, 255, 0.12);
        }

        .feature-icon {
          font-size: 28px;
          color: #6d63ff;
          height: 35px;
        }

        .feature-card b {
          font-size: 14px;
          margin-top: 6px;
        }

        .feature-card p {
          margin: 8px 0 10px;
          color: #4b5563;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 720;
        }

        .feature-card small {
          margin-top: auto;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #ffffff;
          border: 1px solid rgba(17, 24, 39, 0.08);
          color: #111827;
          font-weight: 950;
        }

        .phone-wrap {
          border-radius: 28px;
          min-height: calc(100vh - 32px);
          display: grid;
          place-items: center;
          padding: 18px;
        }

        .phone {
          width: 292px;
          height: 640px;
          border-radius: 42px;
          padding: 9px;
          background: linear-gradient(145deg, #111827, #2f3541);
          box-shadow:
            0 34px 85px rgba(15, 23, 42, 0.22),
            inset 0 0 0 2px rgba(255, 255, 255, 0.1);
        }

        .phone-screen {
          height: 100%;
          border-radius: 34px;
          background:
            radial-gradient(
              circle at 50% 18%,
              rgba(118, 108, 255, 0.16),
              transparent 30%
            ),
            linear-gradient(180deg, #ffffff, #f1f3f7);
          padding: 18px 14px;
          overflow: hidden;
        }

        .phone-status,
        .phone-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .phone-status {
          font-size: 13px;
          margin-bottom: 18px;
        }

        .phone-head button {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(17, 24, 39, 0.08);
        }

        .phone-head b {
          font-size: 22px;
          letter-spacing: 4px;
          font-weight: 950;
        }

        .phone-logo-card {
          width: 136px;
          height: 166px;
          margin: 20px auto 14px;
          border-radius: 22px;
          background: linear-gradient(145deg, #ffffff, #f0efff);
          border: 1px solid rgba(17, 24, 39, 0.08);
          box-shadow: 0 24px 46px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }

        .phone-logo-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .phone-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .phone-controls button,
        .phone-input,
        .phone-features button {
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(17, 24, 39, 0.08);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
          min-height: 40px;
          font-size: 11px;
          font-weight: 900;
        }

        .phone-controls .wide,
        .phone-features .wide {
          grid-column: 1 / -1;
        }

        .phone-input {
          margin: 12px 0;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
          color: #98a2b3;
          font-size: 11px;
        }

        .phone-input button {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          color: #fff;
          background: linear-gradient(135deg, #7068ff, #8f86ff);
        }

        .phone-features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .phone-features button {
          min-height: 62px;
          padding: 6px 4px;
          display: grid;
          place-items: center;
          line-height: 1.1;
        }

        .phone-features button span {
          color: #6d63ff;
          font-size: 17px;
        }

        .phone-bottom {
          margin-top: 14px;
          height: 46px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.78);
          display: flex;
          justify-content: space-around;
          align-items: center;
          color: #667085;
        }

        .phone-bottom span:first-child {
          color: #6d63ff;
        }

        @media (max-width: 1380px) {
          .lyra-page {
            grid-template-columns: 230px minmax(680px, 1fr);
          }

          .phone-wrap {
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
            border-radius: 24px;
          }

          .sidebar-bottom {
            display: none;
          }

          .nav {
            grid-template-columns: repeat(2, 1fr);
          }

          .desktop {
            min-height: auto;
            padding: 18px;
          }

          .topbar h1 {
            letter-spacing: 4px;
            font-size: 22px;
          }

          .about {
            display: none;
          }

          .avatar-glow {
            width: 190px;
            height: 190px;
          }

          .avatar-frame {
            width: 126px;
            height: 168px;
          }

          .control-row {
            gap: 8px;
          }

          .pill {
            min-height: 42px;
            padding: 0 14px;
            font-size: 13px;
          }

          .messages {
            height: 310px;
          }

          .bubble {
            max-width: 92%;
          }

          .input-area {
            flex-wrap: wrap;
          }

          .input-area input {
            order: -1;
            flex-basis: 100%;
          }

          .feature-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 560px) {
          .nav {
            grid-template-columns: 1fr;
          }

          .feature-grid {
            grid-template-columns: 1fr;
          }

          .brand {
            font-size: 30px;
          }
        }
      `}</style>
    </main>
  );
}
