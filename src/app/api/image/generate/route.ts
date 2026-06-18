import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });
  }

  const { caption, imageFormat, regulation, imageDirection, referenceImageUrls } = await req.json();

  const count = imageFormat === "carousel" ? 3 : 1;

  // Build a detailed visual prompt from the caption
  const promptInstruction = `You are a professional art director for a Japanese skincare brand called HugSkin targeting mothers with young children.

Based on the Instagram caption below, write a detailed English image generation prompt (80–120 words) for a high-quality lifestyle photo.

Rules:
- The model MUST be a Japanese woman in her late 20s to mid 30s
- Describe her appearance specifically: Japanese facial features, natural makeup, warm expression
- Set a realistic, warm home environment (bathroom, bedroom, or kitchen)
- The product bottle should be visible in the scene
- Lighting: soft natural light or warm indoor light
- Style: high-end editorial lifestyle photography, Canon or Sony camera aesthetic, shallow depth of field
- Output the prompt text only, no explanations

Caption:
${caption}

${imageDirection ? `Visual direction: ${imageDirection}` : ""}
${regulation ? `Brand context: ${regulation}` : ""}`;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Step 1: If reference images are provided, analyze their visual style via Claude Vision
    let styleAnalysis = "";
    const validRefUrls: string[] = Array.isArray(referenceImageUrls)
      ? referenceImageUrls.filter((u: string) => typeof u === "string" && u.startsWith("http"))
      : [];

    if (validRefUrls.length > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const imageContents = await Promise.all(
        validRefUrls.map(async (url: string) => {
          try {
            const proxyRes = await fetch(`${baseUrl}/api/proxy/image?url=${encodeURIComponent(url)}`);
            if (!proxyRes.ok) return null;
            const buffer = await proxyRes.arrayBuffer();
            const b64 = Buffer.from(buffer).toString("base64");
            const contentType = proxyRes.headers.get("content-type") ?? "image/jpeg";
            return {
              type: "image" as const,
              source: { type: "base64" as const, media_type: contentType as "image/jpeg" | "image/png" | "image/webp", data: b64 },
            };
          } catch {
            return null;
          }
        })
      );

      const validImageContents = imageContents.filter(Boolean);
      if (validImageContents.length > 0) {
        const styleRes = await claude.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 200,
          messages: [{
            role: "user",
            content: [
              ...validImageContents,
              {
                type: "text",
                text: "These are recent Instagram posts from a Japanese skincare brand. In 2-3 sentences in English, describe the consistent visual style: color palette, lighting, background setting, mood, and photography style. Be specific and concise. Output style description only.",
              },
            ] as Parameters<typeof claude.messages.create>[0]["messages"][0]["content"],
          }],
        });
        styleAnalysis = (styleRes.content[0] as { type: string; text: string }).text.trim();
      }
    }

    // Step 2: Generate the main visual prompt using style analysis
    const promptInstructionWithStyle = styleAnalysis
      ? `${promptInstruction}\n\nVisual style reference from brand's own posts: ${styleAnalysis}`
      : promptInstruction;

    const promptRes = await claude.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 250,
      messages: [{ role: "user", content: promptInstructionWithStyle }],
    });
    const visualPrompt = (promptRes.content[0] as { type: string; text: string }).text.trim();

    // Generate images with gpt-image-1 at high quality
    const imagePromises = Array.from({ length: count }).map(() =>
      openai.images.generate({
        model: "gpt-image-1",
        prompt: `${visualPrompt}. Square 1:1 format, Instagram-ready. Japanese woman model only. Photorealistic, ultra high quality.`,
        n: 1,
        size: "1024x1024",
        quality: "high",
      })
    );

    const results = await Promise.all(imagePromises);
    const urls = results.map((r) => {
      const item = r.data?.[0];
      if (!item) return null;
      if (item.url) return item.url;
      if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
      return null;
    }).filter(Boolean);

    return NextResponse.json({ urls, visualPrompt });
  } catch (e) {
    return NextResponse.json({ error: "Image generation failed", detail: String(e) }, { status: 500 });
  }
}
