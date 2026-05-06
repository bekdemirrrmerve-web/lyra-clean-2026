'use client';

import { useState } from 'react';

type ModeKey = 'research' | 'content' | 'lesson' | 'image' | 'read' | 'live';

const modes: {
  key: ModeKey;
  title: string;
  desc: string;
  icon: string;
  options: string[];
}[] = [
  {
    key: 'research',
    title: 'Araştırma Modu',
    desc: 'Bilgi bul, analiz et ve net cevaplar üret.',
    icon: '⌕',
    options: ['Derin araştır', 'Kaynaklı özetle', 'Güncel bilgi bul'],
  },
  {
    key: 'content',
    title: 'İçerik Üretme',
    desc: 'Hook, metin, video fikri ve içerik hazırla.',
    icon: '✎',
    options: ['Hook yaz', 'Teleprompter hazırla', 'Video fikri üret'],
  },
  {
    key: 'lesson',
    title: 'Ders Modu',
    desc: 'Konu anlat, soru çöz ve öğrenmeyi kolaylaştır.',
    icon: '▰',
    options: ['Konu anlat', 'Test üret', 'Yanlışımı açıkla'],
  },
  {
    key: 'image',
    title: 'Görsel Üretme',
    desc: 'Fikirleri görsele dönüştür ve tasarla.',
    icon: '▧',
    options: ['Prompt yaz', 'Konsept üret', 'Görsel fikri ver'],
  },
  {
    key: 'read',
    title: 'Görselle Okut',
    desc: 'Görsel, belge ve ekranları analiz et.',
    icon: '◌',
    options: ['Fotoğraf oku', 'Belge analiz et', 'Etiket çöz'],
  },
  {
    key: 'live',
    title: 'Canlı Mod',
    desc: 'Gerçek zamanlı konuşma alanına geç.',
    icon: '≋',
    options: ['Canlı konuş', 'Ses seç', 'Sessize al'],
  },
];

