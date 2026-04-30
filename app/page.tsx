'use client';

import { useMemo, useState } from 'react';

type ToolCard = {
  title: string;
  subtitle: string;
  icon: string;
};

type ContentCard = {
  title: string;
  type: string;
  meta: string;
  icon: string;
};

type MoodCard = {
  title: string;
  subtitle: string;
  image: string;
};

export default function Page() {
  const [selectedMood, setSelectedMood] = useState('Calm');
  const [selectedTheme, setSelectedTheme] = useState('rose');
  const [selectedTab, setSelectedTab] = useState('Ana Sayfa');

  const quickTools: ToolCard[] = useMemo(
    () => [
      { title: 'Teleprompter', subtitle: 'Metin akışı ve kayıt desteği', icon: '📝' },
      { title: 'Video Çekim', subtitle: 'Kamera + teleprompter modu', icon: '🎥' },
      { title: 'İçerik Fikri', subtitle: 'Hook, akış ve CTA üret', icon: '💡' },
      { title: 'Etkileşim Hesaplama', subtitle: 'Performans analizi yap', icon: '📈' },
      { title: 'Fotoğraf Analizi', subtitle: 'Görseli yorumla ve geliştir', icon: '🖼️' },
      { title: 'PDF Özetle', subtitle: 'Belgeyi özetle ve düzenle', icon: '📄' },
      { title: 'Notlar', subtitle: 'Hızlı not ve içerik taslağı', icon: '🗒️' },
      { title: 'Görsel Üret', subtitle: 'Kapak ve post fikri oluştur', icon: '✨' },
    ],
    []
  );

  const recentContents: ContentCard[] = useMemo(
    () => [
      { title: 'Sabah Manzarası', type: 'PNG', meta: '2.4 MB', icon: '🏞️' },
      { title: 'Ürün Çekimi', type: 'JPG', meta: '1.8 MB', icon: '📸' },
      { title: 'Teleprompter Metni', type: 'TXT', meta: '356 B', icon: '🎤' },
      { title: 'İçerik Fikri Taslağı', type: 'NOTE', meta: 'Yeni', icon: '💡' },
      { title: 'Ruh Hali Günlüğüm', type: 'PDF', meta: '1.2 MB', icon: '📕' },
      { title: 'Günün Planı', type: 'PDF', meta: '428 KB', icon: '✅' },
      { title: 'Lo-fi Çalma Listem', type: 'MP3', meta: '5.2 MB', icon: '🎵' },
      { title: 'Yeni Ekle', type: 'ADD', meta: '', icon: '➕' },
    ],
    []
  );

  const moods: MoodCard[] = useMemo(
    () => [
      {
        title: 'Calm',
        subtitle: 'Sakin',
        image:
          'linear-gradient(135deg, rgba(90,120,255,0.35), rgba(30,30,60,0.4))',
      },
      {
        title: 'Energetic',
        subtitle: 'Enerjik',
        image:
          'linear-gradient(135deg, rgba(255,155,85,0.45), rgba(120,50,20,0.35))',
      },
      {
        title: 'Elegant',
        subtitle: 'Zarif',
        image:
          'linear-gradient(135deg, rgba(180,120,255,0.4), rgba(80,40,120,0.35))',
      },
      {
        title: 'Casual',
        subtitle: 'Rahat',
        image:
          'linear-gradient(135deg, rgba(255,210,190,0.35), rgba(110,80,75,0.3))',
      },
    ],
    []
  );

  return (
    <main className={`page-shell theme-${selectedTheme}`}>
      <div className="page-container">
        {/* TOP BAR */}
        <header className="topbar glass">
          <div className="brand">
            <div className="brand-star">✦</div>
            <div>
              <h1>Sirius AI</h1>
              <p>Seninle, her adımda.</p>
            </div>
          </div>

          <div className="top-actions">
            <button className="pill live-pill">🔴 CANLI MOD</button>
            <button className="pill pro-pill">✨ Pro</button>
            <div className="avatar-badge">M</div>
          </div>
        </header>

        {/* MAIN GRID */}
        <section className="hero-grid">
          {/* LEFT PANEL */}
          <aside className="left-panel">
            <div className="panel-card glass">
              <h3>Canlı Sesli Sohbet</h3>
              <div className="voice-bars">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <p>Seni dinliyorum...</p>
              <button className="circle-btn">🎙️</button>
            </div>

            <div className="panel-card glass">
              <h3>Canlı Görüntülü Ara</h3>
              <p>Lyra ile yüz yüze konuş.</p>
              <button className="circle-btn">📹</button>
            </div>

            <div className="panel-card glass">
              <h3>Hadi kahve? ☕</h3>
              <p>Kahve moduna geçelim mi?</p>
              <div className="mini-preview">Lo-fi, sakin sohbet ve odak modu</div>
              <button className="soft-btn full">Kahve Modu</button>
            </div>

            <div className="panel-card glass">
              <h3>Karakteri Kişiselleştir</h3>
              <p>Sirius’u senin tarzına göre özelleştir.</p>
              <div className="gender-row">
                <button className="chip active">Kadın</button>
                <button className="chip">Erkek</button>
                <button className="chip">Diğer</button>
              </div>
            </div>
          </aside>

          {/* CENTER */}
          <section className="center-panel glass">
            <div className="live-header">
              <span className="status-badge">CANLI MOD</span>
              <div className="live-icons">
                <button>⛶</button>
                <button>⋮</button>
              </div>
            </div>

            <div className="avatar-stage">
              <div className="avatar-figure">
                <div className="avatar-face">😊</div>
              </div>
              <div className="avatar-copy">
                <h2>Lyra</h2>
                <p>
                  Gerçek AI cevapları, sesli yanıt, içerik, kozmetik, plan,
                  kombin ve günlük destek için buradayım.
                </p>
              </div>
            </div>

            <div className="call-controls">
              <button className="control-btn">🔊<span>Hoparlör</span></button>
              <button className="control-btn">🔇<span>Sessiz</span></button>
              <button className="control-btn end">📞<span>Bitir</span></button>
              <button className="control-btn">📷<span>Kamera</span></button>
            </div>
          </section>

          {/* RIGHT PANEL */}
          <aside className="right-panel">
            <div className="panel-card glass">
              <div className="theme-row">
                <span>Tema</span>
                <div className="theme-switch">
                  <button
                    className={selectedTheme === 'rose' ? 'active' : ''}
                    onClick={() => setSelectedTheme('rose')}
                  >
                    ☀️
                  </button>
                  <button
                    className={selectedTheme === 'dark' ? 'active' : ''}
                    onClick={() => setSelectedTheme('dark')}
                  >
                    🌙
                  </button>
                </div>
              </div>
            </div>

            <div className="panel-card glass">
              <h3>Görünüm Özelleştirme</h3>

              <div className="custom-group">
                <div className="custom-title">Saç Rengi</div>
                <div className="dots-row">
                  <span className="dot c1" />
                  <span className="dot c2" />
                  <span className="dot c3" />
                  <span className="dot c4" />
                  <span className="dot c5" />
                </div>
              </div>

              <div className="custom-group">
                <div className="custom-title">Göz Rengi</div>
                <div className="dots-row">
                  <span className="dot e1" />
                  <span className="dot e2" />
                  <span className="dot e3" />
                  <span className="dot e4" />
                  <span className="dot e5" />
                </div>
              </div>

              <div className="custom-group">
                <div className="custom-title">Saç Modeli</div>
                <div className="mini-grid">
                  <div className="mini-thumb">Topuz</div>
                  <div className="mini-thumb">Dalga</div>
                  <div className="mini-thumb">Düz</div>
                  <div className="mini-thumb">Kısa</div>
                </div>
              </div>

              <div className="custom-group">
                <div className="custom-title">Kıyafet</div>
                <div className="mini-grid">
                  <div className="mini-thumb">Günlük</div>
                  <div className="mini-thumb">Şık</div>
                  <div className="mini-thumb">Soft</div>
                  <div className="mini-thumb">Cool</div>
                </div>
              </div>

              <button className="soft-btn full">Tümünü Gör</button>
            </div>
          </aside>
        </section>

        {/* MOODS */}
        <section className="section-card glass">
          <div className="section-head">
            <div>
              <h2>Ruh Hali & Tema Seçimi</h2>
              <p>Sirius’un ruh halini seç, ortamı değişsin.</p>
            </div>
          </div>

          <div className="mood-grid">
            {moods.map((mood) => (
              <button
                key={mood.title}
                className={`mood-card ${selectedMood === mood.title ? 'selected' : ''}`}
                onClick={() => setSelectedMood(mood.title)}
                style={{ background: mood.image }}
              >
                <div className="mood-overlay">
                  <strong>{mood.title}</strong>
                  <span>{mood.subtitle}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="theme-bottom-row">
            <div className="color-palette">
              <span className="palette-dot p1" />
              <span className="palette-dot p2" />
              <span className="palette-dot p3" />
              <span className="palette-dot p4" />
              <span className="palette-dot p5" />
              <span className="palette-dot p6" />
              <span className="palette-dot p7" />
            </div>

            <div className="music-box">
              <span>Ortam Müzikleri</span>
              <strong>Lo-fi Sirius</strong>
            </div>
          </div>
        </section>

        {/* STUDIO TOOLS */}
        <section className="section-card glass">
          <div className="section-head">
            <div>
              <h2>Stüdyo Araçları</h2>
              <p>İçerik üretimi için tüm araçların burada.</p>
            </div>
          </div>

          <div className="tools-grid">
            {quickTools.map((tool) => (
              <div className="tool-card" key={tool.title}>
                <div className="tool-icon">{tool.icon}</div>
                <div>
                  <h3>{tool.title}</h3>
                  <p>{tool.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CONTENT IDEA + INTERACTION */}
        <section className="double-grid">
          <div className="section-card glass">
            <div className="section-head">
              <div>
                <h2>İçerik Fikri Alanı</h2>
                <p>Bugün ne paylaşacağını hızlıca üret.</p>
              </div>
            </div>

            <div className="idea-box">
              <div className="idea-pill">TikTok</div>
              <div className="idea-pill">Kozmetik</div>
              <div className="idea-pill">40 sn</div>
              <div className="idea-pill">Viral olsun</div>
            </div>

            <div className="idea-result">
              <h3>Bugünün Hook Fikri</h3>
              <p>
                “Bu ürünü herkes yanlış kullanıyor olabilir... kimyager gözüyle
                anlatıyorum.”
              </p>
              <ul>
                <li>Giriş: dikkat çeken ilk 3 saniye</li>
                <li>Orta: ürün / içerik açıklaması</li>
                <li>Bitiş: CTA + yorum sorusu</li>
              </ul>
            </div>
          </div>

          <div className="section-card glass">
            <div className="section-head">
              <div>
                <h2>Etkileşim Hesaplama</h2>
                <p>İçeriğinin performansını yorumla.</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <span>Takipçi</span>
                <strong>11.9K</strong>
              </div>
              <div className="stat-box">
                <span>Görüntülenme</span>
                <strong>2.1K</strong>
              </div>
              <div className="stat-box">
                <span>Beğeni</span>
                <strong>185</strong>
              </div>
              <div className="stat-box">
                <span>Kaydetme</span>
                <strong>32</strong>
              </div>
            </div>

            <div className="analysis-box">
              <strong>Etkileşim Yorumu</strong>
              <p>
                Kaydetme oranı fena değil. Kanca cümleni biraz daha sert yaparsan
                izlenme ile kaydetme birlikte yükselebilir.
              </p>
            </div>
          </div>
        </section>

        {/* RECENT CONTENTS */}
        <section className="section-card glass">
          <div className="section-head">
            <div>
              <h2>Son İçeriklerim</h2>
              <p>Fotoğraf, PDF, teleprompter, notlar ve daha fazlası.</p>
            </div>
          </div>

          <div className="tab-row">
            <button className="tab-chip active">Tümü</button>
            <button className="tab-chip">Fotoğraflar</button>
            <button className="tab-chip">PDF&apos;ler</button>
            <button className="tab-chip">Notlar</button>
            <button className="tab-chip">Teleprompter</button>
            <button className="tab-chip">Videolar</button>
          </div>

          <div className="recent-grid">
            {recentContents.map((item) => (
              <div className="recent-card" key={item.title}>
                <div className="recent-icon">{item.icon}</div>
                <h4>{item.title}</h4>
                <p>{item.type}</p>
                <span>{item.meta}</span>
              </div>
            ))}
          </div>
        </section>

        {/* BOTTOM NAV */}
        <nav className="bottom-nav glass">
          {['Ana Sayfa', 'Stüdyo', 'Sirius', 'Sohbetler', 'Profil'].map((item) => (
            <button
              key={item}
              className={`nav-item ${selectedTab === item ? 'active' : ''} ${item === 'Sirius' ? 'star-nav' : ''}`}
              onClick={() => setSelectedTab(item)}
            >
              {item === 'Ana Sayfa' && '🏠'}
              {item === 'Stüdyo' && '🎬'}
              {item === 'Sirius' && '✦'}
              {item === 'Sohbetler' && '💬'}
              {item === 'Profil' && '👤'}
              <span>{item}</span>
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
