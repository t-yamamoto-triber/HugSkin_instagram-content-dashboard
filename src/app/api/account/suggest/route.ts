import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export interface SuggestedAccount {
  username: string;
  fullName?: string;
  biography?: string;
  profilePicUrl?: string;
  followersCount?: number;
  isBusinessAccount?: boolean;
  postsCount?: number;
}

async function suggestUsernamesWithClaude(captions: string[], includeHint: string, excludeHint: string): Promise<string[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const captionText = captions.slice(0, 30).join("\n---\n");

  const prompt = `あなたはInstagramマーケティングの専門家です。
以下は日本のあるブランドアカウントの過去投稿のキャプションです。

【投稿キャプション一覧】
${captionText}

${includeHint ? `【優先する条件】\n以下の条件のアカウントを優先して提案してください。\n${includeHint}\n` : ""}
${excludeHint ? `【除外する条件】\n以下の条件のアカウントは提案しないでください。\n${excludeHint}\n` : ""}
このブランドがベンチマークすべき競合・参考になるInstagramアカウントのユーザー名を10〜15件提案してください。
実在する日本のブランド・企業アカウントを優先してください。

必ずJSON配列だけを返してください。説明文は不要です。
例: ["account1", "account2", "account3"]`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();

  // Extract JSON array from response
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];

  const parsed: unknown = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) return [];
  return (parsed as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 15);
}

async function fetchProfiles(usernames: string[], token: string): Promise<SuggestedAccount[]> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}&timeout=90&memory=256`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames,
        proxy: { useApifyProxy: true },
      }),
    }
  );
  if (!res.ok) throw new Error(`Profile scraper error: ${res.status}`);

  const items: Array<{
    username?: string;
    fullName?: string;
    biography?: string;
    profilePicUrl?: string;
    followersCount?: number;
    isBusinessAccount?: boolean;
    postsCount?: number;
  }> = await res.json();

  return items
    .filter((item) => item.username)
    .map((item) => ({
      username: item.username!,
      fullName: item.fullName,
      biography: item.biography,
      profilePicUrl: item.profilePicUrl,
      followersCount: item.followersCount,
      isBusinessAccount: item.isBusinessAccount,
      postsCount: item.postsCount,
    }));
}

export async function POST(req: NextRequest) {
  const { captions, businessOnly = false, includeHint = "", excludeHint = "" } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 500 });
  }
  if (!process.env.APIFY_API_TOKEN) {
    return NextResponse.json({ error: "APIFY_API_TOKEN is not set" }, { status: 500 });
  }

  if (!captions || captions.length === 0) {
    return NextResponse.json({ accounts: [] });
  }

  try {
    // Step 1: Claude suggests account usernames
    const usernames = await suggestUsernamesWithClaude(captions, includeHint, excludeHint);
    if (usernames.length === 0) {
      return NextResponse.json({ accounts: [], usernames: [] });
    }

    // Step 2: Fetch profiles via Apify
    const accounts = await fetchProfiles(usernames, process.env.APIFY_API_TOKEN);

    const filtered = businessOnly
      ? accounts.filter((a) => a.isBusinessAccount === true)
      : accounts;

    return NextResponse.json({ accounts: filtered, usernames });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