export default function Page() {
  const [activeMode, setActiveMode] = useState<ModeKey | null>(null);
  const [muted, setMuted] = useState(false);
  const [gender, setGender] = useState<'Kadın' | 'Erkek'>('Kadın');
  const [liveOpen, setLiveOpen] = useState(false);

  const active = modes.find((item) => item.key === activeMode);

  const openMode = (key: ModeKey) => {
    if (key === 'live') {
      setLiveOpen(true);
      setActiveMode('live');
      return;
    }

    setActiveMode((current) => (current === key ? null : key));
  };

  return (
    <main className="page">
      <section className="brand-outside">
        <div className="brand-star">✦</div>
        <div className="brand-text">LYRA</div>
      </section>

      <section className="app-layout">
        <aside className="sidebar glass">
          <div className="logo-row">
            <span>✦</span>
            <strong>LYRA</strong>
          </div>

          <nav className="menu">
            <button className="menu-item active">
              <span>＋</span> Yeni Sohbet
            </button>
            <button className="menu-item">
              <span>▢</span> Sohbetler
            </button>
            <button className="menu-item">
              <span>⌘</span> Modlar
            </button>
            <button className="menu-item">
              <span>▤</span> Araçlar
            </button>
            <button className="menu-item">
              <span>♢</span> Hatırlatıcılar
            </button>
            <button className="menu-item">
              <span>⚙</span> Ayarlar
            </button>
          </nav>

          <div className="side-bottom">
            <div className="mini-box">
              <span>✦</span>
              <div>
                <strong>LYRA PRO</strong>
                <small>AI Asistan</small>
              </div>
            </div>

            <div className="profile-box">
              <div className="profile-dot">M</div>
              <div>
                <strong>Merve</strong>
                <small>Pro Üye</small>
              </div>
              <span>⌄</span>
            </div>

            <div className="usage-box">
              <div>
                <strong>Aylık Kullanım</strong>
                <b>%68</b>
              </div>
              <span className="usage-line">
                <i />
              </span>
              <small>6.8 / 10 saat</small>
            </div>
          </div>
        </aside>

        <section className="main-panel glass">
          <header className="main-head">
            <h1>LYRA AI ASİSTANINIZ</h1>

            <div className="head-actions">
              <button>ⓘ Lyra Hakkında</button>
              <button>♢</button>
            </div>
          </header>

          <section className="hero">
            <div className="silver-orbit orbit-one" />
            <div className="silver-orbit orbit-two" />
            <div className="silver-orbit orbit-three" />

            <div className="avatar-video-wrap">
              <video
                className="avatar-video"
                src="/lyra-avatar-mp4.mp4"
                poster="/lyra-avatar.jpg.jpeg"
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
          </section>

          <section className="controls">
            <button className="control">
              <span className="sound">≋</span>
              Ses: Lyra
              <b>⌄</b>
            </button>

            <button
              className={`control ${muted ? 'selected' : ''}`}
              onClick={() => setMuted((value) => !value)}
            >
              <span>♬</span>
              {muted ? 'Sessiz' : 'Sessize Al'}
            </button>

            <button
              className={`control ${gender === 'Kadın' ? 'selected' : ''}`}
              onClick={() => setGender('Kadın')}
            >
              <span>♙</span>
              Kadın
            </button>

            <button
              className={`control ${gender === 'Erkek' ? 'selected' : ''}`}
              onClick={() => setGender('Erkek')}
            >
              <span>♙</span>
              Erkek
            </button>

            <button className="control live" onClick={() => setLiveOpen(true)}>
              <span className="sound">≋</span>
              Canlı Konuşma
            </button>
          </section>

          <section className="write-box">
            <textarea placeholder="Lyra’ya bir şey sor veya yaz..." />

            <div className="write-actions">
              <div>
                <button>⌘</button>
                <button>✧</button>
                <button>▧</button>
              </div>

              <button className="send">▶</button>
            </div>
          </section>

          <section className="mode-grid">
            {modes.map((mode) => (
              <button
                key={mode.key}
                className={`mode-card ${activeMode === mode.key ? 'active' : ''}`}
                onClick={() => openMode(mode.key)}
              >
                <span className="mode-icon">{mode.icon}</span>
                <strong>{mode.title}</strong>
                <small>{mode.desc}</small>
                <b>⌄</b>
              </button>
            ))}
          </section>

          {active && active.key !== 'live' && (
            <section className="sub-panel">
              <strong>{active.title}</strong>
              <div>
                {active.options.map((option) => (
                  <button key={option}>{option}</button>
                ))}
              </div>
            </section>
          )}
        </section>

        <aside className="phone-shell">
          <div className="phone">
            <div className="phone-status">
              <strong>9:41</strong>
              <span />
              <b>▮▮▮</b>
            </div>

            <div className="phone-head">
              <button>☰</button>
              <strong>
                <span>✦</span> LYRA
              </strong>
              <button>♢</button>
            </div>

            <div className="phone-hero">
              <div className="phone-ring" />
              <div className="phone-avatar-video-wrap">
                <video
                  className="phone-avatar-video"
                  src="/lyra-avatar.mp4"
                  poster="/lyra-avatar.jpg"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
            </div>

            <div className="phone-controls">
              <button>≋ Ses: Lyra</button>
              <button>{muted ? 'Sessiz' : 'Sessize Al'}</button>
              <button className={gender === 'Kadın' ? 'selected' : ''}>Kadın</button>
              <button className={gender === 'Erkek' ? 'selected' : ''}>Erkek</button>
              <button className="phone-live" onClick={() => setLiveOpen(true)}>
                ≋ Canlı Konuşma ›
              </button>
            </div>

            <div className="phone-input">
              <span>Lyra’ya bir şey sor veya yaz...</span>
              <button>▶</button>
            </div>

            <div className="phone-grid">
              {modes.map((mode) => (
                <button key={mode.key} onClick={() => openMode(mode.key)}>
                  <span>{mode.icon}</span>
                  <strong>{mode.title}</strong>
                  <small>⌄</small>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {liveOpen && (
        <section className="modal">
          <div className="live-panel glass">
            <button className="close" onClick={() => setLiveOpen(false)}>
              ×
            </button>

            <div className="live-avatar-video-wrap">
              <span className="live-pulse one" />
              <span className="live-pulse two" />
              <video
                className="live-avatar-video"
                src="/lyra-avatar.mp4"
                poster="/lyra-avatar.jpg"
                autoPlay
                loop
                muted
                playsInline
              />
            </div>

            <h2>Canlı Konuşma</h2>
            <p>Lyra canlı mod alanı. Buradan sesli konuşma sistemine bağlanacak.</p>

            <div className="live-buttons">
              <button>🎙 Konuşmayı Başlat</button>
              <button>≋ Ses: Lyra</button>
              <button onClick={() => setMuted((value) => !value)}>
                {muted ? 'Sesi Aç' : 'Sessize Al'}
              </button>
            </div>
          </div>
        </section>
      )}

      <style jsx global>{`
        :root {
          --white: #ffffff;
          --silver-1: #f8f9fa;
          --silver-2: #eef1f3;
          --silver-3: #dfe3e7;
          --silver-4: #c5cbd1;
          --graphite: #111417;
          --graphite-soft: #30363b;
          --muted: #555d64;
          --line: rgba(20, 24, 28, 0.13);
          --line-strong: rgba(20, 24, 28, 0.2);
          --shadow: 0 30px 90px rgba(18, 22, 26, 0.14);
          --shadow-soft: 0 14px 40px rgba(18, 22, 26, 0.09);
          --glass: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.95),
            rgba(235, 238, 241, 0.78),
            rgba(255, 255, 255, 0.88)
          );
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
            'Segoe UI', sans-serif;
          color: var(--graphite);
          background:
            radial-gradient(circle at 48% 22%, rgba(255, 255, 255, 1), transparent 32%),
            linear-gradient(135deg, #ffffff 0%, #f5f7f8 44%, #e6eaee 100%);
        }

        button,
        textarea {
          font: inherit;
        }

        button {
          cursor: pointer;
          border: 0;
        }

        .page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          padding: 34px 34px 44px;
        }

        .page::before,
        .page::after {
          content: '';
          position: absolute;
          inset: -22%;
          pointer-events: none;
          background:
            radial-gradient(ellipse at 50% 42%, transparent 0 28%, rgba(255, 255, 255, 0.92) 29%, transparent 30%),
            radial-gradient(ellipse at 48% 44%, transparent 0 37%, rgba(218, 224, 229, 0.62) 38%, transparent 39%),
            radial-gradient(ellipse at 52% 46%, transparent 0 47%, rgba(255, 255, 255, 0.52) 48%, transparent 49%);
          opacity: 0.86;
        }

        .page::after {
          transform: rotate(-15deg) scale(1.12);
          opacity: 0.42;
        }

        .brand-outside {
          position: relative;
          z-index: 2;
          width: 150px;
          margin-bottom: 16px;
          color: var(--graphite);
        }

        .brand-star {
          font-size: 42px;
          line-height: 1;
          color: #282d32;
          filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.16));
        }

        .brand-text {
          margin-top: 6px;
          font-size: 34px;
          font-weight: 950;
          letter-spacing: 0.18em;
        }

        .app-layout {
          position: relative;
          z-index: 2;
          max-width: 1700px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 245px minmax(680px, 1fr) 370px;
          gap: 24px;
          align-items: stretch;
        }

        .glass {
          background: var(--glass);
          border: 1px solid var(--line);
          box-shadow: var(--shadow);
          backdrop-filter: blur(26px);
          -webkit-backdrop-filter: blur(26px);
        }

        .sidebar {
          min-height: 780px;
          border-radius: 34px;
          padding: 28px 18px;
          display: flex;
          flex-direction: column;
        }

        .logo-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 18px 26px;
          font-size: 28px;
          letter-spacing: 0.08em;
          color: var(--graphite);
        }

        .logo-row strong {
          font-weight: 950;
        }

        .menu {
          display: grid;
          gap: 12px;
        }

        .menu-item,
        .mini-box,
        .profile-box,
        .usage-box,
        .control,
        .write-box,
        .mode-card,
        .phone-controls button,
        .phone-input,
        .phone-grid button,
        .head-actions button {
          color: var(--graphite);
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(239, 242, 244, 0.9));
          border: 1px solid rgba(25, 29, 33, 0.1);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 12px 28px rgba(18, 22, 26, 0.08);
        }

        .menu-item {
          min-height: 48px;
          border-radius: 18px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 13px;
          text-align: left;
          font-weight: 900;
        }

        .menu-item span {
          font-size: 19px;
          font-weight: 950;
        }

        .menu-item.active {
          border-color: var(--line-strong);
        }

        .side-bottom {
          margin-top: auto;
          display: grid;
          gap: 12px;
        }

        .mini-box,
        .profile-box,
        .usage-box {
          border-radius: 20px;
          padding: 18px;
        }

        .mini-box {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .mini-box span {
          font-size: 26px;
        }

        .mini-box strong,
        .profile-box strong,
        .usage-box strong {
          display: block;
          font-weight: 950;
        }

        .mini-box small,
        .profile-box small,
        .usage-box small {
          display: block;
          margin-top: 3px;
          color: var(--muted);
          font-weight: 750;
        }

        .profile-box {
          display: grid;
          grid-template-columns: 42px 1fr auto;
          align-items: center;
          gap: 10px;
        }

        .profile-dot {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 30% 22%, #ffffff, transparent 28%),
            linear-gradient(145deg, #202428, #7e858b);
          color: #ffffff;
          font-weight: 950;
        }

        .usage-box > div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-weight: 900;
        }

        .usage-line {
          display: block;
          height: 7px;
          margin: 14px 0 8px;
          overflow: hidden;
          border-radius: 999px;
          background: #d8dde1;
        }

        .usage-line i {
          display: block;
          width: 68%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #70777e, #c9ced2);
        }

        .main-panel {
          position: relative;
          min-height: 780px;
          border-radius: 34px;
          padding: 22px 32px 32px;
          overflow: hidden;
        }

        .main-panel::before {
          content: '';
          position: absolute;
          inset: -20%;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 25%, rgba(255, 255, 255, 0.95), transparent 25%),
            radial-gradient(circle at 50% 33%, rgba(226, 231, 235, 0.68), transparent 42%);
        }

        .main-head,
        .hero,
        .controls,
        .write-box,
        .mode-grid,
        .sub-panel {
          position: relative;
          z-index: 1;
        }

        .main-head {
          min-height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .main-head h1 {
          margin: 0;
          font-size: clamp(21px, 2.2vw, 31px);
          letter-spacing: 0.12em;
          font-weight: 950;
          color: var(--graphite);
        }

        .head-actions {
          position: absolute;
          right: 0;
          display: flex;
          gap: 10px;
        }

        .head-actions button {
          min-height: 38px;
          border-radius: 999px;
          padding: 0 16px;
          font-weight: 950;
        }

        .hero {
          height: 310px;
          display: grid;
          place-items: center;
          isolation: isolate;
        }

        .silver-orbit {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.95);
          box-shadow:
            0 0 26px rgba(255, 255, 255, 0.9),
            inset 0 0 30px rgba(205, 211, 216, 0.58);
        }

        .orbit-one {
          width: 300px;
          height: 300px;
          animation: orbit 9s ease-in-out infinite;
        }

        .orbit-two {
          width: 390px;
          height: 390px;
          opacity: 0.52;
          animation: orbit 12s ease-in-out infinite reverse;
        }

        .orbit-three {
          width: 470px;
          height: 470px;
          opacity: 0.22;
          animation: orbit 16s ease-in-out infinite;
        }

        .avatar-video-wrap {
          position: relative;
          z-index: 2;
          width: 260px;
          height: 300px;
          border-radius: 150px 150px 46px 46px;
          overflow: hidden;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.95), transparent 36%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(224, 228, 232, 0.72));
          border: 1px solid rgba(20, 24, 28, 0.12);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 28px 70px rgba(18, 22, 26, 0.16);
        }

        .avatar-video-wrap::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: inherit;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(182, 188, 194, 0.34), rgba(255, 255, 255, 0.78));
          z-index: 0;
        }

        .avatar-video {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          filter:
            saturate(1.02)
            contrast(1.02)
            drop-shadow(0 18px 34px rgba(18, 22, 26, 0.14));
        }

        .controls {
          display: grid;
          grid-template-columns: repeat(5, minmax(118px, auto));
          justify-content: center;
          gap: 12px;
          margin-top: -34px;
        }

        .control {
          min-height: 58px;
          border-radius: 22px;
          padding: 0 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 16px;
          font-weight: 950;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .control:hover,
        .mode-card:hover,
        .phone-grid button:hover {
          transform: translateY(-2px);
          border-color: var(--line-strong);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 18px 42px rgba(18, 22, 26, 0.12);
        }

        .control.selected {
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 1), rgba(222, 226, 230, 0.94));
          border-color: var(--line-strong);
        }

        .control.live {
          min-width: 214px;
        }

        .sound {
          font-size: 24px;
          line-height: 1;
        }

        .write-box {
          min-height: 128px;
          margin-top: 22px;
          border-radius: 26px;
          padding: 20px 22px 14px;
        }

        .write-box textarea {
          width: 100%;
          height: 58px;
          border: 0;
          outline: 0;
          resize: none;
          background: transparent;
          color: var(--graphite);
          font-size: 17px;
          font-weight: 850;
        }

        .write-box textarea::placeholder {
          color: #394047;
          opacity: 0.9;
        }

        .write-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .write-actions div {
          display: flex;
          gap: 10px;
        }

        .write-actions button {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          color: var(--graphite);
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 1), rgba(230, 234, 237, 0.92));
          border: 1px solid var(--line);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 7px 18px rgba(18, 22, 26, 0.1);
          font-weight: 950;
        }

        .write-actions .send {
          width: 46px;
          height: 46px;
        }

        .mode-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
          margin-top: 18px;
        }

        .mode-card {
          min-height: 205px;
          border-radius: 24px;
          padding: 24px 14px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .mode-card.active {
          border-color: var(--line-strong);
          outline: 2px solid rgba(18, 22, 26, 0.08);
        }

        .mode-icon {
          height: 54px;
          display: grid;
          place-items: center;
          font-size: 48px;
          line-height: 1;
          color: var(--graphite);
          filter: drop-shadow(0 10px 12px rgba(18, 22, 26, 0.16));
        }

        .mode-card strong {
          margin-top: 16px;
          font-size: 17px;
          font-weight: 950;
          color: var(--graphite);
        }

        .mode-card small {
          margin-top: 10px;
          color: var(--graphite-soft);
          font-size: 13px;
          line-height: 1.45;
          font-weight: 800;
        }

        .mode-card b {
          margin-top: auto;
          font-weight: 950;
        }

        .sub-panel {
          margin-top: 16px;
          border-radius: 22px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid var(--line);
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .sub-panel strong {
          font-weight: 950;
        }

        .sub-panel div {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .sub-panel button {
          min-height: 40px;
          border-radius: 999px;
          padding: 0 16px;
          background: #fff;
          border: 1px solid var(--line);
          color: var(--graphite);
          font-weight: 900;
        }

        .phone-shell {
          align-self: center;
          padding: 10px;
          border-radius: 46px;
          background: linear-gradient(145deg, #f9fafb, #9da3a9, #ffffff);
          box-shadow:
            inset 0 0 0 2px rgba(255, 255, 255, 0.7),
            0 28px 70px rgba(18, 22, 26, 0.22);
        }

        .phone {
          width: 340px;
          height: 735px;
          overflow: hidden;
          border-radius: 38px;
          padding: 15px 14px 18px;
          background:
            radial-gradient(circle at 50% 19%, rgba(255, 255, 255, 1), transparent 34%),
            linear-gradient(145deg, #ffffff, #eef1f3);
          border: 1px solid rgba(255, 255, 255, 0.94);
        }

        .phone-status,
        .phone-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 950;
        }

        .phone-status span {
          width: 88px;
          height: 26px;
          border-radius: 999px;
          background: #080a0c;
        }

        .phone-head {
          margin-top: 18px;
        }

        .phone-head button {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          color: var(--graphite);
          border: 1px solid var(--line);
          font-weight: 950;
        }

        .phone-head strong {
          font-size: 24px;
          letter-spacing: 0.12em;
          font-weight: 950;
        }

        .phone-hero {
          position: relative;
          height: 205px;
          display: grid;
          place-items: center;
        }

        .phone-ring {
          position: absolute;
          width: 178px;
          height: 178px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 0 24px rgba(255, 255, 255, 0.9);
        }

        .phone-avatar-video-wrap {
          position: relative;
          z-index: 2;
          width: 150px;
          height: 175px;
          border-radius: 90px 90px 28px 28px;
          overflow: hidden;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.96), transparent 40%),
            linear-gradient(145deg, #ffffff, #e2e6e9);
          border: 1px solid rgba(20, 24, 28, 0.12);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 18px 42px rgba(18, 22, 26, 0.14);
        }

        .phone-avatar-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }

        .phone-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .phone-controls button {
          min-height: 44px;
          border-radius: 16px;
          font-weight: 950;
        }

        .phone-controls .selected {
          background: linear-gradient(145deg, #ffffff, #e2e6e9);
          border-color: var(--line-strong);
        }

        .phone-live {
          grid-column: 1 / -1;
        }

        .phone-input {
          min-height: 82px;
          margin-top: 12px;
          border-radius: 20px;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #394047;
          font-size: 13px;
          font-weight: 850;
        }

        .phone-input button {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--glass);
          border: 1px solid var(--line);
          color: var(--graphite);
          font-weight: 950;
        }

        .phone-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 12px;
        }

        .phone-grid button {
          min-height: 102px;
          border-radius: 16px;
          padding: 9px 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .phone-grid span {
          font-size: 27px;
          line-height: 1;
        }

        .phone-grid strong {
          font-size: 12px;
          line-height: 1.15;
          font-weight: 950;
        }

        .phone-grid small {
          font-weight: 950;
        }

        .modal {
          position: fixed;
          inset: 0;
          z-index: 20;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(238, 241, 244, 0.72);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        .live-panel {
          position: relative;
          width: min(560px, 100%);
          border-radius: 38px;
          padding: 34px;
          text-align: center;
        }

        .close {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #fff;
          border: 1px solid var(--line);
          font-size: 28px;
          line-height: 1;
        }

        .live-avatar-video-wrap {
          position: relative;
          width: 230px;
          height: 250px;
          margin: 0 auto;
          display: grid;
          place-items: center;
          border-radius: 130px 130px 42px 42px;
          overflow: hidden;
          background: linear-gradient(145deg, #ffffff, #dfe4e8);
          box-shadow: var(--shadow);
        }

        .live-avatar-video {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }

        .live-pulse {
          position: absolute;
          inset: 22px;
          z-index: 1;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.98);
          animation: pulse 2.4s ease-out infinite;
        }

        .live-pulse.two {
          animation-delay: 0.9s;
        }

        .live-panel h2 {
          margin: 22px 0 6px;
          font-size: 32px;
          font-weight: 950;
        }

        .live-panel p {
          margin: 0;
          color: var(--muted);
          font-weight: 800;
        }

        .live-buttons {
          margin-top: 24px;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .live-buttons button {
          min-height: 46px;
          border-radius: 999px;
          padding: 0 18px;
          background: #fff;
          border: 1px solid var(--line);
          color: var(--graphite);
          font-weight: 900;
          box-shadow: var(--shadow-soft);
        }

        @keyframes orbit {
          0%,
          100% {
            transform: scale(1) translateY(0);
          }
          50% {
            transform: scale(1.03) translateY(-8px);
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(0.82);
            opacity: 0.95;
          }
          100% {
            transform: scale(1.18);
            opacity: 0;
          }
        }

        @media (max-width: 1280px) {
          .app-layout {
            grid-template-columns: 220px minmax(620px, 1fr);
          }

          .phone-shell {
            grid-column: 1 / -1;
            justify-self: center;
          }

          .mode-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 860px) {
          .page {
            padding: 22px 14px 30px;
          }

          .brand-outside {
            margin: 0 auto 16px;
            text-align: center;
          }

          .app-layout {
            grid-template-columns: 1fr;
          }

          .sidebar,
          .phone-shell {
            display: none;
          }

          .main-panel {
            min-height: auto;
            padding: 18px 14px 20px;
            border-radius: 26px;
          }

          .main-head {
            justify-content: center;
          }

          .main-head h1 {
            font-size: 18px;
            text-align: center;
          }

          .head-actions {
            display: none;
          }

          .hero {
            height: 260px;
          }

          .orbit-one {
            width: 250px;
            height: 250px;
          }

          .orbit-two {
            width: 310px;
            height: 310px;
          }

          .orbit-three {
            width: 360px;
            height: 360px;
          }

          .avatar-video-wrap {
            width: 205px;
            height: 240px;
          }

          .controls {
            grid-template-columns: 1fr 1fr;
            margin-top: -18px;
          }

          .control.live {
            grid-column: 1 / -1;
          }

          .control {
            min-height: 50px;
            padding: 0 14px;
            font-size: 14px;
          }

          .mode-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .mode-card {
            min-height: 160px;
          }
        }
      `}</style>
    </main>
  );
}
