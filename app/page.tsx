'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

type ModeKey = 'chat' | 'research' | 'content' | 'lesson' | 'image' | 'read' | 'pdf' | 'live';
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
    key: 'chat',
    title: 'Sohbet',
    desc: 'Lyra ile doğal yazış.',
    icon: '✦',
    starter: 'Lyra’ya mesaj yaz...',
  },
  {
    key: 'research',
    title: 'Araştırma',
    desc: 'Bilgi bul ve özetle.',
    icon: '⌕',
    starter: 'Araştırılacak konuyu yaz.',
  },
  {
    key: 'content',
    title: 'İçerik',
    desc: 'Hook ve video metni.',
    icon: '✎',
    starter: 'Video konunu yaz.',
  },
  {
    key: 'lesson',
    title: 'Ders',
    desc: 'Konu anlat, test üret.',
    icon: '▰',
    starter: 'Çalışmak istediğin konuyu yaz.',
  },
  {
    key: 'image',
    title: 'Görsel',
    desc: 'Prompt ve konsept.',
    icon: '▧',
    starter: 'Nasıl bir görsel istediğini yaz.',
  },
  {
    key: 'read',
    title: 'Görselle Okut',
    desc: 'Görsel analiz et.',
    icon: '◌',
    starter: 'Görsel yükle veya ne okutmak istediğini yaz.',
  },
  {
    key: 'pdf',
    title: 'PDF',
    desc: 'PDF özetle.',
    icon: '▤',
    starter: 'PDF yükle veya ne istediğini yaz.',
  },
  {
    key: 'live',
    title: 'Canlı',
    desc: 'Sesli konuş.',
    icon: '≋',
    starter: 'Canlı konuşma açık.',
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

    const loopBeforeBlackFrame = () => {
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        if (video.currentTime >= video.duration - 0.32) {
          video.currentTime = 0.04;
          video.play().catch(() => {});
        }
      }

      rafRef.current = requestAnimationFrame(loopBeforeBlackFrame);
    };

    rafRef.current = requestAnimationFrame(loopBeforeBlackFrame);

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
  if (mode === 'chat') {
    return `
Sen Lyra'sın. Türkçe konuşan, sıcak, doğal, hızlı ve yardımcı bir AI asistansın.
Kullanıcı mesajı: ${input}
Kısa ama yeterli cevap ver. Gerekirse öneri sun.
`;
  }

  if (mode === 'content') {
    return `
Sen Lyra'sın. Türkçe, akıcı ve sosyal medya odaklı içerik üret.
Konu: ${input}
İstenen aksiyon: ${action || 'tam içerik paketi'}

Şu formatta cevap ver:
1) Video Konu Başlıkları: 5 fikir
2) İlk 3 Saniye Hook: 5 seçenek
3) Teleprompter Metni: 45-60 saniyelik, konuşur gibi
4) Ekran Yazıları
5) CTA
6) Çekim Notu
`;
  }

  if (mode === 'lesson') {
    return `
Sen Lyra'sın. Öğretmen gibi ama çok anlaşılır anlat.
Konu/Soru: ${input}
İstenen aksiyon: ${action || 'ders anlatımı'}

Şu formatta cevap ver:
1) Konu Özeti
2) Formüller / Kurallar
3) Sınav İpuçları
4) Çözümlü Örnek Sorular
5) Şıklı Mini Test
6) Yanlış Yapılırsa Nasıl Düşünülmeli?
`;
  }

  if (mode === 'research') {
    return `
Sen Lyra'sın. Konuyu sade, net ve düzenli anlat.
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
  const [activeMode, setActiveMode] = useState<ModeKey>('chat');
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
      text: 'Selam, ben Lyra. Önce sohbet edelim; istersen alttaki modlardan içerik, ders, PDF, görsel veya canlı konuşmaya geçebilirsin.',
    },
  ]);

  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const messageIdRef = useRef(2);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const voice = voices[voiceIndex];
  const active = useMemo(() => modes.find((item) => item.key === activeMode), [activeMode]);
  const placeholderText = active?.starter || 'Lyra’ya mesaj yaz...';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const addMessage = (role: Role, text: string) => {
    const id = messageIdRef.current++;
    setMessages((prev) => [...prev, { id, role, text }].slice(-40));
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

  const fallbackAnswer = (input: string, mode: ModeKey) => {
    if (mode === 'chat') {
      return `Anladım kanka. “${input}” için hemen yardımcı olayım. İstersen bunu sohbet gibi açalım, istersen alttaki modlardan birine geçirip daha düzenli çalışayım.`;
    }

    if (mode === 'content') {
      return `Video Konu Başlıkları:
1. ${input} hakkında 5 farklı video fikri
2. ${input} için izlenir bir seri fikri
3. ${input} konusunda en sık yapılan hata
4. ${input} hızlı rehber
5. ${input} doğru bilinen yanlışlar

Hook:
“Bunu yapıyorsan sonucu fark etmeden bozuyor olabilirsin.”

Teleprompter Metni:
“Bugün sana ${input} konusunu çok basit anlatacağım. Çünkü çoğu kişi burada yanlış noktaya odaklanıyor. Aslında işin özü çok daha net. Önce problemi anlayacağız, sonra doğru adımı seçeceğiz ve sonunda bunu nasıl uygulayacağını konuşacağız.”

CTA:
“Kaydet, sonra birlikte tekrar bakalım.”`;
    }

    if (mode === 'lesson') {
      return `Konu Özeti:
${input} konusunu temel mantık + örnek + tekrar şeklinde çalışmalısın.

Formüller / Kurallar:
- Ana formül
- Gerekli kural
- Uygulama sırası
- Birim kontrolü

Sınav İpuçları:
- Sorunun istediğini bul
- Verilenleri ayır
- Hızlı çözüm yolunu seç
- Sonucu kontrol et

Çözümlü Soru:
Örnek soru + çözüm mantığı.

Mini Test:
1) Bu konuda ilk yapılacak şey nedir?
A) Verilenleri ayırmak
B) Şıkları ezberlemek
C) Rastgele işlem yapmak
D) Sonucu tahmin etmek
Cevap: A`;
    }

    if (mode === 'research') {
      return `${input} için hızlı araştırma özeti:
