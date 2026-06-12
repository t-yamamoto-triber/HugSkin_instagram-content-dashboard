"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import type { BrandSettings } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  settings: BrandSettings;
  onSave: (settings: BrandSettings) => void;
  userEmail?: string | null;
}

export default function SettingsModal({ open, onClose, settings, onSave, userEmail: _userEmail }: Props) {
  const [regulation, setRegulation] = useState(settings.regulation);
  const [imageDirection, setImageDirection] = useState(settings.imageDirection ?? "");
  const [accounts, setAccounts] = useState(settings.competitorAccounts);
  const [newUsername, setNewUsername] = useState("");

  useEffect(() => {
    setRegulation(settings.regulation);
    setImageDirection(settings.imageDirection ?? "");
    setAccounts(settings.competitorAccounts);
  }, [settings]);

  const handleSave = () => {
    onSave({ ...settings, regulation, imageDirection, competitorAccounts: accounts });
    onClose();
  };

  const addAccount = () => {
    const u = newUsername.trim().replace(/^@/, "");
    if (!u || accounts.find((a) => a.username === u)) return;
    setAccounts((prev) => [...prev, { username: u, label: `@${u}` }]);
    setNewUsername("");
  };

  const removeAccount = (username: string) =>
    setAccounts((prev) => prev.filter((a) => a.username !== username));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>設定</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Brand regulation */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              ブランドレギュレーション・トンマナ
            </label>
            <Textarea
              value={regulation}
              onChange={(e) => setRegulation(e.target.value)}
              placeholder={`例：\n- ブランド名：HugSkin\n- ターゲット：20〜30代女性\n- トーン：親しみやすく、プロフェッショナル\n- 禁止ワード：安い、激安\n- 必ず入れる要素：季節感、ライフスタイル提案`}
              rows={8}
              className="text-sm"
            />
            <p className="text-xs text-gray-400">
              プロンプト形式で自由に記述してください。CとDのAI出力に反映されます。
            </p>
          </div>

          {/* Image direction */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              画像テイスト・方向性
            </label>
            <Textarea
              value={imageDirection}
              onChange={(e) => setImageDirection(e.target.value)}
              placeholder={`例：\n- 白を基調としたミニマルなスタジオ撮影風\n- 自然光、アウトドア、ナチュラルテイスト\n- 韓国コスメっぽいパステルカラー\n- モデルは登場させず、商品単体のフラットレイ`}
              rows={5}
              className="text-sm"
            />
            <p className="text-xs text-gray-400">
              Pane Dの画像生成プロンプトに自動反映されます。
            </p>
          </div>

          {/* Competitor accounts */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">競合アカウント</label>
            <div className="flex gap-2">
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="@username"
                className="text-sm h-8 flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") addAccount(); }}
              />
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addAccount}>追加</Button>
            </div>
            {accounts.length > 0 && (
              <div className="flex flex-col gap-1 mt-1">
                {accounts.map((a) => (
                  <div key={a.username} className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-200 rounded-md">
                    <span className="text-xs text-gray-700 flex-1">{a.label}</span>
                    <button onClick={() => removeAccount(a.username)} className="text-[11px] text-gray-400 hover:text-red-500">削除</button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400">最大10アカウント。PaneBで投稿を取得できます。</p>
          </div>

          {/* Future: Google Doc URL */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                外部ドキュメント読み込み
              </label>
              <Badge variant="secondary" className="text-xs">将来対応予定</Badge>
            </div>
            <Input
              disabled
              placeholder="Google Doc / Spreadsheet の URL を貼る"
              className="text-sm bg-gray-50"
            />
            <p className="text-xs text-gray-400">
              ブランドガイドラインのドキュメントURLを読み込んで自動反映できるようになります。
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
