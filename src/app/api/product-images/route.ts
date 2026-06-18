import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  const sb = getClient();
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `product-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await sb.storage.from(BUCKET).upload(filename, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(filename);
  return NextResponse.json({ url: urlData.publicUrl, filename });
}

export async function DELETE(req: NextRequest) {
  const sb = getClient();
  const { filename } = await req.json();
  if (!filename) return NextResponse.json({ error: "No filename" }, { status: 400 });

  const { error } = await sb.storage.from(BUCKET).remove([filename]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