- Ana fikir
- Alt başlıklar
- Önemli noktalar
- Kısa sonuç`;
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
      })) || fallbackAnswer(raw, activeMode);

    addMessage('assistant', aiText);
    setIsThinking(false);
    speak(aiText);
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
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

    if (key === 'chat') {
      return;
    }

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

      <section className="app-layout">
        <aside className="sidebar glass">
          <div className="logo-row">
            <strong>LYRA</strong>
          </div>

          <nav className="menu">
            <button
              className={`menu-item ${activeMode === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveMode('chat')}
            >
              <span>✦</span> Sohbet
            </button>
            <button className="menu-item" onClick={() => setMessages([])}>
              <span>＋</span> Yeni Sohbet
            </button>
            <button
              className={`menu-item ${activeMode === 'content' ? 'active' : ''}`}
              onClick={() => setActiveMode('content')}
            >
              <span>✎</span> İçerik
            </button>
            <button
              className={`menu-item ${activeMode === 'lesson' ? 'active' : ''}`}
              onClick={() => setActiveMode('lesson')}
            >
              <span>▰</span> Ders
            </button>
            <button className="menu-item" onClick={() => imageInputRef.current?.click()}>
              <span>▧</span> Görsel Yükle
            </button>
            <button className="menu-item" onClick={() => pdfInputRef.current?.click()}>
              <span>PDF</span> PDF Yükle
            </button>
          </nav>

          <div className="side-bottom">
            <div className="mini-box">
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
          </div>
        </aside>

        <section className="main-panel glass">
          <header className="main-head">
            <div className="assistant-mini">
              <div className="mini-avatar">
                <AvatarVideo className="mini-avatar-video" imageClassName="mini-avatar-poster" />
              </div>

              <div>
                <h1>LYRA</h1>
                <p>{active?.title || 'Sohbet'} modu · {voice}</p>
              </div>
            </div>

            <div className="head-actions">
              <button onClick={cycleVoice}>Ses: {voice}</button>
              <button onClick={() => setMuted((v) => !v)}>
                {muted ? 'Sesi Aç' : 'Sessiz'}
              </button>
              <button onClick={() => setLiveOpen(true)}>Canlı</button>
            </div>
          </header>

          <section className="chat-shell">
            <div className="message-list">
              {messages.map((item) => (
                <div key={item.id} className={`message ${item.role}`}>
                  {item.text}
                </div>
              ))}

              {isThinking && <div className="message assistant typing">Lyra cevaplıyor...</div>}

              <div ref={messagesEndRef} />
            </div>

            <div className="composer">
              <textarea
                placeholder={placeholderText}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
              />

              <div className="composer-actions">
                <div className="left-actions">
                  <button onClick={() => startListening(false)}>{isListening ? '■' : '🎙'}</button>
                  <button onClick={() => imageInputRef.current?.click()}>Görsel</button>
                  <button onClick={() => pdfInputRef.current?.click()}>PDF</button>
                </div>

                <button className="send" onClick={() => sendMessage()}>
                  Gönder
                </button>
              </div>
            </div>
          </section>

          <section className="mode-dock">
            {modes.map((mode) => (
              <button
                key={mode.key}
                className={`dock-item ${activeMode === mode.key ? 'active' : ''}`}
                onClick={() => openMode(mode.key)}
              >
                <span>{mode.icon}</span>
                <strong>{mode.title}</strong>
              </button>
            ))}
          </section>

          {activeMode !== 'chat' && activeMode !== 'live' && (
            <section className="sub-panel">
              {activeMode === 'content' && (
                <>
                  <strong>İçerik araçları</strong>
                  <div>
                    <button onClick={() => quickAction('Video konu başlıkları üret')}>Video Başlıkları</button>
                    <button onClick={() => quickAction('Hook yaz')}>Hook</button>
                    <button onClick={() => quickAction('Teleprompter video metni yaz')}>Teleprompter</button>
                    <button onClick={() => quickAction('Ekran yazıları ve CTA üret')}>CTA</button>
                  </div>
                </>
              )}

              {activeMode === 'lesson' && (
                <>
                  <strong>Ders araçları</strong>
                  <div>
                    <button onClick={() => quickAction('Konu özeti çıkar')}>Konu Özeti</button>
                    <button onClick={() => quickAction('Konu formülleri ve kuralları çıkar')}>Formüller</button>
                    <button onClick={() => quickAction('Sınav ipuçları ver')}>İpuçları</button>
                    <button onClick={() => quickAction('Çözümlü sorular üret')}>Çözümlü Soru</button>
                    <button onClick={() => quickAction('Şıklı test üret')}>Test</button>
                    <button onClick={() => quickAction('Yanlışımı açıkla')}>Yanlış Açıkla</button>
                  </div>
                </>
              )}

              {activeMode === 'research' && (
                <>
                  <strong>Araştırma araçları</strong>
                  <div>
                    <button onClick={() => quickAction('Derin araştırma yap')}>Derin Araştır</button>
                    <button onClick={() => quickAction('Kaynaklı özet çıkar')}>Özet</button>
                    <button onClick={() => quickAction('Karşılaştırmalı analiz yap')}>Karşılaştır</button>
                  </div>
                </>
              )}

              {activeMode === 'image' && (
                <>
                  <strong>Görsel araçları</strong>
                  <div>
                    <button onClick={() => quickAction('Görsel promptu yaz')}>Prompt</button>
                    <button onClick={() => quickAction('Konsept tasarla')}>Konsept</button>
                    <button onClick={() => quickAction('Renk paleti oluştur')}>Renk Paleti</button>
                  </div>
                </>
              )}

              {activeMode === 'read' && (
                <>
                  <strong>Görselle okut</strong>
                  <div>
                    <button onClick={() => imageInputRef.current?.click()}>Görsel Yükle</button>
                    <button onClick={() => quickAction('Görseldeki yazıyı oku')}>Yazıyı Oku</button>
                    <button onClick={() => quickAction('Görseli analiz et')}>Analiz Et</button>
                  </div>
                </>
              )}

              {activeMode === 'pdf' && (
                <>
                  <strong>PDF araçları</strong>
                  <div>
                    <button onClick={() => pdfInputRef.current?.click()}>PDF Yükle</button>
                    <button onClick={() => quickAction('PDF ana başlıkları çıkar')}>Başlık Çıkar</button>
                    <button onClick={() => quickAction('PDF çalışma notu hazırla')}>Not Hazırla</button>
                  </div>
                </>
              )}
            </section>
          )}
        </section>
      </section>

      {liveOpen && (
        <section className="modal">
          <div className="live-panel glass">
            <button
              className="close"
              onClick={() => {
                setLiveOpen(false);
                stopListening();
              }}
            >
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
              <button onClick={() => startListening(true)}>🎙 Gemini Live Başlat</button>
              <button onClick={stopListening}>■ Durdur</button>
              <button onClick={cycleVoice}>Ses Değiştir</button>
              <button onClick={() => setMuted((v) => !v)}>{muted ? 'Sesi Aç' : 'Sessize Al'}</button>
            </div>
          </div>
        </section>
      )}

      <style jsx global>{`
        :root {
          --bg: #f4f6f8;
          --panel: rgba(255, 255, 255, 0.78);
          --panel-strong: rgba(255, 255, 255, 0.94);
          --line: rgba(20, 24, 28, 0.12);
          --line-strong: rgba(20, 24, 28, 0.22);
          --graphite: #111417;
          --muted: #555d64;
          --shadow: 0 22px 70px rgba(18, 22, 26, 0.13);
          --soft-shadow: 0 10px 28px rgba(18, 22, 26, 0.08);
          --glass: linear-gradient(145deg, rgba(255,255,255,.96), rgba(236,240,243,.82), rgba(255,255,255,.9));
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          color: var(--graphite);
          background:
            radial-gradient(circle at 50% 0%, rgba(255,255,255,1), transparent 34%),
            linear-gradient(135deg, #ffffff 0%, #f4f6f8 45%, #e3e8ed 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
          min-height: 100vh;
          padding: 10px;
          overflow: hidden;
        }

        .app-layout {
          width: 100%;
          min-height: calc(100vh - 20px);
          display: grid;
          grid-template-columns: 230px minmax(0, 1fr);
          gap: 12px;
        }

        .glass {
          background: var(--glass);
          border: 1px solid var(--line);
          box-shadow: var(--shadow);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .sidebar {
          min-height: calc(100vh - 20px);
          border-radius: 28px;
          padding: 18px 14px;
          display: flex;
          flex-direction: column;
        }

        .logo-row {
          min-height: 56px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          font-size: 30px;
          letter-spacing: 0.16em;
        }

        .logo-row strong {
          font-weight: 950;
        }

        .menu {
          display: grid;
          gap: 10px;
          margin-top: 10px;
        }

        .menu-item,
        .mini-box,
        .profile-box,
        .head-actions button,
        .composer,
        .dock-item,
        .sub-panel,
        .sub-panel button {
          color: var(--graphite);
          background: linear-gradient(145deg, rgba(255,255,255,.98), rgba(239,242,244,.9));
          border: 1px solid rgba(25,29,33,.1);
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), var(--soft-shadow);
        }

        .menu-item {
          min-height: 48px;
          border-radius: 18px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 900;
          text-align: left;
          transition: 0.2s ease;
        }

        .menu-item:hover,
        .menu-item.active {
          border-color: var(--line-strong);
          transform: translateY(-1px);
        }

        .menu-item span {
          min-width: 22px;
          font-weight: 950;
        }

        .side-bottom {
          margin-top: auto;
          display: grid;
          gap: 10px;
        }

        .mini-box,
        .profile-box {
          border-radius: 18px;
          padding: 16px;
        }

        .mini-box strong,
        .profile-box strong {
          display: block;
          font-weight: 950;
        }

        .mini-box small,
        .profile-box small {
          display: block;
          margin-top: 3px;
          color: var(--muted);
          font-weight: 750;
        }

        .profile-box {
          display: grid;
          grid-template-columns: 42px 1fr auto;
          gap: 10px;
          align-items: center;
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

        .main-panel {
          min-height: calc(100vh - 20px);
          border-radius: 28px;
          padding: 14px;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto auto;
          gap: 12px;
          overflow: hidden;
        }

        .main-head {
          min-height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .assistant-mini {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .mini-avatar {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          overflow: hidden;
          position: relative;
          background: #fff;
          border: 1px solid var(--line);
          box-shadow: var(--soft-shadow);
        }

        .mini-avatar-video,
        .mini-avatar-poster {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: radial-gradient(circle at 50% 40%, #fff 0%, #f4f6f7 48%, #e7ebee 100%);
        }

        .mini-avatar-video {
          z-index: 2;
        }

        .mini-avatar-poster {
          z-index: 1;
        }

        .assistant-mini h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 950;
          letter-spacing: 0.18em;
        }

        .assistant-mini p {
          margin: 4px 0 0;
          color: var(--muted);
          font-weight: 850;
        }

        .head-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .head-actions button {
          min-height: 40px;
          border-radius: 999px;
          padding: 0 14px;
          font-weight: 900;
        }

        .chat-shell {
          min-height: 0;
          display: grid;
          grid-template-rows: minmax(0, 1fr) auto;
          gap: 12px;
        }

        .message-list {
          min-height: 0;
          overflow: auto;
          border-radius: 26px;
          padding: 22px;
          background:
            radial-gradient(circle at 50% 0%, rgba(255,255,255,.9), transparent 32%),
            rgba(255,255,255,.64);
          border: 1px solid var(--line);
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), var(--soft-shadow);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .message {
          width: fit-content;
          max-width: min(780px, 86%);
          padding: 13px 16px;
          border-radius: 20px;
          font-size: 15px;
          line-height: 1.55;
          font-weight: 760;
          white-space: pre-wrap;
        }

        .message.user {
          align-self: flex-end;
          background: #111417;
          color: white;
          border-bottom-right-radius: 8px;
        }

        .message.assistant {
          align-self: flex-start;
          background: rgba(255,255,255,.94);
          color: var(--graphite);
          border: 1px solid var(--line);
          border-bottom-left-radius: 8px;
        }

        .message.system {
          align-self: center;
          background: rgba(225,230,234,.72);
          color: #3e454c;
          border: 1px solid var(--line);
          font-size: 13px;
        }

        .message.typing {
          opacity: 0.8;
        }

        .composer {
          border-radius: 26px;
          padding: 14px;
        }

        .composer textarea {
          width: 100%;
          min-height: 78px;
          max-height: 170px;
          border: 0;
          outline: 0;
          resize: vertical;
          background: transparent;
          color: var(--graphite);
          font-size: 16px;
          line-height: 1.45;
          font-weight: 800;
        }

        .composer textarea::placeholder {
          color: #4a5259;
          opacity: 0.9;
        }

        .composer-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }

        .left-actions {
          display: flex;
          gap: 8px;
        }

        .left-actions button,
        .send {
          min-height: 40px;
          border-radius: 999px;
          padding: 0 14px;
          color: var(--graphite);
          background: linear-gradient(145deg, #ffffff, #e8ecef);
          border: 1px solid var(--line);
          box-shadow: var(--soft-shadow);
          font-weight: 900;
        }

        .send {
          padding: 0 22px;
          background: #111417;
          color: white;
        }

        .mode-dock {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 8px;
        }

        .dock-item {
          min-height: 74px;
          border-radius: 18px;
          padding: 10px 8px;
          display: grid;
          place-items: center;
          gap: 4px;
          transition: 0.2s ease;
        }

        .dock-item:hover,
        .dock-item.active {
          transform: translateY(-2px);
          border-color: var(--line-strong);
        }

        .dock-item span {
          font-size: 22px;
          line-height: 1;
        }

        .dock-item strong {
          font-size: 12px;
          font-weight: 950;
        }

        .sub-panel {
          border-radius: 22px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
        }

        .sub-panel strong {
          font-weight: 950;
        }

        .sub-panel div {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .sub-panel button {
          min-height: 36px;
          border-radius: 999px;
          padding: 0 14px;
          font-weight: 900;
        }

        .avatar-media-root {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .video-loading {
          position: absolute;
          inset: 0;
          z-index: 3;
          display: grid;
          place-items: center;
          font-size: 13px;
          letter-spacing: 0.16em;
          font-weight: 950;
          color: #2b2f34;
          background: linear-gradient(145deg, #ffffff, #edf1f4);
        }

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
          border-radius: 34px;
          padding: 28px;
          text-align: center;
        }

        .close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #fff;
          border: 1px solid var(--line);
          font-size: 28px;
          line-height: 1;
        }

        .live-avatar-video-wrap {
          position: relative;
          width: 230px;
          height: 300px;
          margin: 0 auto;
          border-radius: 26px;
          overflow: hidden;
          background: radial-gradient(circle at 50% 40%, #fff 0%, #f4f6f7 48%, #e7ebee 100%);
          border: 1px solid rgba(20,24,28,.12);
          box-shadow: var(--shadow);
        }

        .live-avatar-video,
        .live-avatar-poster {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: radial-gradient(circle at 50% 40%, #fff 0%, #f4f6f7 48%, #e7ebee 100%);
        }

        .live-avatar-video {
          z-index: 2;
        }

        .live-avatar-poster {
          z-index: 1;
        }

        .live-panel h2 {
          margin: 20px 0 6px;
          font-size: 30px;
          font-weight: 950;
        }

        .live-panel p {
          margin: 0;
          color: var(--muted);
          font-weight: 800;
        }

        .live-buttons {
          margin-top: 22px;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .live-buttons button {
          min-height: 44px;
          border-radius: 999px;
          padding: 0 18px;
          background: #fff;
          border: 1px solid var(--line);
          color: var(--graphite);
          font-weight: 900;
          box-shadow: var(--soft-shadow);
        }

        @media (max-width: 980px) {
          .page {
            padding: 8px;
          }

          .app-layout {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: none;
          }

          .main-panel {
            min-height: calc(100vh - 16px);
            border-radius: 22px;
            padding: 10px;
          }

          .main-head {
            align-items: flex-start;
            gap: 10px;
          }

          .assistant-mini h1 {
            font-size: 22px;
          }

          .assistant-mini p {
            font-size: 12px;
          }

          .head-actions {
            max-width: 180px;
          }

          .head-actions button {
            min-height: 34px;
            font-size: 12px;
            padding: 0 10px;
          }

          .message-list {
            padding: 14px;
            border-radius: 20px;
          }

          .message {
            max-width: 92%;
            font-size: 14px;
          }

          .composer textarea {
            min-height: 72px;
          }

          .mode-dock {
            grid-template-columns: repeat(4, 1fr);
          }

          .dock-item {
            min-height: 64px;
          }
        }
      `}</style>
    </main>
  );
}
