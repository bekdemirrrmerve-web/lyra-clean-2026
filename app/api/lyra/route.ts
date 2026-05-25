import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIRIUS_LYRA_URL = "https://sirius-core-apii.vercel.app/api/lyra";

export async function GET() {
  try {
    const res = await fetch(`${SIRIUS_LYRA_URL}?from=lyra-frontend`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json();

    return NextResponse.json({
      ok: true,
      name: "Lyra Frontend Proxy",
      proxy: true,
      target: SIRIUS_LYRA_URL,
      sirius: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        name: "Lyra Frontend Proxy",
        error: "LYRA_PROXY_GET_ERROR",
        message: "Lyra, Sirius Core API’ye ulaşamadı.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const res = await fetch(SIRIUS_LYRA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json();

    return NextResponse.json(data, {
      status: res.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        name: "Lyra Frontend Proxy",
        error: "LYRA_PROXY_POST_ERROR",
        message: "Lyra mesajı Sirius Core API’ye gönderemedi.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
