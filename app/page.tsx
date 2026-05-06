'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type ModeKey = 'research' | 'content' | 'lesson' | 'image' | 'read' | 'pdf' | 'live';
type Role = 'user' | 'assistant' | 'system';

type ChatMessage = {
  id: number;
  role: Role;
  text: string;
};

const AVATAR_VIDEO = '/lyra-avatar-mp4.mp4';
const AVATAR_IMAGE = '/lyra-avatar.jpg.jpeg';

const modes: {
  key: ModeKey;
  title: string;
  desc: string;
  icon: string;
  options: string[];
  starter: string;
}[] = [
  {
    key: 'research',
    title: 'Araştırma Modu',
    desc: 'Bilgi bul, analiz et ve net cevaplar üret.',
    icon: '⌕',
    options: ['Derin araştır', 'Kaynaklı özetle', 'Güncel bilgi bul'],
    starter: 'Araştırma modundayım. Konuyu yaz, sana net ve düzenli çıkarayım.',
  },
  {
    key: 'content',
    title: 'İçerik Üretme',
    desc: 'Hook, metin, video fikri ve içerik hazırla.',
    icon: '✎',
    options: ['Hook yaz', 'Teleprompter hazırla', 'Video fikri üret'],
    starter: 'İçerik üretme modundayım. Konuyu yaz, hook ve metin hazırlayayım.',
  },
  {
    key: 'lesson',
    title: 'Ders Modu',
    desc: 'Konu anlat, soru çöz ve öğrenmeyi kolaylaştır.',
    icon: '▰',
    options: ['Konu anlat', 'Test üret', 'Yanlışımı açıkla'],
    starter: 'Ders modundayım. Hangi konuyu çalışıyoruz?',
  },
  {
    key: 'image',
    title: 'Görsel Üretme',
    desc: 'Fikirleri görsele dönüştür ve tasarla.',
    icon: '▧',
    options: ['Prompt yaz', 'Konsept üret', 'Görsel fikri ver'],
    starter: 'Görsel üretme modundayım. Nasıl bir görsel istediğini yaz.',
  },
  {
    key: 'read',
    title: 'Görselle Okut',
    desc: 'Görsel, belge ve ekranları analiz et.',
    icon: '◌',
    options: ['Fotoğraf oku', 'Belge analiz et', 'Etiket çöz'],
    starter: 'Görselle okut modundayım. Görsel yükleyip analiz ettirebilirsin.',
  },
  {
    key: 'pdf',
    title: 'PDF Özeti',
    desc: 'PDF yükle, özetle ve önemli yerleri çıkar.',
    icon: '▤',
    options: ['PDF özetle', 'Başlık çıkar', 'Not hazırla'],
    starter: 'PDF modundayım. PDF yükle, sana özet çıkarayım.',
  },
  {
    key: 'live',
    title: 'Canlı Mod',
    desc: 'Gerçek zamanlı konuşma alanına geç.',
    icon: '≋',
    options: ['Canlı konuş', 'Ses seç', 'Sessize al'],
    starter: 'Canlı mod açıldı. Konuşmaya başlayabilirsin.',
  },
];

const voices = ['Lyra', 'Nova', 'Luna', 'Aura'];

function AvatarVideo({
  className,
  imageClassName,
}: {
  className: string;
  imageClassName: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const checkLoop = () => {
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        if (video.currentTime >= video.duration - 0.32) {
          video.currentTime = 0.04;
          video.play().catch(() => {});
        }
      }

      rafRef.current = requestAnimationFrame(checkLoop);
    };

    rafRef.current = requestAnimationFrame(checkLoop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="avatar-media-root">
      <img className={imageClassName} src={AVATAR_IMAGE} alt="Lyra avatar" />

      <video
        ref={videoRef}
        className={className}
        src={AVATAR_VIDEO}
        poster={AVATAR_IMAGE}
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedData={(event) => {
          setVideoReady(true);
          event.currentTarget.currentTime = 0.04;
          event.currentTarget.play().catch(() => {});
        }}
        onEnded={(event) => {
          event.currentTarget.currentTime = 0.04;
          event.currentTarget.play().catch(() => {});
        }}
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />

      {!videoReady && <div className="video-loading">LYRA</div>}
    </div>
  );
}

async function tryJsonEndpoints(endpoints: string[], body: Record<string, unknown>) {
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) continue;

      const data = await res.json().catch(() => null);
      const text =
        data?.answer ||
        data?.reply ||
        data?.message ||
        data?.text ||
        data?.content ||
        data?.result;

      if (typeof text === 'string' && text.trim()) return text.trim();
    } catch {
      // sıradaki endpoint denensin
    }
  }

  return null;
}

