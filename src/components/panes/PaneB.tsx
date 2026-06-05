"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { CompetitorPost, CompetitorTab, BrandSettings } from "@/types";

type ViewMode = "grid" | "list" | "calendar";

const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

function proxySrc(url: string) {
  return `/api/proxy/image?url=${encodeURIComponent(url)}`;
}

function PostHoverCard({ post }: { post: CompetitorPost }) {
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg p-2 pointer-events-none">
      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={proxySrc(post.imageUrl)} alt="" className="w-full h-32 object-cover rounded mb-1.5" />
      )}
      <p className="text-[11px] text-gray-700 whitespace-pre-wrap line-clamp-6">{post.caption || "（キャプションなし）"}</p>
      {post.timestamp && (
        <p className="text-[10px] text-gray-400 mt-1">
          {new Date(post.timestamp).toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" })}
        </p>
      )}
      {post.permalink && (
        <p className="text-[10px] text-blue-400 mt-0.5 truncate">{post.permalink}</p>
      )}
    </div>
  );
}

function PostGridCard({
  post, isRef, isSaved, onRef, onSave,
}: {
  post: CompetitorPost;
  isRef: boolean;
  isSaved: boolean;
  onRef: () => void;
  onSave: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`border rounded-md overflow-visible cursor-pointer transition-all relative ${
        isRef ? "border-gray-900 border-2" : "border-gray-200 hover:border-gray-400"
      }`}
      onClick={onRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && <PostHoverCard post={post} />}
      <div className="relative h-20 bg-gray-100 rounded-t-md overflow-hidden">
        {post.imageUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={proxySrc(post.imageUrl)} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gray-200" />
        }
        {isRef && (
          <div className="absolute top-1 left-1 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded">
            C参照中
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          className={`absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            isSaved ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {isSaved ? "保存済み" : "保存"}
        </button>
      </div>
      <div className="p-1.5">
        <p className="text-[11px] text-gray-500 line-clamp-2">{post.caption || "（キャプションなし）"}</p>
        <p className="text-[11px] text-gray-300 mt-0.5">
          {post.timestamp ? new Date(post.timestamp).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }) : ""}
        </p>
      </div>
    </div>
  );
}

function CalendarCell({ post, day, isToday, isRef, isSaved, onRef, onSave }: {
  post: CompetitorPost; day: number; isToday: boolean;
  isRef: boolean; isSaved: boolean; onRef: () => void; onSave: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`min-h-[52px] border rounded p-0.5 flex flex-col gap-0.5 relative cursor-pointer transition-colors ${
        isRef ? "border-gray-900 border-2" : "border-gray-100 hover:border-gray-300"
      }`}
      onClick={onRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && <PostHoverCard post={post} />}
      <div className={`text-[10px] leading-none w-4 h-4 flex items-center justify-center ${isToday ? "bg-gray-900 text-white rounded-full font-bold" : "text-gray-400"}`}>
        {day}
      </div>
      {post.imageUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={proxySrc(post.imageUrl)} alt="" className="flex-1 w-full object-cover rounded min-h-[28px]" />
        : <div className="flex-1 bg-gray-300 rounded min-h-[28px]" />
      }
      <button
        onClick={(e) => { e.stopPropagation(); onSave(); }}
        className={`absolute bottom-0.5 right-0.5 text-[9px] px-1 py-0.5 rounded border transition-colors ${
          isSaved ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
        }`}
      >
        {isSaved ? "済" : "保"}
      </button>
    </div>
  );
}

interface Props {
  refPost: CompetitorPost | null;
  onRefPostChange: (post: CompetitorPost | null) => void;
  brandSettings: BrandSettings;
}

export default function PaneB({ refPost, onRefPostChange, brandSettings }: Props) {
  const [tab, setTab] = useState<CompetitorTab>("competitor");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [account, setAccount] = useState("");
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    if (!account && brandSettings.competitorAccounts[0]?.username) {
      setAccount(brandSettings.competitorAccounts[0].username);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandSettings.competitorAccounts]);

  const [postsByAccount, setPostsByAccount] = useState<Record<string, CompetitorPost[]>>({});
  const [saved, setSaved] = useState<Record<string, CompetitorPost>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPosts = postsByAccount[account] ?? [];
  const savedPosts = Object.values(saved);
  const hasFetched = account in postsByAccount;

  // Build date map for calendar
  const postByDate: Record<string, CompetitorPost> = {};
  currentPosts.forEach((p) => {
    if (!p.timestamp) return;
    const d = new Date(p.timestamp);
    const key = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    postByDate[key] = p;
  });

  const prevMonth = () => { if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const startDow = new Date(calYear, calMonth - 1, 1).getDay();
  const today = new Date();

  const fetchPosts = useCallback(async (username: string) => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/competitor/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setPostsByAccount((prev) => ({ ...prev, [username]: data.posts }));
    } catch {
      setError("取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleSave = (post: CompetitorPost) => {
    setSaved((s) => {
      const next = { ...s };
      if (next[post.id]) { delete next[post.id]; }
      else { next[post.id] = post; }
      return next;
    });
  };

  const toggleRef = (post: CompetitorPost) =>
    onRefPostChange(refPost?.id === post.id ? null : post);

  const accounts = brandSettings.competitorAccounts;

  const renderPosts = (posts: CompetitorPost[]) => {
    if (viewMode === "list") {
      return (
        <div className="flex flex-col">
          {posts.map((p) => {
            const isRef = refPost?.id === p.id;
            const isSaved = !!saved[p.id];
            const [hovered, setHovered] = [false, () => {}]; void hovered; void setHovered;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 px-1 rounded transition-colors ${isRef ? "bg-gray-50" : ""}`}
                onClick={() => toggleRef(p)}
              >
                {p.imageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={proxySrc(p.imageUrl)} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                  : <div className="w-8 h-8 rounded bg-gray-200 shrink-0" />
                }
                <p className="flex-1 min-w-0 text-xs text-gray-700 truncate">{p.caption || "（キャプションなし）"}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSave(p); }}
                  className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                    isSaved ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {isSaved ? "保存済み" : "保存"}
                </button>
                {isRef && <span className="text-[10px] text-gray-500 shrink-0">参照中</span>}
              </div>
            );
          })}
        </div>
      );
    }
    if (viewMode === "calendar") {
      return (
        <div>
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
              const post = postByDate[`${calYear}/${calMonth}/${day}`];
              if (post) {
                return (
                  <CalendarCell
                    key={day} post={post} day={day} isToday={isToday}
                    isRef={refPost?.id === post.id} isSaved={!!saved[post.id]}
                    onRef={() => toggleRef(post)} onSave={() => toggleSave(post)}
                  />
                );
              }
              return (
                <div key={day} className="min-h-[52px] border border-gray-100 rounded p-0.5 flex flex-col">
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
      );
    }
    // grid (default)
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          {posts.map((p) => (
            <PostGridCard
              key={p.id} post={p}
              isRef={refPost?.id === p.id} isSaved={!!saved[p.id]}
              onRef={() => toggleRef(p)} onSave={() => toggleSave(p)}
            />
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">クリックするとCペインの参照として選択できます</p>
      </>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-200 shrink-0 flex-wrap">
        <span className="text-xs font-semibold text-gray-700">B &nbsp; 競合投稿</span>
        {(["competitor", "saved"] as CompetitorTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
              tab === t ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
            }`}
          >
            {t === "competitor" ? "競合" : `保存済み${savedPosts.length > 0 ? ` (${savedPosts.length})` : ""}`}
          </button>
        ))}
        {tab === "competitor" && hasFetched && (
          <>
            {(["grid","list","calendar"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                  viewMode === v ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-400"
                }`}
              >
                {v === "grid" ? "グリッド" : v === "list" ? "一覧" : "カレンダー"}
              </button>
            ))}
          </>
        )}
        <div className="flex-1" />
        {accounts.length > 0 && (
          <select
            value={account}
            onChange={(e) => { setAccount(e.target.value); setError(null); }}
            className="text-xs border border-gray-200 rounded px-1.5 py-1 max-w-[120px]"
          >
            {accounts.map((a) => (
              <option key={a.username} value={a.username}>{a.label}</option>
            ))}
          </select>
        )}
        <Button variant="ghost" size="sm" className="text-xs h-7" disabled={loading || !account} onClick={() => fetchPosts(account)}>
          {loading ? "取得中…" : "更新"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-3">
          {tab === "competitor" ? (
            <>
              {accounts.length === 0 && (
                <div className="flex items-center justify-center h-32 border border-dashed border-gray-200 rounded-md">
                  <p className="text-xs text-gray-400 text-center px-4">「設定」から競合アカウントを追加してください</p>
                </div>
              )}
              {accounts.length > 0 && !hasFetched && !loading && !error && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <p className="text-xs text-gray-400">@{account} の投稿を取得します</p>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => fetchPosts(account)}>取得する</Button>
                </div>
              )}
              {loading && (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                  <span className="text-xs text-gray-500">Apifyで取得中…（20〜60秒）</span>
                </div>
              )}
              {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
              {hasFetched && !loading && (
                currentPosts.length === 0
                  ? <p className="text-xs text-gray-400 text-center py-8">投稿が見つかりませんでした</p>
                  : renderPosts(currentPosts)
              )}
            </>
          ) : (
            savedPosts.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-8">保存済みの投稿はありません</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {savedPosts.map((p) => (
                  <div key={p.id} className="border border-gray-200 rounded-md overflow-hidden">
                    <div className="relative h-20 bg-gray-100">
                      {p.imageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={proxySrc(p.imageUrl)} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gray-200" />
                      }
                      <button
                        onClick={() => toggleSave(p)}
                        className="absolute top-1 right-1 bg-white text-[10px] px-1.5 py-0.5 rounded border border-gray-200 hover:bg-gray-50"
                      >
                        解除
                      </button>
                    </div>
                    <div className="p-1.5">
                      <p className="text-[11px] text-gray-500 line-clamp-2">{p.caption || "（キャプションなし）"}</p>
                      <p className="text-[11px] text-gray-400">@{p.account}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
