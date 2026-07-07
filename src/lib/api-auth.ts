import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * APIルート用の認証ガード。
 * Supabase Authのセッションcookieを検証し、未認証なら401レスポンスを返す。
 * 認証済みならnullを返す（そのまま処理を続行してよい）。
 *
 * 使い方:
 *   const authError = await requireAuth();
 *   if (authError) return authError;
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // Route Handlerではcookieの書き換えは不要（セッション更新はmiddlewareが担当）
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
