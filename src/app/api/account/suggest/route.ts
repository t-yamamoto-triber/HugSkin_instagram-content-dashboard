import { NextRequest, NextResponse } from "next/server";

export interface SuggestedAccount {
  username: string;
  fullName?: string;
  biography?: string;
  profilePicUrl?: string;
  followersCount?: number;
  isBusinessAccount?: boolean;
  postsCount?: number;
}

async function fetchHashtagPosts(hashtags: string[], token: string): Promise<string[]> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=${token}&timeout=90&memory=256`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hashtags,
        resultsLimit: 30,
        proxy: { useApifyProxy: true },
      }),
    }
  );
  if (!res.ok) throw new Error(`Hashtag scraper error: ${res.status}`);
  const items: Array<{ ownerUsername?: string }> = await res.json();

  // Deduplicate usernames
  const seen = new Set<string>();
  for (const item of items) {
    if (item.ownerUsername) seen.add(item.ownerUsername);
  }
  return Array.from(seen).slice(0, 20);
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
  const { hashtags, businessOnly = false } = await req.json();

  if (!process.env.APIFY_API_TOKEN) {
    return NextResponse.json({ error: "APIFY_API_TOKEN is not set" }, { status: 500 });
  }

  if (!hashtags || hashtags.length === 0) {
    return NextResponse.json({ accounts: [] });
  }

  const token = process.env.APIFY_API_TOKEN;

  try {
    // Step 1: Get usernames from hashtag posts
    const usernames = await fetchHashtagPosts(hashtags.slice(0, 3), token);
    if (usernames.length === 0) {
      return NextResponse.json({ accounts: [] });
    }

    // Step 2: Get full profile info for each username
    const accounts = await fetchProfiles(usernames, token);

    // Filter by business account if requested
    const filtered = businessOnly
      ? accounts.filter((a) => a.isBusinessAccount === true)
      : accounts;

    return NextResponse.json({ accounts: filtered });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
