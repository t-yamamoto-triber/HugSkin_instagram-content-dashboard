# Instagram Content Dashboard — HugSkin

## プロジェクト概要

HugSkin（M'stime株式会社）のInstagramコンテンツ制作を支援する4ペインダッシュボード。
自社の過去投稿・競合投稿を参照しながら、AIを使ってキャプション・画像を制作し下書き保存するツール。

**本番URL**: https://hug-skin-instagram-content-dashboar.vercel.app  
**リポジトリ**: https://github.com/t-yamamoto-triber/HugSkin_instagram-content-dashboard

---

## 技術スタック

| 区分 | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router), TypeScript |
| UI | Tailwind CSS, shadcn/ui |
| 認証・DB・Storage | Supabase (Auth / PostgreSQL / Storage) |
| AI - キャプション生成 | Anthropic Claude (claude-sonnet / haiku) |
| AI - 画像生成 | OpenAI gpt-image-1 |
| AI - ビジョン分析 | Claude Vision (Haiku) |
| 競合スクレイピング | Apify (Instagram Profile Scraper) |
| デプロイ | Vercel |

---

## ディレクトリ構成

```
src/
├── app/
│   ├── page.tsx                  # ルート（Dashboardをレンダリング）
│   ├── login/page.tsx            # ログインページ
│   ├── layout.tsx
│   └── api/
│       ├── instagram/posts/      # 自社Instagram投稿取得（Graph API）
│       ├── caption/generate/     # Claudeでキャプション生成
│       ├── image/generate/       # Claude Vision + gpt-image-1で画像生成
│       ├── competitor/fetch/     # Apifyで競合Instagram投稿取得
│       ├── account/suggest/      # Claudeでアカウント候補提案
│       ├── settings/             # ブランド設定 CRUD（Supabase）
│       ├── competitor-accounts/  # 競合アカウント CRUD（Supabase）
│       ├── saved-posts/          # 保存済み競合投稿 CRUD（Supabase）
│       ├── drafts/               # 下書き CRUD（Supabase）
│       ├── product-images/       # 商品画像アップロード（Supabase Storage）
│       └── proxy/image/          # Instagram CDN画像のCORSプロキシ
├── components/
│   ├── dashboard/
│   │   ├── Dashboard.tsx         # メインコンポーネント・状態管理
│   │   ├── SettingsModal.tsx     # 設定モーダル
│   │   └── DraftListModal.tsx    # 下書き一覧モーダル
│   └── panes/
│       ├── PaneA.tsx             # 自社過去投稿（カード/一覧/カレンダー）
│       ├── PaneB.tsx             # 競合投稿ビューア＋保存
│       ├── PaneC.tsx             # AIキャプション生成エディタ
│       └── PaneD.tsx             # AI画像生成プランナー
├── lib/
│   └── supabase.ts               # Supabaseクライアント
├── middleware.ts                 # 未認証→/loginにリダイレクト
└── types/index.ts                # 共通型定義
```

---

## Supabase テーブル構成

| テーブル | 主なカラム | 用途 |
|---|---|---|
| `brand_settings` | `id=1`, `regulation`, `image_direction`, `product_description`, `product_image_urls`, `updated_by` | ブランド設定（シングルレコード） |
| `competitor_accounts` | `username`, `label`, `added_by` | 競合アカウント一覧 |
| `saved_posts` | `post_id`, `username`, `caption`, `thumbnail_url`, `post_url`, `saved_at` | 保存済み競合投稿 |
| `drafts` | `caption`, `image_urls`, `image_format`, `theme`, `proposal_rounds`, `created_by`, `updated_by` | 下書き |

**Storage バケット**: `product-images`（商品画像、パブリック）

---

## 環境変数（.env.local / Vercel）

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
INSTAGRAM_ACCESS_TOKEN=         # Instagram Graph API 長期トークン
ANTHROPIC_API_KEY=              # Claude API
OPENAI_API_KEY=                 # gpt-image-1
APIFY_API_TOKEN=                # 競合投稿スクレイピング
NEXT_PUBLIC_APP_URL=            # 本番URL（画像プロキシ用）
```

---

## 4ペインの役割とデータフロー

```
┌─────────────────┬─────────────────┐
│   A 自社過去投稿  │  B 競合投稿      │
│                 │                 │
│ Instagram API   │ Apify scraper   │
│ 直近30件→PaneC  │ 保存した投稿→    │
│ 直近4枚→PaneD   │ チェックでPaneC  │
│                 │ に最大5件渡す    │
├─────────────────┼─────────────────┤
│  C キャプション  │  D 画像生成      │
│    生成エディタ  │   プランナー     │
│                 │                 │
│ Claude Sonnet   │ Claude Vision   │
│ 3案提案→選択→   │ + gpt-image-1   │
│ フィードバック→  │ 商品画像・自社   │
│ 次の3案...      │ トーンを参照     │
└─────────────────┴─────────────────┘
```

### PaneCのキャプション生成コンテキスト（優先度順）
1. ブランドレギュレーション（設定）
2. 自社過去30件のキャプション（PaneA）
3. 選択した競合投稿キャプション（最大5件、PaneBでチェック）

### PaneDの画像生成コンテキスト（優先度順）
1. 商品説明テキスト（設定）
2. 商品アップロード画像（設定、Claude Visionで分析）
3. 画像テイスト設定
4. 自社直近4枚のスタイル参照（Claude Visionで分析）

---

## 主要な開発上の注意点

- **Instagram CDN画像のCORS**: ブラウザからは直接取得不可。`/api/proxy/image?url=...` を経由する
- **Supabase RLS**: 全テーブルに `allow all` ポリシーが必要（無いとAnonキーでアクセス不可）
- **Instagram アクセストークン**: 60日で失効。Meta Developer でページトークンを再取得が必要
- **gpt-image-1**: `response_format` パラメータは非対応。`quality: "high"` で高品質生成
- **ScrollArea**: shadcn/uiの ScrollArea は挙動が不安定なため `div.overflow-y-auto` を使用
- **`NEXT_PUBLIC_APP_URL`**: Vercelの環境変数に本番URLを設定しないと画像プロキシが動かない

---

## ブランド情報（HugSkin）

- **商品**: C10 オールインワン美容液（化粧水・美容液・乳液・クリームの1本）
- **ターゲット**: 産後〜子育て期のママ（20代後半〜30代）
- **トーン**: 贅沢・頼れるお守り。ズボラ・手抜き・コスパはNG
- **薬機法**: シミ・美白・シワ改善表現はNG。ハリ・ツヤ・うるおい・透明感はOK
- **ハッシュタグ固定**: `#HugSkin #ハグスキン #オールインワン美容液 #ママ美容`
- **画像**: 日本人女性モデル・生活感あるリアルな空間・自然光・商品がロゴ見える状態で映る
