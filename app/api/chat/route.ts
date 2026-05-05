import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function cleanText(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value.trim();

  if (typeof value === "object") {
    return (
      value.reply ||
      value.answer ||
      value.text ||
      value.message ||
      value.content ||
      ""
    ).toString().trim();
  }

  return "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userMessage =
      body?.message ||
      body?.text ||
      body?.prompt ||
      body?.content ||
      "";

    const memory = Array.isArray(body?.memory) ? body.memory : [];

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        {
          reply: "Kanka mesajı alamadım, bir daha yazar mısın?",
          answer: "Kanka mesajı alamadım, bir daha yazar mısın?",
          text: "Kanka mesajı alamadım, bir daha yazar mısın?",
          message: "Kanka mesajı alamadım, bir daha yazar mısın?",
        },
        { status: 200 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallback =
        "Kanka GEMINI_API_KEY eksik görünüyor. Vercel > Project Settings > Environment Variables kısmına GEMINI_API_KEY ekleyip redeploy yapman lazım.";

      return NextResponse.json(
        {
          reply: fallback,
          answer: fallback,
          text: fallback,
          message: fallback,
        },
        { status: 200 }
      );
    }

    const systemPrompt = `
Sen Lyra'sın. Türkçe konuşan, sıcak, akıllı, doğal ve yardımcı bir yapay zeka asistansın.
Kullanıcıya gerçek bir sohbet gibi cevap ver.
Kullanıcının mesajını tekrar etme.
Kısa soruya kısa, detay isteyen soruya detaylı cevap ver.
İçerik üretimi, kozmetik, formül, DGS, araştırma, fikir üretme, günlük sohbet ve teknik yardım konularında destek ol.
Cevapların doğal, net, samimi ve işe yarar olsun.
Asla "duydum" deme.
Asla "cevap geldi ama ekrana aktarılamadı" gibi teknik fallback cümleleri söyleme.
`;

    const memoryText =
      memory.length > 0
        ? `Kullanıcının kısa hafızasında şunlar var: ${memory.join(", ")}`
        : "";

    const geminiBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\n${memoryText}\n\nKullanıcı: ${userMessage}\n\nLyra:`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1200,
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(geminiBody),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorText =
        data?.error?.message ||
        "Gemini tarafında geçici bir sorun oldu. Birazdan tekrar deneyelim.";

      return NextResponse.json(
        {
          reply: `Kanka Gemini bağlantısı takıldı: ${errorText}`,
          answer: `Kanka Gemini bağlantısı takıldı: ${errorText}`,
          text: `Kanka Gemini bağlantısı takıldı: ${errorText}`,
          message: `Kanka Gemini bağlantısı takıldı: ${errorText}`,
        },
        { status: 200 }
      );
    }

    const rawAnswer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text)
        ?.filter(Boolean)
        ?.join("\n") ||
      "";

    const finalAnswer =
      cleanText(rawAnswer) ||
      "Kanka cevap üretildi ama metin kısmı boş geldi. Aynı soruyu bir daha dener misin?";

    return NextResponse.json(
      {
        reply: finalAnswer,
        answer: finalAnswer,
        text: finalAnswer,
        message: finalAnswer,
        content: finalAnswer,
        success: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    const errorMessage =
      error?.message ||
      "Beklenmeyen bir hata oldu ama sistem tamamen kopmadı.";

    const fallback = `Kanka sistem takıldı: ${errorMessage}`;

    return NextResponse.json(
      {
        reply: fallback,
        answer: fallback,
        text: fallback,
        message: fallback,
        content: fallback,
        success: false,
      },
      { status: 200 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Lyra API çalışıyor.",
    ok: true,
  });
}
