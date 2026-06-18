import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });
  }

  const { caption, imageFormat, regulation, imageDirection } = await req.json();

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
    // Use Claude to generate a detailed visual prompt, then pass to gpt-image-1
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const promptRes = await claude.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 250,
      messages: [{ role: "user", content: promptInstruction }],
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
