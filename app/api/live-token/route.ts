import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.1-flash-live-preview";

export async function GET() {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "GEMINI_API_KEY eksik. Vercel > Settings > Environment Variables kısmına GEMINI_API_KEY eklenmeli.",
        },
        { status: 500 }
      );
    }

    const client = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    });

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 60 * 1000);

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: {
            sessionResumption: {},
            temperature: 0.7,
            responseModalities: ["AUDIO"],
            systemInstruction: {
              parts: [
                {
                  text:
                    "Sen Lyra Clean 2026'sın. Türkçe konuşan, sıcak, doğal, hızlı, samimi ve zeki bir kadın asistan gibi cevap ver. Kullanıcıyla yakın arkadaş enerjisinde konuş. Kısa, akıcı ve canlı cevap ver. Kullanıcının mesajını tekrar etme. Gereksiz resmi konuşma.",
                },
              ],
            },
          },
        },
        httpOptions: {
          apiVersion: "v1alpha",
        },
      },
    });

    return NextResponse.json({
      ok: true,
      token: token.name,
      model: LIVE_MODEL,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Gemini Live token üretilemedi: " +
          (error?.message || "Bilinmeyen hata"),
      },
      { status: 500 }
    );
  }
}
