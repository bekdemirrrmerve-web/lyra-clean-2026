'use client';

import { useRef, useState } from 'react';

type Message = {
  role: 'user' | 'lyra';
  text: string;
};

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'lyra',
      text: 'Merhaba kankam, ben Lyra. Artık gerçek AI cevabı verebilen daha akıllı sürümüm. Yaz, seslen, birlikte toparlayalım.',
    },
  ]);

  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [voice, setVoice] = useState('nova');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function askAI(nextMessages: Message[]) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: nextMessages }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.log('Chat API hata:', errorText);
      throw new Error('Chat API çalışmadı');
    }

    const data = await res.json();
    return data.text || 'Kankam cevap üretirken takıldım, bir daha dener misin?';
  }

  async function speak(text: string) {
    setSpeaking(true);

    try {
      const res = await fetch('/api/openai-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });

      if (!res.ok) {
        throw new Error('TTS çalışmadı');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = url;
      audioRef.current.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };

      await audioRef.current.play();
    } catch (err) {
      console.log('OpenAI sesi olmadı, tarayıcı sesine geçiliyor:', err);

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 0.95;
        utterance.pitch = 1.08;
        utterance.volume = 1;

        utterance.onend = () => setSpeaking(false);

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch {
        setSpeaking(false);
      }
    }
  }

  async function sendMessage(custom?: string) {
    const text = (custom || input).trim();
    if (!text || thinking) return;

    const userMessage: Message = { role: 'user', text };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setThinking(true);

    try {
      const reply = await askAI(nextMessages);
      const lyraMessage: Message = { role: 'lyra', text: reply };

      setMessages((prev) => [...prev, lyraMessage]);
      await speak(reply);
    } catch {
      const fallback =
        'Kankam sunucudan cevap alamadım. Büyük ihtimalle API key eksik, yanlış ya da Vercel environment değişkeni güncellenmedi.';
      setMessages((prev) => [...prev, { role: 'lyra', text: fallback }]);
      await speak(fallback);
    } finally {
      setThinking(false);
    }
  }

  function listen() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msg =
        'Bu tarayıcı mikrofondan konuşmayı desteklemiyor kankam. Yazıdan devam edelim.';
      setMessages((prev) => [...prev, { role: 'lyra', text: msg }]);
      speak(msg);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      sendMessage(text);
    };

    recognition.onerror = () => {
      setListening(false);
      const msg =
        'Mikrofonu alamadım kankam. Safari izinlerini kontrol et ya da yazıdan devam edelim.';
      setMessages((prev) => [...prev, { role: 'lyra', text: msg }]);
      speak(msg);
    };

    recognition.onend = () => setListening(false);

    recognition.start();
  }

  return (
    <main className="page">
      <section className="card">
        <div className="top">
          <div>
            <p className="mini">Sirius AI</p>
            <h1>Lyra</h1>
          </div>

          <select value={voice} onChange={(e) => setVoice(e.target.value)}>
            <option value="nova">Nova - kadın</option>
            <option value="shimmer">Shimmer - parlak</option>
            <option value="alloy">Alloy - dengeli</option>
            <option value="fable">Fable - anlatıcı</option>
            <option value="echo">Echo - erkek</option>
            <option value="onyx">Onyx - kalın erkek</option>
          </select>
        </div>

        <div className="avatarBox">
          <div className={`avatar ${speaking ? 'talking' : ''}`}>
            <div className="face">
              <div className="hair" />
              <div className="eye left" />
              <div className="eye right" />
              <div className="mouth" />
            </div>
          </div>

          <div>
            <h2>
              {thinking
                ? 'Düşünüyorum...'
                : speaking
                ? 'Lyra konuşuyor...'
                : listening
                ? 'Dinliyorum...'
                : 'Hazırım kankam'}
            </h2>
            <p>
              Gerçek AI cevapları, sesli yanıt, içerik, kozmetik, plan, kombin
              ve günlük destek için buradayım.
            </p>
          </div>
        </div>

        <div className="quick">
          <button onClick={() => sendMessage('Bugün ne yapmalıyım?')}>
            Bugün ne yapmalıyım?
          </button>
          <button onClick={() => sendMessage('Bana moral ver')}>
            Moral ver
          </button>
          <button onClick={() => sendMessage('İçerik fikri ver')}>
            İçerik fikri
          </button>
          <button onClick={() => sendMessage('Kombin öner')}>
            Kombin öner
          </button>
        </div>

        <div className="chat">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <b>{m.role === 'user' ? 'Sen' : 'Lyra'}</b>
              <span>{m.text}</span>
            </div>
          ))}

          {thinking && (
            <div className="msg lyra">
              <b>Lyra</b>
              <span>Bir saniye kankam, düşünüyorum...</span>
            </div>
          )}
        </div>

        <div className="bar">
          <button className={listening ? 'mic active' : 'mic'} onClick={listen}>
            🎙️
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Lyra’ya yaz..."
            disabled={thinking}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendMessage();
            }}
          />

          <button className="send" onClick={() => sendMessage()} disabled={thinking}>
            {thinking ? '...' : 'Gönder'}
          </button>
        </div>
      </section>

      <style>{`
        body {
          background: #fff8ee;
          color: #2b241d;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .page {
          min-height: 100vh;
          padding: 18px;
          background:
            radial-gradient(circle at top left, rgba(255, 205, 120, .5), transparent 35%),
            radial-gradient(circle at bottom right, rgba(130, 200, 155, .38), transparent 35%),
            linear-gradient(135deg, #fff8ee, #ffffff);
        }

        .card {
          max-width: 860px;
          min-height: calc(100vh - 36px);
          margin: 0 auto;
          padding: 20px;
          border-radius: 32px;
          background: rgba(255,255,255,.75);
          border: 1px solid rgba(220, 170, 90, .45);
          box-shadow: 0 24px 80px rgba(75, 50, 20, .14);
          padding-bottom: 100px;
        }

        .top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .mini {
          margin: 0;
          color: #9a7842;
          letter-spacing: .16em;
          text-transform: uppercase;
          font-size: 12px;
        }

        h1 {
          margin: 0;
          font-size: 44px;
        }

        select {
          border: 1px solid rgba(120,90,40,.25);
          border-radius: 16px;
          padding: 11px;
          background: white;
          max-width: 190px;
        }

        .avatarBox {
          margin-top: 22px;
          display: flex;
          gap: 16px;
          align-items: center;
          padding: 16px;
          border-radius: 28px;
          background: linear-gradient(135deg, #ffffff, #fff0d7);
          border: 1px solid rgba(220,170,90,.45);
        }

        .avatar {
          width: 110px;
          height: 110px;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 35%, #ffd8b7, #d57c54 65%, #793721);
          display: grid;
          place-items: center;
          box-shadow: 0 14px 36px rgba(110,60,30,.24);
          animation: float 3s ease-in-out infinite;
          flex: 0 0 auto;
        }

        .avatar.talking {
          animation: float 1.5s ease-in-out infinite, glow 1s ease-in-out infinite;
        }

        .face {
          width: 70px;
          height: 82px;
          border-radius: 45%;
          background: #ffd4b0;
          position: relative;
          overflow: hidden;
        }

        .hair {
          position: absolute;
          top: -18px;
          left: -10px;
          width: 90px;
          height: 50px;
          border-radius: 50%;
          background: #9c3c25;
        }

        .eye {
          position: absolute;
          top: 38px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #526b42;
        }

        .eye.left {
          left: 19px;
        }

        .eye.right {
          right: 19px;
        }

        .mouth {
          position: absolute;
          left: 50%;
          bottom: 20px;
          transform: translateX(-50%);
          width: 22px;
          height: 8px;
          border-radius: 0 0 18px 18px;
          background: #a94c55;
        }

        .talking .mouth {
          animation: talk .28s infinite alternate;
        }

        .quick {
          margin: 18px 0;
          display: flex;
          gap: 9px;
          overflow-x: auto;
        }

        .quick button {
          white-space: nowrap;
          border: 0;
          border-radius: 999px;
          padding: 11px 14px;
          background: #fff1d4;
          color: #5a421f;
        }

        .chat {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .msg {
          max-width: 90%;
          padding: 13px 14px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          line-height: 1.4;
        }

        .msg.user {
          align-self: flex-end;
          background: #2d2822;
          color: white;
        }

        .msg.lyra {
          align-self: flex-start;
          background: white;
          border: 1px solid rgba(220,170,90,.38);
        }

        .bar {
          position: fixed;
          left: 18px;
          right: 18px;
          bottom: 18px;
          max-width: 860px;
          margin: 0 auto;
          display: flex;
          gap: 9px;
          align-items: center;
          padding: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,.9);
          border: 1px solid rgba(220,170,90,.45);
          box-shadow: 0 16px 50px rgba(70,50,25,.18);
        }

        input {
          flex: 1;
          border: 0;
          outline: 0;
          background: transparent;
          font-size: 16px;
        }

        .mic,
        .send {
          border: 0;
          border-radius: 999px;
          height: 42px;
          font-weight: 700;
        }

        .mic {
          width: 42px;
          background: #fff0cf;
        }

        .mic.active {
          background: #c65c4d;
          color: white;
        }

        .send {
          padding: 0 15px;
          background: #2d2822;
          color: white;
        }

        .send:disabled,
        input:disabled {
          opacity: .6;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 14px 36px rgba(110,60,30,.24); }
          50% { box-shadow: 0 14px 50px rgba(230,150,60,.55); }
        }

        @keyframes talk {
          from { height: 5px; width: 18px; }
          to { height: 15px; width: 25px; }
        }
      `}</style>
    </main>
  );
}
