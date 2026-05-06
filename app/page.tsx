"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  Bot,
  FileText,
  ImageIcon,
  Lightbulb,
  MessageCircle,
  Mic,
  Play,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  time?: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Merhaba kanka, ben Lyra. Cilt bakımı, içerik fikri, ders planı, PDF özeti ve canlı Gemini konuşma için hazırım.",
    time: "şimdi",
  },
];

function getTime() {
  return new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Lyra hazır");
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState("/lyra-avatar.jpg");
  const [avatarError, setAvatarError] = useState(false);

  const [memory, setMemory] = useState<string[]>([
    "Cilt bariyeri onarımlı krem mantığını anlat",
    "Akne için etkili içerikler listesi",
  ]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const stopAudio = () => {
    try {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    } catch {}
    setStatus("Lyra hazır");
  };

  const speak = async (text: string) => {
    if (isMuted || !text.trim()) return;

    try {
      stopAudio();
      setStatus("Ses hazırlanıyor...");

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voiceName: "Kore",
        }),
      });

      if (!response.ok) {
        setStatus("Ses üretilemedi");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => setStatus("Lyra konuşuyor...");
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setStatus("Lyra hazır");
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setStatus("Ses oynatılamadı");
      };

      await audio.play();
    } catch {
      setStatus("Ses oynatılamadı");
    }
  };

  const addMemory = (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    const short = clean.length > 58 ? clean.slice(0, 58) + "..." : clean;

    setMemory((prev) => {
      const exists = prev.some(
        (item) => item.toLowerCase() === short.toLowerCase()
      );

      if (exists) return prev;
      return [short, ...prev].slice(0, 4);
    });
  };

  const sendMessage = async (forcedText?: string) => {
    const text = (forcedText ?? input).trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);
    setStatus("Lyra düşünüyor...");
    addMemory(text);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      time: getTime(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json().catch(() => null);

      const reply =
        data?.message ||
        data?.reply ||
        data?.content ||
        "Kanka cevap geldi ama ekrana düzgün aktarılamadı.";

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: reply,
        time: getTime(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStatus("Lyra hazır");
      speak(reply);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Kanka bağlantı takıldı. /api/chat veya Gemini ayarını kontrol etmek lazım.",
          time: getTime(),
        },
      ]);
      setStatus("Bağlantı hatası");
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    stopAudio();
    setMessages(initialMessages);
    setStatus("Lyra hazır");
  };

  const quickSend = (text: string) => {
    sendMessage(text);
  };

  const cards = [
    {
      icon: <FileText size={22} />,
      title: "PDF Özeti",
      text: "PDF dosyalarını yükle, Lyra özetlesin.",
      tag: "PDF Yükle",
    },
    {
      icon: <Wand2 size={22} />,
      title: "İçerik Üret",
      text: "Blog, sosyal medya, e-posta ve daha fazlasını üret.",
      tag: "Yeni İçerik Oluştur",
    },
    {
      icon: <BookOpen size={22} />,
      title: "Ders Modu",
      text: "Konu anlatımı, not çıkarma ve çalışma planı.",
      tag: "Ders Başlat",
    },
    {
      icon: <ImageIcon size={22} />,
      title: "Görsel Üret",
      text: "Metinlerden ilham verici görseller oluştur.",
      tag: "Görsel Oluştur",
    },
    {
      icon: <Zap size={22} />,
      title: "Hızlı Başlangıç",
      text: "Tek tıkla fikir, plan veya içerik üret.",
      tag: "Test Başlat",
    },
  ];

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="logo-row">
          <div className="logo-badge">05</div>
          <div>
            <h2>Lyra</h2>
            <span>CLEAN 2026</span>
          </div>
        </div>

        <nav className="nav">
          <a href="/live" className="nav-item active">
            <Mic size={18} />
            Canlı Konuş
          </a>
          <button className="nav-item" onClick={() => quickSend("Bana bugün için içerik fikri üret.")}>
            <MessageCircle size={18} />
            Yazışma
          </button>
          <button className="nav-item" onClick={() => quickSend("Kısa hafızamda neler var?")}>
            <BookOpen size={18} />
            Kısa Hafıza
          </button>
          <button className="nav-item" onClick={() => quickSend("PDF özetleme alanını nasıl kullanacağımı anlat.")}>
            <FileText size={18} />
            PDF Özeti
          </button>
          <button className="nav-item" onClick={() => quickSend("Bana keşfete düşecek 10 içerik fikri ver.")}>
            <Lightbulb size={18} />
            İçerik Üret
          </button>
          <button className="nav-item" onClick={() => quickSend("DGS için bugünlük çalışma planı çıkar.")}>
            <BookOpen size={18} />
            Ders Modu
          </button>
          <button className="nav-item" onClick={() => quickSend("Bu promptu görsel üretime uygun hale getir.")}>
            <ImageIcon size={18} />
            Görsel Üret
          </button>
          <button className="nav-item" onClick={() => quickSend("Cilt bakımında dünyada şu ara ilgi çeken alanlar neler?")}>
            <Zap size={18} />
            Hızlı Test
          </button>
        </nav>

        <div className="premium-card">
          <Sparkles size={18} />
          <h3>Lyra Premium</h3>
          <p>Tüm özellikleri sınırsız kullan, üretkenliğini katla.</p>
          <button>Yükselt</button>
        </div>

        <p className="copyright">© 2026 Lyra Clean</p>
      </aside>

      <section className="content">
        <header className="header">
          <div>
            <div className="title-row">
              <h1>Lyra Clean 2026</h1>
              <span>AI Asistanın</span>
            </div>
            <p>Lyra ile konuş, üret, planla, araştır, hatırla.</p>
          </div>

          <div className="header-actions">
            <button>
              <Settings size={18} />
              Ayarlar
            </button>
            <button className="circle">
              <Bell size={18} />
            </button>
            <div className="profile">
              <div>
                <strong>Merve</strong>
                <span>Premium</span>
              </div>
              <div className="profile-img"></div>
            </div>
          </div>
        </header>

        <div className="body-grid">
          <section className="main-column">
            <div className="voice-card">
              <div className="voice-top">
                <div className="live-pill">
                  <span></span>
                  Canlı
                </div>
                <em>~Ses dalgası</em>
                <small>{status}</small>
              </div>

              <div className="avatar-wrap">
                <div className="avatar-glow"></div>

                {!avatarError ? (
                  <img
                    src={avatarSrc}
                    alt="Lyra avatar"
                    onError={() => {
                      if (avatarSrc === "/lyra-avatar.jpg") {
                        setAvatarSrc("/lyra-avatar.png");
                        return;
                      }

                      setAvatarError(true);
                    }}
                  />
                ) : (
                  <div className="avatar-fallback">
                    <Bot size={72} />
                  </div>
                )}
              </div>

              <div className="voice-actions">
                <button className="voice-select">
                  <Mic size={17} />
                  Ses
                  <strong>Kadın - Nazik</strong>
                </button>

                <a href="/live" className="primary-voice">
                  <Mic size={18} />
                  Ses ile Konuş
                </a>

                <button onClick={() => setIsMuted((prev) => !prev)}>
                  <Play size={18} />
                  {isMuted ? "Ses Aç" : "Sessiz AI"}
                </button>

                <button onClick={() => quickSend("Bana görsel üretim promptu hazırla.")}>
                  <ImageIcon size={18} />
                  Görsel Göster
                </button>
              </div>
            </div>

            <div className="chat-card">
              <div className="chat-head">
                <div>
                  <MessageCircle size={22} />
                  <h2>Yazışma</h2>
                  <span>Lyra ile yazış ve üret</span>
                </div>

                <button onClick={clearChat}>
                  <Trash2 size={16} />
                  Sohbeti Temizle
                </button>
              </div>

              <div className="chat-window">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`msg ${message.role === "user" ? "user" : "assistant"}`}
                  >
                    <p>{message.content}</p>
                    <small>{message.time}</small>
                  </div>
                ))}

                {isLoading && (
                  <div className="msg assistant">
                    <p>Lyra toparlıyor<span className="dots">...</span></p>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              <div className="composer">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Lyra’ya yaz..."
                />
                <button onClick={() => sendMessage()} disabled={isLoading || !input.trim()}>
                  Gönder
                </button>
              </div>

              <div className="memory-strip">
                <strong>Kısa Hafıza</strong>
                {memory.map((item, index) => (
                  <button key={`${item}-${index}`} onClick={() => quickSend(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="tools">
            {cards.map((card) => (
              <button
                key={card.title}
                className="tool-card"
                onClick={() => quickSend(`${card.title} alanı için bana yardımcı ol: ${card.text}`)}
              >
                <div className="tool-icon">{card.icon}</div>
                <span>{card.tag}</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </button>
            ))}
          </aside>
        </div>
      </section>

      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #fff6fa;
          color: #111827;
        }

        button,
        textarea,
        input {
          font-family: inherit;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        button {
          border: 0;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .app {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 260px 1fr;
          background:
            radial-gradient(circle at 54% 30%, rgba(255, 214, 235, 0.72), transparent 28%),
            linear-gradient(135deg, #fff8fb 0%, #fff7f2 45%, #fff2f9 100%);
        }

        .sidebar {
          min-height: 100vh;
          border-right: 1px solid #f9dce9;
          background: rgba(255,255,255,0.76);
          padding: 28px 22px;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
        }

        .logo-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 42px;
        }

        .logo-badge {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: linear-gradient(135deg, #ff2d87, #ff6aa9);
          color: white;
          font-weight: 950;
          box-shadow: 0 12px 28px rgba(255, 45, 135, 0.22);
        }

        .logo-row h2 {
          margin: 0;
          font-size: 24px;
          line-height: 1;
        }

        .logo-row span {
          color: #ff2d87;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .nav {
          display: grid;
          gap: 8px;
        }

        .nav-item {
          min-height: 44px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 999px;
          background: transparent;
          color: #667085;
          text-decoration: none;
          font-size: 14px;
          font-weight: 760;
          text-align: left;
          transition: 0.18s ease;
        }

        .nav-item:hover,
        .nav-item.active {
          background: #ffe2f1;
          color: #f00073;
        }

        .premium-card {
          margin-top: auto;
          border: 1px solid #fad7e6;
          background: rgba(255,255,255,0.72);
          border-radius: 22px;
          padding: 18px;
          color: #384152;
          box-shadow: 0 18px 44px rgba(239, 90, 151, 0.08);
        }

        .premium-card svg {
          color: #ff2d87;
        }

        .premium-card h3 {
          margin: 8px 0 8px;
          font-size: 14px;
        }

        .premium-card p {
          margin: 0;
          font-size: 12px;
          line-height: 1.5;
          color: #667085;
        }

        .premium-card button {
          margin-top: 18px;
          width: 100%;
          height: 42px;
          border-radius: 14px;
          background: linear-gradient(90deg, #f00073, #ff2d87);
          color: white;
          font-weight: 900;
        }

        .copyright {
          margin: 26px 0 0;
          text-align: center;
          color: #98a2b3;
          font-size: 11px;
        }

        .content {
          min-width: 0;
        }

        .header {
          height: 134px;
          padding: 34px 30px 24px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          background: rgba(255,255,255,0.64);
          border-bottom: 1px solid #f9dce9;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .title-row h1 {
          margin: 0;
          font-size: clamp(28px, 3vw, 36px);
          letter-spacing: -0.055em;
          line-height: 1;
        }

        .title-row span {
          padding: 4px 12px;
          border-radius: 999px;
          background: #ffe2f1;
          color: #f00073;
          font-size: 12px;
          font-weight: 900;
        }

        .header p {
          margin: 6px 0 0;
          color: #667085;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-actions button {
          height: 42px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 16px;
          background: white;
          color: #344054;
          border: 1px solid #fad7e6;
          font-weight: 800;
        }

        .header-actions .circle {
          width: 42px;
          padding: 0;
          justify-content: center;
        }

        .profile {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-left: 14px;
          border-left: 1px solid #f9dce9;
        }

        .profile strong {
          display: block;
          font-size: 14px;
        }

        .profile span {
          display: block;
          color: #f00073;
          font-size: 11px;
          font-weight: 800;
        }

        .profile-img {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          background:
            radial-gradient(circle at 40% 28%, #ffe7ef, transparent 22%),
            linear-gradient(135deg, #f8b2cb, #d7b7ff);
        }

        .body-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 30px;
          padding: 30px;
        }

        .main-column {
          min-width: 0;
          display: grid;
          gap: 24px;
        }

        .voice-card,
        .chat-card,
        .tool-card {
          border: 1px solid #f7d7e6;
          background: rgba(255,255,255,0.84);
          border-radius: 28px;
          box-shadow:
            0 24px 70px rgba(221, 83, 142, 0.09),
            0 1px 0 rgba(255,255,255,0.9) inset;
        }

        .voice-card {
          min-height: 410px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .voice-top {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ff4fa2;
          font-size: 13px;
        }

        .voice-top small {
          margin-left: auto;
          color: #98a2b3;
          font-weight: 800;
        }

        .live-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 999px;
          background: #d9fff0;
          color: #039855;
          font-weight: 900;
        }

        .live-pill span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #12b76a;
        }

        .avatar-wrap {
          position: relative;
          width: 230px;
          height: 230px;
          margin: 10px auto 0;
          display: grid;
          place-items: center;
        }

        .avatar-glow {
          position: absolute;
          inset: -22px;
          border-radius: 999px;
          background:
            radial-gradient(circle, rgba(255,45,135,0.26), transparent 64%),
            linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,226,241,0.3));
          filter: blur(2px);
        }

        .avatar-wrap img,
        .avatar-fallback {
          position: relative;
          width: 204px;
          height: 204px;
          border-radius: 999px;
          object-fit: cover;
          border: 10px solid white;
          box-shadow:
            0 24px 60px rgba(255, 45, 135, 0.22),
            0 0 0 8px rgba(255, 226, 241, 0.75);
          background: #ffe2f1;
        }

        .avatar-fallback {
          display: grid;
          place-items: center;
          color: #f00073;
        }

        .voice-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 14px;
        }

        .voice-actions button,
        .voice-actions a {
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0 20px;
          border-radius: 999px;
          border: 1px solid #f8cfe0;
          background: white;
          color: #344054;
          text-decoration: none;
          font-weight: 850;
          box-shadow: 0 10px 24px rgba(240, 0, 115, 0.07);
        }

        .voice-select strong {
          color: #f00073;
        }

        .primary-voice {
          background: linear-gradient(90deg, #f00073, #ff2d87) !important;
          color: white !important;
          border: 0 !important;
          box-shadow: 0 14px 32px rgba(240, 0, 115, 0.22) !important;
        }

        .chat-card {
          padding: 26px;
        }

        .chat-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .chat-head > div {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .chat-head h2 {
          margin: 0;
          font-size: 19px;
        }

        .chat-head span {
          padding: 4px 10px;
          border-radius: 999px;
          background: #ffe2f1;
          color: #f00073;
          font-size: 11px;
          font-weight: 900;
        }

        .chat-head button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #ff2d87;
          background: transparent;
          font-weight: 800;
        }

        .chat-window {
          max-height: 360px;
          overflow-y: auto;
          padding-right: 8px;
          display: grid;
          gap: 14px;
        }

        .msg {
          max-width: 84%;
          border-radius: 20px;
          padding: 14px 18px;
          position: relative;
        }

        .msg p {
          margin: 0;
          line-height: 1.6;
          color: #344054;
          font-size: 15px;
        }

        .msg small {
          display: block;
          margin-top: 6px;
          color: #b4acb7;
          text-align: right;
          font-size: 11px;
        }

        .msg.user {
          justify-self: start;
          background: #fff0f7;
        }

        .msg.assistant {
          justify-self: end;
          background: #ffeaf4;
          min-width: 240px;
        }

        .dots {
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }

        .composer {
          margin-top: 18px;
          display: flex;
          gap: 12px;
        }

        .composer textarea {
          width: 100%;
          height: 54px;
          resize: none;
          border: 1px solid #f8cfe0;
          border-radius: 18px;
          padding: 14px 16px;
          outline: none;
          background: white;
          color: #344054;
          font-weight: 700;
        }

        .composer button {
          min-width: 110px;
          border-radius: 18px;
          background: linear-gradient(90deg, #f00073, #ff2d87);
          color: white;
          font-weight: 950;
        }

        .memory-strip {
          margin-top: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .memory-strip strong {
          color: #ff2d87;
          white-space: nowrap;
          font-size: 13px;
        }

        .memory-strip button {
          white-space: nowrap;
          height: 28px;
          padding: 0 14px;
          border-radius: 999px;
          background: #fff0f7;
          color: #667085;
          border: 1px solid #f8cfe0;
          font-weight: 700;
        }

        .tools {
          display: grid;
          gap: 14px;
          align-content: start;
        }

        .tool-card {
          min-height: 124px;
          padding: 18px 20px;
          text-align: left;
          position: relative;
          color: #344054;
          transition: 0.18s ease;
        }

        .tool-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 28px 80px rgba(221, 83, 142, 0.15);
        }

        .tool-icon {
          color: #ff2d87;
        }

        .tool-card span {
          position: absolute;
          top: 18px;
          right: 18px;
          padding: 5px 10px;
          border-radius: 999px;
          background: #ffe2f1;
          color: #ff2d87;
          font-size: 11px;
          font-weight: 900;
        }

        .tool-card h3 {
          margin: 16px 0 7px;
          font-size: 19px;
          color: #111827;
        }

        .tool-card p {
          margin: 0;
          color: #667085;
          font-size: 14px;
          line-height: 1.48;
        }

        @media (max-width: 1180px) {
          .app {
            grid-template-columns: 1fr;
          }

          .sidebar {
            position: relative;
            min-height: auto;
            border-right: 0;
            border-bottom: 1px solid #f9dce9;
          }

          .nav {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .premium-card,
          .copyright {
            display: none;
          }

          .body-grid {
            grid-template-columns: 1fr;
          }

          .tools {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .header {
            height: auto;
            flex-direction: column;
            padding: 24px 18px;
          }

          .header-actions {
            flex-wrap: wrap;
          }

          .body-grid {
            padding: 18px;
          }

          .voice-card {
            padding: 22px;
          }

          .tools {
            grid-template-columns: 1fr;
          }

          .nav {
            grid-template-columns: 1fr 1fr;
          }

          .composer {
            flex-direction: column;
          }

          .composer button {
            min-height: 48px;
          }

          .msg {
            max-width: 100%;
          }
        }

        @media (max-width: 520px) {
          .sidebar {
            padding: 20px 14px;
          }

          .title-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .avatar-wrap {
            width: 190px;
            height: 190px;
          }

          .avatar-wrap img,
          .avatar-fallback {
            width: 166px;
            height: 166px;
          }

          .voice-actions {
            flex-direction: column;
          }

          .voice-actions button,
          .voice-actions a {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
