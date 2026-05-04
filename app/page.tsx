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
      "Kanka geldim. Artık seni tekrar edip bırakmayacağım; ne sorarsan direkt cevaplayacağım. İçerik, kimya, kozmetik, ders, plan, araştırma, uygulama hatası… ne varsa birlikte toparlarız.",
  },
];

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [voiceMode, setVoiceMode] = useState<"phone" | "realistic">("phone");
  const [status, setStatus] = useState("Hazır");
  const [speechRate, setSpeechRate] = useState(1.02);
  const [memory, setMemory] = useState<string[]>([
    "kozmetik / formül / cilt bakımı",
    "içerik üretimi",
  ]);

  const recognitionRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  const addMemory = (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    const short = clean.length > 52 ? clean.slice(0, 52) + "..." : clean;

    setMemory((prev) => {
      const exists = prev.some((item) => item.toLowerCase() === short.toLowerCase());
      if (exists) return prev;
      return [short, ...prev].slice(0, 6);
    });
  };

  const speak = (text: string) => {
    if (isMuted) return;
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = speechRate;
    utterance.pitch = voiceMode === "realistic" ? 1.03 : 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const turkishVoice =
      voices.find((v) => v.lang?.toLowerCase().includes("tr")) ||
      voices.find((v) => v.name?.toLowerCase().includes("turkish")) ||
      voices[0];

    if (turkishVoice) {
      utterance.voice = turkishVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
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
        "Kanka Lyra cevap motoruna bağlanırken takıldı. Büyük ihtimalle API key, model adı ya da Vercel environment ayarında bir sorun var."
      );
    }

    return (
      data?.message ||
      data?.content ||
      data?.reply ||
      "Kanka cevap geldi ama ekrana düzgün aktarılamadı. Response alanını yakalayamadım."
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

      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "Kanka bağlantıda minik bir kopma oldu. Şu an sorun büyük ihtimalle frontend’in /api/chat route’una ulaşamaması. Vercel redeploy ve OPENAI_API_KEY ayarını kontrol edelim.",
      };

      setMessages((prev) => [...prev, errorMessage]);
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
      const noSupportMessage: ChatMessage = {
        id: `speech-error-${Date.now()}`,
        role: "assistant",
        content:
          "Kanka bu tarayıcı ses algılamayı desteklemiyor gibi görünüyor. Chrome’da açarsan genelde çalışıyor.",
      };

      setMessages((prev) => [...prev, noSupportMessage]);
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
    }
    setIsMuted((prev) => !prev);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffeaf4_0,#fff7fb_28%,#eef7ff_65%,#f9fbff_100%)] text-[#2b2238]">
      <div className="mx-auto max-w-[1480px] px-5 py-8">
        <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/70 px-6 py-5 shadow-[0_20px_70px_rgba(119,91,140,0.12)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 via-violet-100 to-sky-100 text-2xl font-black text-violet-600 shadow-inner">
              L
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Lyra Clean 2026</h1>
              <p className="text-sm text-[#6e627c]">
                Lyra ile konuş, üret, planla, araştır, hatırla.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => startListening("send")}
              className={`rounded-full px-5 py-3 text-sm font-bold shadow-sm transition ${
                isListening
                  ? "bg-violet-600 text-white"
                  : "bg-white/80 hover:bg-white"
              }`}
            >
              Canlı Konuş
            </button>

            <button
              onClick={() => startListening("write")}
              className="rounded-full bg-white/80 px-5 py-3 text-sm font-bold shadow-sm transition hover:bg-white"
            >
              Sesle Yaz
            </button>

            <button
              onClick={() => {
                stopSpeaking();
                stopListening();
              }}
              className="rounded-full bg-rose-50 px-5 py-3 text-sm font-bold shadow-sm transition hover:bg-rose-100"
            >
              Sustur
            </button>

            <span className="rounded-full bg-gradient-to-r from-fuchsia-300 to-sky-300 px-5 py-3 text-sm font-black shadow-sm">
              AI Mod Açık
            </span>

            <button
              onClick={toggleMute}
              className={`rounded-full px-5 py-3 text-sm font-bold shadow-sm transition ${
                isMuted
                  ? "bg-white/80 hover:bg-white"
                  : "bg-emerald-100 hover:bg-emerald-200"
              }`}
            >
              {isMuted ? "Sessiz" : "Ses Açık"}
            </button>

            <button
              onClick={() => setVoiceMode("phone")}
              className={`rounded-full px-5 py-3 text-sm font-bold shadow-sm transition ${
                voiceMode === "phone"
                  ? "bg-gradient-to-r from-fuchsia-200 to-sky-200"
                  : "bg-white/80 hover:bg-white"
              }`}
            >
              Telefon Sesi
            </button>

            <button
              onClick={() => setVoiceMode("realistic")}
              className={`rounded-full px-5 py-3 text-sm font-bold shadow-sm transition ${
                voiceMode === "realistic"
                  ? "bg-gradient-to-r from-fuchsia-200 to-sky-200"
                  : "bg-white/80 hover:bg-white"
              }`}
            >
              Gerçekçi Ses
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[32px] border border-white/70 bg-white/60 p-7 shadow-[0_20px_80px_rgba(119,91,140,0.12)] backdrop-blur">
            <div className="flex min-h-[540px] flex-col items-center justify-center">
              <div
                className={`relative flex h-72 w-72 items-center justify-center rounded-full bg-gradient-to-br from-emerald-200 via-sky-200 via-violet-200 to-pink-200 shadow-[0_25px_90px_rgba(162,111,214,0.22)] ${
                  isListening ? "animate-pulse" : ""
                }`}
              >
                <div className="absolute inset-4 rounded-full bg-white/25 blur-sm" />
                <div className="absolute inset-10 rounded-full bg-gradient-to-tr from-cyan-200 via-fuchsia-300 to-amber-100 opacity-80 blur-[2px]" />
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-emerald-200 via-sky-300 to-fuchsia-300 text-6xl font-black text-white shadow-inner">
                  L
                </div>
              </div>

              <div className="mt-10 text-center">
                <p className="text-lg font-black">{status}</p>
                <div className="mt-8 w-80 max-w-full">
                  <label className="mb-3 block text-sm font-black">
                    Ses hızı: {speechRate.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.75"
                    max="1.35"
                    step="0.01"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[24px] bg-white/85 p-5 shadow-[0_10px_40px_rgba(119,91,140,0.10)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-black">Lyra ile sohbet et</h2>
                <span className="text-sm text-[#6e627c]">{status}</span>
              </div>

              <div className="flex gap-3">
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
                  className="min-h-[54px] flex-1 resize-none rounded-2xl border border-[#e8ddec] bg-white px-4 py-4 text-sm font-medium outline-none transition placeholder:text-[#9a8aa8] focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />

                <button
                  onClick={() => sendMessage()}
                  disabled={isLoading || !input.trim()}
                  className="rounded-2xl bg-gradient-to-r from-fuchsia-300 to-sky-300 px-6 py-3 font-black text-[#241a2f] shadow-sm transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Gönder
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => startListening("write")}
                  className="rounded-full bg-pink-50 px-5 py-3 text-sm font-black transition hover:bg-pink-100"
                >
                  Sesle Yaz
                </button>

                <button
                  onClick={clearChat}
                  className="rounded-full bg-pink-50 px-5 py-3 text-sm font-black transition hover:bg-pink-100"
                >
                  Sohbeti Temizle
                </button>

                <button
                  onClick={clearMemory}
                  className="rounded-full bg-pink-50 px-5 py-3 text-sm font-black transition hover:bg-pink-100"
                >
                  Hafızayı Temizle
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-[32px] border border-white/70 bg-white/70 p-5 shadow-[0_20px_80px_rgba(119,91,140,0.12)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between px-1">
                <h2 className="font-black">Sohbet</h2>
                <span className="text-sm text-[#6e627c]">
                  {messages.length} mesaj
                </span>
              </div>

              <div className="h-[520px] overflow-y-auto rounded-[26px] bg-white/55 p-4">
                <div className="flex flex-col gap-4">
                  {messages.map((message) => {
                    const isUser = message.role === "user";

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-[24px] px-5 py-4 shadow-sm ${
                            isUser
                              ? "bg-gradient-to-r from-pink-100 to-violet-100"
                              : "bg-white"
                          }`}
                        >
                          <div className="mb-2 text-sm font-black">
                            {isUser ? "Sen" : "Lyra"}
                          </div>
                          <p className="whitespace-pre-wrap leading-7 text-[#3d3448]">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="max-w-[82%] rounded-[24px] bg-white px-5 py-4 shadow-sm">
                        <div className="mb-2 text-sm font-black">Lyra</div>
                        <p className="leading-7 text-[#6e627c]">
                          Düşünüyorum kanka, cevabı toparlıyorum...
                        </p>
                      </div>
                    </div>
                  )}

                  <div ref={endRef} />
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/70 bg-white/70 p-5 shadow-[0_20px_80px_rgba(119,91,140,0.12)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between px-1">
                <h2 className="font-black">Kısa Hafıza</h2>
                <span className="text-sm text-[#6e627c]">{memory.length} kayıt</span>
              </div>

              {memory.length === 0 ? (
                <p className="rounded-2xl bg-white/65 p-4 text-sm text-[#6e627c]">
                  Hafıza şu an boş. Konuştukça kısa notları burada tutacağım.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {memory.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-2xl bg-white/75 p-4 shadow-sm"
                    >
                      <p className="text-sm font-black text-[#3d3448]">{item}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-white/70 bg-white/70 p-5 shadow-[0_20px_80px_rgba(119,91,140,0.12)] backdrop-blur">
              <h2 className="mb-3 font-black">Hızlı Test</h2>
              <div className="flex flex-wrap gap-3">
                {[
                  "Cilt bakımında dünyada şu ara ilgi çeken alanlar neler?",
                  "Bana keşfete düşecek 10 kozmetik içerik fikri ver.",
                  "Ev tipi bariyer onarıcı krem mantığını anlat.",
                  "DGS için bugünlük çalışma planı çıkar.",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    disabled={isLoading}
                    className="rounded-full bg-white/80 px-4 py-3 text-left text-sm font-bold shadow-sm transition hover:bg-white disabled:opacity-50"
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
  );
}
