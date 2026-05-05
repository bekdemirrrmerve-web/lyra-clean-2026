import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTS_MODELS = [
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
];

const ALLOWED_VOICES = [
  "Zephyr",
  "Puck",
  "Charon",
  "Kore",
  "Fenrir",
  "Leda",
  "Orus",
  "Aoede",
  "Callirrhoe",
  "Autonoe",
  "Enceladus",
  "Iapetus",
  "Umbriel",
  "Algieba",
  "Despina",
  "Erinome",
  "Algenib",
  "Rasalgethi",
  "Laomedeia",
  "Achernar",
  "Alnilam",
  "Schedar",
  "Gacrux",
  "Pulcherrima",
  "Achird",
  "Zubenelgenubi",
  "Vindemiatrix",
  "Sadachbia",
  "Sadaltager",
  "Sulafat",
];

function jsonError(message: string, status = 200, extra: any = {}) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...extra,
    },
    { status }
  );
}

function makeWavHeader(
  pcmLength: number,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16
) {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const buffer = Buffer.alloc(44);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + pcmLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(pcmLength, 40);

  return buffer;
}

function pcmToWav(pcmBuffer: Buffer) {
  const header = makeWavHeader(pcmBuffer.length);
  return Buffer.concat([header, pcmBuffer]);
}

function extractAudioBase64(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) return "";

  const audioPart = parts.find(
    (part: any) => part?.inlineData?.data || part?.inline_data?.data
  );

  return (
    audioPart?.inlineData?.data ||
    audioPart?.inline_data?.data ||
    ""
  );
}

async function callGeminiTTS(
  model: string,
  apiKey: string,
  text: string,
  voiceName: string
) {
  const prompt = `
Read this in Turkish with a warm, natural, friendly female assistant energy.
Speak clearly, not robotic. Keep it conversational and calm.
Use natural Turkish pronunciation.

Transcript:
${text}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
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

  const data = await response.json();

  return {
    ok: response.ok,
    data,
    error: data?.error?.message || "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const text = (
      body?.text ||
      body?.message ||
      body?.content ||
      ""
    ).toString();

    const requestedVoice = (body?.voiceName || "Sulafat").toString();
    const voiceName = ALLOWED_VOICES.includes(requestedVoice)
      ? requestedVoice
      : "Sulafat";

    if (!text.trim()) {
      return jsonError("Seslendirilecek metin boş geldi.");
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return jsonError(
        "GEMINI_API_KEY eksik. Vercel Environment Variables kısmına eklenmeli."
      );
    }

    let lastError = "";

    for (const model of TTS_MODELS) {
      const result = await callGeminiTTS(model, apiKey, text, voiceName);

      if (result.ok) {
        const audioBase64 = extractAudioBase64(result.data);

        if (!audioBase64) {
          lastError = `${model}: Audio data boş geldi.`;
          continue;
        }

        const pcmBuffer = Buffer.from(audioBase64, "base64");
        const wavBuffer = pcmToWav(pcmBuffer);

        return new NextResponse(wavBuffer, {
          status: 200,
          headers: {
            "Content-Type": "audio/wav",
            "Cache-Control": "no-store",
            "X-Lyra-TTS-Model": model,
            "X-Lyra-TTS-Voice": voiceName,
          },
        });
      }

      lastError = `${model}: ${result.error}`;
    }

    return jsonError("Gemini TTS çalışmadı.", 200, {
      lastError,
      triedModels: TTS_MODELS,
    });
  } catch (error: any) {
    return jsonError(
      `TTS route hata verdi: ${error?.message || "Bilinmeyen hata"}`
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "Lyra Gemini TTS API çalışıyor.",
    route: "/api/tts",
    models: TTS_MODELS,
    defaultVoice: "Sulafat",
  });
}
