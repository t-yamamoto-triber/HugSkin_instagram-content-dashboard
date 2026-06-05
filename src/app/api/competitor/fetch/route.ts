import { NextResponse } from "next/server";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = "apify~instagram-profile-scraper";

export async function POST(req: Request) {
  if (!APIFY_TOKEN) {
    return NextResponse.json({ error: "APIFY_API_TOKEN is not set" }, { status: 500 });
  }

  const { username } = await req.json();
  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  try {
    // Run Apify actor synchronously (waits for result, timeout 60s)
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60&memory=256`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [username],
          resultsLimit: 50,
        }),
      }
    );

    if (!runRes.ok) {
      const err = await runRes.text();
      return NextResponse.json({ error: "Apify error", detail: err }, { status: 400 });
    }

    const items = await runRes.json();

    // items is an array of profile objects; each has a `latestPosts` array
    const profile = Array.isArray(items) ? items[0] : null;
    if (!profile) {
      return NextResponse.json({ error: "No data returned from Apify" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posts = (profile.latestPosts ?? []).map((p: any) => ({
      id: p.id ?? p.shortCode,
      caption: p.caption ?? "",
      imageUrl: p.displayUrl ?? p.thumbnailUrl ?? "",
      timestamp: p.timestamp ?? p.takenAtDate ?? "",
      account: username,
      permalink: `https://www.instagram.com/p/${p.shortCode}/`,
    }));

    return NextResponse.json({ posts, username });
  } catch (e) {
    return NextResponse.json({ error: "Unexpected error", detail: String(e) }, { status: 500 });
  }
}
