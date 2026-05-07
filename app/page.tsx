'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

type ModeKey = 'research' | 'content' | 'lesson' | 'image' | 'read' | 'pdf' | 'live';
type Role = 'user' | 'assistant' | 'system';

type ChatMessage = {
  id: number;
  role: Role;
  text: string;
};

const AVATAR_VIDEO = '/lyra-avatar-mp4.mp4';
const AVATAR_IMAGE = '/lyra-avatar.jpg.jpeg';

const GEMINI_TEXT_ENDPOINT = '/api/gemini';
const GEMINI_TTS_ENDPOINT = '/api/tts';

const PDF_ENDPOINTS = ['/api/pdf', '/api/pdf-summary', '/api/upload-pdf'];
const IMAGE_ENDPOINTS = ['/api/vision', '/api/image-read', '/api/analyze-image'];

const voices = [
  { label: 'Gemini Live', voiceName: 'Kore' },
  { label: 'Kadın - Nazik', voiceName: 'Kore' },
  { label: 'Kadın - Enerjik', voiceName: 'Aoede' },
  { label: 'Doğal', voiceName: 'Puck' },
  { label: 'Sakin', voiceName: 'Leda' },
];

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
    starter: 'Görsel yükle veya ne okutmak istediğini yaz.',
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

function buildPrompt(mode: ModeKey, input: string, action?: string) {
  if (mode === 'content') {
    return `
Sen Lyra'sın. Türkçe, sıcak, akıcı ve sosyal medya odaklı içerik üret.
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
2) Bilmen Gereken Formüller / Kurallar
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

Şu formatta cevap ver:
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

Şu formatta cevap ver:
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

  return `
Sen Lyra'sın. Türkçe, doğal, sıcak ve hızlı cevap veren bir AI asistansın.
Kullanıcı mesajı: ${input}
Kısa başla, gerekirse detaylandır.
`;
}

async function postGeminiText(body: Record<string, unknown>) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 22000);

    const res = await fetch(GEMINI_TEXT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);

    const text =
      data?.answer ||
      data?.reply ||
      data?.message ||
      data?.text ||
      data?.content ||
      data?.result ||
      data?.response ||
      data?.output;

    if (typeof text === 'string' && text.trim()) return text.trim();

    return null;
  } catch {
    return null;
  }
}

async function postFileFast(endpoints: string[], file: File, extra: Record<string, string>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 26000);

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

function AvatarVideo({
  className,
  imageClassName,
}: {
  className: string;
  imageClassName: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let frame = 0;

    const keepAlive = () => {
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        if (video.currentTime >= video.duration - 0.28) {
          video.currentTime = 0.04;
          video.play().catch(() => {});
        }
      }

      frame = requestAnimationFrame(keepAlive);
    };

    frame = requestAnimationFrame(keepAlive);

    const playTimer = setTimeout(() => {
      video.play().catch(() => {});
    }, 300);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(playTimer);
    };
  }, []);

  return (
    <div className="avatar-media-root">
      <img className={imageClassName} src={AVATAR_IMAGE} alt="Lyra avatar" />

      {!videoFailed && (
        <video
          ref={videoRef}
          className={className}
          src={AVATAR_VIDEO}
          poster={AVATAR_IMAGE}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={(event) => {
            setVideoReady(true);
            event.currentTarget.play().catch(() => {});
          }}
          onLoadedData={(event) => {
            setVideoReady(true);
            event.currentTarget.currentTime = 0.04;
            event.currentTarget.play().catch(() => {});
          }}
          onEnded={(event) => {
            event.currentTarget.currentTime = 0.04;
            event.currentTarget.play().catch(() => {});
          }}
          onError={() => setVideoFailed(true)}
        />
      )}

      {!videoReady && !videoFailed && <div className="video-loading">LYRA</div>}
    </div>
  );
}

export default function Page() {
  const [activeMode, setActiveMode] = useState<ModeKey>('content');
  const [muted, setMuted] = useState(false);
  const [gender, setGender] = useState<'Kadın' | 'Erkek'>('Kadın');
  const [liveOpen, setLiveOpen] = useState(false);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveContinuous, setLiveContinuous] = useState(false);
  const [speakingUi, setSpeakingUi] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'Merhaba, ben Lyra. Gemini bağlantısı hazırsa direkt ondan cevap vereceğim. Konu yaz; içerik, ders, araştırma, PDF veya görsel alanında çalışayım.',
    },
  ]);

  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messageIdRef = useRef(2);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const voice = voices[voiceIndex];
  const active = useMemo(() => modes.find((item) => item.key === activeMode), [activeMode]);
  const placeholderText = active?.starter || 'Lyra’ya bir şey sor veya yaz...';

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isThinking]);

  const addMessage = (role: Role, text: string) => {
    const id = messageIdRef.current++;
    setMessages((prev) => [...prev, { id, role, text }].slice(-24));
  };

  const stopListening = () => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setIsListening(false);
    setLiveContinuous(false);
  };

  const speak = async (text: string) => {
    if (muted || typeof window === 'undefined') return;

    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/[#>`]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .slice(0, 3600);

    try {
      isSpeakingRef.current = true;
      setSpeakingUi(true);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      const response = await fetch(GEMINI_TTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voice: voice.voiceName,
        }),
      });

      if (!response.ok) throw new Error('Gemini TTS çalışmadı');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        isSpeakingRef.current = false;
        setSpeakingUi(false);

        if (liveOpen && shouldRestartRef.current) {
          setTimeout(() => startListening(true), 180);
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        isSpeakingRef.current = false;
        setSpeakingUi(false);

        if (liveOpen && shouldRestartRef.current) {
          setTimeout(() => startListening(true), 180);
        }
      };

      await audio.play();
    } catch {
      isSpeakingRef.current = false;
      setSpeakingUi(false);

      addMessage(
        'system',
        'Gemini sesi çalışmadı. /api/tts route’unu ve GEMINI_API_KEY env ayarını kontrol et.'
      );

      if (liveOpen && shouldRestartRef.current) {
        setTimeout(() => startListening(true), 220);
      }
    }
  };

  const sendMessage = async (input?: string, action?: string) => {
    const raw = (input ?? message).trim();
    if (!raw || isThinking) return;

    setMessage('');
    addMessage('user', raw);
    setIsThinking(true);

    const prompt = buildPrompt(activeMode, raw, action);

    const aiText = await postGeminiText({
      message: prompt,
      rawMessage: raw,
      mode: activeMode,
      action: action || null,
      voice: voice.label,
      gender,
      live: liveOpen,
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      realtime: true,
    });

    setIsThinking(false);

    if (!aiText) {
      addMessage(
        'assistant',
        'Gemini bağlantısı çalışmadı kanka. Eski bot fallback kapalı. app/api/gemini/route.ts ve GEMINI_API_KEY ayarını kontrol edelim.'
      );
      return;
    }

    addMessage('assistant', aiText);
    await speak(aiText);
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

    if (isSpeakingRef.current) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = continuous;
    recognition.interimResults = true;

    shouldRestartRef.current = continuous;

    recognition.onstart = () => {
      setIsListening(true);
      setLiveContinuous(continuous);
      setLiveOpen(true);
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
        recognition.stop();
        sendMessage(finalTranscript.trim());
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setLiveContinuous(false);

      if (continuous && shouldRestartRef.current && !isSpeakingRef.current) {
        setTimeout(() => startListening(true), 450);
      }
    };

    recognition.onend = () => {
      setIsListening(false);

      if (continuous && shouldRestartRef.current && !isSpeakingRef.current && !isThinking) {
        setTimeout(() => startListening(true), 350);
      } else {
        setLiveContinuous(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handlePdfUpload = async (file?: File) => {
    if (!file) return;

    setActiveMode('pdf');
    addMessage('user', `PDF yüklendi: ${file.name}`);
    setIsThinking(true);

    const result =
      (await postFileFast(PDF_ENDPOINTS, file, { mode: 'pdf', provider: 'gemini' })) ||
      `PDF yüklendi. PDF API bağlantısı bulunamadı ama dosya alındı: ${file.name}.`;

    setIsThinking(false);
    addMessage('assistant', result);
    await speak(result);
  };

  const handleImageUpload = async (file?: File) => {
    if (!file) return;

    setActiveMode('read');
    addMessage('user', `Görsel yüklendi: ${file.name}`);
    setIsThinking(true);

    const result =
      (await postFileFast(IMAGE_ENDPOINTS, file, { mode: 'read', provider: 'gemini' })) ||
      `Görsel yüklendi. Görsel analiz API bağlantısı bulunamadı ama dosya alındı: ${file.name}.`;

    setIsThinking(false);
    addMessage('assistant', result);
    await speak(result);
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
              className="menu-item active"
              onClick={() =>
                setMessages([
                  {
                    id: messageIdRef.current++,
                    role: 'assistant',
                    text: 'Yeni sohbet açıldı. Gemini bağlantısı hazırsa direkt ona bağlanacağım.',
                  },
                ])
              }
            >
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
                    'Ben Lyra. Bu sürümde eski bot fallback kapalı. Mesajlar sadece Gemini route’a gider.'
                  )
                }
              >
                Lyra Hakkında
              </button>
              <button onClick={cycleVoice}>⌄</button>
            </div>
          </header>

          <section className="top-zone">
            <div className="avatar-block">
              <div className="silver-orbit orbit-one" />
              <div className="silver-orbit orbit-two" />

              <div className="avatar-video-wrap">
                <AvatarVideo className="avatar-video" imageClassName="avatar-poster" />
              </div>
            </div>

            <div className="controls">
              <button className="control" onClick={cycleVoice}>
                <span className="sound">≋</span>
                Ses: {voice.label}
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
            </div>
          </section>

          <section className="write-box">
            <div className="message-list">
              {messages.map((item) => (
                <div key={item.id} className={`message ${item.role}`}>
                  {item.text}
                </div>
              ))}
              {isThinking && <div className="message assistant">Gemini cevaplıyor...</div>}
              <div ref={messagesEndRef} />
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
                  <button onClick={() => quickAction('Video konu başlıkları üret')}>
                    Video Konu Başlıkları
                  </button>
                  <button onClick={() => quickAction('Hook yaz')}>Hook Alanı</button>
                  <button onClick={() => quickAction('Teleprompter video metni yaz')}>
                    Teleprompter Metni
                  </button>
                  <button onClick={() => quickAction('Ekran yazıları ve CTA üret')}>
                    Ekran Yazısı + CTA
                  </button>
                </div>
              </>
            )}

            {activeMode === 'lesson' && (
              <>
                <strong>Ders Modu</strong>
                <div>
                  <button onClick={() => quickAction('Konu özeti çıkar')}>Konu Özeti</button>
                  <button onClick={() => quickAction('Konu formülleri ve kuralları çıkar')}>
                    Konu Formülleri
                  </button>
                  <button onClick={() => quickAction('Sınav ipuçları ver')}>Sınav İpuçları</button>
                  <button onClick={() => quickAction('Çözümlü sorular üret')}>
                    Çözümlü Sorular
                  </button>
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
              <strong>LYRA</strong>
              <button onClick={cycleVoice}>⌄</button>
            </div>

            <div className="phone-hero">
              <div className="phone-avatar-video-wrap">
                <AvatarVideo className="phone-avatar-video" imageClassName="phone-avatar-poster" />
              </div>
            </div>

            <div className="phone-controls">
              <button onClick={cycleVoice}>≋ Ses: {voice.label}</button>
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
        <section className="live-room">
          <div className="live-bg-orb live-bg-one" />
          <div className="live-bg-orb live-bg-two" />

          <header className="live-topbar">
            <button
              onClick={() => {
                setLiveOpen(false);
                stopListening();
              }}
            >
              ‹
            </button>

            <div>
              <strong>LYRA LIVE</strong>
              <span>
                {liveContinuous
                  ? 'Gemini Live dinliyor'
                  : isThinking
                    ? 'Lyra düşünüyor'
                    : speakingUi
                      ? 'Lyra konuşuyor'
                      : 'Canlı konuşmaya hazır'}
              </span>
            </div>

            <button onClick={cycleVoice}>≋</button>
          </header>

          <div className="live-stage">
            <div
              className={`live-avatar-scene ${liveContinuous ? 'listening' : ''} ${
                isThinking ? 'thinking' : ''
              } ${speakingUi ? 'speaking' : ''}`}
            >
              <div className="live-ring ring-a" />
              <div className="live-ring ring-b" />
              <div className="live-ring ring-c" />

              <div className="live-avatar-card">
                <AvatarVideo className="live-avatar-video" imageClassName="live-avatar-poster" />
              </div>
            </div>

            <div className="live-name">
              <h2>Lyra</h2>
              <p>
                {voice.label} · {gender} avatar · {muted ? 'Sessiz' : 'Ses açık'}
              </p>
            </div>

            <div className="live-transcript">
              {messages.slice(-3).map((item) => (
                <div key={item.id} className={`live-line ${item.role}`}>
                  {item.text}
                </div>
              ))}

              {isListening && <div className="live-line system">Seni dinliyorum...</div>}
              {isThinking && <div className="live-line assistant">Cevabı hazırlıyorum...</div>}
            </div>
          </div>

          <footer className="live-controls">
            <button
              className={`live-control-btn ${muted ? 'active' : ''}`}
              onClick={() => setMuted((value) => !value)}
            >
              {muted ? '🔇' : '🔊'}
              <span>{muted ? 'Sesi Aç' : 'Sessiz'}</span>
            </button>

            <button
              className={`live-control-btn mic ${liveContinuous ? 'active' : ''}`}
              onClick={() => startListening(true)}
            >
              🎙
              <span>{liveContinuous ? 'Dinliyor' : 'Konuş'}</span>
            </button>

            <button
              className="live-control-btn end"
              onClick={() => {
                setLiveOpen(false);
                stopListening();
              }}
            >
              ✕
              <span>Kapat</span>
            </button>

            <button className="live-control-btn" onClick={cycleVoice}>
              ≋
              <span>Ses</span>
            </button>
          </footer>
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
          --shadow: 0 20px 70px rgba(18, 22, 26, 0.12);
          --shadow-soft: 0 12px 30px rgba(18, 22, 26, 0.08);
          --glass: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.95),
            rgba(235, 238, 241, 0.8),
            rgba(255, 255, 255, 0.9)
          );
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
          width: 100%;
          min-height: 100dvh;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 14px 10px 10px;
          scroll-padding-top: 14px;
          background:
            radial-gradient(circle at 48% 22%, rgba(255, 255, 255, 1), transparent 32%),
            linear-gradient(135deg, #ffffff 0%, #f5f7f8 44%, #e6eaee 100%);
        }

        .page::before,
        .page::after {
          content: '';
          position: absolute;
          inset: -12%;
          pointer-events: none;
          background:
            radial-gradient(
              ellipse at 50% 40%,
              transparent 0 28%,
              rgba(255, 255, 255, 0.92) 29%,
              transparent 30%
            ),
            radial-gradient(
              ellipse at 48% 44%,
              transparent 0 36%,
              rgba(218, 224, 229, 0.48) 37%,
              transparent 38%
            );
          opacity: 0.7;
        }

        .page::after {
          transform: rotate(-15deg) scale(1.05);
          opacity: 0.22;
        }

        .app-layout {
          position: relative;
          z-index: 2;
          width: 100%;
          min-height: calc(100dvh - 24px);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 220px minmax(620px, 1fr) 320px;
          gap: 14px;
          align-items: start;
        }

        .glass {
          background: var(--glass);
          border: 1px solid var(--line);
          box-shadow: var(--shadow);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .sidebar {
          min-height: calc(100dvh - 24px);
          border-radius: 28px;
          padding: 18px 14px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .logo-row {
          padding: 2px 12px 16px;
          font-size: 28px;
          letter-spacing: 0.08em;
        }

        .logo-row strong {
          font-weight: 950;
        }

        .menu {
          display: grid;
          gap: 10px;
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
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(239, 242, 244, 0.9));
          border: 1px solid rgba(25, 29, 33, 0.1);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 8px 20px rgba(18, 22, 26, 0.07);
        }

        .menu-item {
          min-height: 44px;
          border-radius: 18px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 13px;
          text-align: left;
          font-weight: 900;
          transition: 0.2s ease;
        }

        .side-bottom {
          margin-top: auto;
          display: grid;
          gap: 10px;
        }

        .mini-box,
        .profile-box,
        .usage-box {
          border-radius: 18px;
          padding: 14px;
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

        .usage-line {
          display: block;
          height: 7px;
          margin: 10px 0 6px;
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
          min-height: calc(100dvh - 24px);
          border-radius: 28px;
          padding: 14px 18px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .main-panel::before {
          content: '';
          position: absolute;
          inset: -20%;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.95), transparent 20%),
            radial-gradient(circle at 50% 30%, rgba(226, 231, 235, 0.52), transparent 36%);
        }

        .main-head,
        .top-zone,
        .write-box,
        .mode-grid,
        .sub-panel {
          position: relative;
          z-index: 1;
        }

        .main-head {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          flex-shrink: 0;
        }

        .main-head h1 {
          margin: 0;
          font-size: clamp(20px, 2vw, 28px);
          letter-spacing: 0.12em;
          font-weight: 950;
          text-align: center;
        }

        .head-actions {
          position: absolute;
          right: 0;
          display: flex;
          gap: 10px;
        }

        .head-actions button {
          min-height: 36px;
          border-radius: 999px;
          padding: 0 14px;
          font-weight: 950;
        }

        .top-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 8px;
          overflow: visible;
          flex-shrink: 0;
        }

        .avatar-block {
          position: relative;
          width: 100%;
          height: 150px;
          display: grid;
          place-items: center;
          isolation: isolate;
          flex-shrink: 0;
        }

        .silver-orbit {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.92);
          box-shadow:
            0 0 24px rgba(255, 255, 255, 0.9),
            inset 0 0 26px rgba(205, 211, 216, 0.48);
        }

        .orbit-one {
          width: 175px;
          height: 175px;
          animation: orbit 9s ease-in-out infinite;
        }

        .orbit-two {
          width: 220px;
          height: 220px;
          opacity: 0.42;
          animation: orbit 12s ease-in-out infinite reverse;
        }

        .avatar-video-wrap {
          position: relative;
          z-index: 2;
          width: 128px;
          height: 156px;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(20, 24, 28, 0.12);
          background: radial-gradient(circle at 50% 40%, #ffffff 0%, #f4f6f7 48%, #e7ebee 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 16px 36px rgba(18, 22, 26, 0.12);
          flex-shrink: 0;
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
          background: radial-gradient(circle at 50% 40%, #ffffff 0%, #f4f6f7 48%, #e7ebee 100%);
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
          font-size: 22px;
          letter-spacing: 0.16em;
          font-weight: 950;
          color: #2b2f34;
          background: linear-gradient(145deg, #ffffff, #edf1f4);
        }

        .controls {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(5, minmax(100px, auto));
          justify-content: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .control {
          min-height: 44px;
          border-radius: 18px;
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-size: 14px;
          font-weight: 950;
          transition: 0.2s ease;
        }

        .control.selected {
          background: linear-gradient(145deg, #ffffff, rgba(222, 226, 230, 0.94));
          border-color: var(--line-strong);
        }

        .control.live {
          min-width: 180px;
        }

        .sound {
          font-size: 21px;
          line-height: 1;
        }

        .write-box {
          min-height: 330px;
          flex: 1;
          border-radius: 24px;
          padding: 14px 16px 12px;
          display: flex;
          flex-direction: column;
        }

        .message-list {
          flex: 1;
          min-height: 220px;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 10px;
          padding-right: 4px;
        }

        .message {
          width: fit-content;
          max-width: 92%;
          padding: 10px 13px;
          border-radius: 16px;
          font-size: 13px;
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
          background: rgba(255, 255, 255, 0.88);
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
          height: 54px;
          min-height: 54px;
          border: 0;
          outline: 0;
          resize: none;
          background: transparent;
          color: var(--graphite);
          font-size: 16px;
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
          min-width: 36px;
          height: 36px;
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
          width: 44px;
          height: 44px;
          border-radius: 50%;
        }

        .mode-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 10px;
          flex-shrink: 0;
        }

        .mode-card {
          min-height: 96px;
          border-radius: 20px;
          padding: 10px 8px 8px;
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
          height: 24px;
          display: grid;
          place-items: center;
          font-size: 23px;
          line-height: 1;
          color: var(--graphite);
        }

        .mode-card strong {
          margin-top: 6px;
          font-size: 12px;
          font-weight: 950;
        }

        .mode-card small {
          margin-top: 4px;
          color: var(--graphite-soft);
          font-size: 9px;
          line-height: 1.2;
          font-weight: 800;
        }

        .mode-card b {
          margin-top: auto;
          font-weight: 950;
        }

        .sub-panel {
          border-radius: 20px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid var(--line);
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          overflow: auto;
          flex-shrink: 0;
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
          min-height: 34px;
          border-radius: 999px;
          padding: 0 14px;
          background: #fff;
          border: 1px solid var(--line);
          color: var(--graphite);
          font-weight: 900;
        }

        .phone-shell {
          align-self: start;
          min-height: calc(100dvh - 24px);
          padding: 8px;
          border-radius: 40px;
          background: linear-gradient(145deg, #f9fafb, #9da3a9, #ffffff);
          box-shadow:
            inset 0 0 0 2px rgba(255, 255, 255, 0.7),
            0 24px 60px rgba(18, 22, 26, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .phone {
          width: 300px;
          height: calc(100dvh - 42px);
          max-height: 820px;
          overflow: hidden;
          border-radius: 34px;
          padding: 14px 12px 16px;
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
          width: 82px;
          height: 24px;
          border-radius: 999px;
          background: #080a0c;
        }

        .phone-head {
          margin-top: 14px;
        }

        .phone-head button {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          color: var(--graphite);
          border: 1px solid var(--line);
          font-weight: 950;
        }

        .phone-head strong {
          font-size: 22px;
          letter-spacing: 0.1em;
          font-weight: 950;
        }

        .phone-hero {
          position: relative;
          height: 176px;
          display: grid;
          place-items: center;
          margin-top: 4px;
        }

        .phone-avatar-video-wrap {
          position: relative;
          width: 122px;
          height: 166px;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(20, 24, 28, 0.12);
          background: radial-gradient(circle at 50% 40%, #ffffff 0%, #f4f6f7 48%, #e7ebee 100%);
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
          min-height: 40px;
          border-radius: 16px;
          font-weight: 950;
          font-size: 12px;
        }

        .phone-controls .selected {
          background: linear-gradient(145deg, #ffffff, #e2e6e9);
          border-color: var(--line-strong);
        }

        .phone-live {
          grid-column: 1 / -1;
        }

        .phone-input {
          min-height: 68px;
          margin-top: 10px;
          border-radius: 18px;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #394047;
          font-size: 11px;
          font-weight: 850;
        }

        .phone-input button {
          width: 34px;
          height: 34px;
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
          margin-top: 10px;
        }

        .phone-grid button {
          min-height: 76px;
          border-radius: 16px;
          padding: 7px 5px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .phone-grid span {
          font-size: 20px;
          line-height: 1;
        }

        .phone-grid strong {
          font-size: 9.5px;
          line-height: 1.1;
          font-weight: 950;
        }

        .phone-grid small {
          font-weight: 950;
        }

        .live-room {
          position: fixed;
          inset: 0;
          z-index: 50;
          overflow: hidden;
          display: grid;
          grid-template-rows: auto 1fr auto;
          padding: 20px;
          color: #111417;
          background:
            radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.98), transparent 24%),
            radial-gradient(circle at 48% 45%, rgba(218, 224, 229, 0.78), transparent 36%),
            linear-gradient(145deg, #ffffff 0%, #eef1f3 46%, #d9dee3 100%);
        }

        .live-room::before {
          content: '';
          position: absolute;
          inset: -20%;
          pointer-events: none;
          background:
            radial-gradient(
              ellipse at 50% 38%,
              transparent 0 30%,
              rgba(255, 255, 255, 0.9) 31%,
              transparent 32%
            ),
            radial-gradient(
              ellipse at 50% 42%,
              transparent 0 42%,
              rgba(170, 178, 186, 0.22) 43%,
              transparent 44%
            );
          opacity: 0.78;
          animation: liveFloat 12s ease-in-out infinite;
        }

        .live-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(2px);
          pointer-events: none;
        }

        .live-bg-one {
          width: 340px;
          height: 340px;
          left: -120px;
          top: 120px;
          background: rgba(255, 255, 255, 0.68);
        }

        .live-bg-two {
          width: 420px;
          height: 420px;
          right: -160px;
          bottom: 80px;
          background: rgba(190, 198, 205, 0.26);
        }

        .live-topbar {
          position: relative;
          z-index: 2;
          height: 58px;
          display: grid;
          grid-template-columns: 48px 1fr 48px;
          align-items: center;
          gap: 12px;
        }

        .live-topbar button {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid rgba(20, 24, 28, 0.12);
          color: #111417;
          font-size: 30px;
          font-weight: 900;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 12px 26px rgba(18, 22, 26, 0.1);
        }

        .live-topbar div {
          text-align: center;
        }

        .live-topbar strong {
          display: block;
          font-size: 18px;
          letter-spacing: 0.12em;
          font-weight: 950;
        }

        .live-topbar span {
          display: block;
          margin-top: 3px;
          color: #555d64;
          font-size: 12px;
          font-weight: 850;
        }

        .live-stage {
          position: relative;
          z-index: 2;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
        }

        .live-avatar-scene {
          position: relative;
          width: min(420px, 82vw);
          height: min(520px, 56vh);
          display: grid;
          place-items: center;
          transform: translateY(2px);
          transition: transform 0.4s ease;
        }

        .live-avatar-scene.listening {
          transform: translateY(-8px) scale(1.025);
        }

        .live-avatar-scene.thinking {
          transform: translateY(-4px) scale(0.99);
        }

        .live-avatar-scene.speaking {
          transform: translateY(-10px) scale(1.035);
        }

        .live-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.95);
          box-shadow:
            0 0 28px rgba(255, 255, 255, 0.92),
            inset 0 0 34px rgba(205, 211, 216, 0.52);
        }

        .ring-a {
          width: 265px;
          height: 265px;
          animation: pulseRing 2.8s ease-in-out infinite;
        }

        .ring-b {
          width: 360px;
          height: 360px;
          opacity: 0.55;
          animation: pulseRing 3.8s ease-in-out infinite reverse;
        }

        .ring-c {
          width: 455px;
          height: 455px;
          opacity: 0.25;
          animation: pulseRing 5.4s ease-in-out infinite;
        }

        .live-avatar-card {
          position: relative;
          z-index: 3;
          width: min(310px, 68vw);
          height: min(430px, 50vh);
          border-radius: 34px;
          overflow: hidden;
          background: radial-gradient(circle at 50% 35%, #ffffff 0%, #f4f6f7 52%, #e5e9ed 100%);
          border: 1px solid rgba(20, 24, 28, 0.14);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 28px 80px rgba(18, 22, 26, 0.18);
        }

        .live-avatar-card .live-avatar-video,
        .live-avatar-card .live-avatar-poster {
          object-fit: contain;
        }

        .live-name {
          text-align: center;
        }

        .live-name h2 {
          margin: 0;
          font-size: clamp(34px, 5vw, 54px);
          letter-spacing: 0.02em;
          font-weight: 950;
        }

        .live-name p {
          margin: 6px 0 0;
          color: #555d64;
          font-size: 14px;
          font-weight: 850;
        }

        .live-transcript {
          width: min(620px, 92vw);
          max-height: 118px;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.48);
          border: 1px solid rgba(20, 24, 28, 0.08);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .live-line {
          width: fit-content;
          max-width: 88%;
          padding: 9px 12px;
          border-radius: 16px;
          font-size: 13px;
          line-height: 1.38;
          font-weight: 800;
          white-space: pre-wrap;
        }

        .live-line.user {
          align-self: flex-end;
          background: #111417;
          color: white;
        }

        .live-line.assistant {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(20, 24, 28, 0.08);
        }

        .live-line.system {
          align-self: center;
          background: rgba(226, 231, 235, 0.78);
          color: #30363b;
        }

        .live-controls {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          padding: 18px 0 4px;
        }

        .live-control-btn {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          gap: 2px;
          color: #111417;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(20, 24, 28, 0.12);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 18px 34px rgba(18, 22, 26, 0.14);
          font-size: 23px;
          font-weight: 950;
        }

        .live-control-btn span {
          font-size: 10px;
          font-weight: 950;
        }

        .live-control-btn.mic {
          width: 86px;
          height: 86px;
          background: linear-gradient(145deg, #111417, #4a5158);
          color: white;
          transform: translateY(-10px);
        }

        .live-control-btn.mic.active {
          animation: micPulse 1.25s ease-in-out infinite;
        }

        .live-control-btn.end {
          background: linear-gradient(145deg, #ff4b5c, #b80f2c);
          color: white;
        }

        .live-control-btn.active {
          outline: 3px solid rgba(17, 20, 23, 0.12);
        }

        @keyframes orbit {
          0%,
          100% {
            transform: scale(1) translateY(0);
          }
          50% {
            transform: scale(1.03) translateY(-6px);
          }
        }

        @keyframes liveFloat {
          0%,
          100% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(-4deg) scale(1.03);
          }
        }

        @keyframes pulseRing {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.58;
          }
          50% {
            transform: scale(1.055);
            opacity: 0.95;
          }
        }

        @keyframes micPulse {
          0%,
          100% {
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.25),
              0 0 0 0 rgba(17, 20, 23, 0.28),
              0 18px 34px rgba(18, 22, 26, 0.14);
          }
          50% {
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.25),
              0 0 0 18px rgba(17, 20, 23, 0),
              0 18px 34px rgba(18, 22, 26, 0.14);
          }
        }

        @media (max-width: 1420px) {
          .app-layout {
            grid-template-columns: 210px minmax(640px, 1fr);
          }

          .phone-shell {
            display: none;
          }

          .mode-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 980px) {
          .page {
            padding: 10px 8px;
          }

          .app-layout {
            grid-template-columns: 1fr;
            min-height: calc(100dvh - 20px);
          }

          .sidebar,
          .phone-shell {
            display: none;
          }

          .main-panel {
            min-height: calc(100dvh - 20px);
            padding: 14px 12px;
            border-radius: 22px;
          }

          .main-head {
            justify-content: center;
            min-height: 48px;
          }

          .main-head h1 {
            font-size: 18px;
            text-align: center;
          }

          .head-actions {
            display: none;
          }

          .avatar-block {
            height: 142px;
          }

          .avatar-video-wrap {
            width: 118px;
            height: 144px;
          }

          .orbit-one {
            width: 160px;
            height: 160px;
          }

          .orbit-two {
            width: 205px;
            height: 205px;
          }

          .controls {
            grid-template-columns: 1fr 1fr;
          }

          .control.live {
            grid-column: 1 / -1;
          }

          .write-box {
            min-height: 340px;
          }

          .mode-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .mode-card {
            min-height: 108px;
          }
        }

        @media (max-width: 760px) {
          .live-room {
            padding: 14px;
          }

          .live-topbar {
            height: 52px;
            grid-template-columns: 44px 1fr 44px;
          }

          .live-topbar button {
            width: 44px;
            height: 44px;
          }

          .live-avatar-scene {
            height: 48vh;
          }

          .ring-a {
            width: 220px;
            height: 220px;
          }

          .ring-b {
            width: 300px;
            height: 300px;
          }

          .ring-c {
            width: 370px;
            height: 370px;
          }

          .live-avatar-card {
            width: min(260px, 72vw);
            height: min(360px, 46vh);
          }

          .live-controls {
            gap: 11px;
          }

          .live-control-btn {
            width: 62px;
            height: 62px;
            font-size: 20px;
          }

          .live-control-btn.mic {
            width: 76px;
            height: 76px;
          }
        }
      `}</style>
    </main>
  );
}
