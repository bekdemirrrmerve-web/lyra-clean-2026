'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

type Role = 'user' | 'assistant' | 'system';
type ModeKey = 'chat' | 'content' | 'lesson' | 'research' | 'image' | 'pdf';

type ChatMessage = {
  id: number;
  role: Role;
  text: string;
  time: string;
};

const AVATAR_VIDEO = '/lyra-avatar-mp4.mp4';
const AVATAR_IMAGE = '/lyra-avatar.jpg.jpeg';

const GEMINI_ENDPOINTS = [
  '/api/gemini-live',
  '/api/gemini',
  '/api/gemini-chat',
  '/api/chat',
  '/api/lyra',
  '/api/ai',
];

const PDF_ENDPOINTS = ['/api/pdf', '/api/pdf-summary', '/api/upload-pdf'];
const IMAGE_ENDPOINTS = ['/api/vision', '/api/image-read', '/api/analyze-image'];

const voiceOptions = [
  { label: 'Kadın - Nazik', voiceName: 'Kore' },
  { label: 'Kadın - Enerjik', voiceName: 'Aoede' },
  { label: 'Doğal', voiceName: 'Puck' },
  { label: 'Sakin', voiceName: 'Leda' },
];

const modeLabels: Record<ModeKey, string> = {
  chat: 'Sohbet',
  content: 'İçerik',
  lesson: 'Ders',
  research: 'Araştırma',
  image: 'Görsel',
  pdf: 'PDF',
};

