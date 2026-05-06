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

const GEMINI_ENDPOINTS = ['/api/gemini', '/api/gemini-chat', '/api/chat', '/api/lyra', '/api/ai'];
const PDF_ENDPOINTS = ['/api/pdf', '/api/pdf-summary', '/api/upload-pdf'];
const IMAGE_ENDPOINTS = ['/api/vision', '/api/image-read', '/api/analyze-image'];

const voices = ['Lyra', 'Nova', 'Luna', 'Aura', 'Gemini Live'];

const modes: {
  key: ModeKey;
  title: string;
  desc: string;
  icon: string;
  starter: string;
}[] = [
  {
    key: 'research',
    title: 'Araştırma Modu',
    desc: 'Bilgi bul, analiz et ve net cevaplar üret.',
    icon: '⌕',
    starter: 'Araştırılacak konuyu yaz.',
  },
  {
    key: 'content',
    title: 'İçerik Üretme',
    desc: 'Hook, başlık, video metni ve teleprompter hazırla.',
    icon: '✎',
    starter: 'Video konunu yaz. Sana başlık, hook ve teleprompter metni çıkarayım.',
  },
  {
    key: 'lesson',
    title: 'Ders Modu',
    desc: 'Konu anlat, test üret, yanlış açıkla.',
    icon: '▰',
    starter: 'Çalışmak istediğin konuyu, soruyu ya da görseli gönder.',
  },
  {
    key: 'image',
    title: 'Görsel Üretme',
    desc: 'Görsel promptu ve konsept hazırla.',
    icon: '▧',
    starter: 'Nasıl bir görsel istediğini yaz.',
  },
  {
    key: 'read',
    title: 'Görselle Okut',
    desc: 'Görsel, belge ve ekranları analiz et.',
    icon: '◌',
    starter: 'Görsel yükle veya görselde ne okutmak istediğini yaz.',
  },
  {
    key: 'pdf',
    title: 'PDF Özeti',
    desc: 'PDF yükle, özetle ve not çıkar.',
    icon: '▤',
    starter: 'PDF yükle, sana özet ve önemli notlar çıkarayım.',
  },
  {
    key: 'live',
    title: 'Canlı Mod',
    desc: 'Gerçek zamanlı konuşma alanı.',
    icon: '≋',
    starter: 'Canlı konuşma açık. Konuşmaya başlayabilirsin.',
  },
];

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

async function postJsonFast(endpoints: string[], body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) continue;

      const data = await res.json().catch(() => null);
      const text =
        data?.answer ||
        data?.reply ||
        data?.message ||
        data?.text ||
        data?.content ||
        data?.result ||
        data?.response;

      if (typeof text === 'string' && text.trim()) {
        clearTimeout(timeout);
        return text.trim();
      }
    } catch {
      continue;
    }
  }

  clearTimeout(timeout);
  return null;
}

