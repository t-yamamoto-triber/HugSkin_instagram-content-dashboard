"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import PaneA from "@/components/panes/PaneA";
import PaneB from "@/components/panes/PaneB";
import PaneC from "@/components/panes/PaneC";
import PaneD from "@/components/panes/PaneD";
import SettingsModal from "@/components/dashboard/SettingsModal";
import DraftListModal from "@/components/dashboard/DraftListModal";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { CompetitorPost, InstagramPost, BrandSettings, ImageFormat } from "@/types";

export default function Dashboard() {
  const [refPost, setRefPost] = useState<CompetitorPost | null>(null);
  const [ownPosts, setOwnPosts] = useState<InstagramPost[]>([]);
  const [selectedSavedPosts, setSelectedSavedPosts] = useState<CompetitorPost[]>([]);
  const [confirmedCaption, setConfirmedCaption] = useState<string | null>(null);
  const [proposalRounds, setProposalRounds] = useState<{ proposals: string[]; feedback: string }[]>([]);
  const [imageFormat, setImageFormat] = useState<ImageFormat>("single");
  const [generatedImageUrls, setGeneratedImageUrls] = useState<string[]>([]);
  const [currentTheme, setCurrentTheme] = useState("");
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftListOpen, setDraftListOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    regulation: "",
    imageDirection: "",
    competitorAccounts: [],
  });

  // Load user, brand settings and competitor accounts from Supabase on mount
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });

    // Load brand settings
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setBrandSettings(prev => ({
            ...prev,
            regulation: data.regulation ?? "",
            imageDirection: data.imageDirection ?? "",
          }));
        }
      })
      .catch(() => {});

    // Load competitor accounts
    fetch("/api/competitor-accounts")
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setBrandSettings(prev => ({ ...prev, competitorAccounts: data.accounts ?? [] }));
        }
      })
      .catch(() => {});
  }, []);

  const handleBrandSettingsSave = async (s: BrandSettings) => {
    setBrandSettings(s);

    // Save regulation + imageDirection
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        regulation: s.regulation,
        imageDirection: s.imageDirection,
        updatedBy: userEmail,
      }),
    });

    // Sync competitor accounts: add new ones
    for (const acc of s.competitorAccounts) {
      await fetch("/api/competitor-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: acc.username, label: acc.label, addedBy: userEmail }),
      });
    }
  };

  const handleCaptionConfirm = (caption: string, rounds: { proposals: string[]; feedback: string }[]) => {
    setConfirmedCaption(caption);
    setProposalRounds(rounds);
  };

  const handleCaptionReset = () => {
    setConfirmedCaption(null);
    setProposalRounds([]);
    setGeneratedImageUrls([]);
    setCurrentDraftId(null);
  };

  const handleSaveDraft = async () => {
    if (!confirmedCaption && generatedImageUrls.length === 0) {
      setSaveMsg("キャプションまたは画像がありません");
      setTimeout(() => setSaveMsg(null), 2000);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentDraftId,
          caption: confirmedCaption,
          imageUrls: generatedImageUrls,
          imageFormat,
          theme: currentTheme,
          proposalRounds,
          updatedBy: userEmail,
        }),
      });
      const data = await res.json();
      if (data.draft) {
        setCurrentDraftId(data.draft.id);
        setSaveMsg("保存しました");
      } else {
        setSaveMsg("保存に失敗しました");
      }
    } catch {
      setSaveMsg("保存に失敗しました");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 2000);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLoadDraft = (draft: any) => {
    setConfirmedCaption(draft.caption ?? null);
    setImageFormat(draft.image_format ?? "single");
    setGeneratedImageUrls(draft.image_urls ?? []);
    setCurrentTheme(draft.theme ?? "");
    setProposalRounds(draft.proposal_rounds ?? []);
    setCurrentDraftId(draft.id);
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <span className="font-bold text-sm text-gray-900">Instagram Content Dashboard</span>
        <div className="flex-1" />
        {saveMsg && (
          <span className={`text-xs px-2 py-1 rounded ${saveMsg.includes("失敗") ? "text-red-500 bg-red-50" : "text-green-600 bg-green-50"}`}>
            {saveMsg}
          </span>
        )}
        {userEmail && (
          <span className="text-xs text-gray-400 hidden sm:inline">{userEmail}</span>
        )}
        <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>設定</Button>
        <Button variant="ghost" size="sm" onClick={() => setDraftListOpen(true)}>下書き一覧</Button>
        <Button size="sm" onClick={handleSaveDraft} disabled={saving}>
          {saving ? "保存中…" : currentDraftId ? "上書き保存" : "下書き保存"}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-gray-400 text-xs">
          ログアウト
        </Button>
      </header>

      {/* 4-pane grid */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 overflow-hidden">
        <div className="border-r border-b border-gray-200 overflow-hidden">
          <PaneA
            onPostsLoaded={setOwnPosts}
            onAddCompetitorAccount={async (username) => {
              const next: BrandSettings = {
                ...brandSettings,
                competitorAccounts: brandSettings.competitorAccounts.some(a => a.username === username)
                  ? brandSettings.competitorAccounts
                  : [...brandSettings.competitorAccounts, { username, label: `@${username}` }],
              };
              await handleBrandSettingsSave(next);
            }}
          />
        </div>
        <div className="border-b border-gray-200 overflow-hidden">
          <PaneB
            refPost={refPost}
            onRefPostChange={setRefPost}
            brandSettings={brandSettings}
            selectedSavedPosts={selectedSavedPosts}
            onSelectedSavedPostsChange={setSelectedSavedPosts}
            userEmail={userEmail}
          />
        </div>
        <div className="border-r border-gray-200 overflow-hidden">
          <PaneC
            refPost={refPost}
            brandSettings={brandSettings}
            confirmedCaption={confirmedCaption}
            onConfirm={handleCaptionConfirm}
            onReset={handleCaptionReset}
            onThemeChange={setCurrentTheme}
            ownPostCaptions={ownPosts.slice(0, 30).map(p => p.caption ?? "").filter(Boolean)}
            selectedSavedPosts={selectedSavedPosts}
          />
        </div>
        <div className="overflow-hidden">
          <PaneD
            confirmedCaption={confirmedCaption}
            imageFormat={imageFormat}
            onImageFormatChange={setImageFormat}
            brandSettings={brandSettings}
            onImagesGenerated={setGeneratedImageUrls}
            referenceImageUrls={
              ownPosts
                .slice(0, 4)
                .map(p => p.mediaUrl ?? p.thumbnailUrl ?? "")
                .filter(Boolean)
            }
          />
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={brandSettings}
        onSave={handleBrandSettingsSave}
        userEmail={userEmail}
      />
      <DraftListModal
        open={draftListOpen}
        onClose={() => setDraftListOpen(false)}
        onLoad={handleLoadDraft}
      />
    </div>
  );
}
