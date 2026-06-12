import { NextRequest, NextResponse } from "next/server";

function extractHashtags(captions: string[]): string[] {
  const counts: Record<string, number> = {};
  for (const caption of captions) {
    const tags = caption.match(/#([^\s#、。！？!?,.]+)/g) ?? [];
    for (const tag of tags) {
      const normalized = tag.replace(/^#/, "").toLowerCase();
      counts[normalized] = (counts[normalized] ?? 0) + 1;
    }
  }
  // Return top 5 hashtags by frequency
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);
}

export async function POST(req: NextRequest) {
  const { captions } = await req.json();

  if (!process.env.APIFY_API_TOKEN) {
    return NextResponse.json({ error: "APIFY_API_TOKEN is not set" }, { status: 500 });
  }

  const hashtags = extractHashtags(captions ?? []);
  if (hashtags.length === 0) {
    return NextResponse.json({ accounts: [], hashtags: [] });
  }

  try {
    // Use the first 3 hashtags for search to keep results focused
    const searchHashtags = hashtags.slice(0, 3);

    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}&timeout=60&memory=256`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hashtags: searchHashtags,
          resultsLimit: 20,
          proxy: { useApifyProxy: true },
        }),
      }
    );

    if (!runRes.ok) {
      const text = await runRes.text();
      return NextResponse.json({ error: `Apify error: ${text}` }, { status: 500 });
    }

    const items: Array<{
      ownerUsername?: string;
      ownerFullName?: string;
      ownerId?: string;
      followersCount?: number;
      timestamp?: string;
    }> = await runRes.json();

    // Deduplicate by username and collect unique accounts
    const seen = new Set<string>();
    const accounts: Array<{ username: string; fullName?: string; followersCount?: number }> = [];

    for (const item of items) {
      const username = item.ownerUsername;
      if (!username || seen.has(username)) continue;
      seen.add(username);
      accounts.push({
        username,
        fullName: item.ownerFullName,
        followersCount: item.followersCount,
      });
      if (accounts.length >= 15) break;
    }

    return NextResponse.json({ accounts, hashtags: searchHashtags });
  } catch (e) {
    return NextResponse.json({ error: "Apify request failed", detail: String(e) }, { status: 500 });
  }
}
