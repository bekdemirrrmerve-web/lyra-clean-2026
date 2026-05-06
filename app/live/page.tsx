"use client";

export default function LiveGeminiPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#111116",
        color: "white",
        display: "grid",
        placeItems: "center",
        fontFamily: "Arial, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 700,
          width: "100%",
          padding: 28,
          borderRadius: 28,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Canlı Gemini Test</h1>
        <p>
          Bu sayfa şu an güvenli test modunda. Build düzelince gerçek canlı
          konuşma kodunu tekrar ekleyeceğiz.
        </p>

        <a
          href="/"
          style={{
            display: "inline-block",
            marginTop: 18,
            padding: "12px 18px",
            borderRadius: 999,
            background: "linear-gradient(90deg, #ddb8ff, #ffb2b9)",
            color: "#210033",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          Ana Lyra’ya dön
        </a>
      </div>
    </main>
  );
}
