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
}

export default function SettingsModal({ open, onClose, settings, onSave }: Props) {
  const [regulation, setRegulation] = useState(settings.regulation);

  useEffect(() => {
    setRegulation(settings.regulation);
  }, [settings]);

  const handleSave = () => {
    onSave({ ...settings, regulation });
    onClose();
  };

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