async function tryFormEndpoints(
  endpoints: string[],
  file: File,
  extra: Record<string, string>
) {
  for (const endpoint of endpoints) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      Object.entries(extra).forEach(([key, value]) => formData.append(key, value));

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) continue;

      const data = await res.json().catch(() => null);
      const text =
        data?.summary ||
        data?.answer ||
        data?.reply ||
        data?.message ||
        data?.text ||
        data?.content ||
        data?.result;

      if (typeof text === 'string' && text.trim()) return text.trim();
    } catch {
      // sıradaki endpoint denensin
    }
  }

  return null;
}

export default function Page() {
  const [activeMode, setActiveMode] = useState<ModeKey>('research');
  const [muted, setMuted] = useState(false);
  const [gender, setGender] = useState<'Kadın' | 'Erkek'>('Kadın');
  const [liveOpen, setLiveOpen] = useState(false);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'Merhaba, ben Lyra. Yazabilir, konuşabilir, PDF ya da görsel yükleyebilirsin.',
    },
  ]);

  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const messageIdRef = useRef(2);

  const voice = voices[voiceIndex];
  const active = useMemo(() => modes.find((item) => item.key === activeMode), [activeMode]);
  const placeholderText = active?.starter || 'Lyra’ya bir şey sor veya yaz...';

  const addMessage = (role: Role, text: string) => {
    const id = messageIdRef.current++;
    setMessages((prev) => [...prev, { id, role, text }].slice(-14));
  };

  const speak = (text: string) => {
    if (muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.96;
    utterance.pitch = voice === 'Luna' ? 1.08 : voice === 'Nova' ? 0.92 : 1;

    const availableVoices = window.speechSynthesis.getVoices();
    const turkishVoice =
      availableVoices.find((v) => v.lang?.toLowerCase().includes('tr')) ||
      availableVoices.find((v) => v.name?.toLowerCase().includes('female')) ||
      availableVoices[0];

    if (turkishVoice) utterance.voice = turkishVoice;

    window.speechSynthesis.speak(utterance);
  };

  const getFallbackAnswer = (input: string, mode: ModeKey) => {
    if (mode === 'research') {
      return `"${input}" için araştırma modunu açtım. API bağlantın aktifse burada kaynaklı cevap dönecek; şu an ön yüzde demo cevap gösteriyorum.`;
    }

    if (mode === 'content') {
      return `"${input}" için içerik taslağı hazırlayabilirim: güçlü hook, kısa açıklama, örnek video metni ve CTA.`;
    }

    if (mode === 'lesson') {
      return `"${input}" konusunu önce basit anlatım, sonra örnek soru, sonra kısa tekrar şeklinde çalışabiliriz.`;
    }

    if (mode === 'image') {
      return `"${input}" için görsel prompt oluşturabilirim. Stil, renk, kadraj ve gerçekçilik seviyesini yazarsan netleştiririm.`;
    }

    if (mode === 'read') {
      return `Görsel okutma için görsel yüklemen gerekiyor. Etiketi, ekran görüntüsünü ya da ürünü analiz edebilirim.`;
    }

    if (mode === 'pdf') {
      return `PDF özetlemek için PDF yüklemen gerekiyor. Yüklediğinde ana fikirleri, başlıkları ve önemli notları çıkarırım.`;
    }

    return `“${input}” mesajını aldım. Canlı mod için mikrofonu başlatabilirsin.`;
  };

  const sendMessage = async (input?: string) => {
    const text = (input ?? message).trim();
    if (!text || isThinking) return;

    setMessage('');
    addMessage('user', text);
    setIsThinking(true);

    const aiText =
      (await tryJsonEndpoints(['/api/chat', '/api/ai', '/api/gemini', '/api/lyra'], {
        message: text,
        mode: activeMode,
        voice,
        gender,
      })) || getFallbackAnswer(text, activeMode);

    addMessage('assistant', aiText);
    speak(aiText);
    setIsThinking(false);
  };

  const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const cycleVoice = () => {
    setVoiceIndex((prev) => (prev + 1) % voices.length);
  };

  const openMode = (key: ModeKey) => {
    setActiveMode(key);

    const mode = modes.find((m) => m.key === key);
    if (mode) addMessage('system', `${mode.title}: ${mode.starter}`);

    if (key === 'live') setLiveOpen(true);
    if (key === 'pdf') setTimeout(() => pdfInputRef.current?.click(), 150);
    if (key === 'read') setTimeout(() => imageInputRef.current?.click(), 150);
  };

  const handleQuickOption = (option: string) => {
    setMessage(option);
    addMessage('system', `${option} seçildi. Detay yazıp Enter’a basabilirsin.`);
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addMessage(
        'assistant',
        'Bu tarayıcı mikrofonla yazıya çevirme özelliğini desteklemiyor. Chrome veya Safari deneyebilirsin.'
      );
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }

      setMessage(transcript);

      const lastResult = event.results[event.results.length - 1];
      if (lastResult?.isFinal && transcript.trim()) {
        sendMessage(transcript.trim());
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      addMessage('assistant', 'Mikrofonu duyamadım. İzinleri kontrol edip tekrar deneyelim.');
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setIsListening(false);
  };

  const handlePdfUpload = async (file?: File) => {
    if (!file) return;

    setActiveMode('pdf');
    addMessage('user', `PDF yüklendi: ${file.name}`);
    setIsThinking(true);

    const result =
      (await tryFormEndpoints(['/api/pdf', '/api/pdf-summary', '/api/upload-pdf'], file, {
        mode: 'pdf',
      })) ||
      `PDF yüklendi ama PDF okuma API bağlantısı bulunamadı. Dosya adı: ${file.name}. Eski çalışan PDF endpoint'in varsa /api/pdf, /api/pdf-summary veya /api/upload-pdf isimlerinden birine bağlayınca özet burada döner.`;

    addMessage('assistant', result);
    speak(result);
    setIsThinking(false);
  };

  const handleImageUpload = async (file?: File) => {
    if (!file) return;

    setActiveMode('read');
    addMessage('user', `Görsel yüklendi: ${file.name}`);
    setIsThinking(true);

    const result =
      (await tryFormEndpoints(['/api/vision', '/api/image-read', '/api/analyze-image'], file, {
        mode: 'read',
      })) ||
      `Görsel yüklendi ama görsel analiz API bağlantısı bulunamadı. Dosya adı: ${file.name}. Eski çalışan görsel endpoint'in varsa /api/vision, /api/image-read veya /api/analyze-image yoluna bağlayınca analiz burada döner.`;

    addMessage('assistant', result);
    speak(result);
    setIsThinking(false);
  };

  return (
    <main className="page">
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(event) => handlePdfUpload(event.target.files?.[0])}
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => handleImageUpload(event.target.files?.[0])}
      />

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
            <button
              className="menu-item active"
              onClick={() => addMessage('system', 'Yeni sohbet başlatıldı.')}
            >
              <span>＋</span> Yeni Sohbet
            </button>
            <button
              className="menu-item"
              onClick={() => addMessage('system', 'Sohbetler alanı açıldı.')}
            >
              <span>▢</span> Sohbetler
            </button>
            <button className="menu-item" onClick={() => setActiveMode('research')}>
              <span>⌘</span> Modlar
            </button>
            <button
              className="menu-item"
              onClick={() => addMessage('system', 'Araçlar alanı hazır.')}
            >
              <span>▤</span> Araçlar
            </button>
            <button
              className="menu-item"
              onClick={() => addMessage('system', 'Hatırlatıcılar alanı hazır.')}
            >
              <span>♢</span> Hatırlatıcılar
            </button>
            <button
              className="menu-item"
              onClick={() => addMessage('system', 'Ayarlar alanı hazır.')}
            >
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
              <button
                onClick={() =>
                  addMessage(
                    'assistant',
                    'Ben Lyra. Araştırma, içerik, ders, PDF ve görsel analiz alanlarında yardımcı olurum.'
                  )
                }
              >
                ⓘ Lyra Hakkında
              </button>
              <button onClick={cycleVoice}>♢</button>
            </div>
          </header>

          <section className="hero">
            <div className="silver-orbit orbit-one" />
            <div className="silver-orbit orbit-two" />

            <div className="avatar-video-wrap">
              <AvatarVideo className="avatar-video" imageClassName="avatar-poster" />
            </div>
          </section>

          <section className="controls">
            <button className="control" onClick={cycleVoice}>
              <span className="sound">≋</span>
              Ses: {voice}
              <b>⌄</b>
            </button>

            <button
              className={`control ${muted ? 'selected' : ''}`}
              onClick={() => setMuted((value) => !value)}
            >
              <span>♬</span>
              {muted ? 'Sesi Aç' : 'Sessize Al'}
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
            <div className="message-list">
              {messages.map((item) => (
                <div key={item.id} className={`message ${item.role}`}>
                  {item.text}
                </div>
              ))}
              {isThinking && <div className="message assistant">Lyra düşünüyor...</div>}
            </div>

            <textarea
              placeholder={placeholderText}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
            />

            <div className="write-actions">
              <div>
                <button onClick={isListening ? stopListening : startListening}>
                  {isListening ? '■' : '🎙'}
                </button>
                <button onClick={() => imageInputRef.current?.click()}>▧</button>
                <button onClick={() => pdfInputRef.current?.click()}>PDF</button>
              </div>

              <button className="send" onClick={() => sendMessage()}>
                ▶
              </button>
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
                  <button key={option} onClick={() => handleQuickOption(option)}>
                    {option}
                  </button>
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
              <button onClick={startListening}>☰</button>
              <strong>
                <span>✦</span> LYRA
              </strong>
              <button onClick={cycleVoice}>♢</button>
            </div>

            <div className="phone-hero">
              <div className="phone-avatar-video-wrap">
                <AvatarVideo className="phone-avatar-video" imageClassName="phone-avatar-poster" />
              </div>
            </div>

            <div className="phone-controls">
              <button onClick={cycleVoice}>≋ Ses: {voice}</button>
              <button onClick={() => setMuted((value) => !value)}>
                {muted ? 'Sesi Aç' : 'Sessize Al'}
              </button>
              <button
                className={gender === 'Kadın' ? 'selected' : ''}
                onClick={() => setGender('Kadın')}
              >
                Kadın
              </button>
              <button
                className={gender === 'Erkek' ? 'selected' : ''}
                onClick={() => setGender('Erkek')}
              >
                Erkek
              </button>
              <button className="phone-live" onClick={() => setLiveOpen(true)}>
                ≋ Canlı Konuşma ›
              </button>
            </div>

            <div className="phone-input" onClick={() => sendMessage(message || 'Merhaba Lyra')}>
              <span>{message || 'Lyra’ya bir şey sor veya yaz...'}</span>
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
              <AvatarVideo className="live-avatar-video" imageClassName="live-avatar-poster" />
            </div>

            <h2>Canlı Konuşma</h2>
            <p>
              Ses: <strong>{voice}</strong> · {muted ? 'Sessiz mod açık' : 'Ses açık'} ·{' '}
              {gender} avatar
            </p>

            <div className="live-buttons">
              <button onClick={isListening ? stopListening : startListening}>
                {isListening ? '■ Dinlemeyi Durdur' : '🎙 Konuşmayı Başlat'}
              </button>
              <button onClick={cycleVoice}>≋ Ses Değiştir</button>
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
          --line-strong: rgba(20, 24, 28, 0.22);
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
          padding: 24px 24px 36px;
        }

        .page::before,
        .page::after {
          content: '';
          position: absolute;
          inset: -22%;
          pointer-events: none;
          background:
            radial-gradient(
              ellipse at 50% 42%,
              transparent 0 28%,
              rgba(255, 255, 255, 0.92) 29%,
              transparent 30%
            ),
            radial-gradient(
              ellipse at 48% 44%,
              transparent 0 37%,
              rgba(218, 224, 229, 0.62) 38%,
              transparent 39%
            );
          opacity: 0.75;
        }

        .page::after {
          transform: rotate(-15deg) scale(1.12);
          opacity: 0.32;
        }

        .brand-outside {
          position: relative;
          z-index: 2;
          width: 150px;
          margin-bottom: 14px;
          color: var(--graphite);
        }

        .brand-star {
          font-size: 42px;
          line-height: 1;
          color: #282d32;
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
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .sidebar {
          min-height: 760px;
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
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.98),
              rgba(239, 242, 244, 0.9)
            );
          border: 1px solid rgba(25, 29, 33, 0.1);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 10px 26px rgba(18, 22, 26, 0.08);
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
          transition: 0.2s ease;
        }

        .menu-item.active,
        .menu-item:hover {
          border-color: var(--line-strong);
          transform: translateY(-1px);
        }

        .menu-item span {
          font-size: 19px;
          font-weight: 950;
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
          min-height: 760px;
          border-radius: 34px;
          padding: 22px 32px 28px;
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
          height: 315px;
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
          width: 385px;
          height: 385px;
          opacity: 0.46;
          animation: orbit 12s ease-in-out infinite reverse;
        }

        .avatar-video-wrap {
          position: relative;
          z-index: 2;
          width: 250px;
          height: 300px;
          border-radius: 28px;
          overflow: hidden;
          border: 1px solid rgba(20, 24, 28, 0.12);
          background:
            radial-gradient(circle at 50% 40%, #ffffff 0%, #f4f6f7 48%, #e7ebee 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 20px 56px rgba(18, 22, 26, 0.16);
        }

        .avatar-media-root {
          position: relative;
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
        }

        .avatar-poster,
        .avatar-video,
        .phone-avatar-poster,
        .phone-avatar-video,
        .live-avatar-poster,
        .live-avatar-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center center;
          background:
            radial-gradient(circle at 50% 40%, #ffffff 0%, #f4f6f7 48%, #e7ebee 100%);
        }

        .avatar-video,
        .phone-avatar-video,
        .live-avatar-video {
          z-index: 2;
        }

        .avatar-poster,
        .phone-avatar-poster,
        .live-avatar-poster {
          z-index: 1;
        }

        .video-loading {
          position: absolute;
          inset: 0;
          z-index: 3;
          display: grid;
          place-items: center;
          font-size: 28px;
          letter-spacing: 0.16em;
          font-weight: 950;
          color: #2b2f34;
          background: linear-gradient(145deg, #ffffff, #edf1f4);
        }

        .controls {
          display: grid;
          grid-template-columns: repeat(5, minmax(118px, auto));
          justify-content: center;
          gap: 12px;
          margin-top: -6px;
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
          transition: 0.2s ease;
        }

        .control:hover,
        .mode-card:hover,
        .phone-grid button:hover {
          transform: translateY(-2px);
          border-color: var(--line-strong);
        }

        .control.selected {
          background: linear-gradient(145deg, #ffffff, rgba(222, 226, 230, 0.94));
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
          min-height: 210px;
          margin-top: 22px;
          border-radius: 26px;
          padding: 18px 22px 14px;
        }

        .message-list {
          max-height: 90px;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 10px;
          padding-right: 4px;
        }

        .message {
          width: fit-content;
          max-width: 88%;
          padding: 8px 12px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.35;
          font-weight: 800;
        }

        .message.user {
          align-self: flex-end;
          background: #111417;
          color: white;
        }

        .message.assistant {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.86);
          color: var(--graphite);
          border: 1px solid var(--line);
        }

        .message.system {
          align-self: center;
          background: rgba(225, 230, 234, 0.7);
          color: var(--graphite-soft);
          border: 1px solid var(--line);
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
          min-width: 38px;
          height: 38px;
          padding: 0 10px;
          border-radius: 999px;
          color: var(--graphite);
          background: linear-gradient(145deg, rgba(255, 255, 255, 1), rgba(230, 234, 237, 0.92));
          border: 1px solid var(--line);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 7px 18px rgba(18, 22, 26, 0.1);
          font-weight: 950;
        }

        .write-actions .send {
          width: 46px;
          height: 46px;
          border-radius: 50%;
        }

        .mode-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
          margin-top: 18px;
        }

        .mode-card {
          min-height: 185px;
          border-radius: 24px;
          padding: 20px 12px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: 0.2s ease;
        }

        .mode-card.active {
          border-color: var(--line-strong);
          outline: 2px solid rgba(18, 22, 26, 0.08);
        }

        .mode-icon {
          height: 44px;
          display: grid;
          place-items: center;
          font-size: 38px;
          line-height: 1;
          color: var(--graphite);
        }

        .mode-card strong {
          margin-top: 12px;
          font-size: 15px;
          font-weight: 950;
        }

        .mode-card small {
          margin-top: 8px;
          color: var(--graphite-soft);
          font-size: 12px;
          line-height: 1.35;
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
          margin-top: 6px;
        }

        .phone-avatar-video-wrap {
          position: relative;
          width: 138px;
          height: 190px;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(20, 24, 28, 0.12);
          background:
            radial-gradient(circle at 50% 40%, #ffffff 0%, #f4f6f7 48%, #e7ebee 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 14px 32px rgba(18, 22, 26, 0.12);
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
          min-height: 88px;
          border-radius: 16px;
          padding: 8px 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .phone-grid span {
          font-size: 23px;
          line-height: 1;
        }

        .phone-grid strong {
          font-size: 11px;
          line-height: 1.12;
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
          width: 250px;
          height: 330px;
          margin: 0 auto;
          border-radius: 28px;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 40%, #ffffff 0%, #f4f6f7 48%, #e7ebee 100%);
          border: 1px solid rgba(20, 24, 28, 0.12);
          box-shadow: var(--shadow);
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
            padding: 18px 12px 24px;
          }

          .brand-outside {
            margin: 0 auto 14px;
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
            height: 270px;
          }

          .orbit-one {
            width: 250px;
            height: 250px;
          }

          .orbit-two {
            width: 320px;
            height: 320px;
          }

          .avatar-video-wrap {
            width: 210px;
            height: 255px;
            border-radius: 22px;
          }

          .controls {
            grid-template-columns: 1fr 1fr;
            margin-top: -4px;
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
