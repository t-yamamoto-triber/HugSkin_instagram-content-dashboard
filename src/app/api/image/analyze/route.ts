import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { analyzeStyle, analyzeProduct } from "@/lib/imageAnalysis";

// Analyzes brand style (recent own posts) and product appearance in parallel.
// PaneD caches the result client-side so repeated generations skip Vision calls.
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 500 });
  }

  const { referenceImageUrls, productImageUrls } = await req.json();
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const [styleAnalysis, productVisual] = await Promise.all([
      analyzeStyle(claude, referenceImageUrls),
      analyzeProduct(claude, productImageUrls),
    ]);
    return NextResponse.json({ styleAnalysis, productVisual });
  } catch (e) {
    return NextResponse.json({ error: "Image analysis failed", detail: String(e) }, { status: 500 });
  }
}
