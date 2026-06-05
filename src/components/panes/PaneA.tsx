"use client";

import { useState, useEffect, useRef } from "react";
import type { InstagramPost, ViewMode } from "@/types";

const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

function CalendarPostCell({ post, day, isToday }: { post: InstagramPost; day: number; isToday: boolean }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const imgSrc = post.thumbnailUrl || post.mediaUrl;

  return (
    <div
      ref={ref}
      className="min-h-[52px] border border-gray-100 rounded p-0.5 flex flex-col gap-0.5 relative cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`text-[10px] leading-none w-4 h-4 flex items-center justify-center ${isToday ? "bg-gray-900 text-white rounded-full font-bold" : "text-gray-400"}`}>
        {day}
      </div>
      {imgSrc
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={imgSrc} alt="" className="flex-1 w-full object-cover rounded min-h-[28px]" />
        : <div className="flex-1 bg-gray-300 rounded min-h-[28px]" />
      }
      {hovered && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg p-2 pointer-events-none">
          {imgSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc} alt="" className="w-full h-28 object-cover rounded mb-1.5" />
          )}
          <p className="text-[11px] text-gray-700 line-clamp-3">{post.caption ?? "（キャプションなし）"}</p>
          <p className="text-[10px] text-gray-400 mt-1">
            {new Date(post.timestamp).toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" })}
          </p>
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: InstagramPost }) {
  const [hovered, setHovered] = useState(false);
  const imgSrc = post.thumbnailUrl || post.mediaUrl;

  return (
    <div
      className="border border-gray-200 rounded-md overflow-hidden cursor-pointer hover:border-gray-400 transition-colors relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {imgSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgSrc} alt={post.caption ?? ""} className="w-full h-16 object-cover" />
      ) : (
        <div className="w-full h-16 bg-gray-200" />
      )}
      {hovered && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-white bg-black/60 px-2 py-1 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            開く
          </a>
        </div>
      )}
      <div className="p-1.5">
        <p className="text-[11px] text-gray-500 truncate">{post.caption ?? "（キャプションなし）"}</p>
        <p className="text-[11px] text-gray-300">{new Date(post.timestamp).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</p>
      </div>
    </div>
  );
}

export default function PaneA() {
  const [view, setView] = useState<ViewMode>("card");
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetch("/api/instagram/posts")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); }
        else {
          setPosts(data.posts);
          setNextCursor(data.nextCursor ?? null);
          setHasMore(data.hasMore ?? false);
        }
      })
      .catch(() => setError("データの取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  const loadMore = () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    fetch(`/api/instagram/posts?after=${nextCursor}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setPosts((prev) => [...prev, ...data.posts]);
          setNextCursor(data.nextCursor ?? null);
          setHasMore(data.hasMore ?? false);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  // Map posts to date key "M/D"
  const postByDate: Record<string, InstagramPost> = {};
  posts.forEach((p) => {
    const d = new Date(p.timestamp);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    postByDate[key] = p;
  });

  const prevMonth = () => { if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const startDow = new Date(calYear, calMonth - 1, 1).getDay();
  const today = new Date();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-200 shrink-0">
        <span className="text-xs font-semibold text-gray-700">A &nbsp; 自社過去投稿</span>
        <div className="flex-1" />
        {(["card", "list", "calendar"] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
              view === v ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
            }`}
          >
            {v === "card" ? "カード" : v === "list" ? "一覧" : "カレンダー"}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
          読み込み中...
        </div>
      )}
      {error && (
        <div className="flex-1 flex items-center justify-center text-xs text-red-400 px-4 text-center">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {view === "calendar" ? (
            <div className="flex-1 overflow-auto p-3">
              {/* Cal nav */}
              <div className="flex items-center gap-2 mb-2">
                <button onClick={prevMonth} className="px-2 py-0.5 border border-gray-200 rounded text-sm hover:bg-gray-50">‹</button>
                <select value={calYear} onChange={(e) => setCalYear(Number(e.target.value))} className="text-xs border border-gray-200 rounded px-1 py-0.5">
                  {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
                <select value={calMonth} onChange={(e) => setCalMonth(Number(e.target.value))} className="text-xs border border-gray-200 rounded px-1 py-0.5">
                  {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <button onClick={nextMonth} className="px-2 py-0.5 border border-gray-200 rounded text-sm hover:bg-gray-50">›</button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                {["日","月","火","水","木","金","土"].map(d => (
                  <div key={d} className="text-center text-[10px] text-gray-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: startDow }).map((_, i) => (
                  <div key={`e-${i}`} className="min-h-[52px] bg-gray-50 rounded border border-gray-100" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isToday = today.getFullYear() === calYear && today.getMonth() + 1 === calMonth && today.getDate() === day;
                  const post = postByDate[`${calMonth}/${day}`];
                  if (post) {
                    return <CalendarPostCell key={day} post={post} day={day} isToday={isToday} />;
                  }
                  return (
                    <div key={day} className="min-h-[52px] border border-gray-100 rounded p-0.5 flex flex-col gap-0.5">
                      <div className={`text-[10px] leading-none w-4 h-4 flex items-center justify-center ${isToday ? "bg-gray-900 text-white rounded-full font-bold" : "text-gray-400"}`}>
                        {day}
                      </div>
                    </div>
                  );
                })}
                {(() => {
                  const rem = (startDow + daysInMonth) % 7;
                  return rem === 0 ? null : Array.from({ length: 7 - rem }).map((_, i) => (
                    <div key={`t-${i}`} className="min-h-[52px] bg-gray-50 rounded border border-gray-100" />
                  ));
                })()}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-3">
                {posts.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">投稿がありません</p>
                ) : view === "card" ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {posts.map((p) => <PostCard key={p.id} post={p} />)}
                    </div>
                    {hasMore && (
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="mt-3 w-full py-1.5 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        {loadingMore ? "読み込み中…" : "もっと読み込む"}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex flex-col">
                      {posts.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                          {(p.thumbnailUrl || p.mediaUrl)
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={p.thumbnailUrl || p.mediaUrl} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                            : <div className="w-7 h-7 rounded bg-gray-200 shrink-0" />
                          }
                          <p className="flex-1 min-w-0 text-xs text-gray-700 truncate">{p.caption ?? "（キャプションなし）"}</p>
                          <span className="text-[11px] text-gray-300 shrink-0">
                            {new Date(p.timestamp).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                          </span>
                        </div>
                      ))}
                    </div>
                    {hasMore && (
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="mt-3 w-full py-1.5 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        {loadingMore ? "読み込み中…" : "もっと読み込む"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