async function postFileFast(endpoints: string[], file: File, extra: Record<string, string>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 24000);

  for (const endpoint of endpoints) {
    try {
      const form = new FormData();
      form.append('file', file);
      Object.entries(extra).forEach(([key, value]) => form.append(key, value));

      const res = await fetch(endpoint, {
        method: 'POST',
        body: form,
        signal: controller.signal,
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
        data?.result ||
        data?.response;

      if (typeof text === 'string' && text.trim()) {
        clearTimeout(timeout);
        return text.trim();
      }
    } catch {
      continue;
    }
  }

  clearTimeout(timeout);
  return null;
}

function buildPrompt(mode: ModeKey, input: string, action?: string) {
  if (mode === 'content') {
    return `
Sen Lyra'sın. Türkçe, akıcı, sosyal medya odaklı içerik üret.
Konu: ${input}
İstenen aksiyon: ${action || 'tam içerik paketi'}

Şu formatta cevap ver:
1) Video Konu Başlıkları: 5 fikir
2) İlk 3 Saniye Hook: 5 seçenek
3) Teleprompter Metni: 45-60 saniyelik, konuşur gibi
4) Ekran Yazıları: kısa kısa
5) CTA: kaydet/yorum/paylaş odaklı
6) Çekim Notu: ışık, kadraj, tempo
`;
  }

  if (mode === 'lesson') {
    return `
Sen Lyra'sın. Öğretmen gibi ama çok anlaşılır anlat.
Konu/Soru: ${input}
İstenen aksiyon: ${action || 'ders anlatımı'}

Şu formatta cevap ver:
1) Konu Özeti
2) Bilmen Gereken Formüller / Kurallar
3) Sınav İpuçları
4) Çözümlü Örnek Sorular
5) Şıklı Mini Test
6) Yanlış Yapılırsa Nasıl Düşünülmeli?
`;
  }

  if (mode === 'research') {
    return `
Sen Lyra'sın. Konuyu sade, güncel ve net araştırma özeti gibi anlat.
Konu: ${input}
Format:
1) Kısa cevap
2) Detaylı açıklama
3) Önemli maddeler
4) Dikkat edilmesi gerekenler
5) Sonuç
`;
  }

  if (mode === 'image') {
    return `
Sen Lyra'sın. Görsel üretim promptu hazırlıyorsun.
İstek: ${input}
Format:
1) Kısa konsept
2) Detaylı prompt
3) Renk paleti
4) Kadraj
5) Stil alternatifleri
`;
  }

  if (mode === 'read') {
    return `
Sen Lyra'sın. Görsel okuma/analiz modundasın.
Kullanıcı isteği: ${input}
Görsel yüklendiyse analiz et; yüklenmediyse ne yüklemesi gerektiğini söyle.
`;
  }

  if (mode === 'pdf') {
    return `
Sen Lyra'sın. PDF özetleme modundasın.
Kullanıcı isteği: ${input}
PDF yüklendiyse özetle; yüklenmediyse PDF yüklemesini iste.
`;
  }

  return input;
}

export default function Page() {
  const [activeMode, setActiveMode] = useState<ModeKey>('content');
  const [muted, setMuted] = useState(false);
  const [gender, setGender] = useState<'Kadın' | 'Erkek'>('Kadın');
  const [liveOpen, setLiveOpen] = useState(false);
  const [voiceIndex, setVoiceIndex] = useState(4);
  const [message, setMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveContinuous, setLiveContinuous] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'Merhaba, ben Lyra. Konu yaz; içerik, ders, araştırma, PDF veya görsel alanında hemen çalışayım.',
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
    setMessages((prev) => [...prev, { id, role, text }].slice(-16));
  };

  const speak = (text: string) => {
    if (muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const cleanText = text.replace(/\*\*/g, '').replace(/[#>`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';
    utterance.rate = voice === 'Gemini Live' ? 1.04 : 0.98;
    utterance.pitch = voice === 'Luna' ? 1.08 : voice === 'Nova' ? 0.94 : 1;

    const availableVoices = window.speechSynthesis.getVoices();
    const tr =
      availableVoices.find((v) => v.lang?.toLowerCase().includes('tr')) ||
      availableVoices.find((v) => v.name?.toLowerCase().includes('google')) ||
      availableVoices.find((v) => v.name?.toLowerCase().includes('female')) ||
      availableVoices[0];

    if (tr) utterance.voice = tr;

    window.speechSynthesis.speak(utterance);
  };

  const fallbackAnswer = (input: string, mode: ModeKey, action?: string) => {
    if (mode === 'content') {
      return `Video Konu Başlıkları:
1. ${input} hakkında kimsenin anlatmadığı 3 detay
2. ${input} konusunda yapılan en büyük hata
3. ${input} için hızlı ama etkili rutin
4. ${input} gerçek mi abartı mı?
5. ${input} hakkında 45 saniyelik mini rehber

Hook:
“Bunu yapıyorsan fark etmeden sonucu bozuyor olabilirsin.”

Teleprompter Metni:
“Bugün sana ${input} konusunu çok basit anlatacağım. Çünkü çoğu kişi burada gereksiz bilgiye boğuluyor ama asıl mesele çok net. Önce problemi tanı, sonra doğru adımı seç. Eğer bunu kaydedersen daha sonra uygularken elinin altında olur.”

CTA:
“Kaydet, sonra birlikte uygulayalım.”`;
    }

    if (mode === 'lesson') {
      return `Konu Özeti:
${input} konusunu önce temel tanım, sonra örnek mantığıyla çalışmalısın.

Formüller / Kurallar:
- Ana kuralı yaz
- Verilenleri ayır
- İstenen değeri bul
- Birimleri kontrol et

Sınav İpuçları:
- Soruda anahtar kelimeyi yakala.
- Uzun soru görünce panikleme, verilenleri sırala.
- Önce kolay işlemden başla.

Çözümlü Soru:
Soru: ${input} ile ilgili temel bir örnek düşün.
Çözüm: Verilenleri yaz, formülü kur, sonucu sadeleştir.

Mini Test:
1) Bu konuda ilk bakılacak şey nedir?
A) Verilenler B) Şıklar C) Rastgele işlem D) Son cümle
Cevap: A`;
    }

    if (mode === 'research') {
      return `${input} için hızlı araştırma özeti:
- Konunun ana fikri çıkarılır.
- Önemli alt başlıklar belirlenir.
- Gerekiyorsa kaynaklı analiz yapılır.
- Sonuç sade bir dille toparlanır.`;
    }

    return `“${input}” için ${active?.title || 'Lyra'} modunda çalışmaya hazırım.`;
  };

  const sendMessage = async (input?: string, action?: string) => {
    const raw = (input ?? message).trim();
    if (!raw || isThinking) return;

    setMessage('');
    addMessage('user', raw);
    setIsThinking(true);

    const prompt = buildPrompt(activeMode, raw, action);

    const aiText =
      (await postJsonFast(GEMINI_ENDPOINTS, {
        message: prompt,
        rawMessage: raw,
        mode: activeMode,
        action: action || null,
        voice,
        gender,
        live: liveOpen,
        provider: 'gemini',
      })) || fallbackAnswer(raw, activeMode, action);

    addMessage('assistant', aiText);
    setIsThinking(false);
    speak(aiText);
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

    if (key === 'live') {
      setLiveOpen(true);
      return;
    }

    if (key === 'pdf') {
      setTimeout(() => pdfInputRef.current?.click(), 120);
      return;
    }

    if (key === 'read') {
      setTimeout(() => imageInputRef.current?.click(), 120);
    }
  };

  const startListening = (continuous = false) => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addMessage('assistant', 'Bu tarayıcı mikrofonla konuşmayı desteklemiyor. Chrome veya Safari dene.');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = continuous;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setLiveContinuous(continuous);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }

      setMessage(finalTranscript || interimTranscript);

      if (finalTranscript.trim()) {
        sendMessage(finalTranscript.trim());
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setLiveContinuous(false);
      addMessage('assistant', 'Mikrofonu duyamadım. İzinleri kontrol edip tekrar deneyelim.');
    };

    recognition.onend = () => {
      setIsListening(false);
      if (continuous && liveOpen) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch {
            setLiveContinuous(false);
          }
        }, 250);
      } else {
        setLiveContinuous(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setIsListening(false);
    setLiveContinuous(false);
  };

  const handlePdfUpload = async (file?: File) => {
    if (!file) return;

    setActiveMode('pdf');
    addMessage('user', `PDF yüklendi: ${file.name}`);
    setIsThinking(true);

    const result =
      (await postFileFast(PDF_ENDPOINTS, file, { mode: 'pdf', provider: 'gemini' })) ||
      `PDF yüklendi. PDF API bağlantısı bulunamadı ama dosya alındı: ${file.name}.`;

    addMessage('assistant', result);
    setIsThinking(false);
    speak(result);
  };

  const handleImageUpload = async (file?: File) => {
    if (!file) return;

    setActiveMode('read');
    addMessage('user', `Görsel yüklendi: ${file.name}`);
    setIsThinking(true);

    const result =
      (await postFileFast(IMAGE_ENDPOINTS, file, { mode: 'read', provider: 'gemini' })) ||
      `Görsel yüklendi. Görsel analiz API bağlantısı bulunamadı ama dosya alındı: ${file.name}.`;

    addMessage('assistant', result);
    setIsThinking(false);
    speak(result);
  };

  const quickAction = (action: string) => {
    const text = message.trim();

    if (!text) {
      setMessage(action);
      return;
    }

    sendMessage(text, action);
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
            <button className="menu-item active" onClick={() => setMessages([])}>
              <span>＋</span> Yeni Sohbet
            </button>
            <button className="menu-item">
              <span>▢</span> Sohbetler
            </button>
            <button className="menu-item" onClick={() => setActiveMode('content')}>
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
              <button onClick={() => addMessage('assistant', 'Ben Lyra. Gemini destekli konuşma, içerik, ders, PDF ve görsel analiz modlarıyla çalışırım.')}>
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

            <button className={`control ${muted ? 'selected' : ''}`} onClick={() => setMuted((v) => !v)}>
              <span>♬</span>
              {muted ? 'Sesi Aç' : 'Sessize Al'}
            </button>

            <button className={`control ${gender === 'Kadın' ? 'selected' : ''}`} onClick={() => setGender('Kadın')}>
              <span>♙</span>
              Kadın
            </button>

            <button className={`control ${gender === 'Erkek' ? 'selected' : ''}`} onClick={() => setGender('Erkek')}>
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
              {isThinking && <div className="message assistant">Lyra cevaplıyor...</div>}
            </div>

            <textarea
              placeholder={placeholderText}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
            />

            <div className="write-actions">
              <div>
                <button onClick={() => startListening(false)}>{isListening ? '■' : '🎙'}</button>
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

          <section className="sub-panel">
            {activeMode === 'content' && (
              <>
                <strong>İçerik Üretme</strong>
                <div>
                  <button onClick={() => quickAction('Video konu başlıkları üret')}>Video Konu Başlıkları</button>
                  <button onClick={() => quickAction('Hook yaz')}>Hook Alanı</button>
                  <button onClick={() => quickAction('Teleprompter video metni yaz')}>Teleprompter Metni</button>
                  <button onClick={() => quickAction('Ekran yazıları ve CTA üret')}>Ekran Yazısı + CTA</button>
                </div>
              </>
            )}

            {activeMode === 'lesson' && (
              <>
                <strong>Ders Modu</strong>
                <div>
                  <button onClick={() => quickAction('Konu özeti çıkar')}>Konu Özeti</button>
                  <button onClick={() => quickAction('Konu formülleri ve kuralları çıkar')}>Konu Formülleri</button>
                  <button onClick={() => quickAction('Sınav ipuçları ver')}>Sınav İpuçları</button>
                  <button onClick={() => quickAction('Çözümlü sorular üret')}>Çözümlü Sorular</button>
                  <button onClick={() => quickAction('Şıklı test üret')}>Test Üret</button>
                  <button onClick={() => quickAction('Yanlışımı açıkla')}>Yanlışımı Açıkla</button>
                  <button onClick={() => imageInputRef.current?.click()}>Soru Görseli Yükle</button>
                </div>
              </>
            )}

            {activeMode === 'research' && (
              <>
                <strong>Araştırma Modu</strong>
                <div>
                  <button onClick={() => quickAction('Derin araştırma yap')}>Derin Araştır</button>
                  <button onClick={() => quickAction('Kaynaklı özet çıkar')}>Kaynaklı Özet</button>
                  <button onClick={() => quickAction('Karşılaştırmalı analiz yap')}>Karşılaştır</button>
                </div>
              </>
            )}

            {activeMode === 'image' && (
              <>
                <strong>Görsel Üretme</strong>
                <div>
                  <button onClick={() => quickAction('Görsel promptu yaz')}>Prompt Yaz</button>
                  <button onClick={() => quickAction('Konsept tasarla')}>Konsept Tasarla</button>
                  <button onClick={() => quickAction('Renk paleti oluştur')}>Renk Paleti</button>
                </div>
              </>
            )}

            {activeMode === 'read' && (
              <>
                <strong>Görselle Okut</strong>
                <div>
                  <button onClick={() => imageInputRef.current?.click()}>Görsel Yükle</button>
                  <button onClick={() => quickAction('Görseldeki yazıyı oku')}>Yazıyı Oku</button>
                  <button onClick={() => quickAction('Görseli analiz et')}>Analiz Et</button>
                </div>
              </>
            )}

            {activeMode === 'pdf' && (
              <>
                <strong>PDF Özeti</strong>
                <div>
                  <button onClick={() => pdfInputRef.current?.click()}>PDF Yükle</button>
                  <button onClick={() => quickAction('PDF ana başlıkları çıkar')}>Başlık Çıkar</button>
                  <button onClick={() => quickAction('PDF çalışma notu hazırla')}>Not Hazırla</button>
                </div>
              </>
            )}
          </section>
        </section>

        <aside className="phone-shell">
          <div className="phone">
            <div className="phone-status">
              <strong>9:41</strong>
              <span />
              <b>▮▮▮</b>
            </div>

            <div className="phone-head">
              <button onClick={() => startListening(false)}>☰</button>
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
              <button onClick={() => setMuted((v) => !v)}>{muted ? 'Sesi Aç' : 'Sessize Al'}</button>
              <button className={gender === 'Kadın' ? 'selected' : ''} onClick={() => setGender('Kadın')}>
                Kadın
              </button>
              <button className={gender === 'Erkek' ? 'selected' : ''} onClick={() => setGender('Erkek')}>
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
            <button className="close" onClick={() => {
              setLiveOpen(false);
              stopListening();
            }}>
              ×
            </button>

            <div className="live-avatar-video-wrap">
              <AvatarVideo className="live-avatar-video" imageClassName="live-avatar-poster" />
            </div>

            <h2>Canlı Konuşma</h2>
            <p>
              Ses: <strong>{voice}</strong> · {muted ? 'Sessiz mod açık' : 'Ses açık'} ·{' '}
              {liveContinuous ? 'Gemini Live dinliyor' : 'Hazır'}
            </p>

            <div className="live-buttons">
              <button onClick={() => startListening(true)}>
                🎙 Gemini Live Başlat
              </button>
              <button onClick={stopListening}>■ Durdur</button>
              <button onClick={cycleVoice}>≋ Ses Değiştir</button>
              <button onClick={() => setMuted((v) => !v)}>{muted ? 'Sesi Aç' : 'Sessize Al'}</button>
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
          --glass: linear-gradient(145deg, rgba(255,255,255,.95), rgba(235,238,241,.78), rgba(255,255,255,.88));
        }

        * { box-sizing: border-box; }

        html, body {
          margin: 0;
          min-height: 100%;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: var(--graphite);
          background:
            radial-gradient(circle at 48% 22%, rgba(255,255,255,1), transparent 32%),
            linear-gradient(135deg, #ffffff 0%, #f5f7f8 44%, #e6eaee 100%);
        }

        button, textarea { font: inherit; }
        button { cursor: pointer; border: 0; }

        .page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          padding: 24px 24px 36px;
        }

        .page::before, .page::after {
          content: '';
          position: absolute;
          inset: -22%;
          pointer-events: none;
          background:
            radial-gradient(ellipse at 50% 42%, transparent 0 28%, rgba(255,255,255,.92) 29%, transparent 30%),
            radial-gradient(ellipse at 48% 44%, transparent 0 37%, rgba(218,224,229,.62) 38%, transparent 39%);
          opacity: .75;
        }

        .page::after { transform: rotate(-15deg) scale(1.12); opacity: .32; }

        .brand-outside {
          position: relative;
          z-index: 2;
          width: 150px;
          margin-bottom: 14px;
        }

        .brand-star { font-size: 42px; line-height: 1; color: #282d32; }
        .brand-text { margin-top: 6px; font-size: 34px; font-weight: 950; letter-spacing: .18em; }

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
          letter-spacing: .08em;
        }

        .logo-row strong { font-weight: 950; }
        .menu { display: grid; gap: 12px; }

        .menu-item, .mini-box, .profile-box, .usage-box, .control, .write-box,
        .mode-card, .phone-controls button, .phone-input, .phone-grid button,
        .head-actions button {
          color: var(--graphite);
          background: linear-gradient(145deg, rgba(255,255,255,.98), rgba(239,242,244,.9));
          border: 1px solid rgba(25,29,33,.1);
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 10px 26px rgba(18,22,26,.08);
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
          transition: .2s ease;
        }

        .menu-item.active, .menu-item:hover { border-color: var(--line-strong); transform: translateY(-1px); }
        .menu-item span { font-size: 19px; font-weight: 950; }

        .side-bottom { margin-top: auto; display: grid; gap: 12px; }
        .mini-box, .profile-box, .usage-box { border-radius: 20px; padding: 18px; }
        .mini-box { display: flex; gap: 12px; align-items: center; }
        .mini-box span { font-size: 26px; }

        .mini-box strong, .profile-box strong, .usage-box strong { display: block; font-weight: 950; }
        .mini-box small, .profile-box small, .usage-box small {
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
          background: radial-gradient(circle at 30% 22%, #fff, transparent 28%), linear-gradient(145deg, #202428, #7e858b);
          color: white;
          font-weight: 950;
        }

        .usage-box > div { display: flex; justify-content: space-between; gap: 12px; font-weight: 900; }
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
            radial-gradient(circle at 50% 25%, rgba(255,255,255,.95), transparent 25%),
            radial-gradient(circle at 50% 33%, rgba(226,231,235,.68), transparent 42%);
        }

        .main-head, .hero, .controls, .write-box, .mode-grid, .sub-panel { position: relative; z-index: 1; }

        .main-head {
          min-height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .main-head h1 {
          margin: 0;
          font-size: clamp(21px, 2.2vw, 31px);
          letter-spacing: .12em;
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
          border: 2px solid rgba(255,255,255,.95);
          box-shadow: 0 0 26px rgba(255,255,255,.9), inset 0 0 30px rgba(205,211,216,.58);
        }

        .orbit-one { width: 300px; height: 300px; animation: orbit 9s ease-in-out infinite; }
        .orbit-two { width: 385px; height: 385px; opacity: .46; animation: orbit 12s ease-in-out infinite reverse; }

        .avatar-video-wrap {
          position: relative;
          z-index: 2;
          width: 250px;
          height: 300px;
          border-radius: 28px;
          overflow: hidden;
          border: 1px solid rgba(20,24,28,.12);
          background: radial-gradient(circle at 50% 40%, #fff 0%, #f4f6f7 48%, #e7ebee 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 20px 56px rgba(18,22,26,.16);
        }

        .avatar-media-root {
          position: relative;
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
        }

        .avatar-poster, .avatar-video, .phone-avatar-poster, .phone-avatar-video,
        .live-avatar-poster, .live-avatar-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center center;
          background: radial-gradient(circle at 50% 40%, #fff 0%, #f4f6f7 48%, #e7ebee 100%);
        }

        .avatar-video, .phone-avatar-video, .live-avatar-video { z-index: 2; }
        .avatar-poster, .phone-avatar-poster, .live-avatar-poster { z-index: 1; }

        .video-loading {
          position: absolute;
          inset: 0;
          z-index: 3;
          display: grid;
          place-items: center;
          font-size: 28px;
          letter-spacing: .16em;
          font-weight: 950;
          color: #2b2f34;
          background: linear-gradient(145deg, #fff, #edf1f4);
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
          transition: .2s ease;
        }

        .control:hover, .mode-card:hover, .phone-grid button:hover {
          transform: translateY(-2px);
          border-color: var(--line-strong);
        }

        .control.selected {
          background: linear-gradient(145deg, #fff, rgba(222,226,230,.94));
          border-color: var(--line-strong);
        }

        .control.live { min-width: 214px; }
        .sound { font-size: 24px; line-height: 1; }

        .write-box {
          min-height: 275px;
          margin-top: 22px;
          border-radius: 26px;
          padding: 18px 22px 14px;
        }

        .message-list {
          height: 150px;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 10px;
          padding-right: 4px;
        }

        .message {
          width: fit-content;
          max-width: 92%;
          padding: 10px 13px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.42;
          font-weight: 800;
          white-space: pre-wrap;
        }

        .message.user {
          align-self: flex-end;
          background: #111417;
          color: white;
        }

        .message.assistant {
          align-self: flex-start;
          background: rgba(255,255,255,.86);
          color: var(--graphite);
          border: 1px solid var(--line);
        }

        .message.system {
          align-self: center;
          background: rgba(225,230,234,.7);
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

        .write-box textarea::placeholder { color: #394047; opacity: .9; }

        .write-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .write-actions div { display: flex; gap: 10px; }

        .write-actions button {
          min-width: 38px;
          height: 38px;
          padding: 0 10px;
          border-radius: 999px;
          color: var(--graphite);
          background: linear-gradient(145deg, rgba(255,255,255,1), rgba(230,234,237,.92));
          border: 1px solid var(--line);
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 7px 18px rgba(18,22,26,.1);
          font-weight: 950;
        }

        .write-actions .send { width: 46px; height: 46px; border-radius: 50%; }

        .mode-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
          margin-top: 18px;
        }

        .mode-card {
          min-height: 165px;
          border-radius: 24px;
          padding: 18px 10px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: .2s ease;
        }

        .mode-card.active {
          border-color: var(--line-strong);
          outline: 2px solid rgba(18,22,26,.08);
        }

        .mode-icon {
          height: 38px;
          display: grid;
          place-items: center;
          font-size: 32px;
          line-height: 1;
          color: var(--graphite);
        }

        .mode-card strong { margin-top: 10px; font-size: 14px; font-weight: 950; }
        .mode-card small {
          margin-top: 7px;
          color: var(--graphite-soft);
          font-size: 11px;
          line-height: 1.28;
          font-weight: 800;
        }

        .mode-card b { margin-top: auto; font-weight: 950; }

        .sub-panel {
          margin-top: 16px;
          border-radius: 22px;
          padding: 16px;
          background: rgba(255,255,255,.74);
          border: 1px solid var(--line);
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .sub-panel strong { font-weight: 950; }

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
          background: linear-gradient(145deg, #f9fafb, #9da3a9, #fff);
          box-shadow: inset 0 0 0 2px rgba(255,255,255,.7), 0 28px 70px rgba(18,22,26,.22);
        }

        .phone {
          width: 340px;
          height: 735px;
          overflow: hidden;
          border-radius: 38px;
          padding: 15px 14px 18px;
          background: radial-gradient(circle at 50% 19%, rgba(255,255,255,1), transparent 34%), linear-gradient(145deg, #fff, #eef1f3);
          border: 1px solid rgba(255,255,255,.94);
        }

        .phone-status, .phone-head {
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

        .phone-head { margin-top: 18px; }

        .phone-head button {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255,255,255,.9);
          color: var(--graphite);
          border: 1px solid var(--line);
          font-weight: 950;
        }

        .phone-head strong { font-size: 24px; letter-spacing: .12em; font-weight: 950; }

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
          border: 1px solid rgba(20,24,28,.12);
          background: radial-gradient(circle at 50% 40%, #fff 0%, #f4f6f7 48%, #e7ebee 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 14px 32px rgba(18,22,26,.12);
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
          background: linear-gradient(145deg, #fff, #e2e6e9);
          border-color: var(--line-strong);
        }

        .phone-live { grid-column: 1 / -1; }

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

        .phone-grid span { font-size: 23px; line-height: 1; }
        .phone-grid strong { font-size: 11px; line-height: 1.12; font-weight: 950; }
        .phone-grid small { font-weight: 950; }

        .modal {
          position: fixed;
          inset: 0;
          z-index: 20;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(238,241,244,.72);
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
          background: radial-gradient(circle at 50% 40%, #fff 0%, #f4f6f7 48%, #e7ebee 100%);
          border: 1px solid rgba(20,24,28,.12);
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
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.03) translateY(-8px); }
        }

        @media (max-width: 1280px) {
          .app-layout { grid-template-columns: 220px minmax(620px, 1fr); }
          .phone-shell { grid-column: 1 / -1; justify-self: center; }
          .mode-grid { grid-template-columns: repeat(3, 1fr); }
        }

        @media (max-width: 860px) {
          .page { padding: 18px 12px 24px; }
          .brand-outside { margin: 0 auto 14px; text-align: center; }
          .app-layout { grid-template-columns: 1fr; }
          .sidebar, .phone-shell { display: none; }
          .main-panel { min-height: auto; padding: 18px 14px 20px; border-radius: 26px; }
          .main-head { justify-content: center; }
          .main-head h1 { font-size: 18px; text-align: center; }
          .head-actions { display: none; }
          .hero { height: 270px; }
          .orbit-one { width: 250px; height: 250px; }
          .orbit-two { width: 320px; height: 320px; }
          .avatar-video-wrap { width: 210px; height: 255px; border-radius: 22px; }
          .controls { grid-template-columns: 1fr 1fr; margin-top: -4px; }
          .control.live { grid-column: 1 / -1; }
          .control { min-height: 50px; padding: 0 14px; font-size: 14px; }
          .mode-grid { grid-template-columns: repeat(2, 1fr); }
          .mode-card { min-height: 160px; }
        }
      `}</style>
    </main>
  );
}
