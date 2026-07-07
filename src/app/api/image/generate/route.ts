import { NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { analyzeStyle, analyzeProduct } from "@/lib/imageAnalysis";

const SCENE_DELIMITER = "---SCENE---";

// Newest first — falls back automatically if the org can't access the newer model
const OPENAI_MODELS = ["gpt-image-2", "gpt-image-1"];
const GEMINI_MODELS = [
  "gemini-3.1-flash-image",
  "gemini-3.1-flash-image-preview",
  "gemini-2.5-flash-image",
];

type Engine = "openai" | "gemini";

// Persist a generated image to Supabase Storage so draft URLs never expire.
// Falls back to a data URL if the bucket is missing or the upload fails.
async function persistImage(b64: string, contentType = "image/png"): Promise<string> {
  const ext = contentType.split("/")[1] ?? "png";
  const dataUrl = `data:${contentType};base64,${b64}`;
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
    const { error } = await sb.storage
      .from("generated-images")
      .upload(path, Buffer.from(b64, "base64"), { contentType });
    if (error) return dataUrl;
    return sb.storage.from("generated-images").getPublicUrl(path).data.publicUrl;
  } catch {
    return dataUrl;
  }
}

async function fetchAsB64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return {
      mimeType: res.headers.get("content-type") ?? "image/jpeg",
      data: Buffer.from(await res.arrayBuffer()).toString("base64"),
    };
  } catch {
    return null;
  }
}

