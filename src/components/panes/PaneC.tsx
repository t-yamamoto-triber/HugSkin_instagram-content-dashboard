"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CompetitorPost, BrandSettings, CaptionProposal } from "@/types";

const MOCK_PROPOSALS: CaptionProposal[] = [
  { id: 1, text: "季節の変わり目にぴったりのアイテムが揃いました。\n今年のトレンドを取り入れながら、自分らしいスタイルを見つけてみてください。\n\n#新作 #ファッション #トレンド #コーデ" },
  { id: 2, text: "新しい季節の始まりとともに、新しいスタイルはいかがですか？\nこだわり抜いたアイテムで、毎日をもっと豊かに。\n\n#新生活 #スタイリング #おしゃれ #ファッション" },
  { id: 3, text: "この季節にぴったりのアイテムが入荷しました。\nシンプルだけど、着るたびに気分が上がるデザインです。\n\n#シンプルコーデ #ファッション #スタイル #コーデ" },
];

interface Props {
  refPost: CompetitorPost | null;
  brandSettings: BrandSettings;
  confirmedCaption: string | null;
  onConfirm: (caption: string) => void;
  onReset: () => void;
}

export default function PaneC({ refPost, confirmedCaption, onConfirm, onReset }: Props) {
  const [theme, setTheme] = useState("");
  const [proposalsShown, setProposalsShown] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [feedback, setFeedback] = useState("");
  const [round, setRound] = useState(1);

  const charCount = caption.length;
  const hashCount = (caption.match(/#\S+/g) ?? []).length;

  const selectProposal = (p: CaptionProposal) => {
    setSelectedProposal(p.id);
    setCaption(p.text);
    setProposalsShown(false);
  };

  const handleReset = () => {
    setProposalsShown(false);
    setSelectedProposal(null);
    setCaption("");
    setFeedback("");
    setRound(1);
    onReset();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 shrink-0">
        <span className="text-xs font-semibold text-gray-700">C &nbsp; AIキャプションエディタ</span>
        <div className="flex-1" />
        <span className="text-[11px] text-gray-400">ラウンド {round}</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 flex flex-col gap-3">

          {/* Confirmed state */}
          {confirmedCaption !== null ? (
            <>
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                <span className="text-green-700 text-sm">✓</span>
                <span className="text-xs text-green-700 font-medium">キャプション確定済み</span>
              </div>
              <Textarea value={confirmedCaption} disabled rows={7} className="text-sm bg-gray-50 resize-none" />
              <div className="flex items-center gap-4">
                <span className={`text-xs ${charCount > 2000 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                  残り {2200 - confirmedCaption.length} 文字
                </span>
                <span className={`text-xs ${hashCount > 28 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                  #{(confirmedCaption.match(/#\S+/g) ?? []).length} / 30
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset} className="self-start text-red-600 border-red-200 hover:bg-red-50">
                やり直す
              </Button>
            </>
          ) : (
            <>
              {/* Ref post */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-medium">参考にする競合投稿（任意）</span>
                {refPost ? (
                  <div className="flex items-center gap-2 px-2 py-1.5 border-2 border-gray-900 rounded-md bg-gray-50">
                    <div className="w-8 h-8 bg-gray-400 rounded shrink-0" />
                    <p className="flex-1 min-w-0 text-xs text-gray-700 truncate">{refPost.caption}</p>
                    <button
                      className="text-[10px] text-gray-400 hover:text-gray-700 shrink-0"
                    >
                      解除
                    </button>
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
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="例：夏の新作コレクションを紹介したい"
                  className="text-xs h-8"
                />
              </div>

              {/* Generate button */}
              <Button
                size="sm"
                className="self-start"
                onClick={() => { setProposalsShown(true); setSelectedProposal(null); setCaption(""); }}
              >
                AIに3案提案させる
              </Button>

              {/* Proposals */}
              {proposalsShown && selectedProposal === null && (
                <>
                  <div className="h-px bg-gray-100" />
                  <div className="grid grid-cols-3 gap-2">
                    {MOCK_PROPOSALS.map((p) => (
                      <div key={p.id} className="border border-gray-200 rounded-md p-2 flex flex-col gap-2 hover:border-gray-400 transition-colors">
                        <p className="text-[11px] text-gray-500 line-clamp-5 whitespace-pre-wrap leading-relaxed">{p.text}</p>
                        <Button variant="outline" size="sm" className="self-start text-xs h-7" onClick={() => selectProposal(p)}>
                          選ぶ
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-gray-500">気に入らない点を入力して再提案</span>
                    <Input
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="例：もっとカジュアルなトーンで"
                      className="text-xs h-8"
                    />
                    <div className="flex gap-2">
                      {round > 1 && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setRound(r => r - 1)}>
                          ← 前の案
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        disabled={!feedback}
                        onClick={() => { setRound(r => r + 1); setFeedback(""); }}
                      >
                        再提案
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Editor */}
              {selectedProposal !== null && (
                <>
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">案 {selectedProposal} を編集中</span>
                    <div className="flex-1" />
                    <button
                      className="text-[11px] text-gray-400 hover:text-gray-700"
                      onClick={() => { setSelectedProposal(null); setProposalsShown(true); }}
                    >
                      ← 案一覧に戻る
                    </button>
                  </div>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={7}
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
                    <Button size="sm" className="text-xs" onClick={() => onConfirm(caption)}>
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
      </ScrollArea>
    </div>
  );
}
