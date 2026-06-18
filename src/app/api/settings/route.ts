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
    .from("brand_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return defaults if no row yet
  return NextResponse.json({
    regulation: data?.regulation ?? "",
    imageDirection: data?.image_direction ?? "",
    productDescription: data?.product_description ?? "",
    productImageUrls: data?.product_image_urls ?? [],
  });
}

export async function PUT(req: NextRequest) {
  const sb = getClient();
  const { regulation, imageDirection, productDescription, productImageUrls, updatedBy } = await req.json();

  const { error } = await sb.from("brand_settings").upsert({
    id: 1,
    regulation: regulation ?? "",
    image_direction: imageDirection ?? "",
    product_description: productDescription ?? "",
    product_image_urls: productImageUrls ?? [],
    updated_by: updatedBy ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
