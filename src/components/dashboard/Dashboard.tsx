"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import PaneA from "@/components/panes/PaneA";
import PaneB from "@/components/panes/PaneB";
import PaneC from "@/components/panes/PaneC";
import PaneD from "@/components/panes/PaneD";
import SettingsModal from "@/components/dashboard/SettingsModal";
import DraftListModal from "@/components/dashboard/DraftListModal";
import type { CompetitorPost, BrandSettings, ImageFormat } from "@/types";

export default function Dashboard() {
  // Shared state
  const [refPost, setRefPost] = useState<CompetitorPost | null>(null);
  const [confirmedCaption, setConfirmedCaption] = useState<string | null>(null);
  const [imageFormat, setImageFormat] = useState<ImageFormat>("single");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftListOpen, setDraftListOpen] = useState(false);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    regulation: "",
    competitorAccounts: [
      { username: "brand_a", label: "@brand_a" },
      { username: "brand_b", label: "@brand_b" },
    ],
  });

  const handleCaptionConfirm = (caption: string) => {
    setConfirmedCaption(caption);
  };

  const handleCaptionReset = () => {
    setConfirmedCaption(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <span className="font-bold text-sm text-gray-900">
          Instagram Content Dashboard
        </span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
          設定
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDraftListOpen(true)}>
          下書き一覧
        </Button>
        <Button size="sm">下書き保存</Button>
      </header>

      {/* 4-pane grid */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 overflow-hidden">
        {/* Upper row */}
        <div className="border-r border-b border-gray-200 overflow-hidden">
          <PaneA />
        </div>
        <div className="border-b border-gray-200 overflow-hidden">
          <PaneB
            refPost={refPost}
            onRefPostChange={setRefPost}
            brandSettings={brandSettings}
          />
        </div>

        {/* Lower row */}
        <div className="border-r border-gray-200 overflow-hidden">
          <PaneC
            refPost={refPost}
            brandSettings={brandSettings}
            confirmedCaption={confirmedCaption}
            onConfirm={handleCaptionConfirm}
            onReset={handleCaptionReset}
          />
        </div>
        <div className="overflow-hidden">
          <PaneD
            confirmedCaption={confirmedCaption}
            imageFormat={imageFormat}
            onImageFormatChange={setImageFormat}
          />
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={brandSettings}
        onSave={setBrandSettings}
      />

      <DraftListModal
        open={draftListOpen}
        onClose={() => setDraftListOpen(false)}
      />
    </div>
  );
}
