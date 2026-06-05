"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { CompetitorPost, CompetitorTab, BrandSettings } from "@/types";

const MOCK_COMPETITOR: Record<string, CompetitorPost[]> = {
  brand_a: [
    { id: "1", caption: "【新作入荷】夏向けのさわやかなアイテムが勢揃い。ぜひ店頭でチェックを...", imageUrl: "", timestamp: "5/12", account: "brand_a", permalink: "" },
    { id: "2", caption: "人気スタイリストとのコラボ企画がスタート！期間限定コレクション公開中...", imageUrl: "", timestamp: "5/9", account: "brand_a", permalink: "" },
    { id: "3", caption: "サステナブルな素材にこだわった新ライン発売。地球にやさしい選択を...", imageUrl: "", timestamp: "5/5", account: "brand_a", permalink: "" },
    { id: "4", caption: "フォロワー1万人感謝キャンペーン開催！参加方法はプロフィールへ...", imageUrl: "", timestamp: "5/2", account: "brand_a", permalink: "" },
  ],
  brand_b: [
    { id: "1", caption: "今シーズン注目のカラーパレットをご紹介。アースカラーが主役です...", imageUrl: "", timestamp: "5/11", account: "brand_b", permalink: "" },
    { id: "2", caption: "週1投稿「スタッフの私服」コーナー。今週はオフィスカジュアル特集...", imageUrl: "", timestamp: "5/8", account: "brand_b", permalink: "" },
    { id: "3", caption: "新作バッグコレクション公開。機能性とデザインを両立した傑作...", imageUrl: "", timestamp: "5/4", account: "brand_b", permalink: "" },
  ],
};

const COLORS = ["bg-gray-400", "bg-gray-500", "bg-gray-600", "bg-gray-700"];

interface Props {
  refPost: CompetitorPost | null;
  onRefPostChange: (post: CompetitorPost | null) => void;
  brandSettings: BrandSettings;
}

export default function PaneB({ refPost, onRefPostChange, brandSettings }: Props) {
  const [tab, setTab] = useState<CompetitorTab>("competitor");
  const [account, setAccount] = useState(brandSettings.competitorAccounts[0]?.username ?? "brand_a");
  const [saved, setSaved] = useState<string[]>([]);

  const posts = MOCK_COMPETITOR[account] ?? [];
  const savedPosts = posts.filter((p) => saved.includes(p.id));

  const toggleSave = (id: string) =>
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const toggleRef = (post: CompetitorPost) =>
    onRefPostChange(refPost?.id === post.id ? null : post);

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
            {t === "competitor" ? "競合" : `保存済み${saved.length > 0 ? ` (${saved.length})` : ""}`}
          </button>
        ))}
        <div className="flex-1" />
        <select
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="text-xs border border-gray-200 rounded px-1.5 py-1"
        >
          {brandSettings.competitorAccounts.map((a) => (
            <option key={a.username} value={a.username}>{a.label}</option>
          ))}
        </select>
        <Button variant="ghost" size="sm" className="text-xs h-7">更新</Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {tab === "competitor" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {posts.map((p, i) => {
                  const isRef = refPost?.id === p.id;
                  const isSaved = saved.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`border rounded-md overflow-hidden cursor-pointer transition-all ${
                        isRef ? "border-gray-900 border-2" : "border-gray-200 hover:border-gray-400"
                      }`}
                      onClick={() => toggleRef(p)}
                    >
                      <div className={`relative h-16 ${COLORS[i % COLORS.length]}`}>
                        {isRef && (
                          <div className="absolute top-1 left-1 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded">
                            C参照中
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSave(p.id); }}
                          className="absolute top-1 right-1 bg-white text-[10px] px-1.5 py-0.5 rounded border border-gray-200 hover:bg-gray-50"
                        >
                          {isSaved ? "保存済み" : "保存"}
                        </button>
                      </div>
                      <div className="p-1.5">
                        <p className="text-[11px] text-gray-500 truncate">{p.caption}</p>
                        <p className="text-[11px] text-gray-300">{p.timestamp}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">投稿をクリックするとCペインの参照として選択できます</p>
            </>
          ) : savedPosts.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-8">保存済みの投稿はありません</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {savedPosts.map((p, i) => (
                <div key={p.id} className="border border-gray-200 rounded-md overflow-hidden">
                  <div className={`relative h-16 ${COLORS[i % COLORS.length]}`}>
                    <button
                      onClick={() => toggleSave(p.id)}
                      className="absolute top-1 right-1 bg-white text-[10px] px-1.5 py-0.5 rounded border border-gray-200"
                    >
                      解除
                    </button>
                  </div>
                  <div className="p-1.5">
                    <p className="text-[11px] text-gray-500 truncate">{p.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
