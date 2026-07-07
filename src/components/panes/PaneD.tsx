"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ImageFormat, BrandSettings } from "@/types";

interface Props {
  confirmedCaption: string | null;
  imageFormat: ImageFormat;
  onImageFormatChange: (format: ImageFormat) => void;
  brandSettings: BrandSettings;
  onImagesGenerated?: (urls: string[]) => void;
  referenceImageUrls?: string[];
}

interface AnalysisCache {
  key: string;
  styleAnalysis: string;
  productVisual: string;
}

type Stage = "idle" | "analyzing" | "generating";
type Engine = "openai" | "gemini";

export default function PaneD({ confirmedCaption, imageFormat, onImageFormatChange, brandSettings, onImagesGenerated, referenceImageUrls = [] }: Props) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [visualPrompt, setVisualPrompt] = useState<string>("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [analysisCache, setAnalysisCache] = useState<AnalysisCache | null>(null);
  const [engine, setEngine] = useState<Engine>("openai");

  const isLocked = confirmedCaption === null;
  const loading = stage !== "idle";

  const handleGenerate = async () => {
    if (!confirmedCaption) return;
    setError(null);
    setImageUrls([]);
    setVisualPrompt("");

    const productImageUrls = brandSettings.productImageUrls ?? [];
    const cacheKey = JSON.stringify([referenceImageUrls, productImageUrls]);

    try {
      // Step 1: visual analysis — OpenAI path only (Gemini receives the actual
      // reference images, so no text summarization is needed).
      // Skipped when inputs haven't changed since the last run.
      let analysis = analysisCache?.key === cacheKey ? analysisCache : null;
      if (engine === "openai" && !analysis && (referenceImageUrls.length > 0 || productImageUrls.length > 0)) {
        setStage("analyzing");
        const res = await fetch("/api/image/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referenceImageUrls, productImageUrls }),
        });
        const data = await res.json();
        if (!data.error) {
          analysis = {
            key: cacheKey,
            styleAnalysis: data.styleAnalysis ?? "",
            productVisual: data.productVisual ?? "",
          };
          setAnalysisCache(analysis);
        }
      }

      // Step 2: prompt building + image generation
      setStage("generating");
      const res = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: confirmedCaption,
          imageFormat,
          regulation: brandSettings.regulation,
          imageDirection: brandSettings.imageDirection ?? "",
          referenceImageUrls,
          productDescription: brandSettings.productDescription ?? "",
          productImageUrls,
          engine,
          ...(engine === "openai" && analysis
            ? { styleAnalysis: analysis.styleAnalysis, productVisual: analysis.productVisual }
            : {}),
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setImageUrls(data.urls ?? []);
      onImagesGenerated?.(data.urls ?? []);
      setVisualPrompt(data.visualPrompt ?? "");
    } catch {
      setError("画像生成に失敗しました。もう一度試してください。");
    } finally {
      setStage("idle");
    }
  };

  const handleDownload = async (url: string, index: number) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `hugskin-image-${index + 1}.png`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleFormatChange = (f: ImageFormat) => {
    onImageFormatChange(f);
    setImageUrls([]);
    setVisualPrompt("");
    setError(null);
  };

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

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-3 flex flex-col gap-3">
          {isLocked ? (
            <div className="flex items-center justify-center border border-dashed border-gray-200 rounded-md h-48 bg-gray-50">
              <p className="text-xs text-gray-400 text-center px-4">
                Cペインでキャプションを確定すると<br />アクティブになります
              </p>
            </div>
          ) : (
            <>
              {/* Engine selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">生成AI</span>
                {(["openai", "gemini"] as Engine[]).map((e) => (
                  <button
                    key={e}
                    onClick={() => setEngine(e)}
                    disabled={loading}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      engine === e
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {e === "openai" ? "OpenAI" : "Gemini（参照画像）"}
                  </button>
                ))}
              </div>

              {/* Format selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">投稿形式</span>
                {(["single", "carousel"] as ImageFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => handleFormatChange(f)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      imageFormat === f
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {f === "single" ? "単一画像" : "カルーセル（3枚）"}
                  </button>
                ))}
              </div>

              {/* Reference images indicator */}
              {referenceImageUrls.length > 0 && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-blue-50 border border-blue-100 rounded-md">
                  <div className="flex -space-x-1.5">
                    {referenceImageUrls.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={`/api/proxy/image?url=${encodeURIComponent(url)}`}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover border border-white"
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-blue-600">
                    自社直近{referenceImageUrls.length}枚のトーンを参照中
                    {engine === "gemini" ? "（画像のまま入力）" : analysisCache ? " ✓分析済み" : ""}
                  </span>
                </div>
              )}

              {/* Image direction indicator */}
              {brandSettings.imageDirection && (
                <div className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-[11px] text-gray-400 mb-0.5">設定済みのテイスト</p>
                  <p className="text-xs text-gray-600 line-clamp-2">{brandSettings.imageDirection}</p>
                </div>
              )}

              {/* Generate button */}
              <Button
                size="sm"
                variant="outline"
                className="self-start text-xs"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading
                  ? `生成中… (${imageFormat === "carousel" ? "3枚" : "1枚"})`
                  : "キャプションをもとに画像を生成"}
              </Button>

              {/* Loading with stage progress */}
              {loading && (
                <div className="flex flex-col gap-1.5 py-4 items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                    <span className="text-xs text-gray-600">
                      {stage === "analyzing"
                        ? "1/2　投稿スタイル・商品画像を分析中…"
                        : engine === "gemini"
                          ? "プロンプト作成・画像生成中…（参照画像を直接入力）"
                          : "2/2　プロンプト作成・画像生成中…"}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {stage === "analyzing"
                      ? "初回のみ実行されます（10秒前後）"
                      : imageFormat === "carousel" ? "3枚で30〜60秒かかります" : "15〜30秒かかります"}
                  </span>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
              )}

              {/* Visual prompt used */}
              {visualPrompt && !loading && (
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-[11px] text-gray-400 mb-0.5">生成に使ったビジュアルプロンプト</p>
                  <p className="text-xs text-gray-600 italic whitespace-pre-wrap">{visualPrompt}</p>
                </div>
              )}

              {/* Images */}
              {imageUrls.length > 0 && !loading && (
                <div className={`grid gap-2 ${imageUrls.length >= 3 ? "grid-cols-3" : "grid-cols-1"}`}>
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`生成画像 ${i + 1}`}
                        className="w-full rounded-md border border-gray-200 object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white text-xs bg-black/60 px-2 py-1 rounded hover:bg-black/80"
                        >
                          開く
                        </a>
                        <button
                          onClick={() => handleDownload(url, i)}
                          className="text-white text-xs bg-black/60 px-2 py-1 rounded hover:bg-black/80"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
