export type ViewMode = "card" | "list" | "calendar";

export type CompetitorTab = "competitor" | "saved";

export type ImageFormat = "single" | "carousel";

export interface InstagramPost {
  id: string;
  caption: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  timestamp: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  permalink: string;
}

export interface CompetitorPost {
  id: string;
  caption: string;
  imageUrl: string;
  timestamp: string;
  account: string;
  permalink: string;
}

export interface CompetitorAccount {
  username: string;
  label: string;
}

export interface Draft {
  id: string;
  caption: string;
  imageUrls: string[];
  imageFormat: ImageFormat;
  refPostId?: string;
  theme?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandSettings {
  regulation: string;
  imageDirection: string;
  competitorAccounts: CompetitorAccount[];
}

export interface CaptionProposal {
  id: number;
  text: string;
}