function nowTime() {
  return new Date().toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildPrompt(mode: ModeKey, input: string) {
  if (mode === 'chat') {
    return `
Sen Lyra'sın. Türkçe, doğal, hızlı, sıcak ve gerçek sohbet gibi cevap ver.
Kullanıcı mesajı: ${input}
Cevap kısa başlasın, gerekirse detaylandır. Gereksiz bekletme, direkt cevap ver.
`;
  }

  if (mode === 'content') {
    return `
Sen Lyra'sın. İçerik üretici asistanı gibi çalış.
Konu: ${input}

Şu formatta cevap ver:
1) Video Konu Başlıkları
2) İlk 3 Saniye Hook
3) Teleprompter Metni
4) Ekran Yazıları
5) CTA
6) Çekim Notu
`;
  }

  if (mode === 'lesson') {
    return `
Sen Lyra'sın. Öğretmen gibi ama sade anlat.
Konu/Soru: ${input}

Şu formatta cevap ver:
1) Konu Özeti
2) Konu Formülleri / Kuralları
3) Sınav İpuçları
4) Çözümlü Sorular
5) Şıklı Test
6) Yanlışımı Açıkla
`;
  }

  if (mode === 'research') {
    return `
Sen Lyra'sın. Araştırma modundasın.
Konu: ${input}

Şu formatta cevap ver:
1) Kısa cevap
2) Detaylı açıklama
3) Önemli noktalar
4) Dikkat edilecekler
5) Sonuç
`;
  }

  if (mode === 'image') {
    return `
Sen Lyra'sın. Görsel üretim promptu hazırlıyorsun.
İstek: ${input}

Şu formatta cevap ver:
1) Konsept
2) Detaylı prompt
3) Renk paleti
4) Kadraj
5) Alternatif stiller
`;
  }

  if (mode === 'pdf') {
    return `
Sen Lyra'sın. PDF özetleme modundasın.
Kullanıcı isteği: ${input}
PDF yüklendiyse özetle, yüklenmediyse PDF yüklemesini söyle.
`;
  }

  return input;
}

async function postGeminiFast(body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);

  for (const endpoint of GEMINI_ENDPOINTS) {
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
        data?.response ||
        data?.output;

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

function Avatar() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const loop = () => {
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        if (video.currentTime >= video.duration - 0.28) {
          video.currentTime = 0.04;
          video.play().catch(() => {});
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="avatar-wrap">
      <img className="avatar-img" src={AVATAR_IMAGE} alt="Lyra avatar" />
      <video
        ref={videoRef}
        className="avatar-video"
        src={AVATAR_VIDEO}
        poster={AVATAR_IMAGE}
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedData={(event) => {
          setReady(true);
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
      {!ready && <div className="avatar-loading">Lyra avatar</div>}
    </div>
  );
}

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'Merhaba kanka, ben Lyra. İster yazışalım, ister canlı Gemini konuşma açalım. Ne konuşuyoruz?',
      time: nowTime(),
    },
  ]);

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ModeKey>('chat');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showVisual, setShowVisual] = useState(true);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [connectionText, setConnectionText] = useState('Canlı bağlantı kapandı');

  const messageIdRef = useRef(2);
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLInputElement | null>(null);

  const voice = voiceOptions[voiceIndex];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const addMessage = (role: Role, text: string) => {
    const id = messageIdRef.current++;
    setMessages((prev) => [...prev, { id, role, text, time: nowTime() }].slice(-60));
  };

  const startListening = (continuous = false) => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addMessage('assistant', 'Bu tarayıcı canlı konuşmayı desteklemiyor. Chrome ya da Safari ile dene.');
      return;
    }

    if (isSpeakingRef.current) return;

    try {
      recognitionRef.current?.stop?.();
    } catch {}

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = continuous;
    recognition.interimResults = true;

    shouldRestartRef.current = continuous;

    recognition.onstart = () => {
      setIsListening(true);
      setConnectionText(continuous ? 'Canlı Gemini dinliyor' : 'Dinliyorum');
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }

      setInput(finalTranscript || interimTranscript);

      if (finalTranscript.trim()) {
        recognition.stop();
        sendMessage(finalTranscript.trim());
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setConnectionText('Mikrofon bağlantısı kapandı');

      if (continuous && shouldRestartRef.current && !isSpeakingRef.current) {
        setTimeout(() => startListening(true), 450);
      }
    };

    recognition.onend = () => {
      setIsListening(false);

      if (continuous && shouldRestartRef.current && !isSpeakingRef.current && !isThinking) {
        setTimeout(() => startListening(true), 350);
      } else if (!continuous) {
        setConnectionText('Canlı bağlantı kapandı');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setIsListening(false);
    setConnectionText('Canlı bağlantı kapandı');
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

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          voice: voice.voiceName,
        }),
      });

      if (!response.ok) {
        throw new Error('Gemini TTS çalışmadı');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        isSpeakingRef.current = false;

        if (liveMode && shouldRestartRef.current) {
          setTimeout(() => startListening(true), 180);
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        isSpeakingRef.current = false;

        if (liveMode && shouldRestartRef.current) {
          setTimeout(() => startListening(true), 180);
        }
      };

      await audio.play();
    } catch {
      isSpeakingRef.current = false;

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const fallback = new SpeechSynthesisUtterance(cleanText);
        fallback.lang = 'tr-TR';
        fallback.rate = 1.04;
        fallback.pitch = 1.05;

        fallback.onend = () => {
          if (liveMode && shouldRestartRef.current) {
            setTimeout(() => startListening(true), 220);
          }
        };

        window.speechSynthesis.speak(fallback);
      } else if (liveMode && shouldRestartRef.current) {
        setTimeout(() => startListening(true), 220);
      }
    }
  };

  const fallbackAnswer = (raw: string) => {
    if (mode === 'content') {
      return `Harika, “${raw}” için içerik moduna geçtim.

Video Konu Başlıkları:
1. ${raw} hakkında herkesin yanlış bildiği şey
2. ${raw} için 3 adımlı mini rehber
3. ${raw} kullanırken yapılan hata
4. ${raw} gerçek mi abartı mı?
5. ${raw} için 45 saniyelik pratik anlatım

Hook:
“Bunu yapıyorsan sonucu fark etmeden bozuyor olabilirsin.”

Teleprompter:
“Bugün sana ${raw} konusunu çok basit anlatacağım. Çünkü çoğu kişi burada yanlış noktaya odaklanıyor. Önce problemi anlayacağız, sonra doğru adımı seçeceğiz. Eğer bunu kaydedersen sonra uygularken elinin altında olur.”

CTA:
“Kaydet, sonra birlikte tekrar bakalım.”`;
    }

    if (mode === 'lesson') {
      return `Ders modunda “${raw}” konusunu çalışalım.

Konu Özeti:
Bu konuyu önce temel mantık, sonra örnek, sonra test şeklinde çalışmalısın.

Formüller / Kurallar:
- Verilenleri ayır
- İstenen şeyi bul
- Uygun kuralı seç
- Sonucu kontrol et

Sınav İpuçları:
- Sorunun son cümlesini iyi oku.
- Verilenleri kenara yaz.
- Uzun sorudan korkma, parçala.

Çözümlü Soru:
Örnek soru üzerinden adım adım ilerleyebiliriz.

Mini Test:
1) İlk yapılacak şey nedir?
A) Verilenleri ayırmak
B) Şıkları ezberlemek
C) Rastgele işlem yapmak
D) Sonucu tahmin etmek
Cevap: A`;
    }

    if (mode === 'research') {
      return `“${raw}” için hızlı araştırma özeti:
- Konunun ana fikrini çıkarırız.
- Alt başlıklarını ayırırız.
- Sonra sade, net ve uygulanabilir şekilde toparlarız.`;
    }

    return `Anladım kanka. “${raw}” için buradayım. İstersen bunu sohbet gibi konuşalım, istersen alttaki modlardan içerik/ders/araştırma tarafına taşıyalım.`;
  };

  const sendMessage = async (text?: string) => {
    const raw = (text ?? input).trim();
    if (!raw || isThinking) return;

    setInput('');
    addMessage('user', raw);
    setIsThinking(true);

    const prompt = buildPrompt(mode, raw);

    const answer =
      (await postGeminiFast({
        message: prompt,
        rawMessage: raw,
        mode,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        live: liveMode,
        voice: voice.label,
        realtime: true,
      })) || fallbackAnswer(raw);

    setIsThinking(false);
    addMessage('assistant', answer);
    await speak(answer);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const toggleLiveMode = () => {
    const next = !liveMode;
    setLiveMode(next);

    if (next) {
      shouldRestartRef.current = true;
      setConnectionText('Canlı Gemini hazır');
      addMessage(
        'assistant',
        'Canlı Gemini ana ekranda açıldı kanka. Artık yazabilir ya da “Ses ile Konuş” ile mikrofonu açabilirsin.'
      );
    } else {
      stopListening();
      addMessage('assistant', 'Canlı mod kapandı. Yazışma modunda devam edebiliriz.');
    }
  };

  const handlePdf = async (file?: File) => {
    if (!file) return;

    setMode('pdf');
    addMessage('user', `PDF yüklendi: ${file.name}`);
    setIsThinking(true);

    const result =
      (await postFileFast(PDF_ENDPOINTS, file, {
        mode: 'pdf',
        provider: 'gemini',
      })) || `PDF yüklendi: ${file.name}. PDF API bağlantısı yoksa özet burada dönemeyebilir.`;

    setIsThinking(false);
    addMessage('assistant', result);
    await speak(result);
  };

  const handleImage = async (file?: File) => {
    if (!file) return;

    setMode('image');
    addMessage('user', `Görsel yüklendi: ${file.name}`);
    setIsThinking(true);

    const result =
      (await postFileFast(IMAGE_ENDPOINTS, file, {
        mode: 'image',
        provider: 'gemini',
      })) || `Görsel yüklendi: ${file.name}. Görsel analiz API bağlantısı yoksa analiz burada dönemeyebilir.`;

    setIsThinking(false);
    addMessage('assistant', result);
    await speak(result);
  };

  const clearChat = () => {
    stopListening();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setMessages([
      {
        id: messageIdRef.current++,
        role: 'assistant',
        text: 'Sohbeti temizledim kanka. Yeni konuya geçebiliriz.',
        time: nowTime(),
      },
    ]);
  };

  return (
    <main className="page">
      <input
        ref={pdfRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(event) => handlePdf(event.target.files?.[0])}
      />

      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => handleImage(event.target.files?.[0])}
      />

      <section className="live-hero">
        <div className="status-row">
          <div className="ready-pill">
            <span />
            {liveMode ? 'Canlı' : 'Hazır'}
          </div>
          <em>{isListening ? '~Dinliyorum' : '~Ses dalgası'}</em>
          <b>{connectionText}</b>
        </div>

        {showVisual && (
          <div className="avatar-stage">
            <Avatar />
          </div>
        )}

        <div className="top-actions">
          <button onClick={() => setVoiceIndex((prev) => (prev + 1) % voiceOptions.length)}>
            🎙 Ses <strong>{voice.label}</strong>
          </button>
          <button className={liveMode ? 'active' : ''} onClick={toggleLiveMode}>
            ⚡ Live Mod
          </button>
          <button className="primary" onClick={() => startListening(liveMode)}>
            🎙 Ses ile Konuş
          </button>
          <button onClick={() => setMuted((prev) => !prev)}>
            ▷ {muted ? 'Sesi Aç' : 'Sessize Al'}
          </button>
          <button onClick={() => setShowVisual((prev) => !prev)}>
            🖼 Görsel Göster
          </button>
        </div>
      </section>

      <section className="chat-section">
        <header className="chat-head">
          <div>
            <h1>Yazışma</h1>
            <span>Lyra ile yazış ve üret</span>
          </div>

          <button onClick={clearChat}>🗑 Sohbeti Temizle</button>
        </header>

        <div className="messages">
          {messages.map((item) => (
            <div key={item.id} className={`bubble ${item.role}`}>
              <p>{item.text}</p>
              <small>{item.time}</small>
            </div>
          ))}

          {isThinking && (
            <div className="bubble assistant thinking">
              <p>Lyra cevaplıyor...</p>
              <small>{nowTime()}</small>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="mode-dock">
          <button className={mode === 'chat' ? 'selected' : ''} onClick={() => setMode('chat')}>
            Sohbet
          </button>
          <button className={mode === 'content' ? 'selected' : ''} onClick={() => setMode('content')}>
            İçerik
          </button>
          <button className={mode === 'lesson' ? 'selected' : ''} onClick={() => setMode('lesson')}>
            Ders
          </button>
          <button className={mode === 'research' ? 'selected' : ''} onClick={() => setMode('research')}>
            Araştırma
          </button>
          <button className={mode === 'image' ? 'selected' : ''} onClick={() => imageRef.current?.click()}>
            Görsel
          </button>
          <button className={mode === 'pdf' ? 'selected' : ''} onClick={() => pdfRef.current?.click()}>
            PDF
          </button>
        </div>

        <div className="quick-panel">
          {mode === 'content' && (
            <>
              <button onClick={() => sendMessage(input || 'Video konu başlıkları üret')}>Video Başlıkları</button>
              <button onClick={() => sendMessage(input || 'Hook yaz')}>Hook</button>
              <button onClick={() => sendMessage(input || 'Teleprompter metni yaz')}>Teleprompter</button>
              <button onClick={() => sendMessage(input || 'CTA ve ekran yazıları üret')}>CTA</button>
            </>
          )}

          {mode === 'lesson' && (
            <>
              <button onClick={() => sendMessage(input || 'Konu özeti çıkar')}>Konu Özeti</button>
              <button onClick={() => sendMessage(input || 'Formülleri çıkar')}>Formüller</button>
              <button onClick={() => sendMessage(input || 'Sınav ipuçları ver')}>Sınav İpuçları</button>
              <button onClick={() => sendMessage(input || 'Çözümlü soru üret')}>Çözümlü Soru</button>
              <button onClick={() => sendMessage(input || 'Şıklı test üret')}>Test</button>
              <button onClick={() => imageRef.current?.click()}>Soru Görseli</button>
            </>
          )}

          {mode === 'research' && (
            <>
              <button onClick={() => sendMessage(input || 'Derin araştırma yap')}>Derin Araştır</button>
              <button onClick={() => sendMessage(input || 'Kısa özet çıkar')}>Özet</button>
              <button onClick={() => sendMessage(input || 'Karşılaştırmalı analiz yap')}>Karşılaştır</button>
            </>
          )}
        </div>

        <div className="composer">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Lyra’ya yaz... (${modeLabels[mode]} modu)`}
          />

          <button onClick={() => sendMessage()} disabled={isThinking}>
            Gönder
          </button>
        </div>
      </section>

      <style jsx global>{`
        :root {
          --pink: #f72585;
          --pink-soft: #ffe5f1;
          --pink-mid: #ff8fc4;
          --ink: #17142b;
          --muted: #8b8ca3;
          --line: rgba(247, 37, 133, 0.22);
          --bg: #fffafb;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background: var(--bg);
          color: var(--ink);
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
        }

        button,
        textarea {
          font: inherit;
        }

        button {
          border: 0;
          cursor: pointer;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 50% 5%, rgba(255, 229, 241, 0.68), transparent 34%),
            linear-gradient(180deg, #fff 0%, #fffafd 54%, #fff4f9 100%);
        }

        .live-hero {
          min-height: 405px;
          padding: 28px 18px 30px;
          border-bottom: 1px solid var(--line);
          background:
            radial-gradient(circle at 50% 48%, rgba(247, 37, 133, 0.12), transparent 19%),
            #fffefe;
        }

        .status-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 10px;
          min-height: 28px;
        }

        .ready-pill {
          height: 30px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 0 13px;
          background: var(--pink-soft);
          color: var(--pink);
          font-size: 13px;
          font-weight: 950;
        }

        .ready-pill span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--pink);
        }

        .status-row em {
          color: var(--pink);
          font-size: 13px;
          font-style: italic;
          font-weight: 700;
        }

        .status-row b {
          justify-self: end;
          color: var(--muted);
          font-size: 12px;
          font-weight: 850;
        }

        .avatar-stage {
          width: 230px;
          height: 230px;
          margin: 34px auto 28px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background:
            radial-gradient(circle, rgba(255, 229, 241, 1), rgba(255, 229, 241, 0.92)),
            #fff;
          border: 9px solid white;
          outline: 8px solid rgba(247, 37, 133, 0.2);
          box-shadow:
            0 0 0 1px rgba(247, 37, 133, 0.18),
            0 0 46px rgba(247, 37, 133, 0.42);
          overflow: hidden;
        }

        .avatar-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          border-radius: inherit;
          overflow: hidden;
          background: #ffe5f1;
        }

        .avatar-img,
        .avatar-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
        }

        .avatar-img {
          z-index: 1;
        }

        .avatar-video {
          z-index: 2;
        }

        .avatar-loading {
          position: relative;
          z-index: 3;
          font-size: 13px;
          font-weight: 850;
        }

        .top-actions {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .top-actions button {
          min-height: 44px;
          border-radius: 999px;
          padding: 0 20px;
          background: white;
          color: var(--ink);
          border: 1px solid var(--line);
          font-weight: 950;
          box-shadow: 0 10px 26px rgba(247, 37, 133, 0.08);
        }

        .top-actions button strong {
          margin-left: 6px;
          color: var(--pink);
        }

        .top-actions .primary,
        .top-actions button.active {
          background: var(--pink);
          color: white;
          border-color: var(--pink);
        }

        .chat-section {
          padding: 28px 12px 18px;
        }

        .chat-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .chat-head h1 {
          margin: 0;
          font-size: 21px;
          font-weight: 950;
        }

        .chat-head span {
          margin-left: 8px;
          border-radius: 999px;
          padding: 6px 10px;
          background: var(--pink-soft);
          color: var(--pink);
          font-size: 11px;
          font-weight: 950;
        }

        .chat-head button {
          color: var(--pink);
          background: transparent;
          font-weight: 950;
          font-size: 16px;
        }

        .messages {
          height: calc(100vh - 590px);
          min-height: 290px;
          max-height: 560px;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-bottom: 18px;
        }

        .bubble {
          width: fit-content;
          max-width: min(980px, 86%);
          border-radius: 22px;
          padding: 16px 18px 10px;
          background: var(--pink-soft);
          color: var(--ink);
          white-space: pre-wrap;
        }

        .bubble p {
          margin: 0;
          line-height: 1.55;
          font-size: 15px;
        }

        .bubble small {
          display: block;
          margin-top: 8px;
          text-align: right;
          color: var(--muted);
          font-size: 11px;
        }

        .bubble.user {
          align-self: flex-start;
          background: #fff1f7;
        }

        .bubble.assistant {
          align-self: flex-end;
          background: #ffe5f1;
        }

        .bubble.system {
          align-self: center;
          background: #fff;
          border: 1px solid var(--line);
        }

        .thinking {
          opacity: 0.78;
        }

        .mode-dock {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }

        .mode-dock button,
        .quick-panel button {
          min-height: 36px;
          border-radius: 999px;
          padding: 0 13px;
          background: white;
          border: 1px solid var(--line);
          color: var(--ink);
          font-size: 13px;
          font-weight: 900;
        }

        .mode-dock button.selected {
          background: var(--pink);
          border-color: var(--pink);
          color: white;
        }

        .quick-panel {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .composer {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 110px;
          gap: 12px;
          position: sticky;
          bottom: 10px;
          background: transparent;
        }

        .composer textarea {
          min-height: 58px;
          max-height: 160px;
          resize: vertical;
          border-radius: 18px;
          border: 1px solid var(--line);
          outline: none;
          padding: 18px;
          background: white;
          color: var(--ink);
          font-size: 15px;
          font-weight: 750;
        }

        .composer textarea::placeholder {
          color: #77758a;
        }

        .composer button {
          border-radius: 18px;
          background: var(--pink);
          color: white;
          font-weight: 950;
          font-size: 16px;
        }

        .composer button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        @media (max-width: 760px) {
          .live-hero {
            min-height: 360px;
          }

          .status-row {
            grid-template-columns: 1fr;
          }

          .status-row b {
            justify-self: start;
          }

          .avatar-stage {
            width: 190px;
            height: 190px;
            margin: 24px auto;
          }

          .top-actions button {
            min-height: 40px;
            padding: 0 14px;
            font-size: 13px;
          }

          .messages {
            height: calc(100vh - 560px);
            min-height: 260px;
          }

          .bubble {
            max-width: 94%;
          }

          .composer {
            grid-template-columns: 1fr;
          }

          .composer button {
            min-height: 48px;
          }
        }
      `}</style>
    </main>
  );
}
