import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function pcmToWav(pcmBase64: string, sampleRate = 24000) {
  const pcmBuffer = Buffer.from(pcmBase64, 'base64');

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  const wavHeader = Buffer.alloc(44);

  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
  wavHeader.write('WAVE', 8);

  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);

  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([wavHeader, pcmBuffer]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body?.text;
    const voice = body?.voice || 'Kore';

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is missing in Vercel environment variables' },
        { status: 500 }
      );
    }

    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/[#>`]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .slice(0, 3600);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Türkçe konuş. Sıcak, doğal, akıcı, gerçek bir kadın asistan gibi oku. Gereksiz yavaşlama yapma. Sohbet eder gibi net ve canlı oku:\n\n${cleanText}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice,
                },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        {
          error: 'Gemini TTS request failed',
          detail,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const audioPart = data?.candidates?.[0]?.content?.parts?.find(
      (part: any) => part?.inlineData?.data
    );

    const audioBase64 = audioPart?.inlineData?.data;
    const mimeType = audioPart?.inlineData?.mimeType || '';

    if (!audioBase64) {
      return NextResponse.json(
        {
          error: 'No audio returned from Gemini TTS',
          data,
        },
        { status: 500 }
      );
    }

    const audioBuffer = mimeType.includes('audio/L16')
      ? pcmToWav(audioBase64, 24000)
      : Buffer.from(audioBase64, 'base64');

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Gemini TTS route error',
        detail: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
