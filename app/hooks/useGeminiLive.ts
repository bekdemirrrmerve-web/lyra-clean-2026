"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LiveStatus =
  | "Kapalı"
  | "Token alınıyor..."
  | "Bağlanıyor..."
  | "Bağlandı"
  | "Mikrofon açık"
  | "Hata";

type UseGeminiLiveOptions = {
  muted?: boolean;
  onStatus?: (text: string) => void;
  onUserMessage?: (text: string) => void;
  onAssistantMessage?: (text: string) => void;
};

const WS_ENDPOINT =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function downsampleTo16k(float32: Float32Array, inputSampleRate: number) {
  const targetSampleRate = 16000;

  if (inputSampleRate === targetSampleRate) return float32;

  const ratio = inputSampleRate / targetSampleRate;
  const newLength = Math.round(float32.length / ratio);
  const result = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;

    for (
      let i = offsetBuffer;
      i < nextOffsetBuffer && i < float32.length;
      i++
    ) {
      accum += float32[i];
      count++;
    }

    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

function floatTo16BitPCM(float32: Float32Array) {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < float32.length; i++) {
    let sample = Math.max(-1, Math.min(1, float32[i]));
    sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(i * 2, sample, true);
  }

  return buffer;
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

export function useGeminiLive(options: UseGeminiLiveOptions = {}) {
  const [liveMode, setLiveMode] = useState(false);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>("Kapalı");
  const [isMicOn, setIsMicOn] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const readyRef = useRef(false);
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  const readyResolverRef = useRef<(() => void) | null>(null);
  const readyRejecterRef = useRef<((error: Error) => void) | null>(null);

  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceRef = useRef<GainNode | null>(null);

  const userTranscriptRef = useRef("");
  const assistantTranscriptRef = useRef("");
  const userAlreadyAddedRef = useRef(false);

  const mutedRef = useRef(options.muted ?? false);
  const onStatusRef = useRef(options.onStatus);
  const onUserMessageRef = useRef(options.onUserMessage);
  const onAssistantMessageRef = useRef(options.onAssistantMessage);

  useEffect(() => {
    mutedRef.current = options.muted ?? false;
    onStatusRef.current = options.onStatus;
    onUserMessageRef.current = options.onUserMessage;
    onAssistantMessageRef.current = options.onAssistantMessage;
  }, [options.muted, options.onStatus, options.onUserMessage, options.onAssistantMessage]);

  const pushStatus = useCallback((text: string) => {
    onStatusRef.current?.(text);
  }, []);

  const ensureOutputContext = useCallback(async () => {
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
  }, []);

  const clearPlayback = useCallback(async () => {
    try {
      await outputAudioContextRef.current?.close();
      outputAudioContextRef.current = null;
      nextPlayTimeRef.current = 0;
      pushStatus("Ses susturuldu");
    } catch {}
  }, [pushStatus]);

  const playPcm24kFromArrayBuffer = useCallback(
    async (arrayBuffer: ArrayBuffer) => {
      if (mutedRef.current) return;

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

      pushStatus("Lyra canlı konuşuyor...");
    },
    [ensureOutputContext, pushStatus]
  );

  const playPcm24kFromBase64 = useCallback(
    async (base64Pcm: string) => {
      const arrayBuffer = base64ToArrayBuffer(base64Pcm);
      await playPcm24kFromArrayBuffer(arrayBuffer);
    },
    [playPcm24kFromArrayBuffer]
  );

  const handleLiveJsonMessage = useCallback(
    async (message: any) => {
      if (message?.setupComplete || message?.setup_complete) {
        readyRef.current = true;
        setLiveStatus("Bağlandı");
        setLiveMode(true);
        pushStatus("Canlı Gemini hazır");

        readyResolverRef.current?.();
        readyResolverRef.current = null;
        readyRejecterRef.current = null;
        connectPromiseRef.current = null;
      }

      if (
        message?.serverContent?.interrupted ||
        message?.server_content?.interrupted
      ) {
        await clearPlayback();
        assistantTranscriptRef.current = "";
        pushStatus("Lyra kesildi, seni dinliyor");
      }

      const { outputText, inputText } = extractTextFromLiveMessage(message);

      if (inputText) {
        userTranscriptRef.current += inputText;
        const cleanInput = userTranscriptRef.current.trim();

        if (cleanInput) {
          pushStatus(`Seni duyuyorum: ${cleanInput.slice(-42)}`);
        }
      }

      if (outputText) {
        assistantTranscriptRef.current += outputText;
      }

      const audioChunks = collectAudioBase64(message);

      for (const audioBase64 of audioChunks) {
        await playPcm24kFromBase64(audioBase64);
      }

      if (
        message?.serverContent?.turnComplete ||
        message?.server_content?.turn_complete
      ) {
        const userText = userTranscriptRef.current.trim();
        const assistantText = assistantTranscriptRef.current.trim();

        if (userText && !userAlreadyAddedRef.current) {
          onUserMessageRef.current?.(userText);
          userAlreadyAddedRef.current = true;
        }

        if (assistantText) {
          onAssistantMessageRef.current?.(assistantText);
        } else if (audioChunks.length > 0) {
          onAssistantMessageRef.current?.("Lyra sesli cevap verdi.");
        }

        userTranscriptRef.current = "";
        assistantTranscriptRef.current = "";
        userAlreadyAddedRef.current = false;

        pushStatus(
          isMicOn ? "Canlı mikrofon açık, seni dinliyorum" : "Canlı Gemini hazır"
        );
      }
    },
    [clearPlayback, isMicOn, playPcm24kFromBase64, pushStatus]
  );

  const handleIncomingData = useCallback(
    async (data: any) => {
      try {
        if (typeof data === "string") {
          const trimmed = data.trim();

          if (trimmed.startsWith("{")) {
            const message = JSON.parse(trimmed);
            await handleLiveJsonMessage(message);
          }

          return;
        }

        if (data instanceof ArrayBuffer) {
          const decodedText = new TextDecoder("utf-8").decode(data).trim();

          if (decodedText.startsWith("{")) {
            const message = JSON.parse(decodedText);
            await handleLiveJsonMessage(message);
            return;
          }

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
          await playPcm24kFromArrayBuffer(arrayBuffer);
        }
      } catch (error) {
        console.error("Gemini Live veri hatası:", error);
        pushStatus("Live veri işlenemedi");
      }
    },
    [handleLiveJsonMessage, playPcm24kFromArrayBuffer, pushStatus]
  );

  const connect = useCallback(async () => {
    if (readyRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      setLiveMode(true);
      return;
    }

    if (connectPromiseRef.current) {
      return connectPromiseRef.current;
    }

    setLiveMode(true);
    setLiveStatus("Token alınıyor...");
    pushStatus("Canlı Gemini bağlanıyor...");
    await ensureOutputContext();

    const readyPromise = new Promise<void>((resolve, reject) => {
      readyResolverRef.current = resolve;
      readyRejecterRef.current = reject;
    });

    connectPromiseRef.current = readyPromise;

    try {
      const tokenResponse = await fetch("/api/live-token");
      const tokenData = await tokenResponse.json().catch(() => null);

      if (!tokenResponse.ok || !tokenData?.token) {
        throw new Error(
          tokenData?.message ||
            "Live token alınamadı. /api/live-token kontrol edilmeli."
        );
      }

      setLiveStatus("Bağlanıyor...");
      pushStatus("Gemini Live WebSocket bağlanıyor...");

      const wsUrl = `${WS_ENDPOINT}?access_token=${encodeURIComponent(
        tokenData.token
      )}`;

      const websocket = new WebSocket(wsUrl);
      websocket.binaryType = "arraybuffer";
      wsRef.current = websocket;

      websocket.onopen = () => {
        setLiveStatus("Bağlandı");
        pushStatus("Gemini Live kurulum yapıyor...");

        const modelName =
          tokenData.model || "gemini-2.5-flash-native-audio-preview-12-2025";

        const setupMessage = {
          setup: {
            model: `models/${modelName}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              temperature: 0.72,
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
        setLiveStatus("Hata");
        pushStatus("Live bağlantı hatası");
        readyRejecterRef.current?.(new Error("WebSocket hatası"));
        connectPromiseRef.current = null;
      };

      websocket.onclose = () => {
        readyRef.current = false;
        setLiveStatus("Kapalı");
        setLiveMode(false);
        setIsMicOn(false);
        pushStatus("Canlı bağlantı kapandı");

        readyRejecterRef.current?.(new Error("Bağlantı kapandı"));
        readyResolverRef.current = null;
        readyRejecterRef.current = null;
        connectPromiseRef.current = null;
      };

      return readyPromise;
    } catch (error) {
      readyRef.current = false;
      connectPromiseRef.current = null;
      setLiveStatus("Hata");
      pushStatus("Live bağlanamadı");
      throw error;
    }
  }, [ensureOutputContext, handleIncomingData, pushStatus]);

  const stopMic = useCallback(() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            realtimeInput: {
              audioStreamEnd: true,
            },
          })
        );
      }

      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      silenceRef.current?.disconnect();

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      inputAudioContextRef.current?.close();

      processorRef.current = null;
      sourceRef.current = null;
      silenceRef.current = null;
      mediaStreamRef.current = null;
      inputAudioContextRef.current = null;

      setIsMicOn(false);

      if (readyRef.current) {
        pushStatus("Canlı Gemini hazır");
      }
    } catch {
      setIsMicOn(false);
    }
  }, [pushStatus]);

  const close = useCallback(() => {
    try {
      stopMic();

      if (wsRef.current) {
        wsRef.current.close();
      }
    } catch {}

    wsRef.current = null;
    readyRef.current = false;
    connectPromiseRef.current = null;
    readyResolverRef.current = null;
    readyRejecterRef.current = null;

    userTranscriptRef.current = "";
    assistantTranscriptRef.current = "";
    userAlreadyAddedRef.current = false;

    setLiveMode(false);
    setLiveStatus("Kapalı");
    setIsMicOn(false);
    pushStatus("Lyra hazır");
  }, [pushStatus, stopMic]);

  const startMic = useCallback(async () => {
    try {
      userTranscriptRef.current = "";
      assistantTranscriptRef.current = "";
      userAlreadyAddedRef.current = false;

      pushStatus("Mikrofon hazırlanıyor...");
      await connect();

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        onAssistantMessageRef.current?.(
          "Kanka canlı bağlantı açık değil, mikrofon başlatamadım."
        );
        return;
      }

      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;

      const inputContext = new AudioCtx();
      inputAudioContextRef.current = inputContext;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const source = inputContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = inputContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const silence = inputContext.createGain();
      silence.gain.value = 0;
      silenceRef.current = silence;

      processor.onaudioprocess = (event) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = event.inputBuffer.getChannelData(0);
        const downsampled = downsampleTo16k(inputData, inputContext.sampleRate);
        const pcm16Buffer = floatTo16BitPCM(downsampled);
        const base64 = arrayBufferToBase64(pcm16Buffer);

        wsRef.current.send(
          JSON.stringify({
            realtimeInput: {
              audio: {
                data: base64,
                mimeType: "audio/pcm;rate=16000",
              },
            },
          })
        );
      };

      source.connect(processor);
      processor.connect(silence);
      silence.connect(inputContext.destination);

      setIsMicOn(true);
      setLiveStatus("Mikrofon açık");
      pushStatus("Canlı mikrofon açık, seni dinliyorum");

      onAssistantMessageRef.current?.(
        "Canlı mikrofon açık kanka. Şimdi konuş; söylediklerin yazışma alanına da düşecek, Lyra sesli cevap verecek."
      );
    } catch (error: any) {
      const msg = error?.message || "Bilinmeyen hata";

      setIsMicOn(false);
      pushStatus("Mikrofon açılamadı");

      if (msg.includes("Requested device not found")) {
        onAssistantMessageRef.current?.(
          "Kanka mikrofon bulunamadı. PC’de mikrofon takılı mı, tarayıcı mikrofonu görüyor mu kontrol et. Telefonda izin verince daha rahat çalışabilir."
        );
      } else if (msg.includes("Permission denied")) {
        onAssistantMessageRef.current?.(
          "Kanka mikrofon izni reddedilmiş. Tarayıcı/site izinlerinden mikrofonu açman lazım."
        );
      } else {
        onAssistantMessageRef.current?.("Kanka mikrofon açılamadı: " + msg);
      }
    }
  }, [connect, pushStatus]);

  const sendText = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      await connect();
      await ensureOutputContext();

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        onAssistantMessageRef.current?.(
          "Kanka canlı bağlantı açık değil, mesaj gönderemedim."
        );
        return;
      }

      userTranscriptRef.current = "";
      assistantTranscriptRef.current = "";
      userAlreadyAddedRef.current = true;

      onUserMessageRef.current?.(clean);

      wsRef.current.send(
        JSON.stringify({
          realtimeInput: {
            text: clean,
          },
        })
      );

      pushStatus("Canlı Gemini cevaplıyor...");
    },
    [connect, ensureOutputContext, pushStatus]
  );

  const toggleLiveMode = useCallback(async () => {
    if (liveMode || readyRef.current) {
      close();
      return;
    }

    try {
      await connect();
      onAssistantMessageRef.current?.(
        "Canlı Gemini ana ekranda açıldı kanka. Artık yazdıkların canlı sesli cevapla döner. Ses ile Konuş butonuyla mikrofonu da açabilirsin."
      );
    } catch (error: any) {
      onAssistantMessageRef.current?.(
        "Kanka Canlı Gemini bağlanamadı: " +
          (error?.message || "Bilinmeyen hata")
      );
    }
  }, [close, connect, liveMode]);

  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

  return {
    liveMode,
    liveStatus,
    isMicOn,
    connect,
    close,
    toggleLiveMode,
    startMic,
    stopMic,
    sendText,
    clearPlayback,
  };
}
