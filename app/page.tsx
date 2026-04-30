"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Message = {
  role: "user" | "lyra";
  text: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  onresult: ((event: any) => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

function Lyra3DAvatar({
  isSpeaking,
  mouthOpen,
  cameraMode,
}: {
  isSpeaking: boolean;
  mouthOpen: boolean;
  cameraMode: "full" | "close";
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const headRef = useRef<THREE.Group | null>(null);
  const mouthRef = useRef<THREE.Mesh | null>(null);
  const auraRef = useRef<THREE.Mesh | null>(null);
  const { camera } = useThree();

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.6) * 0.035;
      groupRef.current.rotation.y = Math.sin(t * 0.55) * 0.08;
    }

    if (headRef.current) {
      headRef.current.rotation.x = Math.sin(t * 1.4) * 0.035;
      headRef.current.rotation.y = Math.sin(t * 0.9) * 0.055;
    }

    if (mouthRef.current) {
      const talkingScale = isSpeaking
        ? 0.5 + Math.abs(Math.sin(t * 18)) * 1.3
        : 0.45;

      mouthRef.current.scale.y = mouthOpen || isSpeaking ? talkingScale : 0.35;
      mouthRef.current.scale.x = mouthOpen || isSpeaking ? 1.05 : 0.85;
    }

    if (auraRef.current) {
      const pulse = isSpeaking ? 1 + Math.sin(t * 5) * 0.035 : 1;
      auraRef.current.scale.setScalar(pulse);
    }

    const targetPosition =
      cameraMode === "close"
        ? new THREE.Vector3(0, 1.62, 3.25)
        : new THREE.Vector3(0, 1.18, 5.7);

    camera.position.lerp(targetPosition, 0.045);
    camera.lookAt(0, 1.28, 0);
  });

  return (
    <group ref={groupRef} position={[0, -1.05, 0]}>
      <mesh ref={auraRef} position={[0, 1.55, -0.25]}>
        <sphereGeometry args={[1.7, 48, 48]} />
        <meshBasicMaterial color="#f4c56d" transparent opacity={0.12} />
      </mesh>

      <group position={[0, 0.04, 0]}>
        <mesh position={[-0.23, 0.25, 0]}>
          <cylinderGeometry args={[0.075, 0.095, 0.72, 24]} />
          <meshStandardMaterial color="#b9805c" roughness={0.55} />
        </mesh>
        <mesh position={[0.23, 0.25, 0]}>
          <cylinderGeometry args={[0.075, 0.095, 0.72, 24]} />
          <meshStandardMaterial color="#b9805c" roughness={0.55} />
        </mesh>

        <mesh position={[-0.23, -0.15, 0.04]} scale={[1.25, 0.35, 0.75]}>
          <sphereGeometry args={[0.11, 24, 16]} />
          <meshStandardMaterial color="#5b3b28" roughness={0.5} />
        </mesh>
        <mesh position={[0.23, -0.15, 0.04]} scale={[1.25, 0.35, 0.75]}>
          <sphereGeometry args={[0.11, 24, 16]} />
          <meshStandardMaterial color="#5b3b28" roughness={0.5} />
        </mesh>
      </group>

      <mesh position={[0, 0.82, 0]} scale={[0.82, 1.05, 0.46]}>
        <sphereGeometry args={[0.48, 48, 32]} />
        <meshStandardMaterial color="#fff2df" roughness={0.38} metalness={0.03} />
      </mesh>

      <mesh position={[0, 0.54, 0]} rotation={[0, 0, 0]} scale={[0.9, 0.9, 0.5]}>
        <cylinderGeometry args={[0.48, 0.7, 0.86, 48]} />
        <meshStandardMaterial color="#f3d996" roughness={0.42} metalness={0.05} />
      </mesh>

      <mesh position={[0, 1.28, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.26, 32]} />
        <meshStandardMaterial color="#e6b38f" roughness={0.45} />
      </mesh>

      <group ref={headRef} position={[0, 1.65, 0]}>
        <mesh position={[0, 0.02, 0]} scale={[0.85, 1.02, 0.78]}>
          <sphereGeometry args={[0.42, 64, 48]} />
          <meshStandardMaterial color="#e9b895" roughness={0.42} />
        </mesh>

        <mesh position={[0, 0.18, -0.06]} scale={[0.98, 1.05, 0.88]}>
          <sphereGeometry args={[0.47, 64, 48]} />
          <meshStandardMaterial color="#8d4328" roughness={0.62} />
        </mesh>

        <mesh position={[-0.36, -0.06, -0.03]} scale={[0.22, 0.64, 0.22]}>
          <sphereGeometry args={[0.45, 32, 24]} />
          <meshStandardMaterial color="#7b3923" roughness={0.66} />
        </mesh>

        <mesh position={[0.36, -0.06, -0.03]} scale={[0.22, 0.64, 0.22]}>
          <sphereGeometry args={[0.45, 32, 24]} />
          <meshStandardMaterial color="#7b3923" roughness={0.66} />
        </mesh>

        <mesh position={[-0.14, 0.05, 0.35]} scale={[1, 1, 0.55]}>
          <sphereGeometry args={[0.035, 24, 16]} />
          <meshStandardMaterial color="#2d241d" />
        </mesh>

        <mesh position={[0.14, 0.05, 0.35]} scale={[1, 1, 0.55]}>
          <sphereGeometry args={[0.035, 24, 16]} />
          <meshStandardMaterial color="#2d241d" />
        </mesh>

        <mesh position={[0, -0.05, 0.39]} scale={[0.5, 0.75, 0.24]}>
          <sphereGeometry args={[0.05, 24, 16]} />
          <meshStandardMaterial color="#d99a7d" roughness={0.45} />
        </mesh>

        <mesh ref={mouthRef} position={[0, -0.17, 0.405]} scale={[1, 0.4, 0.18]}>
          <sphereGeometry args={[0.075, 32, 16]} />
          <meshStandardMaterial color="#a9494f" roughness={0.35} />
        </mesh>

        <mesh position={[-0.14, 0.11, 0.38]} rotation={[0.08, 0, 0.12]}>
          <boxGeometry args={[0.16, 0.018, 0.018]} />
          <meshStandardMaterial color="#5a3528" />
        </mesh>

        <mesh position={[0.14, 0.11, 0.38]} rotation={[0.08, 0, -0.12]}>
          <boxGeometry args={[0.16, 0.018, 0.018]} />
          <meshStandardMaterial color="#5a3528" />
        </mesh>
      </group>

      <mesh position={[-0.58, 0.86, 0]} rotation={[0, 0, -0.34]}>
        <cylinderGeometry args={[0.065, 0.085, 0.85, 24]} />
        <meshStandardMaterial color="#e9b895" roughness={0.45} />
      </mesh>

      <mesh position={[0.58, 0.86, 0]} rotation={[0, 0, 0.34]}>
        <cylinderGeometry args={[0.065, 0.085, 0.85, 24]} />
        <meshStandardMaterial color="#e9b895" roughness={0.45} />
      </mesh>

      <mesh position={[-0.75, 0.44, 0.02]} scale={[1.1, 0.8, 0.8]}>
        <sphereGeometry args={[0.08, 24, 16]} />
        <meshStandardMaterial color="#e9b895" roughness={0.45} />
      </mesh>

      <mesh position={[0.75, 0.44, 0.02]} scale={[1.1, 0.8, 0.8]}>
        <sphereGeometry args={[0.08, 24, 16]} />
        <meshStandardMaterial color="#e9b895" roughness={0.45} />
      </mesh>
    </group>
  );
}

