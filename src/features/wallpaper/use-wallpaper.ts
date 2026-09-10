"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api-client";
import type {
  WallpaperFont,
  WallpaperProfile,
  WallpaperProfileInput,
  WallpaperProfilePatch,
  WallpaperShortcutToken,
  WallpaperShortcutTokenStatus,
  WallpaperStatus,
} from "./types";

const TOKEN_QUERY_KEY = ["/api/v1/wallpaper/shortcut-token"] as const;
const STATUS_QUERY_KEY = ["/api/v1/wallpaper/status"] as const;
const PROFILES_QUERY_KEY = ["/api/v1/wallpaper/profiles"] as const;

export function useWallpaper() {
  const queryClient = useQueryClient();
  const tokenStatus = useQuery({
    queryKey: TOKEN_QUERY_KEY,
    queryFn: () => apiJson<WallpaperShortcutTokenStatus>(TOKEN_QUERY_KEY[0]),
  });
  const fonts = useQuery({
    queryKey: ["/api/v1/wallpaper/fonts"],
    queryFn: () => apiJson<WallpaperFont[]>("/api/v1/wallpaper/fonts"),
  });
  const status = useQuery({
    queryKey: STATUS_QUERY_KEY,
    queryFn: () => apiJson<WallpaperStatus>(STATUS_QUERY_KEY[0]),
  });
  const profiles = useQuery({
    queryKey: PROFILES_QUERY_KEY,
    queryFn: () => apiJson<WallpaperProfile[]>(PROFILES_QUERY_KEY[0]),
  });
  const createToken = useMutation({
    mutationFn: () => apiJson<WallpaperShortcutToken>(TOKEN_QUERY_KEY[0], { method: "POST" }),
    onSuccess: (created) => {
      queryClient.setQueryData<WallpaperShortcutTokenStatus>(TOKEN_QUERY_KEY, {
        active: true,
        scope: created.scope,
        createdAt: created.createdAt,
      });
    },
  });
  const revokeToken = useMutation({
    mutationFn: () => apiJson<WallpaperShortcutTokenStatus>(TOKEN_QUERY_KEY[0], { method: "DELETE" }),
    onSuccess: (status) => queryClient.setQueryData(TOKEN_QUERY_KEY, status),
  });
  const uploadWallpaper = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.set("wallpaper", file);
      return apiJson<WallpaperStatus>("/api/v1/wallpaper/wallpaper", { method: "PUT", body });
    },
    onSuccess: (next) => {
      queryClient.setQueryData(STATUS_QUERY_KEY, next);
      void queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY });
    },
  });
  const createProfile = useMutation({
    mutationFn: (input: WallpaperProfileInput) => apiJson<WallpaperProfile>(PROFILES_QUERY_KEY[0], {
      method: "POST",
      body: JSON.stringify(input),
    }),
    onSuccess: (created) => {
      queryClient.setQueryData<WallpaperProfile[]>(PROFILES_QUERY_KEY, (current = []) => [...current, created]);
      void queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY });
    },
  });
  const updateProfile = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: WallpaperProfilePatch }) =>
      apiJson<WallpaperProfile>(`${PROFILES_QUERY_KEY[0]}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<WallpaperProfile[]>(PROFILES_QUERY_KEY, (current = []) =>
        current.map((profile) => profile.id === updated.id ? updated : profile));
      void queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY });
    },
  });
  const deleteProfile = useMutation({
    mutationFn: (id: string) => apiJson<void>(`${PROFILES_QUERY_KEY[0]}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).then(() => id),
    onSuccess: (id) => {
      queryClient.setQueryData<WallpaperProfile[]>(PROFILES_QUERY_KEY, (current = []) =>
        current.filter((profile) => profile.id !== id));
      void queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY });
    },
  });
  const setDefaultProfile = useMutation({
    mutationFn: (id: string) => apiJson<WallpaperProfile>(
      `${PROFILES_QUERY_KEY[0]}/${encodeURIComponent(id)}/default`,
      { method: "POST" },
    ),
    onSuccess: (updated) => {
      queryClient.setQueryData<WallpaperProfile[]>(PROFILES_QUERY_KEY, (current = []) =>
        current.map((profile) => ({ ...profile, isDefault: profile.id === updated.id })));
      queryClient.setQueryData<WallpaperStatus>(STATUS_QUERY_KEY, (current) => current ? {
        ...current,
        defaultProfileId: updated.id,
        defaultProfileName: updated.name,
      } : current);
      void queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY });
    },
  });

  return {
    tokenStatus: tokenStatus.data,
    tokenStatusLoading: tokenStatus.isLoading,
    tokenStatusError: tokenStatus.error,
    fonts: fonts.data ?? [],
    fontsLoading: fonts.isLoading,
    status: status.data,
    statusLoading: status.isLoading,
    statusError: status.error,
    profiles: profiles.data ?? [],
    profilesLoading: profiles.isLoading,
    profilesError: profiles.error,
    createToken,
    revokeToken,
    uploadWallpaper,
    createProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
  };
}