async function generateWithOpenAI(openai: OpenAI, prompt: string): Promise<string | null> {
  let lastError: unknown = null;
  for (const model of OPENAI_MODELS) {
    try {
      const r = await openai.images.generate({
        model,
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "high",
      });
      const item = r.data?.[0];
      if (item?.b64_json) return persistImage(item.b64_json);
      if (item?.url) {
        const fetched = await fetchAsB64(item.url);
        return fetched ? persistImage(fetched.data, fetched.mimeType) : item.url;
      }
      return null;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

async function generateWithGemini(
  apiKey: string,
  textPrompt: string,
  imageParts: { inlineData: { mimeType: string; data: string } }[]
): Promise<string> {
  let lastError = "";
  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [...imageParts, { text: textPrompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      }
    );
    if (res.status === 404) {
      lastError = await res.text();
      continue; // model id not available for this key — try the next
    }
    if (!res.ok) throw new Error(`Gemini API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    const parts: { inlineData?: { mimeType?: string; data?: string } }[] =
      json.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p) => p.inlineData?.data);
    if (!img?.inlineData?.data) throw new Error("Gemini returned no image data");
    return persistImage(img.inlineData.data, img.inlineData.mimeType ?? "image/png");
  }
  throw new Error(`利用可能なGemini画像モデルが見つかりません: ${lastError.slice(0, 200)}`);
}

export async function POST(req: Request) {
  const {
    caption,
    imageFormat,
    regulation,
    imageDirection,
    referenceImageUrls,
    productDescription,
    productImageUrls,
    styleAnalysis: cachedStyle,
    productVisual: cachedProduct,
    engine: rawEngine,
  } = await req.json();

  const engine: Engine = rawEngine === "gemini" ? "gemini" : "openai";
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (engine === "openai" && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });
  }
  if (engine === "gemini" && !geminiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY が未設定です。.env.local / Vercel に追加してください" },
      { status: 500 }
    );
  }

  const count = imageFormat === "carousel" ? 3 : 1;

  try {
    const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Step 1: visual analyses (OpenAI path only — Gemini gets the actual
    // reference images attached, so no text summarization is needed).
    // Uses client-cached results when provided, otherwise runs in parallel.
    let styleAnalysis = "";
    let productVisualDescription = "";
    if (engine === "openai") {
      [styleAnalysis, productVisualDescription] = await Promise.all([
        typeof cachedStyle === "string" ? cachedStyle : analyzeStyle(claude, referenceImageUrls),
        typeof cachedProduct === "string" ? cachedProduct : analyzeProduct(claude, productImageUrls),
      ]);
    }

    // Step 2: build the prompt instruction combining all context
    const sceneRule =
      count > 1
        ? `- Write ${count} DIFFERENT prompts for a carousel post that tells a story across the images (e.g. 1: relatable everyday moment / skin concern, 2: using the product, 3: satisfied result and mood). Keep the SAME woman, home, lighting and photographic style across all prompts so they read as one shoot. Separate the prompts with a line containing exactly "${SCENE_DELIMITER}". Output the prompts only, no numbering or explanations.`
        : `- Output the prompt text only, no explanations`;

    const promptInstruction = `You are a professional art director for a Japanese skincare brand called HugSkin targeting mothers with young children.

Based on the Instagram caption below, write ${count > 1 ? `${count} detailed English image generation prompts (80–120 words each)` : "a detailed English image generation prompt (80–120 words)"} for high-quality lifestyle photos.

Rules:
- The model MUST be a Japanese woman in her late 20s to mid 30s
- Describe her appearance specifically: Japanese facial features, natural makeup, warm expression
- Set a realistic, warm home environment (bathroom, bedroom, or kitchen)
- The product bottle should be visible in the scene
- Lighting: soft natural light or warm indoor light
- Style: high-end editorial lifestyle photography, Canon or Sony camera aesthetic, shallow depth of field
${sceneRule}

Caption:
${caption}

${imageDirection ? `Visual direction: ${imageDirection}` : ""}
${regulation ? `Brand context: ${regulation}` : ""}`;

    const productContext = [
      productDescription ? `Product description: ${productDescription}` : "",
      productVisualDescription
        ? `Product appearance (from uploaded photos): ${productVisualDescription}`
        : "",
    ].filter(Boolean).join("\n");

    const promptInstructionWithStyle = [
      promptInstruction,
      styleAnalysis ? `Visual style reference from brand's own posts: ${styleAnalysis}` : "",
      productContext,
    ].filter(Boolean).join("\n\n");

    const promptRes = await claude.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: count > 1 ? 900 : 300,
      messages: [{ role: "user", content: promptInstructionWithStyle }],
    });
    const rawPrompts = (promptRes.content[0] as { type: string; text: string }).text.trim();

    // For carousel: one prompt per scene; reuse the first if Claude returned fewer
    const scenePrompts = rawPrompts
      .split(SCENE_DELIMITER)
      .map((p) => p.trim())
      .filter(Boolean);
    const visualPrompts = Array.from({ length: count }).map(
      (_, i) => scenePrompts[i] ?? scenePrompts[0] ?? rawPrompts
    );

    // imageDirection is appended verbatim so it reaches the image model
    // unfiltered, instead of relying on Haiku to keep it in the 80-120 word prompt
    const directionSuffix = imageDirection
      ? ` Art direction from the brand (must follow): ${imageDirection}`
      : "";
    const basePrompt = (p: string) =>
      `${p}. Square 1:1 format, Instagram-ready. Japanese woman model only. Photorealistic, ultra high quality.${directionSuffix}`;

    // Step 3: generate images
    let urls: (string | null)[];

    if (engine === "gemini") {
      // Attach the actual product photos and recent own posts as reference images
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const productUrls: string[] = Array.isArray(productImageUrls)
        ? productImageUrls.filter((u: string) => typeof u === "string" && u.startsWith("http")).slice(0, 3)
        : [];
      const refUrls: string[] = Array.isArray(referenceImageUrls)
        ? referenceImageUrls.filter((u: string) => typeof u === "string" && u.startsWith("http")).slice(0, 4)
        : [];

      const [productParts, refParts] = await Promise.all([
        Promise.all(productUrls.map(fetchAsB64)),
        Promise.all(refUrls.map((u) => fetchAsB64(`${baseUrl}/api/proxy/image?url=${encodeURIComponent(u)}`))),
      ]);
      const validProduct = productParts.filter(Boolean).map((p) => ({ inlineData: p! }));
      const validRef = refParts.filter(Boolean).map((p) => ({ inlineData: p! }));

      const referenceNote = [
        validProduct.length > 0
          ? `The first ${validProduct.length} attached photo(s) show the ACTUAL product — reproduce this exact bottle, label and logo faithfully in the scene.`
          : "",
        validRef.length > 0
          ? `The remaining ${validRef.length} attached photo(s) are the brand's recent Instagram posts — match their color palette, lighting and overall tone.`
          : "",
      ].filter(Boolean).join(" ");

      urls = await Promise.all(
        visualPrompts.map((p) =>
          generateWithGemini(
            geminiKey!,
            `${basePrompt(p)}${referenceNote ? `\n\n${referenceNote}` : ""}`,
            [...validProduct, ...validRef]
          )
        )
      );
    } else {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      urls = await Promise.all(visualPrompts.map((p) => generateWithOpenAI(openai, basePrompt(p))));
    }

    return NextResponse.json({
      urls: urls.filter(Boolean),
      visualPrompt:
        visualPrompts.join("\n\n---\n\n") +
        (imageDirection ? `\n\n【固定テイスト指示（原文のまま適用）】${imageDirection}` : ""),
      styleAnalysis,
      productVisual: productVisualDescription,
      engine,
    });
  } catch (e) {
    return NextResponse.json({ error: "Image generation failed", detail: String(e) }, { status: 500 });
  }
}
