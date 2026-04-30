'use client';

import { useMemo, useRef, useState } from 'react';

type ToolKey =
  | 'Teleprompter'
  | 'Video Çekim'
  | 'İçerik Fikri'
  | 'Etkileşim Hesaplama'
  | 'Fotoğraf Analizi'
  | 'PDF Özetle'
  | 'Notlar'
  | 'Görsel Üret';

type ToolCard = {
  title: ToolKey;
  subtitle: string;
  icon: string;
};

type ContentCard = {
  title: string;
  type: string;
  meta: string;
  icon: string;
};

type ChatMessage = {
  role: 'user' | 'lyra';
  text: string;
};

export default function Page() {
  const [selectedMood, setSelectedMood] = useState('Calm');
  const [selectedTheme, setSelectedTheme] = useState('rose');
  const [selectedTab, setSelectedTab] = useState('Ana Sayfa');
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'lyra',
      text: 'Buradayım kankam. Ne yapıyoruz; içerik mi, moral mi, plan mı, yoksa birlikte bir şeyi mi çözüyoruz?',
    },
  ]);

  const [teleText, setTeleText] = useState(
    'Merhaba! Bugün seninle üretkenliğini artıracak 5 etkili alışkanlıktan bahsedeceğim. Hazırsan hemen başlayalım...'
  );

  const [ideaTopic, setIdeaTopic] = useState('kozmetik');
  const [ideaPlatform, setIdeaPlatform] = useState('TikTok');
  const [ideaResult, setIdeaResult] = useState('');

  const [toolResult, setToolResult] = useState('');
  const [toolLoading, setToolLoading] = useState(false);

  const [followers, setFollowers] = useState('11900');
  const [views, setViews] = useState('2100');
  const [likes, setLikes] = useState('185');
  const [comments, setComments] = useState('22');
  const [saves, setSaves] = useState('32');
  const [shares, setShares] = useState('18');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [recording, setRecording] = useState(false);

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

  const totalEngagement =
    Number(likes || 0) +
    Number(comments || 0) +
    Number(saves || 0) +
    Number(shares || 0);

  const engagementRate = Number(views || 0)
    ? ((totalEngagement / Number(views || 1)) * 100).toFixed(2)
    : '0.00';

  async function askLyra(prompt: string) {
    setToolLoading(true);
    setToolResult('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', text: prompt }] }),
      });

      const data = await res.json();
      setToolResult(data.text || 'Lyra cevap üretemedi kankam, bir daha deneyelim.');
      return data.text || '';
    } catch {
      const fallback =
        'Kankam yerel Lyra modunda küçük bir hata oldu. Ama sistem çalışıyor; biraz daha kısa bir komutla tekrar deneyelim.';
      setToolResult(fallback);
      return fallback;
    } finally {
      setToolLoading(false);
    }
  }

  async function startCamera() {
    setCameraError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
    } catch {
      setCameraError(
        'Kankam kamera açılmadı. Tarayıcı kamera iznini kontrol et veya Vercel HTTPS linkinden açtığından emin ol.'
      );
    }
  }

  function stopCamera() {
    const video = videoRef.current;

    if (video?.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }

    setCameraActive(false);
    setRecording(false);
  }

  function toggleRecording() {
    if (!cameraActive) {
      setCameraError('Önce kamerayı aç kankam.');
      return;
    }

    setRecording((prev) => !prev);
  }

  async function sendLyraMessage() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const userMessage: ChatMessage = { role: 'user', text };
    const nextMessages: ChatMessage[] = [...chatMessages, userMessage];

    setChatMessages(nextMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = await res.json();

      const lyraMessage: ChatMessage = {
        role: 'lyra',
        text:
          data.text ||
          'Kankam cevap üretirken takıldım, bir daha dener misin?',
      };

      setChatMessages((prev) => [...prev, lyraMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        role: 'lyra',
        text: 'Kankam şu an cevap alamadım ama sohbet sistemi çalışıyor. Bir daha kısa bir cümleyle dener misin?',
      };

      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  }

  async function generateIdea() {
    const text = await askLyra(
      `${ideaPlatform} için ${ideaTopic} konusunda içerik fikri ver. Hook, video akışı, CTA ve caption da yaz.`
    );
    setIdeaResult(text);
  }

  function openTool(tool: ToolKey) {
    setActiveTool(tool);
    setToolResult('');
    setCameraError('');

    if (tool !== 'Video Çekim') {
      stopCamera();
    }
  }

  return (
    <main className={`page-shell theme-${selectedTheme}`}>
      <div className="page-container">
        <header className="topbar glass">
          <div className="brand">
            <div className="brand-star">✦</div>
            <div>
              <h1>Sirius AI</h1>
              <p>Seninle, her adımda.</p>
            </div>
          </div>

          <div className="top-actions">
            <button className="pill live-pill" onClick={() => setChatOpen(true)}>
              🔴 CANLI MOD
            </button>
            <button className="pill pro-pill">✨ Pro</button>
            <div className="avatar-badge">M</div>
          </div>
        </header>

        <section className="hero-grid">
          <aside className="left-panel">
            <div className="panel-card glass">
              <h3>Canlı Sesli Sohbet</h3>
              <div className="voice-bars">
                <span /><span /><span /><span /><span /><span /><span />
              </div>
              <p>Seni dinliyorum...</p>
              <button className="circle-btn" onClick={() => setChatOpen(true)}>
                🎙️
              </button>
            </div>

            <div className="panel-card glass">
              <h3>Canlı Görüntülü Ara</h3>
              <p>Lyra ile yüz yüze konuş.</p>
              <button className="circle-btn" onClick={() => openTool('Video Çekim')}>
                📹
              </button>
            </div>

            <div className="panel-card glass">
              <h3>Hadi kahve? ☕</h3>
              <p>Kahve moduna geçelim mi?</p>
              <div className="mini-preview">Lo-fi, sakin sohbet ve odak modu</div>
              <button
                className="soft-btn full"
                onClick={() => {
                  setChatOpen(true);
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      role: 'lyra',
                      text: 'Kahve modu açıldı kankam ☕ Bugün yumuşak bir akışla gidelim. Ne yapmak istiyorsun?',
                    },
                  ]);
                }}
              >
                Kahve Modu
              </button>
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
                  API olmadan da çalışan yerel akıllı mod açık. İçerik, plan,
                  teleprompter, video çekim, kozmetik ve moral desteği verebilirim.
                </p>
              </div>
            </div>

            <div className="call-controls">
              <button className="control-btn"><span>🔊</span><span>Hoparlör</span></button>
              <button className="control-btn"><span>🔇</span><span>Sessiz</span></button>
              <button className="control-btn end"><span>📞</span><span>Bitir</span></button>
              <button className="control-btn" onClick={() => openTool('Video Çekim')}>
                <span>📷</span><span>Kamera</span>
              </button>
            </div>
          </section>

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

        <section className="section-card glass">
          <div className="section-head">
            <div>
              <h2>Ruh Hali & Tema Seçimi</h2>
              <p>Sirius’un ruh halini seç, ortamı değişsin.</p>
            </div>
          </div>

          <div className="mood-grid">
            {['Calm', 'Energetic', 'Elegant', 'Casual'].map((mood) => (
              <button
                key={mood}
                className={`mood-card ${selectedMood === mood ? 'selected' : ''}`}
                onClick={() => setSelectedMood(mood)}
              >
                <div className="mood-overlay">
                  <strong>{mood}</strong>
                  <span>
                    {mood === 'Calm'
                      ? 'Sakin'
                      : mood === 'Energetic'
                        ? 'Enerjik'
                        : mood === 'Elegant'
                          ? 'Zarif'
                          : 'Rahat'}
                  </span>
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

        <section className="section-card glass">
          <div className="section-head">
            <div>
              <h2>Stüdyo Araçları</h2>
              <p>İçerik üretimi için tüm araçların burada.</p>
            </div>
          </div>

          <div className="tools-grid">
            {quickTools.map((tool) => (
              <button
                className="tool-card"
                key={tool.title}
                onClick={() => openTool(tool.title)}
              >
                <div className="tool-icon">{tool.icon}</div>
                <div>
                  <h3>{tool.title}</h3>
                  <p>{tool.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

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
              <div className="stat-box"><span>Takipçi</span><strong>11.9K</strong></div>
              <div className="stat-box"><span>Görüntülenme</span><strong>2.1K</strong></div>
              <div className="stat-box"><span>Beğeni</span><strong>185</strong></div>
              <div className="stat-box"><span>Kaydetme</span><strong>32</strong></div>
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

        <nav className="bottom-nav glass">
          {['Ana Sayfa', 'Stüdyo', 'Sirius', 'Sohbetler', 'Profil'].map((item) => (
            <button
              key={item}
              className={`nav-item ${selectedTab === item ? 'active' : ''} ${
                item === 'Sirius' ? 'star-nav' : ''
              }`}
              onClick={() => {
                setSelectedTab(item);
                if (item === 'Sirius') setChatOpen(true);
              }}
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

        {activeTool && (
          <div
            className="modal-backdrop"
            onClick={() => {
              setActiveTool(null);
              stopCamera();
            }}
          >
            <section
              className="tool-modal glass"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-head">
                <div>
                  <p>Stüdyo Modülü</p>
                  <h2>{activeTool}</h2>
                </div>
                <button
                  onClick={() => {
                    setActiveTool(null);
                    stopCamera();
                  }}
                >
                  ✕
                </button>
              </div>

              {activeTool === 'Teleprompter' && (
                <div className="modal-content">
                  <textarea
                    value={teleText}
                    onChange={(event) => setTeleText(event.target.value)}
                    placeholder="Teleprompter metnini buraya yaz..."
                  />

                  <div className="teleprompter-preview">
                    <p>{teleText}</p>
                  </div>

                  <div className="modal-actions">
                    <button
                      onClick={async () => {
                        const text = await askLyra(
                          '40 saniyelik teleprompter metni yaz. Konu: kozmetik ürünü kimyager gözüyle anlatmak.'
                        );
                        if (text) setTeleText(text);
                      }}
                    >
                      AI ile Metin Üret
                    </button>
                    <button>Başlat</button>
                    <button>Duraklat</button>
                    <button>Metni Kaydet</button>
                  </div>
                </div>
              )}

              {activeTool === 'Video Çekim' && (
                <div className="modal-content">
                  <div className="video-frame camera-frame">
                    <video
                      ref={videoRef}
                      className="camera-video"
                      playsInline
                      muted
                    />

                    {!cameraActive && (
                      <div className="camera-placeholder">
                        <strong>Video çekim alanı</strong>
                        <p>Kamerayı açınca burada canlı önizleme görünecek.</p>
                      </div>
                    )}

                    {cameraActive && (
                      <div className="teleprompter-overlay">
                        <p>{teleText}</p>
                      </div>
                    )}

                    {recording && <span className="record-badge">● REC</span>}
                  </div>

                  {cameraError && <div className="result-box">{cameraError}</div>}

                  <div className="modal-actions">
                    <button onClick={startCamera}>Kamerayı Aç</button>
                    <button onClick={stopCamera}>Kamerayı Kapat</button>
                    <button onClick={toggleRecording}>
                      {recording ? 'Kaydı Durdur' : 'Kayıt Başlat'}
                    </button>
                    <button>9:16</button>
                    <button>Işık</button>
                    <button>Filtre</button>
                    <button
                      onClick={() =>
                        askLyra(
                          'Video çekim planı hazırla. Kamera, ışık, hook, akış ve CTA olsun.'
                        )
                      }
                    >
                      Çekim Planı Oluştur
                    </button>
                  </div>

                  <div className="result-box">
                    <strong>Teleprompter metni:</strong>
                    <p>{teleText}</p>
                  </div>

                  {toolLoading && <div className="result-box">Lyra düşünüyor...</div>}
                  {toolResult && <div className="result-box">{toolResult}</div>}
                </div>
              )}

              {activeTool === 'İçerik Fikri' && (
                <div className="modal-content">
                  <div className="form-grid">
                    <label>
                      Platform
                      <select
                        value={ideaPlatform}
                        onChange={(event) => setIdeaPlatform(event.target.value)}
                      >
                        <option>TikTok</option>
                        <option>Instagram Reels</option>
                        <option>YouTube Shorts</option>
                        <option>Story</option>
                      </select>
                    </label>

                    <label>
                      Konu
                      <input
                        value={ideaTopic}
                        onChange={(event) => setIdeaTopic(event.target.value)}
                        placeholder="kozmetik, kimya, vlog..."
                      />
                    </label>
                  </div>

                  <button className="primary-action" onClick={generateIdea}>
                    Fikir Üret
                  </button>

                  {toolLoading && <div className="result-box">Lyra düşünüyor...</div>}
                  {ideaResult && <pre className="result-box">{ideaResult}</pre>}
                </div>
              )}

              {activeTool === 'Etkileşim Hesaplama' && (
                <div className="modal-content">
                  <div className="form-grid">
                    <label>Takipçi <input value={followers} onChange={(event) => setFollowers(event.target.value)} /></label>
                    <label>Görüntülenme <input value={views} onChange={(event) => setViews(event.target.value)} /></label>
                    <label>Beğeni <input value={likes} onChange={(event) => setLikes(event.target.value)} /></label>
                    <label>Yorum <input value={comments} onChange={(event) => setComments(event.target.value)} /></label>
                    <label>Kaydetme <input value={saves} onChange={(event) => setSaves(event.target.value)} /></label>
                    <label>Paylaşım <input value={shares} onChange={(event) => setShares(event.target.value)} /></label>
                  </div>

                  <div className="result-box">
                    <h3>Etkileşim Oranı: %{engagementRate}</h3>
                    <p>
                      Toplam etkileşim: {totalEngagement}. Kaydetme ve paylaşım
                      güçlü ise içerik algoritmada daha uzun yaşayabilir.
                    </p>
                    <p>
                      Benim yorumum: İzlenmeye göre kaydetme ve paylaşım artarsa,
                      içerik daha güçlü sinyal verir. İlk 3 saniyeyi daha iddialı
                      kurmak faydalı olur.
                    </p>
                  </div>
                </div>
              )}

              {activeTool === 'Fotoğraf Analizi' && (
                <div className="modal-content">
                  <div className="upload-box">📸 Fotoğraf yükleme alanı</div>
                  <button
                    className="primary-action"
                    onClick={() =>
                      askLyra('Fotoğraf analizi alanı için caption, renk paleti, ürün çekim önerisi ve içerik fikri çıkar.')
                    }
                  >
                    Analiz Örneği Üret
                  </button>
                  {toolLoading && <div className="result-box">Lyra düşünüyor...</div>}
                  {toolResult && <div className="result-box">{toolResult}</div>}
                </div>
              )}

              {activeTool === 'PDF Özetle' && (
                <div className="modal-content">
                  <div className="upload-box">📄 PDF yükleme alanı</div>
                  <button
                    className="primary-action"
                    onClick={() =>
                      askLyra('PDF özetleme sistemi nasıl çalışacak? Özet, önemli maddeler, soru cevap ve teleprompter çıktısı anlat.')
                    }
                  >
                    PDF Akışı Oluştur
                  </button>
                  {toolLoading && <div className="result-box">Lyra düşünüyor...</div>}
                  {toolResult && <div className="result-box">{toolResult}</div>}
                </div>
              )}

              {activeTool === 'Notlar' && (
                <div className="modal-content">
                  <textarea placeholder="Hızlı notunu yaz..." />
                  <div className="modal-actions">
                    <button onClick={() => askLyra('Notu toparla, yapılacak listesine çevir ve kısa özet çıkar.')}>
                      Notu Toparla
                    </button>
                    <button>Yapılacak Listeye Çevir</button>
                    <button>Kaydet</button>
                  </div>
                  {toolLoading && <div className="result-box">Lyra düşünüyor...</div>}
                  {toolResult && <div className="result-box">{toolResult}</div>}
                </div>
              )}

              {activeTool === 'Görsel Üret' && (
                <div className="modal-content">
                  <textarea placeholder="Üretmek istediğin görseli anlat..." />
                  <div className="modal-actions">
                    <button onClick={() => askLyra('Instagram kapak görseli için prompt üret. Premium, mistik, Sirius AI tarzı olsun.')}>
                      Kapak Promptu
                    </button>
                    <button onClick={() => askLyra('Ürün çekimi için premium görsel üretim promptu yaz.')}>
                      Ürün Çekimi Promptu
                    </button>
                    <button>Moodboard</button>
                    <button>Görsel Üret</button>
                  </div>
                  {toolLoading && <div className="result-box">Lyra düşünüyor...</div>}
                  {toolResult && <div className="result-box">{toolResult}</div>}
                </div>
              )}
            </section>
          </div>
        )}

        {chatOpen && (
          <div className="modal-backdrop" onClick={() => setChatOpen(false)}>
            <section
              className="tool-modal glass lyra-chat-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-head">
                <div>
                  <p>Sirius AI</p>
                  <h2>Lyra Sohbet</h2>
                </div>
                <button onClick={() => setChatOpen(false)}>✕</button>
              </div>

              <div className="lyra-chat-list">
                {chatMessages.map((message, index) => (
                  <div key={index} className={`lyra-bubble ${message.role}`}>
                    <strong>{message.role === 'user' ? 'Sen' : 'Lyra'}</strong>
                    <span>{message.text}</span>
                  </div>
                ))}

                {chatLoading && (
                  <div className="lyra-bubble lyra">
                    <strong>Lyra</strong>
                    <span>Bir saniye kankam, düşünüyorum...</span>
                  </div>
                )}
              </div>

              <div className="lyra-chat-input">
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Lyra’ya yaz..."
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') sendLyraMessage();
                  }}
                />
                <button onClick={sendLyraMessage} disabled={chatLoading}>
                  {chatLoading ? '...' : 'Gönder'}
                </button>
              </div>
            </section>
          </div>
        )}

        <style jsx global>{`
          .camera-frame {
            position: relative;
            overflow: hidden;
            min-height: 520px;
            background: #09070d;
          }

          .camera-video {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .camera-placeholder {
            position: relative;
            z-index: 2;
            display: grid;
            gap: 10px;
            place-items: center;
            text-align: center;
            color: #fff4e8;
          }

          .teleprompter-overlay {
            position: absolute;
            left: 50%;
            bottom: 28px;
            transform: translateX(-50%);
            z-index: 3;
            width: min(88%, 720px);
            max-height: 42%;
            overflow: hidden;
            padding: 18px 22px;
            border-radius: 24px;
            background: rgba(10, 7, 15, 0.58);
            border: 1px solid rgba(255, 220, 190, 0.26);
            backdrop-filter: blur(12px);
            text-align: center;
          }

          .teleprompter-overlay p {
            margin: 0;
            color: #fff8ef;
            font-size: clamp(22px, 4vw, 42px);
            line-height: 1.35;
            text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
          }

          .record-badge {
            position: absolute;
            top: 18px;
            left: 18px;
            z-index: 4;
            padding: 8px 14px;
            border-radius: 999px;
            background: rgba(255, 60, 60, 0.22);
            color: #ffb3b3;
            border: 1px solid rgba(255, 80, 80, 0.35);
            font-weight: 700;
          }
        `}</style>
      </div>
    </main>
  );
}
