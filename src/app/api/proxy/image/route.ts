import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("url param required", { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; bot/1.0)",
        "Accept": "image/*",
      },
    });

    if (!res.ok) return new NextResponse("Failed to fetch image", { status: res.status });

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 500 });
  }
}
