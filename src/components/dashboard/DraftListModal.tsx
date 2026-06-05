"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Draft {
  id: string;
  caption: string | null;
  image_urls: string[];
  image_format: string;
  theme: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onLoad: (draft: Draft) => void;
}

export default function DraftListModal({ open, onClose, onLoad }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/drafts")
      .then((r) => r.json())
      .then((d) => setDrafts(d.drafts ?? []))
      .finally(() => setLoading(false));
  }, [open]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch("/api/drafts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    setDeletingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>下書き一覧</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-400">読み込み中…</div>
        ) : drafts.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">保存済みの下書きはありません</div>
        ) : (
          <div className="flex flex-col gap-2 py-2">
            {drafts.map((d) => (
              <div key={d.id} className="border border-gray-200 rounded-lg p-3 flex gap-3">
                {/* Thumbnail */}
                {d.image_urls[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.image_urls[0]} alt="" className="w-14 h-14 object-cover rounded shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-gray-100 rounded shrink-0 flex items-center justify-center text-[10px] text-gray-400">
                    画像なし
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  {d.theme && <p className="text-[11px] text-gray-400">テーマ: {d.theme}</p>}
                  <p className="text-xs text-gray-700 line-clamp-2">{d.caption ?? "（キャプションなし）"}</p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(d.updated_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    　{d.image_format === "carousel" ? "カルーセル" : "単一画像"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { onLoad(d); onClose(); }}>
                    読み込む
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 text-red-500 hover:text-red-700"
                    disabled={deletingId === d.id}
                    onClick={() => handleDelete(d.id)}
                  >
                    削除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
