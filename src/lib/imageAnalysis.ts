import type Anthropic from "@anthropic-ai/sdk";

type ImageBlock = {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/jpeg" | "image/png" | "image/webp";
    data: string;
  };
};

function validHttpUrls(urls: unknown): string[] {
  return Array.isArray(urls)
    ? urls.filter((u): u is string => typeof u === "string" && u.startsWith("http"))
    : [];
}

async function fetchAsImageBlock(url: string): Promise<ImageBlock | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: contentType as ImageBlock["source"]["media_type"],
        data: Buffer.from(buffer).toString("base64"),
      },
    };
  } catch {
    return null;
  }
}

async function describeImages(
  claude: Anthropic,
  blocks: ImageBlock[],
  instruction: string,
  maxTokens: number
): Promise<string> {
  if (blocks.length === 0) return "";
  const res = await claude.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: [
          ...blocks,
          { type: "text", text: instruction },
        ] as Parameters<typeof claude.messages.create>[0]["messages"][0]["content"],
      },
    ],
  });
  return (res.content[0] as { type: string; text: string }).text.trim();
}

// Instagram CDN images must go through the CORS proxy
export async function analyzeStyle(claude: Anthropic, referenceImageUrls: unknown): Promise<string> {
  const urls = validHttpUrls(referenceImageUrls);
  if (urls.length === 0) return "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const blocks = (
    await Promise.all(
      urls.map((url) => fetchAsImageBlock(`${baseUrl}/api/proxy/image?url=${encodeURIComponent(url)}`))
    )
  ).filter((b): b is ImageBlock => b !== null);
  return describeImages(
    claude,
    blocks,
    "These are recent Instagram posts from a Japanese skincare brand. In 2-3 sentences in English, describe the consistent visual style: color palette, lighting, background setting, mood, and photography style. Be specific and concise. Output style description only.",
    200
  );
}

export async function analyzeProduct(claude: Anthropic, productImageUrls: unknown): Promise<string> {
  const urls = validHttpUrls(productImageUrls).slice(0, 3);
  if (urls.length === 0) return "";
  const blocks = (await Promise.all(urls.map(fetchAsImageBlock))).filter(
    (b): b is ImageBlock => b !== null
  );
  return describeImages(
    claude,
    blocks,
    "Describe this skincare product's physical appearance in 2 sentences in English: bottle shape, color, size, label/logo design. Be precise and visual. Output description only.",
    150
  );
}
