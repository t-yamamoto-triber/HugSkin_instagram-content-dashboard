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
import { useState, useEffect, useRef } from "react";
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
  const [productDescription, setProductDescription] = useState(settings.productDescription ?? "");
  const [productImageUrls, setProductImageUrls] = useState<string[]>(settings.productImageUrls ?? []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRegulation(settings.regulation);
    setImageDirection(settings.imageDirection ?? "");
    setAccounts(settings.competitorAccounts);
    setProductDescription(settings.productDescription ?? "");
    setProductImageUrls(settings.productImageUrls ?? []);
  }, [settings]);

  const handleSave = () => {
    onSave({ ...settings, regulation, imageDirection, competitorAccounts: accounts, productDescription, productImageUrls });
    onClose();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/product-images", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setProductImageUrls(prev => [...prev, data.url]);
    } catch {
      // silent fail
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageRemove = async (url: string) => {
    const filename = url.split("/").pop();
    setProductImageUrls(prev => prev.filter(u => u !== url));
    if (filename) {
      await fetch("/api/product-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
    }
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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

          {/* Product info */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">商品情報（画像生成に反映）</label>

            {/* Product description text */}
            <Textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder={`例：\n白いエアレスポンプボトル（縦長・約30ml）。キャップはマットホワイト。\nロゴ「HUGSKIN」が正面に大文字で刻印されている。\n洗顔後に顔全体に1〜2プッシュして馴染ませるだけ。洗面台に立てて置くことが多い。`}
              rows={4}
              className="text-sm"
            />
            <p className="text-xs text-gray-400">ボトルの形状・色・使い方などを記述してください。</p>

            {/* Product image upload */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">商品画像（最大5枚）</span>
                {productImageUrls.length < 5 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? "アップロード中…" : "画像を追加"}
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              {productImageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {productImageUrls.map((url, i) => (
                    <div key={i} className="relative group w-16 h-16">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-16 h-16 object-cover rounded-md border border-gray-200" />
                      <button
                        onClick={() => handleImageRemove(url)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400">商品写真をアップロードするとAIが形状・色を把握して画像生成に反映します。</p>
            </div>
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
