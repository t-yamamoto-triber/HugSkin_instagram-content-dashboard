"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CompetitorPost, BrandSettings } from "@/types";

interface Round {
  proposals: string[];
  feedback: string;
}

interface Props {
  refPost: CompetitorPost | null;
  brandSettings: BrandSettings;
  confirmedCaption: string | null;
  onConfirm: (caption: string) => void;
  onReset: () => void;
  onThemeChange?: (theme: string) => void;
}

export default function PaneC({ refPost, brandSettings, confirmedCaption, onConfirm, onReset, onThemeChange }: Props) {
  const [theme, setTheme] = useState("");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [viewingRound, setViewingRound] = useState(0);
  const [selectedProposal, setSelectedProposal] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRoundIndex = rounds.length - 1;
  const isLatestRound = viewingRound === currentRoundIndex;
  const displayedProposals = rounds[viewingRound]?.proposals ?? [];

  const charCount = caption.length;
  const hashCount = (caption.match(/#\S+/g) ?? []).length;

  const generate = async (fb?: string) => {
    setLoading(true);
    setError(null);
    setSelectedProposal(null);
    setCaption("");

    const prevRound = rounds[currentRoundIndex];
    const body = {
      theme,
      refPostCaption: refPost?.caption ?? null,
      regulation: brandSettings.regulation,
      feedback: fb ?? "",
      previousProposals: prevRound?.proposals ?? [],
      round: rounds.length + 1,
    };

    try {
      const res = await fetch("/api/caption/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }

      const newRound: Round = { proposals: data.proposals, feedback: fb ?? "" };
      setRounds((prev) => [...prev, newRound]);
      setViewingRound(rounds.length);
    } catch {
      setError("生成に失敗しました。もう一度試してください。");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => generate();

  const handleRegenerate = () => {
    if (!feedback.trim()) return;
    generate(feedback);
    setFeedback("");
  };

  const selectProposal = (index: number) => {
    setSelectedProposal(index);
    setCaption(displayedProposals[index]);
  };

  const handleReset = () => {
    setTheme("");
    setRounds([]);
    setViewingRound(0);
    setSelectedProposal(null);
    setCaption("");
    setFeedback("");
    setError(null);
    onReset();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 shrink-0">
        <span className="text-xs font-semibold text-gray-700">C &nbsp; AIキャプションエディタ</span>
        <div className="flex-1" />
        {rounds.length > 0 && (
          <span className="text-[11px] text-gray-400">ラウンド {viewingRound + 1} / {rounds.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-3 flex flex-col gap-3">

          {/* ── Confirmed state ── */}
          {confirmedCaption !== null ? (
            <>
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                <span className="text-green-700 text-sm">✓</span>
                <span className="text-xs text-green-700 font-medium">キャプション確定済み</span>
              </div>
              <Textarea value={confirmedCaption} disabled rows={7} className="text-sm bg-gray-50 resize-none" />
              <div className="flex items-center gap-4">
                <span className={`text-xs ${confirmedCaption.length > 2000 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                  残り {2200 - confirmedCaption.length} 文字
                </span>
                <span className={`text-xs ${(confirmedCaption.match(/#\S+/g) ?? []).length > 28 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                  #{(confirmedCaption.match(/#\S+/g) ?? []).length} / 30
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset} className="self-start text-red-600 border-red-200 hover:bg-red-50">
                やり直す
              </Button>
            </>
          ) : (
            <>
              {/* ── Input section (only visible when no proposals yet) ── */}
              {rounds.length === 0 && (
                <>
                  {/* Ref post */}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500 font-medium">参考にする競合投稿（任意）</span>
                    {refPost ? (
                      <div className="flex items-center gap-2 px-2 py-1.5 border-2 border-gray-900 rounded-md bg-gray-50">
                        <div className="w-8 h-8 bg-gray-400 rounded shrink-0" />
                        <p className="flex-1 min-w-0 text-xs text-gray-700 truncate">{refPost.caption}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 py-1">Bペインの投稿をクリックして選択</p>
                    )}
                  </div>

                  {/* Theme */}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500 font-medium">今回のテーマ（任意）</span>
                    <Input
                      value={theme}
                      onChange={(e) => { setTheme(e.target.value); onThemeChange?.(e.target.value); }}
                      placeholder="例：夏の新作コレクションを紹介したい"
                      className="text-xs h-8"
                      disabled={loading}
                    />
                  </div>

                  <Button size="sm" className="self-start" onClick={handleGenerate} disabled={loading}>
                    {loading ? "生成中…" : "AIに3案提案させる"}
                  </Button>
                </>
              )}

              {/* Error */}
              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
              )}

              {/* Loading indicator */}
              {loading && (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                  <span className="text-xs text-gray-500">Claudeが考えています…</span>
                </div>
              )}

              {/* ── Proposals ── */}
              {rounds.length > 0 && selectedProposal === null && !loading && (
                <>
                  {/* Round navigation */}
                  {rounds.length > 1 && (
                    <div className="flex items-center gap-1">
                      {rounds.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => { setViewingRound(i); setSelectedProposal(null); }}
                          className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                            viewingRound === i
                              ? "bg-gray-900 text-white border-gray-900"
                              : "border-gray-200 text-gray-500 hover:border-gray-400"
                          }`}
                        >
                          R{i + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {displayedProposals.map((text, i) => (
                      <div key={i} className="border border-gray-200 rounded-md p-2 flex flex-col gap-2 hover:border-gray-400 transition-colors">
                        <p className="text-[11px] text-gray-500 line-clamp-6 whitespace-pre-wrap leading-relaxed">{text}</p>
                        {isLatestRound && (
                          <Button variant="outline" size="sm" className="self-start text-xs h-7" onClick={() => selectProposal(i)}>
                            選ぶ
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Feedback & regenerate (only on latest round) */}
                  {isLatestRound && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-gray-500">気に入らない点を入力して再提案</span>
                      <Input
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="例：もっとカジュアルなトーンで"
                        className="text-xs h-8"
                        disabled={loading}
                        onKeyDown={(e) => { if (e.key === "Enter" && feedback.trim()) handleRegenerate(); }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="self-start text-xs h-7"
                        disabled={!feedback.trim() || loading}
                        onClick={handleRegenerate}
                      >
                        再提案（ラウンド {rounds.length + 1}）
                      </Button>
                    </div>
                  )}

                  <Button variant="ghost" size="sm" className="self-start text-xs text-gray-400 h-7" onClick={handleReset}>
                    最初からやり直す
                  </Button>
                </>
              )}

              {/* ── Editor ── */}
              {selectedProposal !== null && !loading && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">R{viewingRound + 1}・案{selectedProposal + 1} を編集中</span>
                    <div className="flex-1" />
                    <button
                      className="text-[11px] text-gray-400 hover:text-gray-700"
                      onClick={() => setSelectedProposal(null)}
                    >
                      ← 案一覧に戻る
                    </button>
                  </div>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={8}
                    className="text-sm resize-none"
                    placeholder="キャプション本文..."
                  />
                  <div className="flex items-center gap-4">
                    <span className={`text-xs ${charCount > 2000 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                      残り {2200 - charCount} 文字
                    </span>
                    <span className={`text-xs ${hashCount > 28 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                      #{hashCount} / 30
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="text-xs" onClick={() => onConfirm(caption)} disabled={!caption.trim()}>
                      このキャプションで確定する
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={handleReset}>
                      やり直す
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
