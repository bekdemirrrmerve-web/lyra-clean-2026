"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: number;
  role: "lyra" | "user";
  text: string;
  time: string;
};

const messages: ChatMessage[] = [
  {
    id: 1,
    role: "lyra",
    text: "Seni görmek çok güzel. Bugün nasılsın?",
    time: "00:12",
  },
  {
    id: 2,
    role: "user",
    text: "Biraz yoruldum ama seninle konuşunca daha iyi hissettim.",
    time: "00:18",
  },
];

export default function LiveTalkPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setConnected(true), 500);

    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Mobil tarayıcılarda autoplay engellenirse sessizce geç.
      });
    }

    return () => clearTimeout(timer);
  }, []);

  function endCall() {
    window.location.href = "/";
  }

  return (
    <main className="livePage">
      <section className="phoneFrame">
        <div className="statusBar">
          <span>9:41</span>
          <div className="statusIcons">
            <span className="signal">▮▮▮</span>
            <span>⌁</span>
            <span className="battery"></span>
          </div>
        </div>

        <header className="topArea">
          <button
            className="topIcon"
            aria-label="Geri dön"
            onClick={() => window.history.back()}
          >
            <span>⌄</span>
          </button>

          <div className="titleBlock">
            <h1>Live Talk</h1>
            <div className="connection">
              <span className={connected ? "dot active" : "dot"}></span>
              <span>{connected ? "Connected" : "Connecting..."}</span>
              <span className="audioBars">
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </span>
            </div>
          </div>

          <button className="topIcon sparkle" aria-label="Efektler">
            ✨
          </button>
        </header>

        <div className="videoStage">
          <div className="roomGlow one"></div>
          <div className="roomGlow two"></div>

          <video
            ref={videoRef}
            className="avatarVideo"
            src="/lyra-avatar-mp4.mp4"
            autoPlay
            muted
            loop
            playsInline
            poster="/lyra-avatar.jpg.jpeg"
          />

          <div className="avatarFallback">
            <div className="avatarHead">
              <div className="hair"></div>
              <div className="face">
                <span className="eye left"></span>
                <span className="eye right"></span>
                <span className="smile"></span>
              </div>
            </div>
            <div className="avatarBody"></div>
          </div>

          {showChat && (
            <div className="floatingMessages">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={
                    message.role === "lyra" ? "bubble lyra" : "bubble user"
                  }
                >
                  {message.role === "lyra" && (
                    <div className="typingDots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  )}

                  <time>{message.time}</time>
                  <p>{message.text}</p>

                  {message.role === "user" && <small>✓✓</small>}
                </article>
              ))}
            </div>
          )}
        </div>

        <nav className="controlDock">
          <button
            className={muted ? "control activeControl" : "control"}
            onClick={() => setMuted((v) => !v)}
          >
            <span className="circleIcon">🎙️</span>
            <b>{muted ? "Muted" : "Mute"}</b>
          </button>

          <button
            className={speaker ? "control activeControl" : "control"}
            onClick={() => setSpeaker((v) => !v)}
          >
            <span className="circleIcon">🔊</span>
            <b>Speaker</b>
          </button>

          <button
            className={showChat ? "control activeControl" : "control"}
            onClick={() => setShowChat((v) => !v)}
          >
            <span className="circleIcon">💬</span>
            <b>Chat</b>
          </button>

          <button className="control end" onClick={endCall}>
            <span className="circleIcon">☎</span>
            <b>End</b>
          </button>
        </nav>

        <div className="homeIndicator"></div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .livePage {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background:
            radial-gradient(circle at top left, rgba(255, 255, 255, 0.95), transparent 34%),
            linear-gradient(135deg, #f7eee4 0%, #e9d7c7 45%, #d9c0ae 100%);
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          color: #2f2925;
        }

        .phoneFrame {
          position: relative;
          width: min(100%, 430px);
          height: min(94vh, 880px);
          overflow: hidden;
          border-radius: 44px;
          background:
            linear-gradient(180deg, rgba(255, 246, 235, 0.96), rgba(226, 201, 181, 0.9)),
            #f2decb;
          box-shadow:
            0 35px 90px rgba(86, 56, 35, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          isolation: isolate;
        }

        .phoneFrame::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 28%, rgba(255, 255, 255, 0.72), transparent 24%),
            radial-gradient(circle at 82% 30%, rgba(255, 240, 214, 0.55), transparent 23%),
            linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent 22%, transparent 78%, rgba(255, 255, 255, 0.24));
          pointer-events: none;
          z-index: 1;
        }

        .statusBar {
          position: absolute;
          top: 18px;
          left: 0;
          width: 100%;
          z-index: 8;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 34px;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .statusIcons {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
        }

        .signal {
          font-size: 13px;
          letter-spacing: -3px;
          transform: translateY(1px);
        }

        .battery {
          width: 25px;
          height: 13px;
          border: 2px solid #211b18;
          border-radius: 4px;
          position: relative;
          display: inline-block;
        }

        .battery::after {
          content: "";
          position: absolute;
          right: -5px;
          top: 3px;
          width: 3px;
          height: 5px;
          border-radius: 0 2px 2px 0;
          background: #211b18;
        }

        .battery::before {
          content: "";
          position: absolute;
          left: 2px;
          top: 2px;
          width: 16px;
          height: 5px;
          border-radius: 2px;
          background: #211b18;
        }

        .topArea {
          position: absolute;
          top: 62px;
          left: 0;
          width: 100%;
          z-index: 8;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 0 26px;
        }

        .topIcon {
          width: 54px;
          height: 54px;
          border: 0;
          border-radius: 20px;
          background: rgba(255, 250, 242, 0.74);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.78),
            0 14px 35px rgba(116, 82, 56, 0.13);
          color: #756557;
          display: grid;
          place-items: center;
          font-size: 31px;
          cursor: pointer;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          transition: 0.2s ease;
        }

        .topIcon:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.86);
        }

        .sparkle {
          font-size: 22px;
          color: #bd9460;
        }

        .titleBlock {
          text-align: center;
          padding-top: 3px;
        }

        .titleBlock h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1;
          letter-spacing: -0.05em;
          font-weight: 800;
        }

        .connection {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 10px;
          color: rgba(47, 41, 37, 0.72);
          font-size: 15px;
          font-weight: 650;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #bbb0a3;
        }

        .dot.active {
          background: #35c46d;
          box-shadow: 0 0 0 5px rgba(53, 196, 109, 0.12);
        }

        .audioBars {
          display: inline-flex;
          align-items: end;
          gap: 3px;
          height: 17px;
          margin-left: 2px;
        }

        .audioBars i {
          width: 3px;
          border-radius: 4px;
          background: #36c36d;
          animation: audioWave 0.8s infinite ease-in-out;
        }

        .audioBars i:nth-child(1) {
          height: 7px;
          animation-delay: 0s;
        }

        .audioBars i:nth-child(2) {
          height: 13px;
          animation-delay: 0.1s;
        }

        .audioBars i:nth-child(3) {
          height: 9px;
          animation-delay: 0.2s;
        }

        .audioBars i:nth-child(4) {
          height: 16px;
          animation-delay: 0.3s;
        }

        @keyframes audioWave {
          0%,
          100% {
            transform: scaleY(0.7);
            opacity: 0.55;
          }

          50% {
            transform: scaleY(1.2);
            opacity: 1;
          }
        }

        .videoStage {
          position: absolute;
          inset: 0;
          z-index: 2;
          overflow: hidden;
          background:
            radial-gradient(circle at 18% 46%, rgba(255, 255, 255, 0.65), transparent 25%),
            radial-gradient(circle at 80% 54%, rgba(255, 228, 190, 0.6), transparent 22%),
            linear-gradient(180deg, #f4e5d4 0%, #ead2bd 100%);
        }

        .videoStage::before {
          content: "";
          position: absolute;
          left: -42px;
          top: 145px;
          width: 128px;
          height: 270px;
          border-radius: 100px;
          background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.08)),
            linear-gradient(#eee0cc, #fff4e4);
          box-shadow: inset -12px 0 30px rgba(210, 180, 142, 0.2);
          filter: blur(0.1px);
          opacity: 0.86;
        }

        .videoStage::after {
          content: "";
          position: absolute;
          right: 23px;
          top: 265px;
          width: 105px;
          height: 118px;
          border-radius: 24px;
          background:
            radial-gradient(circle at 72% 38%, rgba(255, 238, 196, 0.95) 0 17px, transparent 18px),
            linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.12));
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.35),
            0 30px 55px rgba(136, 96, 57, 0.09);
          opacity: 0.72;
          filter: blur(0.2px);
        }

        .roomGlow {
          position: absolute;
          border-radius: 999px;
          filter: blur(30px);
          opacity: 0.6;
          pointer-events: none;
        }

        .roomGlow.one {
          width: 210px;
          height: 210px;
          background: rgba(255, 255, 255, 0.82);
          left: -66px;
          top: 160px;
        }

        .roomGlow.two {
          width: 180px;
          height: 180px;
          background: rgba(255, 224, 184, 0.85);
          right: -30px;
          top: 345px;
        }

        .avatarVideo {
          position: absolute;
          z-index: 3;
          left: 50%;
          bottom: 106px;
          width: 118%;
          max-width: 570px;
          height: auto;
          transform: translateX(-50%);
          object-fit: cover;
          object-position: center bottom;
          filter: drop-shadow(0 30px 45px rgba(78, 47, 29, 0.13));
          animation: avatarFloat 5s ease-in-out infinite;
        }

        .avatarVideo:not([src]),
        .avatarVideo[src=""] {
          display: none;
        }

        .avatarFallback {
          position: absolute;
          z-index: 2;
          left: 50%;
          bottom: 138px;
          width: 260px;
          height: 470px;
          transform: translateX(-50%);
          animation: avatarFloat 5s ease-in-out infinite;
        }

        .avatarHead {
          position: absolute;
          top: 0;
          left: 50%;
          width: 185px;
          height: 205px;
          transform: translateX(-50%);
          border-radius: 48% 52% 45% 45%;
          background: #f1bb92;
          box-shadow:
            inset 0 -15px 30px rgba(167, 89, 45, 0.12),
            0 15px 35px rgba(101, 62, 37, 0.08);
        }

        .hair {
          position: absolute;
          inset: -22px -22px 40px -20px;
          border-radius: 48% 52% 45% 50%;
          background:
            radial-gradient(circle at 38% 18%, #fff0ca 0 16px, transparent 17px),
            linear-gradient(135deg, #d89c4d, #f5d493 45%, #bf7a39);
          z-index: 0;
        }

        .face {
          position: absolute;
          inset: 30px 26px 18px;
          z-index: 2;
          border-radius: 45%;
          background: #f6c6a1;
        }

        .eye {
          position: absolute;
          top: 72px;
          width: 13px;
          height: 9px;
          border-radius: 50%;
          background: #5b3c2d;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.2);
          animation: blink 4.7s infinite;
        }

        .eye.left {
          left: 36px;
        }

        .eye.right {
          right: 36px;
        }

        .smile {
          position: absolute;
          left: 50%;
          top: 118px;
          width: 42px;
          height: 18px;
          border-bottom: 3px solid rgba(118, 63, 47, 0.78);
          border-radius: 0 0 40px 40px;
          transform: translateX(-50%);
        }

        .avatarBody {
          position: absolute;
          left: 50%;
          top: 185px;
          width: 215px;
          height: 285px;
          transform: translateX(-50%);
          border-radius: 54px 54px 26px 26px;
          background:
            linear-gradient(180deg, #191817, #111),
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.12), transparent 30%);
          box-shadow: 0 20px 40px rgba(41, 27, 21, 0.18);
        }

        @keyframes avatarFloat {
          0%,
          100% {
            transform: translateX(-50%) translateY(0) scale(1);
          }

          50% {
            transform: translateX(-50%) translateY(-7px) scale(1.008);
          }
        }

        @keyframes blink {
          0%,
          92%,
          100% {
            transform: scaleY(1);
          }

          95% {
            transform: scaleY(0.12);
          }
        }

        .floatingMessages {
          position: absolute;
          z-index: 7;
          left: 26px;
          right: 26px;
          bottom: 162px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          pointer-events: none;
        }

        .bubble {
          position: relative;
          width: fit-content;
          max-width: 78%;
          min-width: 210px;
          padding: 24px 19px 16px;
          border-radius: 22px;
          background: rgba(255, 251, 244, 0.82);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          box-shadow:
            0 14px 34px rgba(80, 52, 34, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.52);
          color: #2e2926;
          animation: bubbleIn 0.38s ease both;
        }

        .bubble.user {
          margin-top: 2px;
          padding-top: 17px;
          border-radius: 21px;
          background: rgba(253, 246, 238, 0.78);
        }

        .bubble time {
          position: absolute;
          top: 10px;
          right: 14px;
          font-size: 12px;
          color: rgba(47, 41, 37, 0.56);
          font-weight: 700;
        }

        .bubble p {
          margin: 0;
          font-size: 17px;
          line-height: 1.34;
          letter-spacing: -0.02em;
          font-weight: 650;
        }

        .bubble small {
          position: absolute;
          right: 14px;
          bottom: 8px;
          font-size: 12px;
          color: rgba(47, 41, 37, 0.5);
        }

        .typingDots {
          position: absolute;
          left: 17px;
          top: 12px;
          display: flex;
          gap: 6px;
        }

        .typingDots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(123, 105, 89, 0.45);
        }

        @keyframes bubbleIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .controlDock {
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 44px;
          z-index: 9;
          min-height: 118px;
          border-radius: 34px;
          background: rgba(245, 232, 218, 0.7);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          align-items: center;
          gap: 6px;
          padding: 13px 11px 12px;
          box-shadow:
            0 23px 55px rgba(82, 54, 37, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.82),
            inset 0 0 0 1px rgba(255, 255, 255, 0.35);
        }

        .control {
          border: 0;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
          color: #5e554f;
          cursor: pointer;
          transition: 0.2s ease;
          padding: 0;
        }

        .control:hover {
          transform: translateY(-2px);
        }

        .circleIcon {
          width: 61px;
          height: 61px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(255, 251, 244, 0.86);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 8px 20px rgba(93, 63, 44, 0.1);
          font-size: 24px;
        }

        .control b {
          font-size: 13px;
          line-height: 1;
          font-weight: 760;
          letter-spacing: -0.02em;
        }

        .activeControl .circleIcon {
          background: rgba(255, 255, 255, 0.98);
        }

        .end .circleIcon {
          background: linear-gradient(135deg, #ff8174, #f1645f);
          color: white;
          font-size: 28px;
          box-shadow:
            0 13px 26px rgba(238, 88, 79, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.36);
        }

        .end b {
          color: #443833;
        }

        .homeIndicator {
          position: absolute;
          left: 50%;
          bottom: 12px;
          z-index: 10;
          width: 132px;
          height: 5px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          transform: translateX(-50%);
        }

        @media (max-width: 460px) {
          .livePage {
            padding: 0;
          }

          .phoneFrame {
            width: 100%;
            height: 100vh;
            border-radius: 0;
          }

          .topArea {
            padding: 0 20px;
          }

          .topIcon {
            width: 50px;
            height: 50px;
            border-radius: 18px;
          }

          .titleBlock h1 {
            font-size: 28px;
          }

          .floatingMessages {
            left: 22px;
            right: 22px;
            bottom: 154px;
          }

          .bubble {
            max-width: 86%;
            min-width: 205px;
          }

          .controlDock {
            left: 16px;
            right: 16px;
            bottom: 38px;
          }

          .circleIcon {
            width: 57px;
            height: 57px;
          }
        }
      `}</style>
    </main>
  );
}
