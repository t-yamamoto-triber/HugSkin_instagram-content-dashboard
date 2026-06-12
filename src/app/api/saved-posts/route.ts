import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  const sb = getClient();
  const { data, error } = await sb
    .from("saved_posts")
    .select("*")
    .order("saved_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = getClient();
  const { postId, username, postUrl, thumbnailUrl, caption, savedBy } = await req.json();

  const { error } = await sb.from("saved_posts").upsert({
    post_id: postId,
    username,
    post_url: postUrl,
    thumbnail_url: thumbnailUrl,
    caption,
    saved_by: savedBy ?? null,
  }, { onConflict: "post_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const sb = getClient();
  const { postId } = await req.json();
  const { error } = await sb.from("saved_posts").delete().eq("post_id", postId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
