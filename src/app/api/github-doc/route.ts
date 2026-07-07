import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  const { url, token } = await req.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Convert GitHub web URL to raw URL if needed
  // e.g. https://github.com/owner/repo/blob/main/file.md
  //   -> https://raw.githubusercontent.com/owner/repo/main/file.md
  const rawUrl = url
    .replace("https://github.com/", "https://raw.githubusercontent.com/")
    .replace("/blob/", "/");

  const headers: Record<string, string> = {
    "Accept": "text/plain",
    "User-Agent": "HugSkin-Dashboard",
  };
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  try {
    const res = await fetch(rawUrl, { headers });
    if (!res.ok) {
      const status = res.status;
      if (status === 404) {
        return NextResponse.json({ error: "ファイルが見つかりません。URLを確認してください。" }, { status: 404 });
      }
      if (status === 401 || status === 403) {
        return NextResponse.json({ error: "アクセス権限がありません。プライベートリポジトリの場合はTokenが必要です。" }, { status: 403 });
      }
      return NextResponse.json({ error: `取得に失敗しました (${status})` }, { status: 500 });
    }

    const content = await res.text();
    return NextResponse.json({ content });
  } catch (e) {
    return NextResponse.json({ error: `ネットワークエラー: ${String(e)}` }, { status: 500 });
  }
}
