"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ImageFormat } from "@/types";

interface Props {
  confirmedCaption: string | null;
  imageFormat: ImageFormat;
  onImageFormatChange: (format: ImageFormat) => void;
}

export default function PaneD({ confirmedCaption, imageFormat, onImageFormatChange }: Props) {
  const [generated, setGenerated] = useState(false);

  const isLocked = confirmedCaption === null;
  const cols = imageFormat === "carousel" ? 3 : 1;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 shrink-0">
        <span className="text-xs font-semibold text-gray-700">D &nbsp; 画像構成プランナー</span>
        <div className="flex-1" />
        {!isLocked && (
          <span className="text-[11px] text-green-600 font-medium">キャプション確定済み</span>
        )}
      </div>

      <div className="flex-1 p-3 flex flex-col gap-3 overflow-auto">
        {isLocked ? (
          <div className="flex-1 flex items-center justify-center border border-dashed border-gray-200 rounded-md bg-gray-50">
            <p className="text-xs text-gray-400 text-center px-4">
              Cペインでキャプションを確定すると<br />アクティブになります
            </p>
          </div>
        ) : (
          <>
            {/* Format selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">投稿形式</span>
              {(["single", "carousel"] as ImageFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => { onImageFormatChange(f); setGenerated(false); }}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    imageFormat === f
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {f === "single" ? "単一画像" : "カルーセル"}
                </button>
              ))}
            </div>

            {/* Image area */}
            {generated ? (
              <div className={`grid gap-2 ${cols === 3 ? "grid-cols-3" : "grid-cols-1"}`}>
                {Array.from({ length: cols }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center bg-gray-100 border border-gray-200 rounded-md"
                    style={{ height: cols === 3 ? 96 : 200 }}
                  >
                    <span className="text-xs text-gray-400">AI生成 {i + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center border border-dashed border-gray-200 rounded-md h-40">
                <p className="text-xs text-gray-400">画像がここに表示されます</p>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              className="self-start text-xs"
              onClick={() => setGenerated(true)}
            >
              キャプションを元に画像生成
            </Button>

            {generated && (
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-700">Vercel Blob に自動保存済み — 1時間後に元URLが失効しても閲覧できます</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
