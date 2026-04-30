'use client';

import { useMemo, useState } from 'react';

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

export default function Page() {
  const [selectedMood, setSelectedMood] = useState('Calm');
  const [selectedTheme, setSelectedTheme] = useState('rose');
  const [selectedTab, setSelectedTab] = useState('Ana Sayfa');
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
const [chatOpen, setChatOpen] = useState(false);
const [chatInput, setChatInput] = useState('');
const [chatLoading, setChatLoading] = useState(false);
const [chatMessages, setChatMessages] = useState<
  { role: 'user' | 'lyra'; text: string }[]
>([
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

  const [followers, setFollowers] = useState('11900');
  const [views, setViews] = useState('2100');
  const [likes, setLikes] = useState('185');
  const [comments, setComments] = useState('22');
  const [saves, setSaves] = useState('32');
  const [shares, setShares] = useState('18');

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
    Number(likes || 0) + Number(comments || 0) + Number(saves || 0) + Number(shares || 0);

  const engagementRate = Number(views || 0)
    ? ((totalEngagement / Number(views || 1)) * 100).toFixed(2)
    : '0.00';

  function generateIdea() {
    const result = `${ideaPlatform} için ${ideaTopic} konulu içerik fikri:
async function sendLyraMessage() {
  const text = chatInput.trim();
  if (!text || chatLoading) return;

  const userMessage: { role: 'user'; text: string } = { role: 'user', text };
  const nextMessages = [...chatMessages, userMessage];

  setChatMessages(nextMessages);
  setChatInput('');
  setChatLoading(true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: nextMessages }),
    });

    if (!res.ok) {
      throw new Error('AI cevabı alınamadı');
    }

    const data = await res.json();

    setChatMessages((prev) => [
      ...prev,
      {
        role: 'lyra',
        text: data.text || 'Kankam cevap üretirken takıldım, bir daha dener misin?',
      },
    ]);
  } catch {
    setChatMessages((prev) => [
      ...prev,
      {
        role: 'lyra',
        text: 'Kankam şu an cevap alamadım. API kredisi/key tarafı eksik olabilir ama sohbet sistemi doğru bağlandı.',
      },
    ]);
  } finally {
    setChatLoading(false);
  }
}
Kanca: “Bu konuda çoğu kişi aynı hatayı yapıyor...”
Akış:
1. İlk 3 saniyede merak uyandır.
2. Kısa bir problem göster.
3. Kimyager/uzman bakışıyla sade açıkla.
4. Uygulanabilir mini öneri ver.
5. Sonunda yorum sorusu sor.

CTA: “Bunu daha önce duymuş muydun? Yoruma yaz.”`;

    setIdeaResult(result);
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
            <button className="pill live-pill">🔴 CANLI MOD</button>
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
                onClick={() => setActiveTool(tool.title)}
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
  if (item === 'Sirius') {
    setChatOpen(true);
  }
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
          <div className="modal-backdrop" onClick={() => setActiveTool(null)}>{chatOpen && (
  <div className="modal-backdrop" onClick={() => setChatOpen(false)}>
    <section className="tool-modal glass lyra-chat-modal" onClick={(e) => e.stopPropagation()}>
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
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Lyra’ya yaz..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              sendLyraMessage();
            }
          }}
        />
        <button onClick={sendLyraMessage} disabled={chatLoading}>
          {chatLoading ? '...' : 'Gönder'}
        </button>
      </div>
    </section>
  </div>
)}
            <section className="tool-modal glass" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div>
                  <p>Stüdyo Modülü</p>
                  <h2>{activeTool}</h2>
                </div>
                <button onClick={() => setActiveTool(null)}>✕</button>
              </div>

              {activeTool === 'Teleprompter' && (
                <div className="modal-content">
                  <textarea
                    value={teleText}
                    onChange={(e) => setTeleText(e.target.value)}
                    placeholder="Teleprompter metnini buraya yaz..."
                  />
                  <div className="teleprompter-preview">
                    <p>{teleText}</p>
                  </div>
                  <div className="modal-actions">
                    <button>Başlat</button>
                    <button>Duraklat</button>
                    <button>Metni Kaydet</button>
                  </div>
                </div>
              )}

              {activeTool === 'Video Çekim' && (
                <div className="modal-content">
                  <div className="video-frame">
                    <span>REC</span>
                    <strong>Video çekim alanı</strong>
                    <p>Burada kamera + teleprompter birlikte çalışacak.</p>
                  </div>
                  <div className="modal-actions">
                    <button>9:16</button>
                    <button>Işık</button>
                    <button>Filtre</button>
                    <button>Kayıt Başlat</button>
                  </div>
                </div>
              )}

              {activeTool === 'İçerik Fikri' && (
                <div className="modal-content">
                  <div className="form-grid">
                    <label>
                      Platform
                      <select value={ideaPlatform} onChange={(e) => setIdeaPlatform(e.target.value)}>
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
                        onChange={(e) => setIdeaTopic(e.target.value)}
                        placeholder="kozmetik, kimya, vlog..."
                      />
                    </label>
                  </div>

                  <button className="primary-action" onClick={generateIdea}>
                    Fikir Üret
                  </button>

                  {ideaResult && <pre className="result-box">{ideaResult}</pre>}
                </div>
              )}

              {activeTool === 'Etkileşim Hesaplama' && (
                <div className="modal-content">
                  <div className="form-grid">
                    <label>Takipçi <input value={followers} onChange={(e) => setFollowers(e.target.value)} /></label>
                    <label>Görüntülenme <input value={views} onChange={(e) => setViews(e.target.value)} /></label>
                    <label>Beğeni <input value={likes} onChange={(e) => setLikes(e.target.value)} /></label>
                    <label>Yorum <input value={comments} onChange={(e) => setComments(e.target.value)} /></label>
                    <label>Kaydetme <input value={saves} onChange={(e) => setSaves(e.target.value)} /></label>
                    <label>Paylaşım <input value={shares} onChange={(e) => setShares(e.target.value)} /></label>
                  </div>

                  <div className="result-box">
                    <h3>Etkileşim Oranı: %{engagementRate}</h3>
                    <p>
                      Toplam etkileşim: {totalEngagement}. Kaydetme ve paylaşım
                      güçlü ise içerik algoritmada daha uzun yaşayabilir.
                    </p>
                  </div>
                </div>
              )}

              {activeTool === 'Fotoğraf Analizi' && (
                <div className="modal-content">
                  <div className="upload-box">📸 Fotoğraf yükleme alanı</div>
                  <div className="result-box">
                    Fotoğraf yüklendiğinde AI burada caption, renk paleti,
                    ürün çekim önerisi ve içerik fikri çıkaracak.
                  </div>
                </div>
              )}

              {activeTool === 'PDF Özetle' && (
                <div className="modal-content">
                  <div className="upload-box">📄 PDF yükleme alanı</div>
                  <div className="result-box">
                    PDF yüklendiğinde özet, önemli maddeler, soru-cevap ve
                    teleprompter metni oluşturulacak.
                  </div>
                </div>
              )}

              {activeTool === 'Notlar' && (
                <div className="modal-content">
                  <textarea placeholder="Hızlı notunu yaz..." />
                  <div className="modal-actions">
                    <button>Notu Toparla</button>
                    <button>Yapılacak Listeye Çevir</button>
                    <button>Kaydet</button>
                  </div>
                </div>
              )}

              {activeTool === 'Görsel Üret' && (
                <div className="modal-content">
                  <textarea placeholder="Üretmek istediğin görseli anlat..." />
                  <div className="modal-actions">
                    <button>Kapak Görseli</button>
                    <button>Ürün Çekimi</button>
                    <button>Moodboard</button>
                    <button>Görsel Üret</button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
