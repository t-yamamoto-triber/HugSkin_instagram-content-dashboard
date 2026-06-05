import { NextRequest, NextResponse } from "next/server";

const FIELDS = "id,caption,media_url,thumbnail_url,timestamp,media_type,permalink";

export async function GET(req: NextRequest) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const after = req.nextUrl.searchParams.get("after") ?? "";

  if (!token) {
    return NextResponse.json({ error: "INSTAGRAM_ACCESS_TOKEN is not set" }, { status: 500 });
  }

  try {
    const meRes = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${token}`
    );
    if (!meRes.ok) {
      const err = await meRes.json();
      return NextResponse.json({ error: "Failed to get user info", detail: err }, { status: 400 });
    }
    const me = await meRes.json();

    const cursor = after ? `&after=${after}` : "";
    const mediaRes = await fetch(
      `https://graph.instagram.com/${me.id}/media?fields=${FIELDS}&limit=24${cursor}&access_token=${token}`
    );
    if (!mediaRes.ok) {
      const err = await mediaRes.json();
      return NextResponse.json({ error: "Failed to fetch media", detail: err }, { status: 400 });
    }

    const media = await mediaRes.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posts = (media.data ?? []).map((p: any) => ({
      id: p.id,
      caption: p.caption ?? null,
      mediaUrl: p.media_url ?? null,
      thumbnailUrl: p.thumbnail_url ?? null,
      timestamp: p.timestamp,
      mediaType: p.media_type,
      permalink: p.permalink,
    }));

    return NextResponse.json({
      userId: me.id,
      username: me.username,
      posts,
      nextCursor: media.paging?.cursors?.after ?? null,
      hasMore: !!media.paging?.next,
    });
  } catch (e) {
    return NextResponse.json({ error: "Unexpected error", detail: String(e) }, { status: 500 });
  }
}
