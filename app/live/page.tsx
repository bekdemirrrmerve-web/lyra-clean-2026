"use client";

import React, { useRef, useState } from "react";

type LiveStatus =
  | "Kapalı"
  | "Token alınıyor..."
  | "Bağlanıyor..."
  | "Bağlandı"
  | "Hata";

const WS_ENDPOINT =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function collectAudioBase64(node: any, result: string[] = []) {
  if (!node || typeof node !== "object") return result;

  const inlineData = node.inlineData || node.inline_data;

  if (inlineData?.data) {
    const mimeType = inlineData.mimeType || inlineData.mime_type || "";

    if (!mimeType || mimeType.includes("audio")) {
      result.push(inlineData.data);
    }
  }

  if (Array.isArray(node)) {
    for (const item of node) collectAudioBase64(item, result);
    return result;
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === "object") {
      collectAudioBase64(value, result);
    }
  }

  return result;
}

function extractTextFromLiveMessage(message: any) {
  const outputText =
    message?.serverContent?.outputTranscription?.text ||
    message?.server_content?.output_transcription?.text ||
    "";

  const inputText =
    message?.serverContent?.inputTranscription?.text ||
    message?.server_content?.input_transcription?.text ||
    "";

  return { outputText, inputText };
}

export default function LiveGeminiPage() {
  const [status, setStatus] = useState<LiveStatus>("Kapalı");
  const [log, setLog] = useState<string[]>([
    "Canlı Gemini test sayfası hazır.",
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const [textInput, setTextInput] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const setupReadyRef = useRef(false);
  const pendingTextRef = useRef<string | null>(null);

  const addLog = (text: string) => {
    setLog((prev) => [text, ...prev].slice(0, 24));
  };

  const ensureOutputContext = async () => {
    if (!outputAudioContextRef.current) {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;

      outputAudioContextRef.current = new AudioCtx();
      nextPlayTimeRef.current = outputAudioContextRef.current.currentTime;
    }

    if (outputAudioContextRef.current.state === "suspended") {
      await outputAudioContextRef.current.resume();
    }

    return outputAudioContextRef.current;
  };

  const clearPlayback = async () => {
    try {
      await outputAudioContextRef.current?.close();
      outputAudioContextRef.current = null;
      nextPlayTimeRef.current = 0;
      addLog("Ses kuyruğu temizlendi.");
    } catch {}
  };

  const playPcm24kFromArrayBuffer = async (arrayBuffer: ArrayBuffer) => {
    const audioContext = await ensureOutputContext();
    const int16 = new Int16Array(arrayBuffer);

    if (!int16.length) return;

    const audioBuffer = audioContext.createBuffer(1, int16.length, 24000);
    const channel = audioBuffer.getChannelData(0);

    for (let i = 0; i < int16.length; i++) {
      channel[i] = int16[i] / 32768;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    const now = audioContext.currentTime;
    const startAt = Math.max(now + 0.02, nextPlayTimeRef.current);

    source.start(startAt);
    nextPlayTimeRef.current = startAt + audioBuffer.duration;
  };

  const playPcm24kFromBase64 = async (base64Pcm: string) => {
    const arrayBuffer = base64ToArrayBuffer(base64Pcm);
    await playPcm24kFromArrayBuffer(arrayBuffer);
  };

  const reallySendText = async (text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog("Bağlantı açık değil, mesaj gönderilemedi.");
      return;
    }

    await ensureOutputContext();

    wsRef.current.send(
      JSON.stringify({
        realtimeInput: {
          text,
        },
      })
    );

    addLog(`Sen: ${text}`);
  };

  const handleLiveJsonMessage = async (message: any) => {
    if (message?.setupComplete || message?.setup_complete) {
      setupReadyRef.current = true;
      setStatus("Bağlandı");
      addLog("Kurulum tamamlandı. Artık yazı gönderince sesli cevap bekleyeceğiz.");

      if (pendingTextRef.current) {
        const pending = pendingTextRef.current;
        pendingTextRef.current = null;
        await reallySendText(pending);
      }
    }

    if (
      message?.serverContent?.interrupted ||
      message?.server_content?.interrupted
    ) {
      await clearPlayback();
      addLog("Lyra kesildi, yeni konuşmanı dinliyor.");
    }

    const { outputText, inputText } = extractTextFromLiveMessage(message);

    if (inputText) addLog(`Senin sesin: ${inputText}`);
    if (outputText) addLog(`Lyra yazı dökümü: ${outputText}`);

    const audioChunks = collectAudioBase64(message);

    if (audioChunks.length > 0) {
      addLog(`Ses paketi geldi: ${audioChunks.length} parça. Çalıyorum...`);
    }

    for (const audioBase64 of audioChunks) {
      await playPcm24kFromBase64(audioBase64);
    }

    if (
      message?.serverContent?.turnComplete ||
      message?.server_content?.turn_complete
    ) {
      addLog("Lyra cevabı tamamladı.");
    }
  };

  const handleIncomingData = async (data: any) => {
    try {
      if (typeof data === "string") {
        const trimmed = data.trim();

        if (trimmed.startsWith("{")) {
          const message = JSON.parse(trimmed);
          await handleLiveJsonMessage(message);
          return;
        }

        addLog("Metin veri geldi ama JSON değil, atlandı.");
        return;
      }

      if (data instanceof ArrayBuffer) {
        const decodedText = new TextDecoder("utf-8").decode(data).trim();

        if (decodedText.startsWith("{")) {
          const message = JSON.parse(decodedText);
          await handleLiveJsonMessage(message);
          return;
        }

        addLog("Binary ses paketi geldi. Çalıyorum...");
        await playPcm24kFromArrayBuffer(data);
        return;
      }

      if (data instanceof Blob) {
        const blobText = await data.text();
        const trimmed = blobText.trim();

        if (trimmed.startsWith("{")) {
          const message = JSON.parse(trimmed);
          await handleLiveJsonMessage(message);
          return;
        }

        const arrayBuffer = await data.arrayBuffer();
        addLog("Blob ses paketi geldi. Çalıyorum...");
        await playPcm24kFromArrayBuffer(arrayBuffer);
        return;
      }

      addLog("Bilinmeyen veri tipi geldi, atlandı.");
    } catch (error: any) {
      addLog("Gelen mesaj işlenemedi: " + (error?.message || "hata"));
    }
  };

  const connectLive = async () => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        addLog("Zaten bağlı.");
        return;
      }

      setupReadyRef.current = false;
      await ensureOutputContext();

      setStatus("Token alınıyor...");
      addLog("Live token alınıyor...");

      const tokenResponse = await fetch("/api/live-token");
      const tokenData = await tokenResponse.json().catch(() => null);

      if (!tokenResponse.ok || !tokenData?.token) {
        throw new Error(
          tokenData?.message ||
            "Live token alınamadı. /api/live-token kontrol et."
        );
      }

      setStatus("Bağlanıyor...");
      addLog("Gemini Live WebSocket bağlanıyor...");

      const wsUrl = `${WS_ENDPOINT}?access_token=${encodeURIComponent(
        tokenData.token
      )}`;

      const websocket = new WebSocket(wsUrl);
      websocket.binaryType = "arraybuffer";
      wsRef.current = websocket;

      websocket.onopen = () => {
        setIsConnected(true);
        setStatus("Bağlandı");
        addLog("Gemini Live bağlandı. Kurulum mesajı gönderiliyor...");

        const modelName = tokenData.model || "gemini-3.1-flash-live-preview";

        const setupMessage = {
          setup: {
            model: `models/${modelName}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              temperature: 0.7,
            },
            systemInstruction: {
              parts: [
                {
                  text:
                    "Sen Lyra Clean 2026'sın. Türkçe konuşan, sıcak, doğal, hızlı, samimi ve zeki bir kadın asistan gibi cevap ver. Kullanıcıyla yakın arkadaş enerjisinde konuş. Kısa, akıcı ve canlı cevap ver. Kullanıcının mesajını tekrar etme. Türkçe konuş.",
                },
              ],
            },
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          },
        };

        websocket.send(JSON.stringify(setupMessage));
      };

      websocket.onmessage = async (event) => {
        await handleIncomingData(event.data);
      };

      websocket.onerror = () => {
        setStatus("Hata");
        addLog("WebSocket hatası oldu.");
      };

      websocket.onclose = (event) => {
        setIsConnected(false);
        setupReadyRef.current = false;

        if (event.code === 1000) {
          setStatus("Kapalı");
        } else {
          setStatus("Hata");
        }

        const reason = event.reason ? ` ${event.reason}` : "";
        addLog(`Bağlantı kapandı.${reason}`);
      };
    } catch (error: any) {
      setStatus("Hata");
      addLog(error?.message || "Canlı bağlantı hatası.");
    }
  };

  const disconnectLive = () => {
    try {
      if (wsRef.current) {
        wsRef.current.close();
      }

      wsRef.current = null;
      setIsConnected(false);
      setupReadyRef.current = false;
      setStatus("Kapalı");
      addLog("Canlı Gemini kapatıldı.");
    } catch {
      setStatus("Kapalı");
    }
  };

  const sendTextToLive = async () => {
    const text = textInput.trim();

    if (!text) return;

    await ensureOutputContext();

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      pendingTextRef.current = text;
      addLog("Bağlantı yoktu. Önce bağlanıyorum, sonra mesajı otomatik göndereceğim...");
      setTextInput("");
      await connectLive();
      return;
    }

    if (!setupReadyRef.current) {
      pendingTextRef.current = text;
      addLog("Kurulum henüz tamamlanmadı. Mesajı beklemeye aldım.");
      setTextInput("");
      return;
    }

    await reallySendText(text);
    setTextInput("");
  };

  return (
    <main className="live-page">
      <section className="live-shell">
        <div className="top">
          <div>
            <h1>Canlı Gemini</h1>
            <p>Önce yazıyla sesli cevap test ediyoruz. Ses paketi gelirse sistem tamam.</p>
          </div>
          <a href="/">Ana Lyra’ya dön</a>
        </div>

        <div className="status-card">
          <div className={`orb ${isConnected ? "talking" : ""}`}>L</div>
          <h2>{status}</h2>
          <p>
            {isConnected
              ? "Bağlantı hazır. Mesaj yazıp Gönder’e bas."
              : "Mesaj yazıp Gönder’e basarsan otomatik bağlanır."}
          </p>
        </div>

        <div className="controls">
          <button onClick={connectLive} disabled={isConnected}>
            Canlı Gemini Bağlan
          </button>
          <button onClick={clearPlayback}>Sesi Sustur</button>
          <button onClick={disconnectLive}>Bağlantıyı Kapat</button>
        </div>

        <div className="text-send">
          <input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendTextToLive();
            }}
            placeholder="Örn: Merhaba Lyra, bana kısa sesli cevap ver."
          />
          <button onClick={sendTextToLive}>Gönder</button>
        </div>

        <div className="log-card">
          <h2>Canlı Kayıt</h2>
          <div className="logs">
            {log.map((item, index) => (
              <p key={`${item}-${index}`}>{item}</p>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #111116;
        }

        .live-page {
          min-height: 100vh;
          padding: 28px;
          color: #f4efff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background:
            radial-gradient(circle at top left, rgba(192,132,252,0.25), transparent 28%),
            radial-gradient(circle at bottom right, rgba(255,178,185,0.16), transparent 36%),
            linear-gradient(135deg, #131316, #191720 48%, #111116);
        }

        .live-shell {
          width: min(980px, 100%);
          margin: 0 auto;
        }

        .top,
        .status-card,
        .controls,
        .text-send,
        .log-card {
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 24px 80px rgba(0,0,0,0.26);
          backdrop-filter: blur(18px);
          border-radius: 28px;
        }

        .top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 22px;
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        h1 {
          font-size: 34px;
          letter-spacing: -0.05em;
        }

        .top p {
          margin-top: 6px;
          color: #cec3d3;
        }

        .top a {
          color: #210033;
          text-decoration: none;
          font-weight: 950;
          padding: 12px 16px;
          border-radius: 999px;
          background: linear-gradient(90deg, #ddb8ff, #ffb2b9);
        }

        .status-card {
          margin-top: 18px;
          min-height: 320px;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 24px;
        }

        .orb {
          width: 170px;
          height: 170px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          font-size: 66px;
          font-weight: 950;
          color: white;
          background:
            radial-gradient(circle at 35% 25%, rgba(255,255,255,0.85), transparent 14%),
            linear-gradient(135deg, #a6f4d6, #9dd8ff, #d7b7ff, #ff9fce);
          box-shadow: 0 0 70px rgba(221,184,255,0.28);
        }

        .orb.talking {
          animation: pulse 1s infinite ease-in-out;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .status-card h2 {
          margin-top: 18px;
        }

        .status-card p {
          margin-top: 8px;
          color: #cec3d3;
        }

        .controls {
          margin-top: 18px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 16px;
        }

        button {
          min-height: 44px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          color: #f4efff;
          padding: 0 16px;
          font-weight: 900;
          cursor: pointer;
        }

        button:hover {
          background: rgba(255,255,255,0.13);
        }

        button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .text-send {
          margin-top: 18px;
          display: flex;
          gap: 10px;
          padding: 16px;
        }

        input {
          width: 100%;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(14,14,17,0.82);
          color: #f4efff;
          padding: 14px 16px;
          outline: none;
          font-weight: 700;
        }

        .text-send button {
          min-width: 110px;
          background: linear-gradient(90deg, #ddb8ff, #ffb2b9);
          color: #210033;
        }

        .log-card {
          margin-top: 18px;
          padding: 20px;
        }

        .logs {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }

        .logs p {
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(255,255,255,0.08);
          color: #f4efff;
          line-height: 1.55;
        }

        @media (max-width: 640px) {
          .live-page {
            padding: 14px;
          }

          .top {
            align-items: flex-start;
            flex-direction: column;
          }

          .text-send {
            flex-direction: column;
          }

          .orb {
            width: 140px;
            height: 140px;
            font-size: 54px;
          }
        }
      `}</style>
    </main>
  );
}
