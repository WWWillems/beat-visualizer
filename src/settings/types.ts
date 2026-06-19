export interface SocialProfileUrls {
  instagram: string;
  tiktok: string;
  snapchat: string;
  x: string;
}

export interface ArtistLogo {
  name: string;
  mimeType: string;
  size: number;
  updatedAt: number;
}

export interface AppSettings {
  artistName: string;
  website: string;
  socials: SocialProfileUrls;
  customMessage: string;
  artistLogo: ArtistLogo | null;
}
