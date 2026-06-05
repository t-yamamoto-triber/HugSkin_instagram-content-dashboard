import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET: fetch all drafts
export async function GET() {
  const sb = getClient();
  const { data, error } = await sb
    .from("drafts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drafts: data });
}

// POST: create or update draft
export async function POST(req: NextRequest) {
  const sb = getClient();
  const body = await req.json();
  const { id, caption, imageUrls, imageFormat, theme } = body;

  if (id) {
    const { data, error } = await sb
      .from("drafts")
      .update({ caption, image_urls: imageUrls, image_format: imageFormat, theme, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ draft: data });
  } else {
    const { data, error } = await sb
      .from("drafts")
      .insert({ caption, image_urls: imageUrls ?? [], image_format: imageFormat ?? "single", theme })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ draft: data });
  }
}

// DELETE: remove a draft
export async function DELETE(req: NextRequest) {
  const sb = getClient();
  const { id } = await req.json();
  const { error } = await sb.from("drafts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
