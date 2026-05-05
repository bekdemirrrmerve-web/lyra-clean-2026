"use client";

import React, { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Kanka geldim. Artık cevapları direkt vereceğim; istersen yaz, istersen sesle konuş. Ses açıkken cevaplarımı da okumaya çalışacağım.",
  },
];

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState("Hazır");
  const [speechRate, setSpeechRate] = useState(1.02);
  const [voiceMode, setVoiceMode] = useState<"phone" | "realistic">("realistic");
  const [memory, setMemory] = useState<string[]>([
    "kozmetik / formül / cilt bakımı",
    "içerik üretimi",
  ]);

  const [lessonTopic, setLessonTopic] = useState("");
  const [lessonQuestion, setLessonQuestion] = useState("");

  const [ideaPrompt, setIdeaPrompt] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState("");

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfQuestion, setPdfQuestion] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfResult, setPdfResult] = useState("");

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  const stopSpeaking = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    recognitionRef.current = null;
    setIsListening(false);
    setStatus("Hazır");
  };

  const addMemory = (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    const short = clean.length > 56 ? clean.slice(0, 56) + "..." : clean;

    setMemory((prev) => {
      const exists = prev.some(
        (item) => item.toLowerCase() === short.toLowerCase()
      );
      if (exists) return prev;
      return [short, ...prev].slice(0, 6);
    });
  };

  const fallbackBrowserVoice = (text: string) => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = speechRate;
    utterance.pitch = voiceMode === "realistic" ? 1.08 : 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const selectedVoice =
      voices.find((v) => v.lang?.toLowerCase().includes("tr")) ||
      voices.find((v) => v.name?.toLowerCase().includes("turkish")) ||
      voices[0];

    if (selectedVoice) utterance.voice = selectedVoice;

    window.speechSynthesis.speak(utterance);
  };

  const speak = async (text: string, force = false) => {
    if (!force && isMuted) return;
    if (!text.trim()) return;

    try {
      stopSpeaking();
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
        const errorData = await response.json().catch(() => null);
        console.error("Gemini TTS hata:", errorData);
        setStatus("Tarayıcı sesi deneniyor...");
        fallbackBrowserVoice(text);
        setStatus("Hazır");
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setStatus("Hazır");
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setStatus("Tarayıcı sesi deneniyor...");
        fallbackBrowserVoice(text);
        setStatus("Hazır");
      };

      await audio.play();
      setStatus("Konuşuyor...");
    } catch (error) {
      console.error("Ses oynatma hatası:", error);
      setStatus("Tarayıcı sesi deneniyor...");
      fallbackBrowserVoice(text);
      setStatus("Hazır");
    }
  };

  const getLyraReply = async (userText: string, history: ChatMessage[]) => {
    const cleanHistory = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: userText,
        messages: cleanHistory,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return (
        data?.message ||
        data?.error ||
        "Kanka Lyra cevap motoruna bağlanırken takıldı. API key, model adı veya Vercel ayarını kontrol edelim."
      );
    }

    return (
      data?.message ||
      data?.content ||
      data?.reply ||
      "Kanka cevap geldi ama ekrana düzgün aktarılamadı."
    );
  };

  const sendMessage = async (forcedText?: string) => {
    const userText = (forcedText ?? input).trim();
    if (!userText || isLoading) return;

    setInput("");
    setIsLoading(true);
    setStatus("Düşünüyor...");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userText,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    addMemory(userText);

    try {
      const replyText = await getLyraReply(userText, nextMessages);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: replyText,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStatus("Hazır");
      speak(replyText);
    } catch (error) {
      console.error("Lyra mesaj hatası:", error);

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Kanka bağlantıda bir kopma oldu. Frontend /api/chat route’una ulaşamıyor olabilir. Vercel redeploy ve API key ayarını kontrol edelim.",
        },
      ]);

      setStatus("Bağlantı hatası");
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = (mode: "send" | "write") => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        {
          id: `speech-error-${Date.now()}`,
          role: "assistant",
          content:
            "Kanka bu tarayıcı ses algılamayı desteklemiyor gibi. Chrome’da denersen daha iyi çalışabilir.",
        },
      ]);
      return;
    }

    stopSpeaking();
    stopListening();

    const recognition = new SpeechRecognition();
    recognition.lang = "tr-TR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognitionRef.current = recognition;
    setIsListening(true);
    setStatus(mode === "send" ? "Dinliyorum..." : "Sesini yazıya çeviriyorum...");

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      const currentText = (finalTranscript || interim).trim();

      if (mode === "write") {
        setInput(currentText);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Ses algılama hatası:", event);
      setIsListening(false);
      setStatus("Ses algılama hatası");
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatus("Hazır");

      const cleanText = finalTranscript.trim();

      if (!cleanText) return;

      if (mode === "write") {
        setInput(cleanText);
      }

      if (mode === "send") {
        sendMessage(cleanText);
      }
    };

    recognition.start();
  };

  const clearChat = () => {
    stopSpeaking();
    stopListening();
    setMessages(initialMessages);
    setInput("");
    setStatus("Hazır");
  };

  const clearMemory = () => {
    setMemory([]);
  };

  const toggleMute = () => {
    if (!isMuted) {
      stopSpeaking();
      setIsMuted(true);
      setStatus("Sessiz mod");
      return;
    }

    setIsMuted(false);
    setStatus("Ses açılıyor...");

    setTimeout(() => {
      speak("Ses açıldı kanka. Artık cevapları sesli okumayı deneyeceğim.", true);
    }, 150);
  };

  const sendLessonRequest = (
    type: "long" | "summary" | "tips" | "solved" | "questions"
  ) => {
    const topic = lessonTopic.trim();
    const question = lessonQuestion.trim();

    if (!topic && !question) {
      setMessages((prev) => [
        ...prev,
        {
          id: `lesson-empty-${Date.now()}`,
          role: "assistant",
          content:
            "Kanka ders alanına en azından konu başlığı ya da soru yazman lazım. Mesela: 'Sayı basamakları' veya 'Bu problemi nasıl çözerim?' gibi.",
        },
      ]);
      return;
    }

    const modeText =
      type === "long"
        ? "uzun konu anlatımı"
        : type === "summary"
        ? "özet"
        : type === "tips"
        ? "ipuçları ve akılda kalıcı kodlama"
        : type === "solved"
        ? "çözümlü sorular"
        : "sadece çoktan seçmeli sorular ve cevap anahtarı";

    const prompt = `
Ders çalışma alanı isteği.

Konu başlığı:
${topic || "Belirtilmedi"}

Kullanıcının sorusu:
${question || "Belirtilmedi"}

İstenen çıktı türü:
${modeText}

Cevabı Türkçe ver. DGS/ÖSYM mantığına uygun, anlaşılır, düzenli ve çalışmaya hazır formatta hazırla.
`;

    sendMessage(prompt);
  };

  const improveIdeaPrompt = () => {
    const prompt = ideaPrompt.trim();

    if (!prompt) {
      setMessages((prev) => [
        ...prev,
        {
          id: `prompt-empty-${Date.now()}`,
          role: "assistant",
          content:
            "Kanka önce fikir alanına ham promptunu yaz, ben onu görsel üretime daha uygun hale getireyim.",
        },
      ]);
      return;
    }

    sendMessage(`
Bu görsel promptunu profesyonel hale getir.

Ham prompt:
${prompt}

Bana:
1. Daha iyi görsel üretim promptu
2. Renk/stil önerisi
3. Kompozisyon önerisi
4. Negatif prompt
5. 3 farklı varyasyon

şeklinde hazırla.
`);
  };

  const createIdeaImage = async () => {
    const prompt = ideaPrompt.trim();

    if (!prompt) {
      setMessages((prev) => [
        ...prev,
        {
          id: `idea-empty-${Date.now()}`,
          role: "assistant",
          content:
            "Kanka fikir/görsel alanına bir prompt yazman lazım. Mesela: 'mistik beyaz AI asistan uygulaması ana ekran tasarımı' gibi.",
        },
      ]);
      return;
    }

    setImageLoading(true);
    setGeneratedImage("");
    setStatus("Görsel üretiliyor...");

    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `image-error-${Date.now()}`,
            role: "assistant",
            content:
              data?.message ||
              "Kanka görsel üretimi takıldı. Gemini image model veya kota tarafını kontrol etmemiz lazım.",
          },
        ]);
        return;
      }

      setGeneratedImage(data?.imageUrl || "");

      setMessages((prev) => [
        ...prev,
        {
          id: `image-ok-${Date.now()}`,
          role: "assistant",
          content:
            "Görsel hazır kanka. Fikir alanında önizlemeyi açtım. Beğenmezsen promptu biraz daha netleştirip tekrar üretiriz.",
        },
      ]);
    } catch (error) {
      console.error("Görsel üretim hatası:", error);

      setMessages((prev) => [
        ...prev,
        {
          id: `image-fatal-${Date.now()}`,
          role: "assistant",
          content:
            "Kanka görsel route’una bağlanırken hata oldu. /api/image dosyasını ve GEMINI_API_KEY ayarını kontrol edelim.",
        },
      ]);
    } finally {
      setImageLoading(false);
      setStatus("Hazır");
    }
  };

  const summarizePdf = async (
    mode: "summary" | "long" | "short" | "questions" | "solved"
  ) => {
    if (!pdfFile) {
      setPdfResult("Kanka önce PDF / dosya yüklemen lazım.");
      return;
    }

    setPdfLoading(true);
    setPdfResult("");
    setStatus("PDF okunuyor...");

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("mode", mode);
      formData.append("question", pdfQuestion);

      const response = await fetch("/api/pdf", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setPdfResult(
          data?.message ||
            "PDF özetleme takıldı. Gemini API key, model veya dosya boyutunu kontrol edelim."
        );
        return;
      }

      setPdfResult(data?.result || "PDF işlendi ama sonuç boş geldi.");
    } catch (error) {
      console.error("PDF özetleme hatası:", error);
      setPdfResult(
        "Kanka PDF route’una bağlanırken hata oldu. /api/pdf dosyasını ve Vercel redeploy’u kontrol edelim."
      );
    } finally {
      setPdfLoading(false);
      setStatus("Hazır");
    }
  };

  const quickPrompts = [
    "Cilt bakımında dünyada şu ara ilgi çeken alanlar neler?",
    "Bana keşfete düşecek 10 kozmetik içerik fikri ver.",
    "Ev tipi bariyer onarıcı krem mantığını anlat.",
    "DGS için bugünlük çalışma planı çıkar.",
  ];

  return (
    <>
      <main className="lyra-page">
        <div className="lyra-shell">
          <header className="top-card">
            <div className="brand-area">
              <div className="brand-icon">L</div>
              <div>
                <h1>Lyra Clean 2026</h1>
                <p>Lyra ile konuş, üret, planla, araştır, hatırla.</p>
              </div>
            </div>

            <div className="top-actions">
              <button onClick={() => startListening("send")}>
                {isListening ? "Dinliyor" : "Canlı Konuş"}
              </button>
              <button onClick={() => startListening("write")}>Sesle Yaz</button>
              <button
                onClick={() => {
                  stopSpeaking();
                  stopListening();
                }}
              >
                Sustur
              </button>
              <span>AI Mod Açık</span>
              <button onClick={toggleMute}>{isMuted ? "Sessiz" : "Ses Açık"}</button>
              <button
                className={voiceMode === "phone" ? "active" : ""}
                onClick={() => setVoiceMode("phone")}
              >
                Telefon Sesi
              </button>
              <button
                className={voiceMode === "realistic" ? "active" : ""}
                onClick={() => setVoiceMode("realistic")}
              >
                Gerçekçi Ses
              </button>
            </div>
          </header>

          <section className="main-grid">
            <div className="left-panel">
              <div className="avatar-zone">
                <div className={`avatar-orb ${isListening ? "pulse" : ""}`}>
                  <div className="orb-blur"></div>
                  <div className="orb-core">L</div>
                </div>

                <p className="status-text">{status}</p>

                <div className="speed-box">
                  <label>Ses hızı: {speechRate.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.75"
                    max="1.35"
                    step="0.01"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="input-card">
                <div className="input-head">
                  <strong>Lyra ile sohbet et</strong>
                  <span>{status}</span>
                </div>

                <div className="input-row">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Bana normal mesaj yaz..."
                  />

                  <button
                    onClick={() => sendMessage()}
                    disabled={isLoading || !input.trim()}
                    className="send-button"
                  >
                    Gönder
                  </button>
                </div>

                <div className="small-actions">
                  <button onClick={() => startListening("write")}>Sesle Yaz</button>
                  <button onClick={clearChat}>Sohbeti Temizle</button>
                  <button onClick={clearMemory}>Hafızayı Temizle</button>
                  <button
                    onClick={() =>
                      speak("Ses testi kanka. Duyuyorsan sistem çalışıyor.", true)
                    }
                  >
                    Ses Testi
                  </button>
                </div>
              </div>
            </div>

            <div className="right-panel">
              <div className="chat-card">
                <div className="section-head">
                  <h2>Sohbet</h2>
                  <span>{messages.length} mesaj</span>
                </div>

                <div className="chat-window">
                  {messages.map((message) => {
                    const isUser = message.role === "user";

                    return (
                      <div
                        key={message.id}
                        className={`message-line ${
                          isUser ? "user-line" : "assistant-line"
                        }`}
                      >
                        <div
                          className={`message-bubble ${
                            isUser ? "user" : "assistant"
                          }`}
                        >
                          <strong>{isUser ? "Sen" : "Lyra"}</strong>
                          <p>{message.content}</p>
                        </div>
                      </div>
                    );
                  })}

                  {isLoading && (
                    <div className="message-line assistant-line">
                      <div className="message-bubble assistant">
                        <strong>Lyra</strong>
                        <p>Düşünüyorum kanka, cevabı toparlıyorum...</p>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              </div>

              <div className="tools-stack">
                <div className="tool-card">
                  <div className="tool-head">
                    <div>
                      <h2>Ders Alanı</h2>
                      <p>
                        Konu başlığı yaz, soru sor; Lyra sana anlatım, özet,
                        ipucu ve soru hazırlasın.
                      </p>
                    </div>
                    <span>DGS / Ders</span>
                  </div>

                  <div className="tool-grid">
                    <input
                      className="tool-input"
                      value={lessonTopic}
                      onChange={(e) => setLessonTopic(e.target.value)}
                      placeholder="Konu başlığı: Sayı basamakları, OBEB-OKEK, paragraf..."
                    />

                    <textarea
                      className="tool-textarea"
                      value={lessonQuestion}
                      onChange={(e) => setLessonQuestion(e.target.value)}
                      placeholder="Sorunu yaz: Bu konuyu anlamıyorum / şu soruyu çöz / bana örnek hazırla..."
                    />
                  </div>

                  <div className="tool-buttons">
                    <button onClick={() => sendLessonRequest("long")}>
                      Uzun Konu Anlatımı
                    </button>
                    <button onClick={() => sendLessonRequest("summary")}>
                      Özet
                    </button>
                    <button onClick={() => sendLessonRequest("tips")}>
                      İpuçları
                    </button>
                    <button onClick={() => sendLessonRequest("solved")}>
                      Çözümlü Sorular
                    </button>
                    <button onClick={() => sendLessonRequest("questions")}>
                      Sadece Sorular + Şıklar
                    </button>
                  </div>
                </div>

                <div className="tool-card">
                  <div className="tool-head">
                    <div>
                      <h2>Fikir & Görsel Alanı</h2>
                      <p>
                        Tasarım, içerik veya prompt yaz; Lyra promptu
                        iyileştirsin ya da görsel üretsin.
                      </p>
                    </div>
                    <span>Prompt / Görsel</span>
                  </div>

                  <textarea
                    className="tool-textarea"
                    value={ideaPrompt}
                    onChange={(e) => setIdeaPrompt(e.target.value)}
                    placeholder="Örnek: beyaz, mistik, güneş tonları olan 4D avatar asistan uygulaması ana ekran tasarımı..."
                  />

                  <div className="tool-buttons">
                    <button onClick={improveIdeaPrompt}>Promptu Güzelleştir</button>
                    <button onClick={createIdeaImage} disabled={imageLoading}>
                      {imageLoading ? "Görsel Üretiliyor..." : "Görsel Oluştur"}
                    </button>
                  </div>

                  {generatedImage && (
                    <div className="image-preview">
                      <img
                        src={generatedImage}
                        alt="Lyra tarafından oluşturulan görsel"
                      />
                    </div>
                  )}
                </div>

                <div className="tool-card">
                  <div className="tool-head">
                    <div>
                      <h2>Kitap / PDF Alanı</h2>
                      <p>
                        PDF yükle; özet, uzun anlatım, soru veya çözümlü test
                        hazırlasın.
                      </p>
                    </div>
                    <span>PDF Özet</span>
                  </div>

                  <input
                    className="tool-file"
                    type="file"
                    accept=".pdf,.txt,.md,.html,application/pdf,text/plain,text/markdown,text/html"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  />

                  <input
                    className="tool-input"
                    value={pdfQuestion}
                    onChange={(e) => setPdfQuestion(e.target.value)}
                    placeholder="PDF hakkında özel sorun varsa yaz: Bu kitaptan sınavlık yerleri çıkar..."
                  />

                  <div className="tool-buttons">
                    <button
                      onClick={() => summarizePdf("summary")}
                      disabled={pdfLoading}
                    >
                      Özet Oluştur
                    </button>
                    <button
                      onClick={() => summarizePdf("long")}
                      disabled={pdfLoading}
                    >
                      Uzun Anlat
                    </button>
                    <button
                      onClick={() => summarizePdf("short")}
                      disabled={pdfLoading}
                    >
                      Kısa Tekrar
                    </button>
                    <button
                      onClick={() => summarizePdf("questions")}
                      disabled={pdfLoading}
                    >
                      Soru Üret
                    </button>
                    <button
                      onClick={() => summarizePdf("solved")}
                      disabled={pdfLoading}
                    >
                      Çözümlü Sorular
                    </button>
                  </div>

                  {pdfLoading && (
                    <p className="tool-result">PDF okunuyor kanka, biraz bekle...</p>
                  )}

                  {pdfResult && (
                    <div className="tool-result">
                      <pre>{pdfResult}</pre>
                    </div>
                  )}
                </div>
              </div>

              <div className="memory-card">
                <div className="section-head">
                  <h2>Kısa Hafıza</h2>
                  <span>{memory.length} kayıt</span>
                </div>

                {memory.length === 0 ? (
                  <p className="empty-memory">
                    Hafıza şu an boş. Konuştukça kısa notları burada tutacağım.
                  </p>
                ) : (
                  <div className="memory-list">
                    {memory.map((item, index) => (
                      <div key={`${item}-${index}`} className="memory-item">
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="quick-card">
                <h2>Hızlı Test</h2>
                <div className="quick-list">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      disabled={isLoading}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          min-height: 100%;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #fff7fb;
          color: #2b2238;
        }

        button,
        textarea,
        input {
          font-family: inherit;
        }

        button {
          cursor: pointer;
          border: none;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .lyra-page {
          min-height: 100vh;
          padding: 32px 20px;
          background:
            radial-gradient(circle at top left, rgba(192, 132, 252, 0.22), transparent 28%),
            radial-gradient(circle at bottom right, rgba(255, 178, 185, 0.18), transparent 34%),
            linear-gradient(135deg, #131316 0%, #191720 45%, #111116 100%);
          color: #f4efff;
        }

        .lyra-shell {
          width: min(1480px, 100%);
          margin: 0 auto;
        }

        .top-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 26px;
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background:
            linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02)),
            rgba(19, 19, 22, 0.74);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(20px);
        }

        .brand-area {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .brand-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          border-radius: 20px;
          background: linear-gradient(135deg, #ddb8ff, #ffb2b9, #9dd8ff);
          color: #2c0051;
          font-size: 28px;
          font-weight: 950;
          box-shadow:
            0 0 26px rgba(221, 184, 255, 0.24),
            inset 0 0 24px rgba(255, 255, 255, 0.55);
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        .brand-area h1 {
          font-size: clamp(26px, 3vw, 38px);
          line-height: 1.05;
          letter-spacing: -0.05em;
          font-weight: 950;
          color: #ffffff;
          text-shadow: 0 0 18px rgba(221, 184, 255, 0.22);
        }

        .brand-area p {
          margin-top: 6px;
          color: #cec3d3;
          font-size: 14px;
        }

        .top-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 10px;
        }

        .top-actions button,
        .top-actions span,
        .small-actions button,
        .quick-list button {
          min-height: 42px;
          padding: 0 18px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: #f4efff;
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 14px;
          font-weight: 850;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.14);
          transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
        }

        .top-actions button:hover,
        .small-actions button:hover,
        .quick-list button:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.13);
          border-color: rgba(221, 184, 255, 0.45);
        }

        .top-actions span,
        .top-actions .active {
          background: linear-gradient(90deg, rgba(221,184,255,0.72), rgba(255,178,185,0.58));
          color: #210033;
        }

        .main-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          gap: 24px;
          margin-top: 24px;
        }

        .left-panel,
        .right-panel {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .left-panel,
        .chat-card,
        .memory-card,
        .quick-card {
          border-radius: 34px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background:
            linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02)),
            rgba(19, 19, 22, 0.62);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.24);
          backdrop-filter: blur(20px);
        }

        .left-panel {
          padding: 26px;
        }

        .avatar-zone {
          min-height: 520px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .avatar-orb {
          position: relative;
          width: 286px;
          height: 286px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background:
            radial-gradient(circle at 38% 34%, rgba(255, 255, 255, 0.95), transparent 10%),
            linear-gradient(135deg, #a6f4d6, #9dd8ff, #d7b7ff, #ff9fce, #ffe6ad);
          box-shadow: 0 26px 90px rgba(162, 111, 214, 0.28);
        }

        .avatar-orb::before {
          content: "";
          position: absolute;
          inset: -18px;
          border-radius: inherit;
          background: conic-gradient(from 140deg, #ffe7f1, #dff7ff, #e9dcff, #fff2d0, #ffe7f1);
          opacity: 0.55;
          filter: blur(4px);
          z-index: -1;
        }

        .avatar-orb.pulse {
          animation: pulse 1.2s ease-in-out infinite;
        }

        .orb-blur {
          position: absolute;
          inset: 50px;
          border-radius: inherit;
          background: rgba(255, 255, 255, 0.22);
          filter: blur(10px);
        }

        .orb-core {
          position: relative;
          width: 132px;
          height: 132px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: linear-gradient(135deg, #a6f4d6, #77cbff, #ed74c7);
          color: white;
          font-size: 64px;
          font-weight: 950;
          box-shadow: inset 0 0 30px rgba(255, 255, 255, 0.25);
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.035);
          }
        }

        .status-text {
          margin-top: 42px;
          font-weight: 950;
          font-size: 18px;
          color: #ffffff;
        }

        .speed-box {
          width: min(330px, 100%);
          margin-top: 32px;
        }

        .speed-box label {
          display: block;
          margin-bottom: 12px;
          font-size: 14px;
          font-weight: 900;
          color: #f4efff;
        }

        .speed-box input {
          width: 100%;
          accent-color: #ddb8ff;
        }

        .input-card {
          padding: 20px;
          border-radius: 26px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(14, 14, 17, 0.76);
          box-shadow: 0 14px 44px rgba(0, 0, 0, 0.18);
        }

        .input-head,
        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .input-head strong,
        .section-head h2,
        .quick-card h2 {
          font-size: 18px;
          font-weight: 950;
          color: #ffffff;
        }

        .input-head span,
        .section-head span {
          color: #cec3d3;
          font-size: 14px;
        }

        .input-row {
          display: flex;
          gap: 12px;
        }

        textarea {
          width: 100%;
          min-height: 58px;
          resize: none;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          outline: none;
          padding: 16px 16px;
          background: rgba(14, 14, 17, 0.86);
          color: #f4efff;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.45;
        }

        textarea::placeholder,
        input::placeholder {
          color: rgba(244, 239, 255, 0.46);
        }

        textarea:focus,
        input:focus {
          border-color: rgba(221, 184, 255, 0.75);
          box-shadow: 0 0 0 5px rgba(221, 184, 255, 0.12);
        }

        .send-button {
          min-width: 108px;
          border-radius: 18px;
          background: linear-gradient(90deg, #ddb8ff, #ffb2b9);
          color: #210033;
          font-size: 15px;
          font-weight: 950;
          box-shadow: 0 12px 28px rgba(221, 184, 255, 0.14);
        }

        .small-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 14px;
        }

        .small-actions button {
          background: rgba(255, 255, 255, 0.08);
        }

        .chat-card,
        .memory-card,
        .quick-card {
          padding: 22px;
        }

        .chat-window {
          height: 520px;
          overflow-y: auto;
          padding: 18px;
          border-radius: 28px;
          background: rgba(14, 14, 17, 0.44);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .message-line {
          display: flex;
          margin-bottom: 16px;
        }

        .assistant-line {
          justify-content: flex-start;
        }

        .user-line {
          justify-content: flex-end;
        }

        .message-bubble {
          width: fit-content;
          max-width: 84%;
          padding: 16px 18px;
          border-radius: 24px;
          box-shadow: 0 10px 34px rgba(0, 0, 0, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .message-bubble strong {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 950;
        }

        .message-bubble p {
          white-space: pre-wrap;
          color: #f4efff;
          font-size: 15px;
          line-height: 1.65;
        }

        .message-bubble.assistant {
          background: rgba(255, 255, 255, 0.08);
        }

        .message-bubble.user {
          background: linear-gradient(90deg, rgba(221,184,255,0.28), rgba(255,178,185,0.22));
        }

        .tools-stack {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .tool-card {
          position: relative;
          overflow: hidden;
          padding: 22px;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)),
            rgba(20, 18, 28, 0.82);
          box-shadow:
            0 24px 80px rgba(119, 91, 140, 0.16),
            inset 0 0 22px rgba(221, 184, 255, 0.05);
          color: #f4efff;
        }

        .tool-card::before {
          content: "";
          position: absolute;
          width: 220px;
          height: 220px;
          border-radius: 999px;
          background: rgba(192, 132, 252, 0.18);
          filter: blur(70px);
          top: -90px;
          right: -80px;
          pointer-events: none;
        }

        .tool-card::after {
          content: "";
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 999px;
          background: rgba(255, 178, 185, 0.13);
          filter: blur(70px);
          bottom: -90px;
          left: -70px;
          pointer-events: none;
        }

        .tool-head {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
        }

        .tool-head h2 {
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -0.03em;
          color: #ffffff;
        }

        .tool-head p {
          margin-top: 6px;
          color: #cfc3df;
          font-size: 14px;
          line-height: 1.55;
        }

        .tool-head span {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 8px 12px;
          background: linear-gradient(90deg, rgba(221,184,255,0.28), rgba(255,178,185,0.22));
          color: #f0dbff;
          font-size: 12px;
          font-weight: 900;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tool-grid {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 12px;
        }

        .tool-input,
        .tool-textarea,
        .tool-file {
          position: relative;
          z-index: 1;
          width: 100%;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(14, 14, 17, 0.82);
          color: #f4efff;
          padding: 14px 16px;
          outline: none;
          font-size: 14px;
          font-weight: 650;
          box-shadow: inset 0 0 20px rgba(0,0,0,0.16);
        }

        .tool-textarea {
          min-height: 104px;
          resize: vertical;
        }

        .tool-input::placeholder,
        .tool-textarea::placeholder {
          color: rgba(244, 239, 255, 0.48);
        }

        .tool-input:focus,
        .tool-textarea:focus,
        .tool-file:focus {
          border-color: rgba(221, 184, 255, 0.75);
          box-shadow:
            0 0 0 4px rgba(221, 184, 255, 0.12),
            inset 0 0 20px rgba(0,0,0,0.16);
        }

        .tool-buttons {
          position: relative;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 14px;
        }

        .tool-buttons button {
          min-height: 42px;
          border-radius: 999px;
          padding: 0 15px;
          background: rgba(255, 255, 255, 0.08);
          color: #f4efff;
          border: 1px solid rgba(255, 255, 255, 0.13);
          font-size: 13px;
          font-weight: 900;
          transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
        }

        .tool-buttons button:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.13);
          border-color: rgba(221, 184, 255, 0.55);
        }

        .tool-buttons button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .image-preview {
          position: relative;
          z-index: 1;
          margin-top: 16px;
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
        }

        .image-preview img {
          display: block;
          width: 100%;
          height: auto;
        }

        .tool-result {
          position: relative;
          z-index: 1;
          margin-top: 16px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.06);
          color: #f4efff;
          padding: 16px;
          line-height: 1.65;
          font-size: 14px;
          white-space: pre-wrap;
        }

        .tool-result pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: inherit;
          color: inherit;
        }

        .memory-list {
          display: grid;
          gap: 10px;
        }

        .memory-item,
        .empty-memory {
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.08);
          color: #f4efff;
          font-size: 14px;
          font-weight: 850;
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .empty-memory {
          color: #cec3d3;
          font-weight: 600;
        }

        .quick-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 14px;
        }

        .quick-list button {
          min-height: 44px;
          text-align: left;
        }

        @media (max-width: 980px) {
          .top-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .top-actions {
            justify-content: flex-start;
          }

          .main-grid {
            grid-template-columns: 1fr;
          }

          .chat-window {
            height: 460px;
          }
        }

        @media (max-width: 620px) {
          .lyra-page {
            padding: 16px 10px;
          }

          .top-card,
          .left-panel,
          .chat-card,
          .memory-card,
          .quick-card,
          .tool-card {
            border-radius: 24px;
          }

          .brand-area h1 {
            font-size: 26px;
          }

          .top-actions button,
          .top-actions span,
          .small-actions button,
          .quick-list button {
            padding: 0 13px;
            font-size: 13px;
          }

          .avatar-zone {
            min-height: 410px;
          }

          .avatar-orb {
            width: 220px;
            height: 220px;
          }

          .orb-core {
            width: 102px;
            height: 102px;
            font-size: 50px;
          }

          .input-row {
            flex-direction: column;
          }

          .send-button {
            min-height: 52px;
          }

          .message-bubble {
            max-width: 94%;
          }

          .tool-head {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}
