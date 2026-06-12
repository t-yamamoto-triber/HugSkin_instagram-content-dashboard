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
    .from("competitor_accounts")
    .select("*")
    .order("added_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    accounts: (data ?? []).map((r) => ({ username: r.username, label: r.label ?? `@${r.username}` })),
  });
}

export async function POST(req: NextRequest) {
  const sb = getClient();
  const { username, label, addedBy } = await req.json();

  const { error } = await sb.from("competitor_accounts").upsert({
    username,
    label: label ?? `@${username}`,
    added_by: addedBy ?? null,
  }, { onConflict: "username" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const sb = getClient();
  const { username } = await req.json();
  const { error } = await sb.from("competitor_accounts").delete().eq("username", username);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
