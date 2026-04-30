'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Message = {
  role: 'user' | 'lyra';
  text: string;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'lyra',
      text: 'Buradayım kankam. İstersen sesli konuşabiliriz, içerik fikri üretebiliriz ya da kamerayı açıp teleprompter ile çekim yapabiliriz.',
    },
  ]);

  const [input, setInput] = useState('');
  const [voiceReplyOn, setVoiceReplyOn] = useState(true);
  const [isListening, setIsListening] = useState(false);

  const [teleText, setTeleText] = useState(
    'Merhaba kankalar, bugün size gerçekten işinize yarayacak kısa ama etkili bir öneriyle geldim...'
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

  const [noteText, setNoteText] = useState('');
  const [visualPrompt, setVisualPrompt] = useState('');
  const [visualResult, setVisualResult] = useState('');

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState('');

  const [smoothness, setSmoothness] = useState(18);
  const [glow, setGlow] = useState(12);
  const [whiten, setWhiten] = useState(10);
  const [saturation, setSaturation] = useState(10);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const totalEngagement =
    Number(likes || 0) +
    Number(comments || 0) +
    Number(saves || 0) +
    Number(shares || 0);

  const engagementRate = Number(views || 0)
    ? ((totalEngagement / Number(views || 1)) * 100).toFixed(2)
    : '0.00';

  const beautyFilter = useMemo(() => {
    const blur = smoothness / 40;
    const brightness = 1 + (glow + whiten) / 100;
    const contrast = 1 + whiten / 140;
    const saturate = 1 + saturation / 100;
    return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) blur(${blur}px)`;
  }, [smoothness, glow, whiten, saturation]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      stopListening();
      stopCamera();
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function speak(text: string) {
    if (!voiceReplyOn || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = 1;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const trVoice =
      voices.find((v) => v.lang?.toLowerCase().includes('tr')) || voices[0];
    if (trVoice) utterance.voice = trVoice;

    window.speechSynthesis.speak(utterance);
  }

  function localLyraReply(text: string) {
    const t = text.toLowerCase().trim();

    if (
      t.includes('merhaba') ||
      t.includes('selam') ||
      t.includes('naber') ||
      t === 'hi'
    ) {
      return 'Merhaba kankam, ben iyiyim. Bugün ne yapıyoruz? İçerik mi, sohbet mi, yoksa çekim mi?';
    }

    if (t.includes('içerik') || t.includes('fikir')) {
      return 'Bence bugün en iyi içerik açısı: merak uyandıran kısa bir giriş, ardından mini bir bilgi ve en sonda kaydetmeye yönlendiren bir CTA. İstersen sana direkt konuya göre hazır metin de çıkarırım.';
    }

    if (t.includes('moral') || t.includes('kötü') || t.includes('üzgün')) {
      return 'Kankam biraz yorulmuş gibisin. Kendine bu kadar yüklenme. Bugün her şeyi mükemmel yapmak zorunda değilsin. Bir şeyi bile bitirmen yeterli.';
    }

    if (t.includes('teleprompter')) {
      return 'Teleprompter için kısa, akıcı ve doğal cümleler en iyi çalışır. Ben olsam ilk 3 saniyeye direkt dikkat çeken tek cümle koyardım.';
    }

    if (t.includes('video') || t.includes('çekim')) {
      return 'Video çekerken en iyi kombin: net ışık, kısa hook, orta bölümde değerli bilgi ve sonda çağrı. İstersen sana saniye saniye akış da veririm.';
    }

    if (t.includes('kozmetik') || t.includes('cilt') || t.includes('kimya')) {
      return 'Bu konuda kimyager bakış açısı seni zaten farklılaştırıyor. “Herkes bunu böyle sanıyor ama işin kimyası farklı” gibi bir giriş çok güçlü olur.';
    }

    if (t.includes('plan')) {
      return 'Bugün için mini plan: 1) bir içerik fikri seç, 2) teleprompter metnini yaz, 3) bir kısa video çek, 4) paylaşmadan önce kapağı düşün. Küçük ama net gidelim.';
    }

    return 'Kankam bunu birlikte toparlayabiliriz. İstersen bunu içerik fikrine, yapılacak plana, teleprompter metnine ya da kısa bir cevaba çevireyim.';
  }

  function sendMessage(customText?: string) {
    const raw = customText ?? input;
    const text = raw.trim();
    if (!text) return;

    const userMsg: Message = { role: 'user', text };
    const reply = localLyraReply(text);
    const lyraMsg: Message = { role: 'lyra', text: reply };

    setMessages((prev) => [...prev, userMsg, lyraMsg]);
    setInput('');
    speak(reply);
  }

  function startListening() {
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      alert('Bu tarayıcıda ücretsiz konuşma algılama desteklenmiyor kankam. Chrome veya Safari dene.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'tr-TR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || '';
        setInput(transcript);
        setIsListening(false);

        if (transcript) {
          setTimeout(() => sendMessage(transcript), 250);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      alert('Ses başlatılırken küçük bir sorun oldu kankam.');
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop();
      setIsListening(false);
    } catch {}
  }

  async function startCamera() {
    setCameraError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
    } catch {
      setCameraError(
        'Kamera açılamadı kankam. Tarayıcı izinlerini kontrol et ve uygulamayı HTTPS/Vercel linkinden aç.'
      );
    }
  }

  function stopCamera() {
    try {
      if (recording) {
        mediaRecorderRef.current?.stop();
      }

      const video = videoRef.current;
      if (video?.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }

      setCameraActive(false);
      setRecording(false);
    } catch {}
  }

  function toggleRecording() {
    const video = videoRef.current;

    if (!cameraActive || !video?.srcObject) {
      setCameraError('Önce kamerayı aç kankam.');
      return;
    }

    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
        setRecordedVideoUrl('');
      }

      recordedChunksRef.current = [];

      const stream = video.srcObject as MediaStream;

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: mimeType || 'video/webm',
        });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setCameraError(
        'Bu tarayıcıda kayıt özelliği tam desteklenmiyor olabilir kankam. Önizleme çalışır ama kayıt bazı telefonlarda naz yapabilir.'
      );
    }
  }

  function generateIdea() {
    const topic = ideaTopic.trim() || 'kozmetik';
    const platform = ideaPlatform;

    const result = `${platform} için içerik fikri

Hook:
“${topic} konusunda çoğu kişinin bilmediği şeyi şimdi anlatıyorum...”

Akış:
1. İlk 3 saniyede dikkat çeken cümle
2. Problemi söyle
3. Kısa ama net bilgi ver
4. Kendi yorumunu kat
5. Sonunda kaydet / yorum CTA'sı

CTA:
“Bunu kaydet kankam, sonra lazım olur.”
“İstersen bunun devamını da yaparım.”

Caption:
“${topic} konusunda en çok karıştırılan noktalardan biri bu olabilir. Ben olsam bunu özellikle not alırdım.”`;

    setIdeaResult(result);
  }

  function generateTeleprompter() {
    const text = `Kankam bugün sana kısa ama çok işe yarayan bir bilgi vereceğim. 
Çoğu kişi bu kısmı atlıyor ama aslında işin püf noktası burada. 
Eğer bunu doğru yaparsan sonuç çok daha iyi olur. 
İstersen bunun devamını da yaparım, kaydetmeyi unutma.`;

    setTeleText(text);
  }

  function summarizeNote() {
    if (!noteText.trim()) return;

    const summary = `Not özeti:
- Ana konu: ${noteText.slice(0, 80)}...
- Yapılacak ilk iş: öncelikli kısmı seç
- Sonraki iş: bunu kısa eylem listesine çevir
- Benim fikrim: çok dağıtmadan önce tek bir hedefe odaklan`;

    alert(summary);
  }

  function generateVisualPrompt() {
    const base = visualPrompt.trim() || 'kozmetik içerik kapağı';
    const result = `Görsel prompt:
“Premium, estetik, modern bir ${base} tasarımı. Yumuşak ışık, şık tipografi, temiz kompozisyon, sosyal medya kapağı görünümü, dikkat çekici ama zarif.”`;

    setVisualResult(result);
  }

  return (
    <main className="page">
      <div className="container">
        <header className="hero card">
          <div>
            <div className="eyebrow">Sirius AI ✦ Lyra</div>
            <h1>Tek Dosyalık Final Sürüm</h1>
            <p>
              Sesli konuşma, kamera, teleprompter, güzelleştirici efekt,
              kayıt, içerik araçları ve günlük kullanım ekranı.
            </p>
          </div>

          <div className="hero-actions">
            <button className="primary" onClick={startListening}>
              {isListening ? 'Dinliyor...' : '🎙️ Sesli Başlat'}
            </button>
            <button
              className="secondary"
              onClick={() => {
                setVoiceReplyOn((prev) => !prev);
                window.speechSynthesis?.cancel();
              }}
            >
              {voiceReplyOn ? '🔊 Sesli Cevap Açık' : '🔇 Sesli Cevap Kapalı'}
            </button>
          </div>
        </header>

        <section className="grid top-grid">
          <div className="card chat-card">
            <div className="section-head">
              <h2>Lyra Sohbet</h2>
              <span>{isListening ? 'Canlı dinleme' : 'Hazır'}</span>
            </div>

            <div className="chat-list">
              {messages.map((m, i) => (
                <div key={i} className={`bubble ${m.role}`}>
                  <strong>{m.role === 'user' ? 'Sen' : 'Lyra'}</strong>
                  <p>{m.text}</p>
                </div>
              ))}
            </div>

            <div className="chat-input">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Lyra'ya yaz..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage();
                }}
              />
              <button onClick={() => sendMessage()}>Gönder</button>
              <button onClick={isListening ? stopListening : startListening}>
                {isListening ? 'Durdur' : 'Konuş'}
              </button>
            </div>
          </div>

          <div className="card camera-card">
            <div className="section-head">
              <h2>Video Çekim + Güzelleştirme</h2>
              <span>{cameraActive ? 'Kamera açık' : 'Kapalı'}</span>
            </div>

            <div className="camera-frame">
              <video
                ref={videoRef}
                className="camera-video"
                playsInline
                muted
                style={{ filter: beautyFilter }}
              />

              {!cameraActive && (
                <div className="camera-placeholder">
                  <strong>Canlı kamera alanı</strong>
                  <p>Kamerayı açınca burada önizleme göreceksin.</p>
                </div>
              )}

              {cameraActive && (
                <>
                  <div className="beauty-glow" style={{ opacity: glow / 100 }} />
                  <div className="teleprompter-overlay">
                    <p>{teleText}</p>
                  </div>
                </>
              )}

              {recording && <div className="rec-badge">● REC</div>}
            </div>

            <div className="toolbar">
              <button onClick={startCamera}>Kamerayı Aç</button>
              <button onClick={stopCamera}>Kapat</button>
              <button onClick={toggleRecording}>
                {recording ? 'Kaydı Durdur' : 'Kayıt Başlat'}
              </button>
            </div>

            {cameraError && <div className="info danger">{cameraError}</div>}

            <div className="sliders">
              <label>
                Pürüzsüzleştirme
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={smoothness}
                  onChange={(e) => setSmoothness(Number(e.target.value))}
                />
              </label>

              <label>
                Aydınlatma
                <input
                  type="range"
                  min="0"
                  max="35"
                  value={glow}
                  onChange={(e) => setGlow(Number(e.target.value))}
                />
              </label>

              <label>
                Beyazlatıcı Görünüm
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={whiten}
                  onChange={(e) => setWhiten(Number(e.target.value))}
                />
              </label>

              <label>
                Canlılık
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="mini-note">
              Not: Bu sürümde efektler ücretsiz tarayıcı filtresi mantığıyla
              çalışır. Yani pratik ve hafif bir güzelleştirme verir.
            </div>

            {recordedVideoUrl && (
              <div className="recorded-box">
                <h3>Kaydedilen Video</h3>
                <video
                  src={recordedVideoUrl}
                  controls
                  className="recorded-video"
                  playsInline
                />
                <a
                  href={recordedVideoUrl}
                  download="sirius-lyra-video.webm"
                  className="download-btn"
                >
                  Videoyu İndir
                </a>
              </div>
            )}
          </div>
        </section>

        <section className="grid mid-grid">
          <div className="card">
            <div className="section-head">
              <h2>Teleprompter</h2>
              <span>Hazır metin</span>
            </div>

            <textarea
              value={teleText}
              onChange={(e) => setTeleText(e.target.value)}
              className="big-textarea"
              placeholder="Teleprompter metnini yaz..."
            />

            <div className="toolbar">
              <button onClick={generateTeleprompter}>Hazır Metin Üret</button>
              <button onClick={() => navigator.clipboard.writeText(teleText)}>
                Metni Kopyala
              </button>
            </div>
          </div>

          <div className="card">
            <div className="section-head">
              <h2>İçerik Fikri</h2>
              <span>Hızlı üretim</span>
            </div>

            <div className="form-row">
              <select
                value={ideaPlatform}
                onChange={(e) => setIdeaPlatform(e.target.value)}
              >
                <option>TikTok</option>
                <option>Instagram Reels</option>
                <option>YouTube Shorts</option>
                <option>Story</option>
              </select>

              <input
                value={ideaTopic}
                onChange={(e) => setIdeaTopic(e.target.value)}
                placeholder="Konu yaz..."
              />
            </div>

            <div className="toolbar">
              <button onClick={generateIdea}>Fikir Üret</button>
            </div>

            <pre className="result">{ideaResult || 'Henüz fikir üretilmedi.'}</pre>
          </div>
        </section>

        <section className="grid bottom-grid">
          <div className="card">
            <div className="section-head">
              <h2>Etkileşim Hesaplama</h2>
              <span>%{engagementRate}</span>
            </div>

            <div className="stats-grid">
              <label>Takipçi<input value={followers} onChange={(e) => setFollowers(e.target.value)} /></label>
              <label>Görüntülenme<input value={views} onChange={(e) => setViews(e.target.value)} /></label>
              <label>Beğeni<input value={likes} onChange={(e) => setLikes(e.target.value)} /></label>
              <label>Yorum<input value={comments} onChange={(e) => setComments(e.target.value)} /></label>
              <label>Kaydetme<input value={saves} onChange={(e) => setSaves(e.target.value)} /></label>
              <label>Paylaşım<input value={shares} onChange={(e) => setShares(e.target.value)} /></label>
            </div>

            <div className="info">
              <strong>Toplam etkileşim:</strong> {totalEngagement}
              <br />
              <strong>Etkileşim oranı:</strong> %{engagementRate}
              <br />
              Bence burada kaydetme + paylaşım artarsa içerik daha güçlü görünür.
            </div>
          </div>

          <div className="card">
            <div className="section-head">
              <h2>Notlar</h2>
              <span>Hızlı toparla</span>
            </div>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="big-textarea"
              placeholder="Notlarını yaz..."
            />

            <div className="toolbar">
              <button onClick={summarizeNote}>Notu Toparla</button>
              <button onClick={() => navigator.clipboard.writeText(noteText)}>
                Notu Kopyala
              </button>
            </div>
          </div>

          <div className="card">
            <div className="section-head">
              <h2>Görsel Fikir / Prompt</h2>
              <span>Ücretsiz prompt alanı</span>
            </div>

            <textarea
              value={visualPrompt}
              onChange={(e) => setVisualPrompt(e.target.value)}
              className="big-textarea"
              placeholder="Nasıl bir görsel istediğini yaz..."
            />

            <div className="toolbar">
              <button onClick={generateVisualPrompt}>Prompt Oluştur</button>
            </div>

            <pre className="result">
              {visualResult || 'Burada görsel prompt sonucu görünecek.'}
            </pre>
          </div>
        </section>

        <footer className="footer">
          <p>
            Sirius AI ✦ Lyra — ücretsiz tarayıcı tabanlı final kullanım sürümü
          </p>
        </footer>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background:
            radial-gradient(circle at top, rgba(255, 226, 202, 0.14), transparent 30%),
            linear-gradient(180deg, #0f0b14 0%, #17111d 100%);
          color: #fff7f1;
          font-family: Arial, Helvetica, sans-serif;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }

        .page {
          min-height: 100vh;
          padding: 20px;
        }

        .container {
          max-width: 1500px;
          margin: 0 auto;
          display: grid;
          gap: 18px;
        }

        .card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 228, 207, 0.12);
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(14px);
        }

        .hero {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: center;
          flex-wrap: wrap;
        }

        .eyebrow {
          font-size: 13px;
          color: #f8d5be;
          margin-bottom: 6px;
        }

        h1,
        h2,
        h3,
        p {
          margin-top: 0;
        }

        h1 {
          font-size: clamp(28px, 5vw, 46px);
          margin-bottom: 10px;
        }

        .hero p {
          max-width: 720px;
          color: #f2dfd3;
          margin-bottom: 0;
        }

        .hero-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        button {
          border: none;
          border-radius: 16px;
          padding: 12px 16px;
          cursor: pointer;
          color: #fffaf7;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 228, 207, 0.12);
        }

        button.primary {
          background: linear-gradient(135deg, rgba(255, 176, 182, 0.35), rgba(255, 210, 165, 0.22));
        }

        button.secondary {
          background: rgba(255, 255, 255, 0.08);
        }

        .grid {
          display: grid;
          gap: 18px;
        }

        .top-grid {
          grid-template-columns: 1fr 1.15fr;
        }

        .mid-grid {
          grid-template-columns: 1fr 1fr;
        }

        .bottom-grid {
          grid-template-columns: 1fr 1fr 1fr;
        }

        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }

        .section-head span {
          font-size: 13px;
          color: #f3cfbb;
        }

        .chat-card {
          min-height: 560px;
          display: flex;
          flex-direction: column;
        }

        .chat-list {
          flex: 1;
          display: grid;
          gap: 12px;
          overflow: auto;
          max-height: 430px;
          padding-right: 4px;
        }

        .bubble {
          padding: 12px 14px;
          border-radius: 18px;
          max-width: 88%;
        }

        .bubble strong {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .bubble p {
          margin: 0;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .bubble.user {
          margin-left: auto;
          background: rgba(255, 190, 184, 0.14);
          border: 1px solid rgba(255, 190, 184, 0.18);
        }

        .bubble.lyra {
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 228, 207, 0.12);
        }

        .chat-input {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 10px;
          margin-top: 14px;
        }

        .chat-input input,
        .form-row input,
        .form-row select,
        .stats-grid input,
        textarea,
        select {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          color: #fff9f4;
          border: 1px solid rgba(255, 228, 207, 0.14);
          border-radius: 14px;
          padding: 12px 14px;
          outline: none;
        }

        .camera-frame {
          position: relative;
          min-height: 560px;
          border-radius: 22px;
          overflow: hidden;
          background: #08060d;
          border: 1px solid rgba(255, 228, 207, 0.1);
        }

        .camera-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }

        .camera-placeholder {
          position: relative;
          z-index: 2;
          height: 560px;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 20px;
          color: #f6e6da;
        }

        .beauty-glow {
          position: absolute;
          inset: 0;
          z-index: 2;
          background:
            radial-gradient(circle at 50% 30%, rgba(255,255,255,0.16), transparent 36%),
            radial-gradient(circle at 50% 70%, rgba(255,230,210,0.10), transparent 42%);
          pointer-events: none;
        }

        .teleprompter-overlay {
          position: absolute;
          left: 50%;
          bottom: 20px;
          transform: translateX(-50%);
          z-index: 3;
          width: min(90%, 760px);
          max-height: 44%;
          overflow: hidden;
          padding: 18px 22px;
          border-radius: 22px;
          background: rgba(10, 7, 15, 0.55);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 228, 207, 0.18);
          text-align: center;
        }

        .teleprompter-overlay p {
          margin: 0;
          font-size: clamp(20px, 3vw, 34px);
          line-height: 1.45;
          color: #fffaf5;
          text-shadow: 0 2px 10px rgba(0,0,0,0.55);
        }

        .rec-badge {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 4;
          border-radius: 999px;
          padding: 8px 12px;
          background: rgba(255, 61, 61, 0.22);
          border: 1px solid rgba(255, 90, 90, 0.38);
          color: #ffbcbc;
          font-weight: 700;
        }

        .toolbar {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .sliders {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 16px;
        }

        .sliders label,
        .stats-grid label {
          display: grid;
          gap: 8px;
          font-size: 14px;
          color: #f4dbcd;
        }

        input[type='range'] {
          padding: 0;
        }

        .mini-note,
        .info {
          margin-top: 14px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 228, 207, 0.12);
          color: #f5e6dc;
          line-height: 1.6;
        }

        .danger {
          border-color: rgba(255, 121, 121, 0.3);
        }

        .recorded-box {
          margin-top: 16px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 228, 207, 0.12);
        }

        .recorded-box h3 {
          margin-bottom: 10px;
        }

        .recorded-video {
          width: 100%;
          border-radius: 18px;
          background: #000;
        }

        .download-btn {
          display: inline-flex;
          margin-top: 14px;
          text-decoration: none;
          color: #fffaf6;
          padding: 12px 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(255, 176, 182, 0.35), rgba(255, 210, 165, 0.22));
          border: 1px solid rgba(255, 228, 207, 0.15);
        }

        .big-textarea {
          min-height: 220px;
          resize: vertical;
        }

        .form-row {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 10px;
        }

        .result {
          white-space: pre-wrap;
          margin-top: 14px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 228, 207, 0.12);
          color: #fff5ee;
          min-height: 150px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .footer {
          text-align: center;
          color: #e7cdbf;
          font-size: 14px;
          padding: 10px 0 30px;
        }

        @media (max-width: 1100px) {
          .top-grid,
          .mid-grid,
          .bottom-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .page {
            padding: 12px;
          }

          .chat-input {
            grid-template-columns: 1fr;
          }

          .form-row,
          .sliders,
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .camera-frame {
            min-height: 420px;
          }

          .camera-placeholder {
            height: 420px;
          }
        }
      `}</style>
    </main>
  );
}
