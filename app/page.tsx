"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Merhaba Merve. Ben Lyra. Yazabilir ya da mikrofona basıp konuşabilirsin.",
    },
  ]);

  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sayfa aşağı kaydırma
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // iPhone / tarayıcı seslerini yükleme
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();

      const trVoices = voices.filter(
        (voice) => voice.lang === "tr-TR" || voice.lang.startsWith("tr")
      );

      const usableVoices = trVoices.length > 0 ? trVoices : voices;

      setAvailableVoices(usableVoices);

      const savedVoice = localStorage.getItem("lyra_voice_name");

      if (savedVoice) {
        setSelectedVoiceName(savedVoice);
      } else if (usableVoices[0]) {
        setSelectedVoiceName(usableVoices[0].name);
      }
    };

    loadVoices();

    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Mikrofon / konuşmayı yazıya çevirme
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Bu tarayıcı konuşmayı yazıya çevirme özelliğini desteklemiyor.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "tr-TR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Mikrofon hatası:", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setInput(transcript);
    };

    recognitionRef.current = recognition;
  }, []);

  const speakWithPhoneVoice = (text: string) => {
    if (!voiceEnabled) return;
    if (typeof window === "undefined") return;

    if (!("speechSynthesis" in window)) {
      console.log("Bu tarayıcı sesli okuma desteklemiyor.");
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "tr-TR";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = synth.getVoices();

    const selectedVoice =
      voices.find((voice) => voice.name === selectedVoiceName) ||
      voices.find((voice) => voice.lang === "tr-TR") ||
      voices.find((voice) => voice.lang.startsWith("tr")) ||
      voices[0];

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    synth.cancel();

    // iPhone bazen hemen speak çağrısını yemiyor, minicik gecikme daha stabil.
    setTimeout(() => {
      synth.speak(utterance);
    }, 100);
  };

  const typeAssistantMessage = async (fullText: string) => {
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    let currentText = "";

    for (let i = 0; i < fullText.length; i++) {
      currentText += fullText[i];

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: currentText,
        };
        return updated;
      });

      await new Promise((resolve) => setTimeout(resolve, 18));
    }
  };

  const getLyraReply = async (userText: string) => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userText,
          messages,
        }),
      });

      if (!response.ok) {
        throw new Error("Sunucudan cevap alınamadı.");
      }

      const data = await response.json();

      return (
        data.reply ||
        data.message ||
        data.answer ||
        "Şu an cevap oluşturamadım ama bağlantı çalışıyor gibi görünüyor."
      );
    } catch (error) {
      console.error(error);

      return "Beybim şu an sunucudan cevap alamadım. Ama yazışma ve iPhone sesi kısmı çalışıyor. API bağlantısını ayrıca kontrol etmemiz gerekiyor.";
    }
  };

  const sendMessage = async () => {
    const cleanInput = input.trim();

    if (!cleanInput || isThinking) return;

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }

    window.speechSynthesis?.cancel();

    setInput("");
    setIsThinking(true);

    setMessages((prev) => [...prev, { role: "user", content: cleanInput }]);

    const reply = await getLyraReply(cleanInput);

    setIsThinking(false);

    await typeAssistantMessage(reply);

    speakWithPhoneVoice(reply);
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      alert(
        "Bu tarayıcı mikrofonla yazıya çevirme özelliğini desteklemiyor. iPhone’da Safari bazen kısıtlayabilir; Chrome ya da Safari güncel olmalı."
      );
      return;
    }

    try {
      setInput("");
      recognitionRef.current.start();
    } catch (error) {
      console.error(error);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;

    recognitionRef.current.stop();
    setIsListening(false);
  };

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoiceName(voiceName);
    localStorage.setItem("lyra_voice_name", voiceName);
  };

  const testVoice = () => {
    speakWithPhoneVoice(
      "Merhaba Merve. Ben Lyra. Artık iPhone'un kendi sesiyle konuşuyorum."
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#fffaf0] via-white to-[#eef8ef] text-[#1f1f1f]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-5">
        <header className="mb-4 rounded-3xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-white to-emerald-100 shadow-inner">
              <span className="text-3xl">☀️</span>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">Lyra</h1>
              <p className="text-sm text-neutral-600">
                Yazışma, mikrofon ve iPhone sistem sesi aktif.
              </p>
            </div>
          </div>
        </header>

        <section className="mb-4 grid gap-3 rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">iPhone sistem sesi</label>

            <select
              value={selectedVoiceName}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-white p-3 text-sm outline-none"
            >
              {availableVoices.length === 0 && (
                <option value="">Ses bulunamadı</option>
              )}

              {availableVoices.map((voice) => (
                <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                  {voice.name} - {voice.lang}
                </option>
              ))}
            </select>

            {availableVoices.length === 0 && (
              <p className="mt-2 text-xs text-neutral-500">
                iPhone’da Ayarlar → Erişilebilirlik → Seslendirilen İçerik →
                Sesler → Türkçe kısmından Türkçe ses indir.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={testVoice}
              className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white active:scale-[0.99]"
            >
              Sesi Test Et
            </button>

            <button
              onClick={() => setVoiceEnabled((prev) => !prev)}
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium active:scale-[0.99]"
            >
              Ses: {voiceEnabled ? "Açık" : "Kapalı"}
            </button>
          </div>
        </section>

        <section className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/75 shadow-sm backdrop-blur">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    message.role === "user"
                      ? "bg-black text-white"
                      : "bg-[#fff8e8] text-neutral-900"
                  }`}
                >
                  <div className="mb-1 text-xs opacity-60">
                    {message.role === "user" ? "Sen" : "Lyra"}
                  </div>
                  {message.content}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="rounded-3xl bg-[#fff8e8] px-4 py-3 text-sm text-neutral-600 shadow-sm">
                  Lyra düşünüyor...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-neutral-100 bg-white/80 p-3">
            {isListening && (
              <div className="mb-2 rounded-2xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                Dinliyorum beybim... Konuşman yazıya dönüyor.
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`rounded-2xl px-4 py-3 text-lg active:scale-[0.98] ${
                  isListening
                    ? "bg-red-500 text-white"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {isListening ? "■" : "🎙️"}
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Lyra’ya yaz ya da mikrofona basıp konuş..."
                rows={1}
                className="max-h-32 flex-1 resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none"
              />

              <button
                onClick={sendMessage}
                disabled={isThinking || !input.trim()}
                className="rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
              >
                Gönder
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