function LyraScene({
  isSpeaking,
  mouthOpen,
  cameraMode,
}: {
  isSpeaking: boolean;
  mouthOpen: boolean;
  cameraMode: "full" | "close";
}) {
  return (
    <Canvas camera={{ position: [0, 1.18, 5.7], fov: 35 }}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 4, 3]} intensity={2.2} />
      <pointLight position={[-2, 2.6, 2]} intensity={1.1} color="#fff2c8" />
      <pointLight position={[2.4, 1.8, 1.2]} intensity={0.7} color="#dff5ca" />
      <Lyra3DAvatar
        isSpeaking={isSpeaking}
        mouthOpen={mouthOpen}
        cameraMode={cameraMode}
      />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2.7}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}

export default function LyraPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "lyra",
      text: "Ben buradayım Merve. Artık fotoğraf değil, 3D avatar modundayım.",
    },
  ]);

  const [input, setInput] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<"full" | "close">("full");
  const [error, setError] = useState("");

  const mouthTimeoutRef = useRef<number | null>(null);
  const lipLoopRef = useRef<number | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    const savedVoice = localStorage.getItem("lyra_voice");
    if (savedVoice) setSelectedVoiceURI(savedVoice);

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      stopLipLoop();
    };
  }, []);

  useEffect(() => {
    if (selectedVoiceURI) {
      localStorage.setItem("lyra_voice", selectedVoiceURI);
    }
  }, [selectedVoiceURI]);

  const bestVoice = useMemo(() => {
    if (!voices.length) return null;

    const selected = voices.find((voice) => voice.voiceURI === selectedVoiceURI);
    if (selected) return selected;

    const hints = [
      "tr",
      "turkish",
      "türkçe",
      "female",
      "woman",
      "zira",
      "seda",
      "google",
      "microsoft",
      "enhanced",
    ];

    return (
      voices.find(
        (voice) =>
          voice.lang.toLowerCase().startsWith("tr") &&
          hints.some((hint) =>
            `${voice.name} ${voice.lang}`.toLowerCase().includes(hint)
          )
      ) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("tr")) ||
      voices.find((voice) =>
        hints.some((hint) =>
          `${voice.name} ${voice.lang}`.toLowerCase().includes(hint)
        )
      ) ||
      voices[0]
    );
  }, [voices, selectedVoiceURI]);

  function pulseMouth(duration = 110) {
    setMouthOpen(true);

    if (mouthTimeoutRef.current) {
      window.clearTimeout(mouthTimeoutRef.current);
    }

    mouthTimeoutRef.current = window.setTimeout(() => {
      setMouthOpen(false);
    }, duration);
  }

  function startLipLoop() {
    stopLipLoop();

    lipLoopRef.current = window.setInterval(() => {
      pulseMouth(105);
    }, 155);
  }

  function stopLipLoop() {
    if (lipLoopRef.current) {
      window.clearInterval(lipLoopRef.current);
      lipLoopRef.current = null;
    }

    if (mouthTimeoutRef.current) {
      window.clearTimeout(mouthTimeoutRef.current);
      mouthTimeoutRef.current = null;
    }

    setMouthOpen(false);
  }

  function speak(text: string) {
    setError("");

    if (!("speechSynthesis" in window)) {
      setError("Bu tarayıcı sesli konuşmayı desteklemiyor.");
      return;
    }

    window.speechSynthesis.cancel();
    stopLipLoop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = bestVoice;
    utterance.lang = bestVoice?.lang || "tr-TR";
    utterance.rate = 0.94;
    utterance.pitch = 1.08;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCameraMode("close");
      startLipLoop();
    };

    utterance.onboundary = () => {
      pulseMouth(110);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCameraMode("full");
      stopLipLoop();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCameraMode("full");
      stopLipLoop();
      setError("Ses başlamadıysa ekrana bir kez tıklayıp tekrar dene kankam.");
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setCameraMode("full");
    stopLipLoop();
  }

  async function sendMessage(forcedText?: string) {
    const text = (forcedText || input).trim();
    if (!text) return;

    setInput("");
    setError("");

    const userMessage: Message = { role: "user", text };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);

    let reply =
      "Seni duydum kankam. Artık 3D avatar modundayım; konuşurken yüzüm ve kameram hareket ediyor.";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (response.ok) {
        const data = await response.json();
        reply =
          data.reply ||
          data.text ||
          data.message ||
          data.content ||
          reply;
      }
    } catch {
      reply =
        "Şu an sunucu tarafı cevap vermedi ama 3D avatarım ve ücretsiz ses sistemim çalışıyor.";
    }

    const lyraMessage: Message = { role: "lyra", text: reply };

    setMessages((prev) => [...prev, lyraMessage]);
    speak(reply);
  }

  function startListening() {
    setError("");
    stopSpeaking();

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setError("Ses tanıma bu tarayıcıda yok. Chrome veya Edge ile dene.");
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;

    recognition.lang = "tr-TR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onerror = () => {
      setIsListening(false);
      setError("Mikrofon çalışmadı. Tarayıcı mikrofon iznini kontrol et.");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setInput(transcript);
      sendMessage(transcript);
    };

    recognition.start();
  }

  return (
    <main className="lyraPage">
      <div className="glow glowOne" />
      <div className="glow glowTwo" />
      <div className="sparkle sparkleOne">✦</div>
      <div className="sparkle sparkleTwo">❧</div>
      <div className="sparkle sparkleThree">✧</div>

      <header className="topbar">
        <div>
          <p className="eyebrow">LYRA 3D MODE</p>
          <h1>Lyra</h1>
          <p className="subtitle">
            3D avatarlı, sesle hareket eden, beyaz mistik asistan.
          </p>
        </div>

        <div className="status">
          <span className={isSpeaking || isListening ? "dot active" : "dot"} />
          {isSpeaking ? "Konuşuyor" : isListening ? "Dinliyor" : "Hazır"}
        </div>
      </header>

      <section className="layout">
        <aside className="avatarPanel">
          <div className="avatarStage3D">
            <LyraScene
              isSpeaking={isSpeaking}
              mouthOpen={mouthOpen}
              cameraMode={cameraMode}
            />

            <div className={isSpeaking ? "voiceBars active" : "voiceBars"}>
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="avatarText">
            <p className="eyebrow">GERÇEK 3D SAHNE</p>
            <h2>Fotoğraf değil, hareketli 3D Lyra.</h2>
            <p>
              Konuşurken kamera yaklaşır, ağız hareket eder, avatar nefes alır
              gibi canlı durur. Bu ücretsiz 3D temel sürüm.
            </p>
          </div>

          <div className="cameraButtons">
            <button onClick={() => setCameraMode("full")}>Boydan göster</button>
            <button onClick={() => setCameraMode("close")}>Yakın göster</button>
            <button onClick={() => speak("Ben buradayım Merve. Artık üç boyutlu Lyra modundayım.")}>
              3D sesi dene
            </button>
          </div>
        </aside>

        <section className="chatPanel">
          <div className="chatHeader">
            <div>
              <p className="eyebrow">SOHBET</p>
              <h2>Lyra ile konuş</h2>
            </div>

            <button
              className="ghostButton"
              onClick={() =>
                speak(
                  "Ben buradayım Merve. Konuşurken kamera yaklaşır, ağzım hareket eder ve üç boyutlu görünürüm."
                )
              }
            >
              Sesi dene
            </button>
          </div>

          <div className="messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "lyra"
                    ? "message lyraMessage"
                    : "message userMessage"
                }
              >
                <strong>{message.role === "lyra" ? "Lyra" : "Sen"}</strong>
                <p>{message.text}</p>
              </div>
            ))}
          </div>

          {error && <div className="error">{error}</div>}

          <div className="inputArea">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendMessage();
              }}
              placeholder="Lyra’ya yaz veya seslen..."
            />

            <button onClick={() => sendMessage()} className="sendButton">
              Gönder
            </button>

            <button onClick={startListening} className="micButton">
              {isListening ? "Dinliyorum" : "Seslen"}
            </button>
          </div>

          <div className="settings">
            <label>
              Ses seç
              <select
                value={selectedVoiceURI}
                onChange={(event) => setSelectedVoiceURI(event.target.value)}
              >
                <option value="">Otomatik en iyi ses</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} / {voice.lang}
                  </option>
                ))}
              </select>
            </label>

            <button onClick={stopSpeaking} className="stopButton">
              Sesi durdur
            </button>
          </div>
        </section>
      </section>

      <section className="dock">
        <div>PDF Özet</div>
        <div>Araştırma</div>
        <div>Kimya Lab</div>
        <div>Astroloji</div>
        <div>Not Defteri</div>
        <div>Görsel</div>
      </section>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background: #fffaf1;
          color: #2f261d;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          border: 0;
          cursor: pointer;
        }

        .lyraPage {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          padding: 28px;
          background:
            radial-gradient(circle at 12% 10%, rgba(255, 219, 151, 0.88), transparent 28%),
            radial-gradient(circle at 92% 12%, rgba(195, 228, 180, 0.7), transparent 26%),
            linear-gradient(135deg, #fffdf8 0%, #fff5df 46%, #f7fff0 100%);
        }

        .glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(18px);
          pointer-events: none;
        }

        .glowOne {
          width: 330px;
          height: 330px;
          left: -90px;
          bottom: -90px;
          background: rgba(255, 198, 90, 0.38);
        }

        .glowTwo {
          width: 260px;
          height: 260px;
          right: -60px;
          top: 160px;
          background: rgba(174, 220, 162, 0.44);
        }

        .sparkle {
          position: absolute;
          color: rgba(110, 139, 80, 0.42);
          font-size: 34px;
          pointer-events: none;
        }

        .sparkleOne {
          left: 7%;
          top: 25%;
        }

        .sparkleTwo {
          right: 7%;
          bottom: 22%;
        }

        .sparkleThree {
          right: 22%;
          top: 8%;
        }

        .topbar {
          position: relative;
          z-index: 2;
          max-width: 1180px;
          margin: 0 auto 24px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .eyebrow {
          margin: 0 0 7px;
          color: #9a743a;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        h1,
        h2,
        p {
          margin-top: 0;
        }

        h1 {
          margin-bottom: 8px;
          font-size: clamp(50px, 9vw, 96px);
          line-height: 0.9;
          letter-spacing: -0.08em;
          color: #2e2419;
        }

        .subtitle {
          margin: 0;
          color: #765e3e;
          font-weight: 600;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border: 1px solid rgba(165, 125, 62, 0.2);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(18px);
          box-shadow: 0 14px 40px rgba(88, 59, 24, 0.08);
          color: #6f532a;
          font-weight: 800;
          white-space: nowrap;
        }

        .dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #c7b28a;
        }

        .dot.active {
          background: #d99d2c;
          box-shadow: 0 0 0 8px rgba(217, 157, 44, 0.16);
        }

        .layout {
          position: relative;
          z-index: 2;
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 0.92fr 1.08fr;
          gap: 22px;
        }

        .avatarPanel,
        .chatPanel {
          border: 1px solid rgba(156, 119, 63, 0.18);
          border-radius: 34px;
          background: rgba(255, 255, 255, 0.58);
          backdrop-filter: blur(24px);
          box-shadow: 0 28px 90px rgba(93, 67, 29, 0.13);
        }

        .avatarPanel {
          padding: 22px;
        }

        .avatarStage3D {
          position: relative;
          height: 560px;
          overflow: hidden;
          border-radius: 32px;
          background:
            radial-gradient(circle at center, rgba(255, 232, 178, 0.95), transparent 36%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.82), rgba(248, 255, 239, 0.76));
        }

        .avatarText {
          padding: 20px 4px 8px;
        }

        .avatarText h2 {
          margin-bottom: 8px;
          font-size: 26px;
          letter-spacing: -0.04em;
        }

        .avatarText p {
          margin-bottom: 0;
          color: #765f3e;
          line-height: 1.58;
        }

        .cameraButtons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 14px;
        }

        .cameraButtons button,
        .ghostButton,
        .stopButton {
          min-height: 44px;
          padding: 0 15px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.76);
          color: #67491f;
          font-weight: 900;
          box-shadow: 0 12px 28px rgba(87, 61, 25, 0.08);
        }

        .chatPanel {
          min-height: 720px;
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .chatHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }

        .chatHeader h2 {
          margin-bottom: 0;
          font-size: 36px;
          letter-spacing: -0.05em;
        }

        .messages {
          flex: 1;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 13px;
          padding: 16px;
          border-radius: 24px;
          background: rgba(255, 250, 240, 0.62);
        }

        .message {
          max-width: 88%;
          padding: 14px 16px;
          border-radius: 22px;
          box-shadow: 0 12px 30px rgba(68, 44, 15, 0.07);
        }

        .message strong {
          display: block;
          margin-bottom: 5px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .message p {
          margin: 0;
          line-height: 1.55;
        }

        .lyraMessage {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.9);
          color: #4a3925;
        }

        .lyraMessage strong {
          color: #a87926;
        }

        .userMessage {
          align-self: flex-end;
          background: linear-gradient(135deg, #e8c36b, #fff0b6);
          color: #332516;
        }

        .userMessage strong {
          color: #70501f;
        }

        .error {
          margin-top: 12px;
          padding: 12px 14px;
          border-radius: 18px;
          background: rgba(255, 226, 217, 0.86);
          color: #8c3c2f;
          font-weight: 800;
        }

        .inputArea {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 10px;
          margin-top: 14px;
        }

        .inputArea input {
          width: 100%;
          min-height: 54px;
          border: 1px solid rgba(156, 119, 63, 0.18);
          outline: none;
          border-radius: 18px;
          padding: 0 16px;
          background: rgba(255, 255, 255, 0.78);
          color: #332619;
        }

        .sendButton,
        .micButton {
          min-height: 54px;
          padding: 0 18px;
          border-radius: 18px;
          background: linear-gradient(135deg, #e7b75e, #fff1bf);
          color: #332413;
          font-weight: 950;
          box-shadow: 0 12px 32px rgba(87, 61, 25, 0.08);
        }

        .micButton {
          background: linear-gradient(135deg, #d8eecb, #fffef3);
        }

        .settings {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          margin-top: 14px;
          align-items: end;
        }

        .settings label {
          display: grid;
          gap: 8px;
          padding: 12px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.57);
          color: #70542f;
          font-size: 13px;
          font-weight: 900;
        }

        .settings select {
          width: 100%;
          min-height: 42px;
          border: 1px solid rgba(156, 119, 63, 0.22);
          border-radius: 14px;
          padding: 0 10px;
          background: #fffdf8;
          color: #4e3921;
        }

        .voiceBars {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: end;
          gap: 5px;
          z-index: 5;
          opacity: 0;
          transition: opacity 0.25s ease;
          pointer-events: none;
        }

        .voiceBars.active {
          opacity: 1;
        }

        .voiceBars span {
          width: 6px;
          height: 16px;
          border-radius: 999px;
          background: linear-gradient(180deg, #e2b35a, #fff1bf);
          animation: bars 0.9s infinite ease-in-out;
        }

        .voiceBars span:nth-child(2) {
          animation-delay: 0.1s;
        }

        .voiceBars span:nth-child(3) {
          animation-delay: 0.2s;
        }

        .voiceBars span:nth-child(4) {
          animation-delay: 0.3s;
        }

        .voiceBars span:nth-child(5) {
          animation-delay: 0.4s;
        }

        .dock {
          position: relative;
          z-index: 2;
          max-width: 1180px;
          margin: 22px auto 0;
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }

        .dock div {
          min-height: 72px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(156, 119, 63, 0.18);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.58);
          backdrop-filter: blur(18px);
          box-shadow: 0 20px 50px rgba(84, 58, 21, 0.08);
          color: #644927;
          font-weight: 950;
        }

        @keyframes bars {
          0%,
          100% {
            height: 12px;
          }

          50% {
            height: 34px;
          }
        }

        @media (max-width: 920px) {
          .lyraPage {
            padding: 18px;
          }

          .topbar {
            flex-direction: column;
          }

          .layout {
            grid-template-columns: 1fr;
          }

          .avatarStage3D {
            height: 430px;
          }

          .chatPanel {
            min-height: 650px;
          }

          .dock {
            grid-template-columns: repeat(2, 1fr);
          }

          .cameraButtons {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .avatarPanel,
          .chatPanel {
            border-radius: 28px;
            padding: 18px;
          }

          .inputArea {
            grid-template-columns: 1fr;
          }

          .settings {
            grid-template-columns: 1fr;
          }

          .dock {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
