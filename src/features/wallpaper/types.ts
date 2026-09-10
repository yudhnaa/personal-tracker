export type WallpaperShortcutTokenStatus = {
  active: boolean;
  scope: "wallpaper:render";
  createdAt: string | null;
};

export type WallpaperShortcutToken = {
  token: string;
  scope: "wallpaper:render";
  createdAt: string;
};

export type WallpaperFont = {
  id: "system" | "serif" | "monospace";
  name: string;
};

export type WallpaperExclusionZone = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WallpaperStatus = {
  hasWallpaper: boolean;
  updatedAt: string | null;
  defaultProfileId: string | null;
  defaultProfileName: string | null;
};

export type WallpaperProfileInput = {
  name: string;
  phoneModel: string;
  screenWidth: number;
  screenHeight: number;
  fontId: WallpaperFont["id"];
  exclusionZones: WallpaperExclusionZone[];
  layoutId: "agenda-grid";
  layoutVersion: 1;
};

export type WallpaperProfilePatch = Partial<WallpaperProfileInput>;

export type WallpaperProfile = WallpaperProfileInput & {
  id: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};
