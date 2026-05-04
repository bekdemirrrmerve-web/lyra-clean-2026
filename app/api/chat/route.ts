import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_TTS_MODEL =
  process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function createWavFromPcm(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16
) {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);

  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function extractAudioBase64(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) return "";

  const audioPart =
    parts.find((part) => part?.inlineData?.data) ||
    parts.find((part) => part?.inline_data?.data);

  return audioPart?.inlineData?.data || audioPart?.inline_data?.data || "";
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "Lyra Gemini TTS",
    hasGeminiKey: Boolean(GEMINI_API_KEY),
    model: GEMINI_TTS_MODEL,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const text = cleanText(body?.text || body?.message || body?.content);
    const voiceName = cleanText(body?.voiceName) || "Kore";

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "GEMINI_API_KEY eksik. Vercel Environment Variables kısmına ekleyip redeploy yapmalısın.",
        },
        { status: 500 }
      );
    }

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          message: "Seslendirmek için metin gelmedi.",
        },
        { status: 400 }
      );
    }

    const safeText = text.length > 2500 ? text.slice(0, 2500) : text;

    const prompt = `
Read this Turkish text aloud with a warm, natural, friendly female assistant voice.
Tone: sincere, calm, close friend energy, not robotic.
Pace: natural conversational Turkish.
Do not add extra words. Only speak the transcript.

Transcript:
${safeText}
`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName,
                },
              },
            },
          },
        }),
      }
    );

    const data = await geminiResponse.json().catch(() => null);

    if (!geminiResponse.ok) {
      const error =
        data?.error?.message ||
        data?.message ||
        `Gemini TTS hata kodu: ${geminiResponse.status}`;

      return NextResponse.json(
        {
          ok: false,
          message: "Gemini ses üretirken takıldı. Gerçek hata: " + error,
          error,
        },
        { status: 500 }
      );
    }

    const audioBase64 = extractAudioBase64(data);

    if (!audioBase64) {
      return NextResponse.json(
        {
          ok: false,
          message: "Gemini ses üretti gibi görünüyor ama audio alanı boş geldi.",
        },
        { status: 500 }
      );
    }

    const pcmBuffer = Buffer.from(audioBase64, "base64");
    const wavBuffer = createWavFromPcm(pcmBuffer);

    return new NextResponse(wavBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "TTS route içinde beklenmeyen hata oldu: " +
          (error?.message || "Bilinmeyen hata"),
      },
      { status: 500 }
    );
  }
}
