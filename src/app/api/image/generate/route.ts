import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });
  }

  const { caption, imageFormat, regulation, imageDirection } = await req.json();

  const count = imageFormat === "carousel" ? 3 : 1;

  // Build a concise visual prompt from the caption
  const promptInstruction = `以下のInstagramキャプションに合う画像のビジュアルプロンプトを英語で1文（60語以内）で書いてください。画像の説明のみを出力し、余分な説明は不要です。\n\nキャプション:\n${caption}\n\n${imageDirection ? `画像のテイスト・方向性: ${imageDirection}` : ""}\n${regulation ? `ブランド情報: ${regulation}` : ""}`;

  try {
    // Use Claude (or GPT) to generate a visual prompt, then pass to DALL-E
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const promptRes = await claude.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 150,
      messages: [{ role: "user", content: promptInstruction }],
    });
    const visualPrompt = (promptRes.content[0] as { type: string; text: string }).text.trim();

    // Generate images with DALL-E 3 (count times)
    const imagePromises = Array.from({ length: count }).map(() =>
      openai.images.generate({
        model: "gpt-image-1",
        prompt: `${visualPrompt}. Square format, Instagram-ready, high quality product/lifestyle photography style.`,
        n: 1,
        size: "1024x1024",
      })
    );

    const results = await Promise.all(imagePromises);
    const urls = results.map((r) => {
      const item = r.data[0];
      if (item.url) return item.url;
      // gpt-image-1 returns base64
      if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
      return null;
    }).filter(Boolean);

    return NextResponse.json({ urls, visualPrompt });
  } catch (e) {
    return NextResponse.json({ error: "Image generation failed", detail: String(e) }, { status: 500 });
  }
}
