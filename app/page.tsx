"use client";

import { useMemo, useState } from "react";

type Mode = "analysis" | "formula";

export default function Home() {
  const [mode, setMode] = useState<Mode>("analysis");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAllTrends, setShowAllTrends] = useState(false);
  const [showFormulaPanel, setShowFormulaPanel] = useState(true);

  const exampleQuestions = useMemo(
    () => [
      "Çıkış suyunda KOİ yüksek ama numune berrak değil. Kit ile ölçüm yaptım, neden olabilir?",
      "Toplam azot ve nitrat sonucu uyumsuz çıkıyor. Nasıl yorumlanır?",
      "Krem formülünde pH neden zamanla yükselir?",
      "Amonyum yüksek, nitrit düşük, nitrat yüksekse proses ne anlatır?",
    ],
    []
  );

  const exampleFormulas = useMemo(
    () => [
      "100 g nemlendirici krem bazı formülü hazırla.",
      "SLES yerine daha nazik temizleyici alternatifleriyle jel formül yaz.",
      "Yağlı cilt için niacinamide içeren serum formülü hazırla.",
      "Panthenol ve allantoin içeren bariyer destekleyici krem formülü yaz.",
    ],
    []
  );

  const trends = [
    {
      name: "Niacinamide",
      desc: "Sebum dengesi, ton eşitsizliği ve bariyer desteği için popüler aktif.",
      detail:
        "Genelde %2-5 aralığında kullanılır. Çok düşük pH sistemlerde stabilite ve tolerans kontrolü gerekir.",
    },
    {
      name: "Panthenol",
      desc: "Yatıştırıcı, nem destekleyici ve bariyer dostu yardımcı aktif.",
      detail:
        "Krem, serum, tonik ve saç bakım formüllerinde kullanılabilir. Hassas cilt ürünlerinde iyi konumlanır.",
    },
    {
      name: "Allantoin",
      desc: "Yatıştırıcı ve cilt konforunu artıran destekleyici hammadde.",
      detail:
        "Genelde düşük oranlarda kullanılır. Çözünürlük ve sıcaklık kontrolü önemlidir.",
    },
    {
      name: "Betaine",
      desc: "Nem desteği ve daha konforlu his için kullanılan yardımcı bileşen.",
      detail:
        "Temizleyici ve bakım ürünlerinde formül hissini yumuşatmak için değerlidir.",
    },
  ];

  const localAnalysisAnswer = (text: string) => {
    const q = text.toLowerCase();

    if (q.includes("koi") || q.includes("koİ") || q.includes("cod")) {
      return `### KOİ yüksek görünüyorsa olası nedenler

KOİ yani Kimyasal Oksijen İhtiyacı, sudaki oksitlenebilir organik yükü gösterir. Çıkış suyu berrak değilse veya kit ile ölçüm yapılıyorsa sonuç birkaç sebeple yüksek çıkabilir.

**Olası nedenler:**
- Numunede askıda katı madde veya bulanıklık varsa kit sonucu olduğundan yüksek etkilenebilir.
- Seyreltme doğru yapılmadıysa sonuç direkt sapar.
- Reaktif, tüp veya pipet kontaminasyonu olabilir.
- Numune iyi homojenize edilmemiş olabilir.
- Arıtma prosesinde organik yük tam parçalanmamış olabilir.
- Çıkış suyu berrak değilse filtrasyon/çöktürme performansı zayıflamış olabilir.

**Ben olsam önce şunları kontrol ederdim:**
1. Aynı numuneyi bir kez süzerek, bir kez süzmeden ölçerdim.
2. Kör numune ve standart kontrol çalışırdım.
3. Seyreltme katsayısını tekrar hesaplardım.
4. Giriş-çıkış KOİ giderim yüzdesine bakardım.
5. Havalandırma, çamur yaşı ve çökelme performansını birlikte değerlendirirdim.

**Yorum:**  
KOİ çıkışta tamamen sıfır olmak zorunda değildir. Ama çıkış standardına göre yüksekse ya ölçüm kaynaklı sapma vardır ya da proses organik yükü yeterince düşüremiyordur.`;
    }

    if (
      q.includes("toplam azot") ||
      q.includes("nitrat") ||
      q.includes("tn") ||
      q.includes("azot")
    ) {
      return `### Toplam azot - nitrat uyumsuzluğu nasıl yorumlanır?

Normal mantıkta **Toplam Azot**, numunedeki farklı azot türlerinin toplamını temsil eder. Bu yüzden nitrat azotu, toplam azottan yüksek görünüyorsa burada teknik bir uyumsuzluk düşünülür.

**Olası nedenler:**
- Nitrat sonucu NO₃ olarak, toplam azot sonucu N olarak raporlanıyor olabilir.
- Seyreltme katsayısı yanlış uygulanmış olabilir.
- Kit aralığı aşılmış olabilir.
- Cihazda yanlış metot seçilmiş olabilir.
- Numune farklı saatlerden veya farklı karışım seviyelerinden alınmış olabilir.
- Reaktif, küvet veya blank kaynaklı hata olabilir.

**Önemli ayrım:**  
Nitrat bazen **NO₃⁻ olarak**, bazen **NO₃-N olarak** verilir. Bu ikisi aynı şey değildir.

Yaklaşık dönüşüm mantığı:
- NO₃-N = NO₃ × 14 / 62
- NO₃ = NO₃-N × 62 / 14

**Benim net yorumum:**  
Toplam azot 160 iken nitrat 548 gibi görünüyorsa önce birim ve raporlama formatı kontrol edilmeli. Büyük ihtimalle biri “azot cinsinden”, diğeri “nitrat iyonu cinsinden” okunuyor olabilir.`;
    }

    if (q.includes("ph") || q.includes("pH".toLowerCase())) {
      return `### pH zamanla neden değişebilir?

Bir formülde veya su numunesinde pH zamanla değişiyorsa bu genelde sistemin hâlâ kimyasal olarak oturmadığını gösterir.

**Olası nedenler:**
- Koruyucu sistem veya aktif madde pH'ı etkiliyor olabilir.
- Emülgatör sistemi zamanla dengeye geliyor olabilir.
- CO₂ kaybı veya hava teması pH'ı değiştirebilir.
- Numunede mikrobiyal aktivite varsa pH değişebilir.
- Tam çözünmeyen hammaddeler zamanla çözünüp pH'ı kaydırabilir.
- pH probu kalibrasyonu hatalı olabilir.

**Kontrol önerisi:**
- pH’ı üretimden hemen sonra, 24 saat sonra ve 7 gün sonra ölç.
- 25°C civarında ölçüm yap.
- Prob kalibrasyonunu pH 4 ve pH 7 tamponlarıyla doğrula.
- Formül kozmetikse hedef pH’ı cilt toleransına göre belirle.

**Ben olsam:**  
Tek ölçüme güvenmezdim. pH stabilitesi için küçük bir takip tablosu yapardım.`;
    }

    return `### Genel analiz yorumu

Bu soruda net yorum yapabilmek için parametreleri birlikte okumak gerekir. Tek bir değere bakıp “kesin sorun bu” demek yanıltıcı olabilir.

**Kontrol edilmesi gerekenler:**
- Numune alma saati ve numunenin temsil gücü
- Seyreltme katsayısı
- Kitin ölçüm aralığı
- Blank/kör numune sonucu
- Cihazda seçilen metot
- Giriş ve çıkış değerlerinin aynı gün/saat karşılaştırması
- Numunenin bulanıklığı, rengi ve askıda katı madde durumu

**Pratik yorum:**  
Eğer sonuç beklenenden çok farklıysa önce ölçüm kaynaklı hataları elemek en doğru adım olur. Ölçüm doğruysa proses tarafında yük artışı, yetersiz havalandırma, çökelme problemi veya biyolojik aktivite zayıflığı düşünülür.`;
  };

  const localFormulaAnswer = (text: string) => {
    const q = text.toLowerCase();

    if (q.includes("temizleyici") || q.includes("sles") || q.includes("jel")) {
      return `### Nazik temizleyici jel örnek formül - 100 g

Bu formül SLES yerine daha yumuşak yüzey aktiflerle hazırlanmış temel bir jel temizleyici mantığıdır.

| Faz | Hammadde | Oran |
|---|---:|---:|
| A | Distile su | %62.00 |
| A | Glycerin | %4.00 |
| A | Disodium EDTA | %0.10 |
| B | Cocamidopropyl Betaine | %10.00 |
| B | Decyl Glucoside | %8.00 |
| B | Sodium Cocoyl Glutamate | %6.00 |
| C | Panthenol | %1.00 |
| C | Allantoin | %0.20 |
| C | Koruyucu | %1.00 |
| C | Kıvam ayarı / tuz veya uygun polimer | %0.50 - %1.20 |
| C | pH ayarı | q.s. |
|  | Toplam | %100 |

**Hedef pH:** 5.2 - 5.8

**Üretim mantığı:**
1. Su fazında glycerin ve EDTA çözündürülür.
2. Yüzey aktifler köpürtmeden yavaşça eklenir.
3. Panthenol ve allantoin uygun sıcaklıkta eklenir.
4. Koruyucu eklenir.
5. pH sitrik asit veya laktik asit ile ayarlanır.
6. Kıvam son aşamada kontrollü yükseltilir.

**Not:**  
Glucoside bazlı sistemlerde pH ayarı sonrası kıvam değişebilir. O yüzden pH’tan önce son kıvam kararını verme kanka.`;
    }

    if (
      q.includes("serum") ||
      q.includes("niacinamide") ||
      q.includes("yağlı")
    ) {
      return `### Yağlı cilt için niacinamide serum örneği - 100 g

| Faz | Hammadde | Oran |
|---|---:|---:|
| A | Distile su | %78.20 |
| A | Glycerin | %3.00 |
| A | Propanediol | %5.00 |
| A | Niacinamide | %4.00 |
| A | Zinc PCA | %0.50 |
| B | Panthenol | %1.00 |
| B | Hyaluronic Acid çözeltisi | %5.00 |
| B | Koruyucu | %1.00 |
| B | Kıvam verici | %0.30 |
| B | pH ayarı | q.s. |
|  | Toplam | %100 |

**Hedef pH:** 5.5 - 6.2

**Formül yorumu:**  
Niacinamide çok asidik sistemleri sevmez. Bu yüzden pH’ı 5’in altına sert düşürmemek daha mantıklı olur.

**Üretim mantığı:**
1. Su, glycerin ve propanediol karıştırılır.
2. Niacinamide tamamen çözündürülür.
3. Zinc PCA eklenir.
4. Kıvam verici ayrı disperse edilip sisteme alınır.
5. Panthenol, HA çözeltisi ve koruyucu eklenir.
6. pH son kontrolde ayarlanır.

**Ben olsam:**  
Bu formülü “parlama karşıtı ama bariyeri bozmayan serum” diye konumlandırırdım. İçerik anlatımı da çok güzel çıkar.`;
    }

    return `### Nemlendirici krem bazı örnek formül - 100 g

| Faz | Hammadde | Oran |
|---|---:|---:|
| A | Distile su | %69.30 |
| A | Glycerin | %4.00 |
| A | Disodium EDTA | %0.10 |
| B | Caprylic/Capric Triglyceride | %7.00 |
| B | Cetearyl Alcohol | %3.00 |
| B | Glyceryl Stearate Citrate | %3.00 |
| B | Shea Butter | %4.00 |
| C | Panthenol | %1.50 |
| C | Allantoin | %0.20 |
| C | Koruyucu | %1.00 |
| C | Parfüm / esans | %0.20 |
| C | pH ayarı | q.s. |
|  | Toplam | %100 |

**Hedef pH:** 5.2 - 5.8

**Üretim adımları:**
1. A fazı ve B fazı ayrı ayrı yaklaşık 70-75°C’ye ısıtılır.
2. B fazı A fazına yavaşça eklenir ve homojenize edilir.
3. Karışım soğurken düşük devirde karıştırmaya devam edilir.
4. 40°C altına düşünce C fazı eklenir.
5. pH ölçülür ve gerekirse ayarlanır.
6. 24 saat sonra viskozite ve pH tekrar kontrol edilir.

**Dikkat:**  
Bu örnek eğitim ve AR-GE başlangıç formülüdür. Piyasaya ürün çıkarmadan önce stabilite, mikrobiyoloji, challenge test ve mevzuat uygunluğu gerekir.`;
  };

  const askGemini = async (text: string, currentMode: Mode) => {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          prompt: text,
          question: text,
          mode: currentMode,
          system:
            currentMode === "formula"
              ? "Sen InciLab kozmetik formülasyon asistanısın. Türkçe, anlaşılır, bilimsel ve uygulanabilir formülasyon cevabı ver."
              : "Sen InciLab kimya, kozmetik ve analiz asistanısın. Türkçe, anlaşılır, bilimsel ve uygulanabilir analiz yorumu ver.",
        }),
      });

      if (!res.ok) return "";

      const data = await res.json();

      return (
        data.answer ||
        data.reply ||
        data.text ||
        data.result ||
        data.message ||
        ""
      );
    } catch {
      return "";
    }
  };

  const handleAnalyze = async () => {
    const text = question.trim();
    if (!text) {
      setAnswer("Önce bir soru yaz kanka. Analiz veya formül sorusunu buraya bırak, ben toparlayayım.");
      return;
    }

    setLoading(true);
    setAnswer("");

    const aiAnswer = await askGemini(text, mode);

    if (aiAnswer && typeof aiAnswer === "string" && aiAnswer.length > 10) {
      setAnswer(aiAnswer);
    } else {
      setAnswer(mode === "formula" ? localFormulaAnswer(text) : localAnalysisAnswer(text));
    }

    setLoading(false);
  };

  const handleClear = () => {
    setQuestion("");
    setAnswer("");
  };

  const handlePrint = () => {
    const content = `
      <html>
        <head>
          <title>InciLab Çıktı</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              color: #17142b;
              line-height: 1.6;
            }
            h1 {
              color: #6d28d9;
              margin-bottom: 4px;
            }
            .badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 999px;
              background: #f3e8ff;
              color: #6d28d9;
              font-size: 12px;
              margin-bottom: 20px;
            }
            pre {
              white-space: pre-wrap;
              font-family: Arial, sans-serif;
              background: #faf7ff;
              padding: 20px;
              border-radius: 18px;
              border: 1px solid #eadcff;
            }
          </style>
        </head>
        <body>
          <span class="badge">InciLab • ${mode === "formula" ? "Formül" : "Analiz"} Çıktısı</span>
          <h1>InciLab Raporu</h1>
          <h3>Soru</h3>
          <pre>${question.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
          <h3>Cevap</h3>
          <pre>${answer.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const activeExamples = mode === "formula" ? exampleFormulas : exampleQuestions;

  return (
    <main className="incilab-page">
      <section className="hero">
        <div>
          <div className="pill">Kimya • Kozmetik • Analiz Asistanı</div>
          <h1>InciLab</h1>
          <p>
            Analiz sonucunu, formülasyon mantığını veya hammadde yorumunu yaz;
            ben sana anlaşılır, bilimsel ve uygulanabilir şekilde toparlayayım.
          </p>
        </div>

        <div className="status-card">
          <span>Durum</span>
          <strong>Hazır</strong>
        </div>
      </section>

      <section className="layout">
        <div className="left">
          <div className="card main-card">
            <div className="tabs">
              <button
                className={mode === "analysis" ? "tab active" : "tab"}
                onClick={() => setMode("analysis")}
              >
                Analiz Sor
              </button>
              <button
                className={mode === "formula" ? "tab active" : "tab"}
                onClick={() => setMode("formula")}
              >
                Formül Sor
              </button>
            </div>

            <div className="section-title">
              <h2>{mode === "formula" ? "Formül Sorusu" : "Analiz Sorusu"}</h2>
              <p>
                {mode === "formula"
                  ? "Ürün tipini, hedef cildi, hacmi/gramajı ve istediğin aktifleri yazabilirsin."
                  : "Laboratuvar sonucu, formül problemi veya içerik sorusu yazabilirsin."}
              </p>
            </div>

            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                mode === "formula"
                  ? "Örn: 100 g yağlı cilt için niacinamide serum formülü hazırla. pH, fazlar ve üretim adımlarını da yaz."
                  : "Örn: Çıkış suyunda KOİ yüksek ama numune berrak değil. Kit ile ölçüm yaptım, neden olabilir?"
              }
            />

            <div className="chips">
              {activeExamples.map((item) => (
                <button key={item} onClick={() => setQuestion(item)}>
                  {item}
                </button>
              ))}
            </div>

            <div className="actions">
              <button className="primary" onClick={handleAnalyze} disabled={loading}>
                {loading ? "Hazırlanıyor..." : mode === "formula" ? "Formül oluştur" : "Analiz et"}
              </button>
              <button className="secondary" onClick={handleClear}>
                Temizle
              </button>
            </div>
          </div>

          <div className="card answer-card">
            <div className="answer-head">
              <div>
                <h2>InciLab Cevabı</h2>
                <p>Cevap geldikten sonra detay, tümünü gör ve çıktı alma alanı aktif olur.</p>
              </div>

              <div className="answer-buttons">
                <button onClick={() => setAnswer(answer || "Henüz detaylandırılacak cevap yok kanka.")}>
                  Detaylandır
                </button>
                <button onClick={handlePrint} disabled={!answer}>
                  PDF / Yazdır
                </button>
              </div>
            </div>

            <div className={answer ? "answer-box filled" : "answer-box"}>
              {answer ? (
                <pre>{answer}</pre>
              ) : (
                <span>
                  Henüz cevap yok. Sorunu yazıp butona basınca cevap burada görünecek.
                </span>
              )}
            </div>
          </div>
        </div>

        <aside className="right">
          <div className="card side-card">
            <div className="side-head">
              <h2>Trend Hammaddeler</h2>
              <button onClick={() => setShowAllTrends((v) => !v)}>
                {showAllTrends ? "Kısalt" : "Tümünü gör"}
              </button>
            </div>

            {(showAllTrends ? trends : trends.slice(0, 2)).map((item) => (
              <div className="ingredient" key={item.name}>
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.desc}</p>
                  {showAllTrends && <small>{item.detail}</small>}
                </div>
                <button onClick={() => setQuestion(`${item.name} kozmetikte ne işe yarar, kullanım oranı ve formül mantığı nedir?`)}>
                  Detay
                </button>
              </div>
            ))}
          </div>

          <div className="card side-card">
            <div className="side-head">
              <h2>Formül Alanı</h2>
              <button onClick={() => setShowFormulaPanel((v) => !v)}>
                {showFormulaPanel ? "Kapat" : "Aç"}
              </button>
            </div>

            {showFormulaPanel && (
              <>
                <div className="formula-mini">
                  <h3>Nemlendirici krem bazı</h3>
                  <p>Su fazı + yağ fazı + emülgatör + koruyucu + pH ayarı mantığı.</p>
                  <div>
                    Basit bir kremde su fazı, humektanlar, yağ fazı, emülgatör sistemi,
                    kıvam verici, koruyucu ve pH ayarı ayrı ayrı kontrol edilmelidir.
                  </div>
                  <button
                    onClick={() => {
                      setMode("formula");
                      setQuestion("100 g nemlendirici krem bazı formülü hazırla. Fazları, oranları, pH ve üretim adımlarını yaz.");
                    }}
                  >
                    Bu formülü aç
                  </button>
                </div>

                <div className="formula-mini">
                  <h3>Nazik temizleyici jel</h3>
                  <p>Anyonik + amfoterik + noniyonik yüzey aktif kombinasyonu.</p>
                  <div>
                    Hassas cilt için sülfatsız sistemlerde köpük, kıvam ve pH dengesi birlikte düşünülür.
                  </div>
                  <button
                    onClick={() => {
                      setMode("formula");
                      setQuestion("SLES içermeyen nazik temizleyici jel formülü hazırla. Yüzey aktif sistemi, pH ve üretim adımlarını yaz.");
                    }}
                  >
                    Bu formülü aç
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </section>

      <style jsx>{`
        .incilab-page {
          min-height: 100vh;
          padding: 32px;
          color: #17142b;
          background:
            radial-gradient(circle at top left, rgba(168, 85, 247, 0.18), transparent 34%),
            radial-gradient(circle at top right, rgba(236, 72, 153, 0.12), transparent 32%),
            linear-gradient(135deg, #fbf7ff 0%, #ffffff 42%, #f4edff 100%);
        }

        .hero {
          max-width: 1220px;
          margin: 0 auto 24px;
          padding: 28px 32px;
          border-radius: 34px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(139, 92, 246, 0.16);
          box-shadow: 0 24px 60px rgba(109, 40, 217, 0.08);
          backdrop-filter: blur(18px);
        }

        .pill {
          display: inline-flex;
          padding: 7px 14px;
          border-radius: 999px;
          color: #6d28d9;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid #e7d7ff;
          background: #fbf7ff;
          margin-bottom: 10px;
        }

        h1 {
          font-size: 42px;
          margin: 0;
          letter-spacing: -1.4px;
          color: #141124;
        }

        h2 {
          margin: 0;
          font-size: 20px;
          color: #1f1836;
        }

        h3 {
          margin: 0 0 6px;
          font-size: 16px;
          color: #24183f;
        }

        p {
          margin: 0;
          color: #695f82;
          line-height: 1.55;
        }

        .hero p {
          max-width: 760px;
          margin-top: 8px;
        }

        .status-card {
          min-width: 90px;
          height: 90px;
          border-radius: 28px;
          display: grid;
          place-items: center;
          text-align: center;
          border: 1px solid #eadcff;
          background: linear-gradient(180deg, #ffffff, #fbf7ff);
          box-shadow: 0 12px 32px rgba(109, 40, 217, 0.1);
        }

        .status-card span {
          color: #6b6281;
          font-size: 14px;
        }

        .status-card strong {
          display: block;
          color: #6d28d9;
          font-size: 15px;
          margin-top: -14px;
        }

        .layout {
          max-width: 1220px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.9fr);
          gap: 24px;
        }

        .left,
        .right {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .card {
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(139, 92, 246, 0.16);
          box-shadow: 0 18px 45px rgba(109, 40, 217, 0.08);
          backdrop-filter: blur(16px);
          border-radius: 30px;
        }

        .main-card,
        .answer-card,
        .side-card {
          padding: 24px;
        }

        .tabs {
          display: inline-flex;
          padding: 5px;
          border-radius: 999px;
          background: #f3e8ff;
          border: 1px solid #eadcff;
          margin-bottom: 20px;
        }

        .tab {
          border: none;
          cursor: pointer;
          border-radius: 999px;
          padding: 11px 18px;
          background: transparent;
          color: #6d5f84;
          font-weight: 800;
        }

        .tab.active {
          color: white;
          background: linear-gradient(135deg, #7c3aed, #c026d3);
          box-shadow: 0 10px 22px rgba(124, 58, 237, 0.25);
        }

        .section-title {
          margin-bottom: 18px;
        }

        textarea {
          width: 100%;
          min-height: 178px;
          resize: vertical;
          padding: 22px;
          border-radius: 24px;
          border: 1px solid #e6d8ff;
          background: rgba(255, 255, 255, 0.9);
          outline: none;
          color: #201936;
          font-size: 15px;
          line-height: 1.6;
          box-sizing: border-box;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.7);
        }

        textarea:focus {
          border-color: #a855f7;
          box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.12);
        }

        textarea::placeholder {
          color: #9b91ad;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 18px 0;
        }

        .chips button,
        .side-head button,
        .ingredient button,
        .answer-buttons button,
        .formula-mini button {
          cursor: pointer;
          border: 1px solid #eadcff;
          background: #ffffff;
          color: #6a5688;
          border-radius: 999px;
          padding: 9px 13px;
          font-weight: 700;
          font-size: 13px;
          transition: 0.2s ease;
        }

        .chips button:hover,
        .side-head button:hover,
        .ingredient button:hover,
        .answer-buttons button:hover,
        .formula-mini button:hover {
          transform: translateY(-1px);
          border-color: #c4a2ff;
          color: #6d28d9;
          background: #fbf7ff;
        }

        .actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .primary,
        .secondary {
          border: none;
          cursor: pointer;
          border-radius: 17px;
          padding: 15px 22px;
          font-weight: 900;
          font-size: 14px;
        }

        .primary {
          color: white;
          background: linear-gradient(135deg, #6d28d9, #a21caf);
          box-shadow: 0 12px 24px rgba(109, 40, 217, 0.28);
        }

        .primary:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .secondary {
          color: #5f5375;
          background: #ffffff;
          border: 1px solid #eadcff;
        }

        .answer-head,
        .side-head {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .answer-head p {
          font-size: 13px;
          margin-top: 5px;
        }

        .answer-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .answer-buttons button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .answer-box {
          border: 1px dashed #d8c4ff;
          background: linear-gradient(180deg, #ffffff, #fbf7ff);
          min-height: 96px;
          border-radius: 24px;
          padding: 22px;
          color: #74688c;
        }

        .answer-box.filled {
          border-style: solid;
          background: #fff;
        }

        pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          margin: 0;
          font-family: inherit;
          color: #24183f;
          line-height: 1.65;
          font-size: 14px;
        }

        .ingredient {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          padding: 18px;
          border-radius: 22px;
          border: 1px solid #eadcff;
          background: linear-gradient(180deg, #ffffff, #fbf7ff);
          margin-top: 12px;
        }

        .ingredient p {
          font-size: 14px;
        }

        .ingredient small {
          display: block;
          color: #806f9d;
          margin-top: 8px;
          line-height: 1.5;
        }

        .formula-mini {
          padding: 18px;
          border-radius: 22px;
          border: 1px solid #eadcff;
          background: linear-gradient(180deg, #ffffff, #fbf7ff);
          margin-top: 12px;
        }

        .formula-mini p {
          font-size: 14px;
          margin-bottom: 12px;
        }

        .formula-mini div {
          background: rgba(243, 232, 255, 0.58);
          border-radius: 18px;
          padding: 14px;
          color: #67587f;
          line-height: 1.55;
          font-size: 14px;
          margin-bottom: 12px;
        }

        @media (max-width: 980px) {
          .incilab-page {
            padding: 18px;
          }

          .hero {
            flex-direction: column;
            align-items: flex-start;
            border-radius: 26px;
          }

          .layout {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 34px;
          }

          .answer-head,
          .side-head {
            flex-direction: column;
          }

          .answer-buttons {
            justify-content: flex-start;
          }
        }
      `}</style>
    </main>
  );
}
