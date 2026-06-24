import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SIRIUS_LYRA_URL =
  process.env.SIRIUS_LYRA_URL || "https://sirius-core-apii.vercel.app/api/lyra";

function normalizeLyraResponse(data: any, fallbackMessage: string) {
  const reply =
    data?.reply ||
    data?.message ||
    data?.text ||
    data?.answer ||
    fallbackMessage;

  return {
    ok: data?.ok ?? true,
    source: "lyra-proxy",
    siriusUrl: SIRIUS_LYRA_URL,
    reply,
    speakText: data?.speakText || reply,
    emotion: data?.emotion || "warm",
    avatarState: data?.avatarState || "talking",
    memoryUpdate: data?.memoryUpdate || null,
    voicePacket: data?.voicePacket || null,
    raw: data,
  };
}

export async function GET() {
  try {
    const res = await fetch(SIRIUS_LYRA_URL, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json();

    return NextResponse.json(
      normalizeLyraResponse(data, "Lyra bağlantısı çalışıyor kanka."),
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        source: "lyra-proxy",
        error: error?.message || "Bilinmeyen hata",
        reply:
          "Sirius tarafına bağlanamadım kanka. Bağlantı köprüsünü kontrol etmemiz lazım.",
        speakText:
          "Sirius tarafına bağlanamadım kanka. Bağlantı köprüsünü kontrol etmemiz lazım.",
        emotion: "concerned",
        avatarState: "idle",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userMessage =
      body?.message ||
      body?.text ||
      body?.prompt ||
      body?.userMessage ||
      "";

    const payload = {
      message: userMessage,
      text: userMessage,
      prompt: userMessage,
      userMessage,
      mode: body?.mode || "chat",
      user: body?.user || "Merve",
    };

    const res = await fetch(SIRIUS_LYRA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await res.json();

    return NextResponse.json(
      normalizeLyraResponse(data, "Buradayım kanka, devam edelim."),
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        source: "lyra-proxy",
        error: error?.message || "Bilinmeyen hata",
        reply:
          "Lyra şu an Sirius Core API’ye ulaşamadı kanka. Ama sorun büyük ihtimalle bağlantı dosyasında.",
        speakText:
          "Lyra şu an Sirius Core API’ye ulaşamadı kanka. Ama sorun büyük ihtimalle bağlantı dosyasında.",
        emotion: "concerned",
        avatarState: "idle",
      },
      { status: 500 }
    );
  }
}
