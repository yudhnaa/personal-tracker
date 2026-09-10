"use client";

import { Check, Clipboard, Edit3, Image as ImageIcon, KeyRound, Plus, RotateCcw, ShieldCheck, Smartphone, Star, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { TextField } from "@/components/form-controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, gatewayApiUrl } from "@/lib/api-client";
import { messages, type Locale } from "@/lib/i18n";
import type { WallpaperExclusionZone, WallpaperProfile, WallpaperProfileInput } from "./types";
import { useWallpaper } from "./use-wallpaper";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ZONES = 12;
type Point = { x: number; y: number };
type Drag = { start: Point; current: Point };
type FieldErrors = Partial<Record<keyof WallpaperProfileInput, string>>;
type CopyKind = "token" | `profile:${string}`;

const INITIAL_PROFILE: WallpaperProfileInput = {
  name: "", phoneModel: "", screenWidth: 390, screenHeight: 844, fontId: "system",
  exclusionZones: [], layoutId: "agenda-grid", layoutVersion: 1,
};

export function WallpaperSettingsPanel({ locale }: { locale: Locale }) {
  const t = messages[locale].components.settings.wallpaper;
  const confirm = useConfirm();
  const wallpaper = useWallpaper();
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [wallpaperFile, setWallpaperFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<WallpaperProfileInput>(INITIAL_PROFILE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [range, setRange] = useState(1);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [copied, setCopied] = useState<CopyKind | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const draftZone = drag ? zoneFromPoints(drag.start, drag.current) : null;
  const dimensionsValid = validDimensions(profileDraft.screenWidth, profileDraft.screenHeight);
  const sortedProfiles = useMemo(
    () => [...wallpaper.profiles].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
    [wallpaper.profiles],
  );
  const tokenMutationError = wallpaper.createToken.error ?? wallpaper.revokeToken.error;
  const profileMutationError = wallpaper.createProfile.error ?? wallpaper.updateProfile.error
    ?? wallpaper.deleteProfile.error ?? wallpaper.setDefaultProfile.error;

  async function handleTokenCreate() {
    if (wallpaper.tokenStatus?.active) {
      const approved = await confirm({ title: t.rotateTitle, message: t.rotateMessage, confirmLabel: t.rotate, danger: true });
      if (!approved) return;
    }
    try { setRawToken((await wallpaper.createToken.mutateAsync()).token); } catch { /* shown below */ }
  }

  async function handleTokenRevoke() {
    const approved = await confirm({ title: t.revokeTitle, message: t.revokeMessage, confirmLabel: t.revoke, danger: true });
    if (!approved) return;
    try { await wallpaper.revokeToken.mutateAsync(); setRawToken(null); } catch { /* shown below */ }
  }

  function handleFile(file: File | undefined) {
    setUploadError(null);
    if (!file) return;
    if (!isSupportedImage(file) || file.size > MAX_FILE_BYTES) {
      setWallpaperFile(null); setUploadError(t.invalidImage); return;
    }
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return nextUrl; });
    setWallpaperFile(file);
  }

  async function uploadLatestWallpaper() {
    if (!wallpaperFile) return;
    setUploadError(null);
    try { await wallpaper.uploadWallpaper.mutateAsync(wallpaperFile); setWallpaperFile(null); }
    catch (error) { setUploadError(errorMessage(error, t.uploadFailed)); }
  }

  function updateDraft<K extends keyof WallpaperProfileInput>(field: K, value: WallpaperProfileInput[K]) {
    setProfileDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function editProfile(profile: WallpaperProfile) {
    setEditingId(profile.id);
    setProfileDraft({ name: profile.name, phoneModel: profile.phoneModel, screenWidth: profile.screenWidth,
      screenHeight: profile.screenHeight, fontId: profile.fontId, exclusionZones: profile.exclusionZones,
      layoutId: profile.layoutId, layoutVersion: profile.layoutVersion });
    setFieldErrors({});
  }

  function resetProfileForm() { setEditingId(null); setProfileDraft(INITIAL_PROFILE); setFieldErrors({}); }

  async function saveProfile() {
    const validation = validateProfile(profileDraft, t.requiredField, t.invalidDimensions);
    setFieldErrors(validation);
    if (Object.keys(validation).length) return;
    try {
      if (editingId) await wallpaper.updateProfile.mutateAsync({ id: editingId, patch: profileDraft });
      else await wallpaper.createProfile.mutateAsync(profileDraft);
      resetProfileForm();
    } catch (error) {
      const serverErrors = apiFieldErrors(error, t.invalidField);
      if (Object.keys(serverErrors).length) setFieldErrors(serverErrors);
    }
  }

  async function removeProfile(profile: WallpaperProfile) {
    if (profile.isDefault) return;
    const approved = await confirm({ title: t.deleteProfileTitle, message: t.deleteProfileMessage(profile.name), confirmLabel: t.deleteProfile, danger: true });
    if (!approved) return;
    try { await wallpaper.deleteProfile.mutateAsync(profile.id); if (editingId === profile.id) resetProfileForm(); }
    catch { /* shown below */ }
  }

  function pointFromEvent(event: ReactPointerEvent<HTMLDivElement>): Point | null {
    const bounds = previewRef.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) return null;
    return { x: clamp((event.clientX - bounds.left) / bounds.width), y: clamp((event.clientY - bounds.top) / bounds.height) };
  }
  function startZone(event: ReactPointerEvent<HTMLDivElement>) {
    if (profileDraft.exclusionZones.length >= MAX_ZONES || event.button !== 0) return;
    const point = pointFromEvent(event); if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId); setDrag({ start: point, current: point });
  }
  function moveZone(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return; const point = pointFromEvent(event);
    if (point) setDrag((current) => current ? { ...current, current: point } : null);
  }
  function finishZone(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const zone = zoneFromPoints(drag.start, pointFromEvent(event) ?? drag.current);
    if (zone.width >= 0.02 && zone.height >= 0.02) updateDraft("exclusionZones", [...profileDraft.exclusionZones, roundZone(zone)]);
    setDrag(null);
  }
  function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && profileDraft.exclusionZones.length < MAX_ZONES) {
      event.preventDefault(); const offset = Math.min(profileDraft.exclusionZones.length * 0.025, 0.2);
      updateDraft("exclusionZones", [...profileDraft.exclusionZones, { x: 0.35 + offset / 2, y: 0.08 + offset, width: 0.3, height: 0.08 }]);
    }
    if ((event.key === "Delete" || event.key === "Backspace") && profileDraft.exclusionZones.length) {
      event.preventDefault(); updateDraft("exclusionZones", profileDraft.exclusionZones.slice(0, -1));
    }
  }
  async function copy(value: string, kind: CopyKind) {
    try { await navigator.clipboard.writeText(value); setCopied(kind); window.setTimeout(() => setCopied((current) => current === kind ? null : current), 1600); }
    catch { setCopied(null); }
  }

  return <section className="space-y-4 rounded-[var(--radius-inner)] bg-surface-sunken p-3">
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink"><ImageIcon size={17} aria-hidden="true" /></div>
      <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-ink">{t.title}</h3><p className="mt-1 text-xs leading-relaxed text-ink-soft">{t.description}</p></div>
    </div>

    {!wallpaper.statusLoading && !wallpaper.profilesLoading && (!wallpaper.status?.hasWallpaper || !wallpaper.profiles.length) ?
      <div className="rounded-[var(--radius-inner)] border border-accent/25 bg-accent-soft p-3">
        <p className="text-xs font-semibold text-accent-ink">{t.firstTimeTitle}</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-relaxed text-ink-soft">
          <li className={wallpaper.status?.hasWallpaper ? "line-through opacity-60" : ""}>{t.firstTimeUpload}</li>
          <li className={wallpaper.profiles.length ? "line-through opacity-60" : ""}>{t.firstTimeProfile}</li><li>{t.firstTimeShortcut}</li>
        </ol>
      </div> : null}

    <Panel>
      <PanelTitle icon={<KeyRound size={16} />} title={t.shortcutToken} status={wallpaper.tokenStatusLoading ? t.checking : wallpaper.tokenStatusError ? t.unavailable : wallpaper.tokenStatus?.active ? t.active : t.inactive} />
      <p className="text-xs leading-relaxed text-ink-soft">{t.tokenDescription}</p>
      {wallpaper.tokenStatusError ? <Alert>{t.tokenStatusError}</Alert> : null}
      {rawToken ? <div className="space-y-2 rounded-[var(--radius-inner)] border border-accent/30 bg-accent-soft p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-accent-ink"><ShieldCheck size={15} />{t.tokenShownOnce}</div>
        <code className="block break-all rounded-lg bg-surface px-2.5 py-2 text-xs text-ink">{rawToken}</code>
        <ActionButton onClick={() => void copy(rawToken, "token")}>{copied === "token" ? <Check size={14} /> : <Clipboard size={14} />}{copied === "token" ? t.copied : t.copyToken}</ActionButton>
      </div> : null}
      {tokenMutationError ? <Alert>{errorMessage(tokenMutationError, t.tokenError)}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={() => void handleTokenCreate()} disabled={wallpaper.createToken.isPending || wallpaper.tokenStatusLoading || Boolean(wallpaper.tokenStatusError)}>
          {wallpaper.tokenStatus?.active ? <RotateCcw size={14} /> : <Plus size={14} />}{wallpaper.tokenStatus?.active ? t.rotate : t.createToken}
        </ActionButton>
        {wallpaper.tokenStatus?.active ? <DangerButton onClick={() => void handleTokenRevoke()} disabled={wallpaper.revokeToken.isPending}><Trash2 size={14} />{t.revoke}</DangerButton> : null}
      </div>
    </Panel>

    <Panel>
      <PanelTitle icon={<Upload size={16} />} title={t.storedWallpaper} status={wallpaper.statusLoading ? t.checking : wallpaper.statusError ? t.unavailable : wallpaper.status?.hasWallpaper ? t.wallpaperReady : t.wallpaperMissing} />
      <p className="text-xs leading-relaxed text-ink-soft">{wallpaper.status?.hasWallpaper && wallpaper.status.updatedAt ? t.wallpaperUpdated(new Date(wallpaper.status.updatedAt).toLocaleString(locale)) : t.wallpaperDescription}</p>
      {wallpaper.statusError ? <Alert>{t.statusError}</Alert> : null}
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-surface-muted px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-hover">
        <ImageIcon size={15} />{wallpaperFile ? wallpaperFile.name : wallpaper.status?.hasWallpaper ? t.chooseReplacement : t.chooseWallpaper}
        <input type="file" accept=".png,.jpg,.jpeg,.heic,image/png,image/jpeg,image/heic,image/heif" className="sr-only" aria-label={wallpaper.status?.hasWallpaper ? t.chooseReplacement : t.chooseWallpaper} onChange={(event) => handleFile(event.target.files?.[0])} />
      </label>
      {uploadError ? <Alert>{uploadError}</Alert> : null}<p className="text-[11px] leading-relaxed text-ink-faint">{t.uploadPrivacy}</p>
      <ActionButton onClick={() => void uploadLatestWallpaper()} disabled={!wallpaperFile || wallpaper.uploadWallpaper.isPending}><Upload size={14} />{wallpaper.uploadWallpaper.isPending ? t.uploading : wallpaper.status?.hasWallpaper ? t.replaceWallpaper : t.uploadWallpaper}</ActionButton>
    </Panel>

    <Panel>
      <PanelTitle icon={<Smartphone size={16} />} title={t.profiles} status={wallpaper.profilesLoading ? t.checking : t.profileCount(wallpaper.profiles.length)} />
      <p className="text-xs leading-relaxed text-ink-soft">{t.profilesDescription}</p>{wallpaper.profilesError ? <Alert>{t.profilesError}</Alert> : null}
      <div className="space-y-2">{sortedProfiles.map((profile) => {
        const kind = `profile:${profile.id}` as const;
        return <article key={profile.id} className="rounded-[var(--radius-inner)] border border-line p-3">
          <div className="flex items-start gap-2"><div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5"><h5 className="truncate text-sm font-semibold text-ink">{profile.name}</h5>{profile.isDefault ? <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-ink"><Star size={10} fill="currentColor" />{t.defaultProfile}</span> : null}</div>
            <p className="mt-1 text-xs text-ink-soft">{profile.phoneModel} · {profile.screenWidth} × {profile.screenHeight} · {profile.fontId}</p>
          </div>
          <button type="button" onClick={() => editProfile(profile)} aria-label={t.editProfileLabel(profile.name)} className="rounded-full p-2 text-ink-soft hover:bg-surface-hover hover:text-ink"><Edit3 size={14} /></button>
          {!profile.isDefault ? <button type="button" onClick={() => void removeProfile(profile)} aria-label={t.deleteProfileLabel(profile.name)} className="rounded-full p-2 text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"><Trash2 size={14} /></button> : null}</div>
          <div className="mt-3 flex flex-wrap gap-2">{!profile.isDefault ? <SecondaryButton onClick={() => wallpaper.setDefaultProfile.mutate(profile.id)} disabled={wallpaper.setDefaultProfile.isPending}><Star size={13} />{t.makeDefault}</SecondaryButton> : null}
            <SecondaryButton onClick={() => void copy(shortcutSetup(profile.id, range, t), kind)} disabled={!Number.isInteger(range) || range < 1 || range > 3}>{copied === kind ? <Check size={13} /> : <Clipboard size={13} />}{copied === kind ? t.copied : t.copyShortcutSetup}</SecondaryButton>
          </div>
        </article>;
      })}{!wallpaper.profilesLoading && !wallpaper.profiles.length ? <p className="rounded-[var(--radius-inner)] bg-surface-sunken px-3 py-3 text-xs text-ink-soft">{t.noProfiles}</p> : null}</div>
      <ProfileField id="wallpaper-range" label={t.range} error={!Number.isInteger(range) || range < 1 || range > 3 ? t.invalidRange : undefined}><TextField id="wallpaper-range" type="number" min={1} max={3} value={range} onChange={(event) => setRange(Number(event.target.value))} aria-invalid={!Number.isInteger(range) || range < 1 || range > 3} /></ProfileField>
      {profileMutationError ? <Alert>{errorMessage(profileMutationError, t.profileMutationError)}</Alert> : null}
    </Panel>

    <Panel>
      <div className="flex items-center justify-between gap-2"><div><h4 className="text-sm font-semibold text-ink">{editingId ? t.editProfile : t.createProfile}</h4><p className="mt-1 text-xs leading-relaxed text-ink-soft">{t.profileFormDescription}</p></div>{editingId ? <button type="button" onClick={resetProfileForm} aria-label={t.cancelEdit} className="rounded-full p-2 text-ink-soft hover:bg-surface-hover"><X size={15} /></button> : null}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <ProfileField id="wallpaper-profile-name" label={t.profileName} error={fieldErrors.name}><TextField id="wallpaper-profile-name" value={profileDraft.name} maxLength={120} onChange={(e) => updateDraft("name", e.target.value)} aria-invalid={Boolean(fieldErrors.name)} /></ProfileField>
        <ProfileField id="wallpaper-phone-model" label={t.phoneModel} error={fieldErrors.phoneModel}><TextField id="wallpaper-phone-model" value={profileDraft.phoneModel} maxLength={200} onChange={(e) => updateDraft("phoneModel", e.target.value)} aria-invalid={Boolean(fieldErrors.phoneModel)} /></ProfileField>
        <ProfileField id="wallpaper-screen-width" label={t.screenWidth} error={fieldErrors.screenWidth}><TextField id="wallpaper-screen-width" type="number" min={320} max={8192} value={profileDraft.screenWidth} onChange={(e) => updateDraft("screenWidth", Number(e.target.value))} aria-invalid={Boolean(fieldErrors.screenWidth)} /></ProfileField>
        <ProfileField id="wallpaper-screen-height" label={t.screenHeight} error={fieldErrors.screenHeight}><TextField id="wallpaper-screen-height" type="number" min={320} max={8192} value={profileDraft.screenHeight} onChange={(e) => updateDraft("screenHeight", Number(e.target.value))} aria-invalid={Boolean(fieldErrors.screenHeight)} /></ProfileField>
      </div>
      {!dimensionsValid && !fieldErrors.screenWidth ? <FieldError>{t.invalidDimensions}</FieldError> : null}
      <div><label className="mb-1.5 block text-xs font-medium text-ink-soft">{t.font}</label><Select value={profileDraft.fontId} onValueChange={(value) => updateDraft("fontId", value as WallpaperProfileInput["fontId"])}><SelectTrigger aria-label={t.font}><SelectValue /></SelectTrigger><SelectContent>{(wallpaper.fonts.length ? wallpaper.fonts : [{ id: "system" as const, name: t.systemFont }, { id: "serif" as const, name: t.serifFont }, { id: "monospace" as const, name: t.monospaceFont }]).map((font) => <SelectItem key={font.id} value={font.id}>{font.name}</SelectItem>)}</SelectContent></Select></div>
      <div><h5 className="text-xs font-semibold text-ink">{t.exclusionEditor}</h5><p id="wallpaper-editor-help" className="mt-1 text-[11px] leading-relaxed text-ink-soft">{t.editorDescription} {t.keyboardHint}</p></div>
      <div ref={previewRef} role="application" tabIndex={0} aria-label={t.editorAriaLabel} aria-describedby="wallpaper-editor-help"
        className="relative mx-auto w-full max-w-[240px] touch-none select-none overflow-hidden rounded-[1.5rem] border border-line bg-gradient-to-br from-slate-700 via-slate-900 to-black shadow-inner outline-none focus:ring-2 focus:ring-accent/50"
        style={{ aspectRatio: dimensionsValid ? `${profileDraft.screenWidth} / ${profileDraft.screenHeight}` : "390 / 844", backgroundImage: previewUrl ? `linear-gradient(rgb(0 0 0 / 0.08), rgb(0 0 0 / 0.08)), url(${JSON.stringify(previewUrl).slice(1, -1)})` : undefined, backgroundPosition: "center", backgroundSize: "cover" }}
        onPointerDown={startZone} onPointerMove={moveZone} onPointerUp={finishZone} onPointerCancel={() => setDrag(null)} onKeyDown={handleEditorKeyDown}>
        <div className="pointer-events-none absolute left-1/2 top-[4%] h-3 w-16 -translate-x-1/2 rounded-full bg-black/55" />
        {profileDraft.exclusionZones.map((zone, index) => <button key={`${zone.x}-${zone.y}-${index}`} type="button" aria-label={t.removeZone(index + 1)} title={t.removeZone(index + 1)} onPointerDown={(event) => event.stopPropagation()} onClick={() => updateDraft("exclusionZones", profileDraft.exclusionZones.filter((_, i) => i !== index))} className="absolute grid place-items-center border border-dashed border-white/90 bg-red-500/35 text-[10px] font-bold text-white hover:bg-red-500/50 focus:ring-2 focus:ring-white" style={zoneStyle(zone)}>{index + 1}</button>)}
        {draftZone ? <div className="pointer-events-none absolute border border-dashed border-white bg-accent/45" style={zoneStyle(draftZone)} /> : null}
        {!profileDraft.exclusionZones.length && !drag ? <div className="pointer-events-none absolute inset-x-5 top-1/2 -translate-y-1/2 rounded-xl bg-black/45 px-3 py-2 text-center text-[11px] leading-relaxed text-white/90">{t.drawHint}</div> : null}
      </div>
      <div className="flex items-center justify-between gap-3"><p className="text-xs text-ink-soft">{t.zoneCount(profileDraft.exclusionZones.length, MAX_ZONES)}</p>{profileDraft.exclusionZones.length ? <button type="button" onClick={() => updateDraft("exclusionZones", [])} className="text-xs font-semibold text-red-600 hover:underline dark:text-red-300">{t.clearZones}</button> : null}</div>
      <div className="flex flex-wrap gap-2"><ActionButton onClick={() => void saveProfile()} disabled={wallpaper.createProfile.isPending || wallpaper.updateProfile.isPending}>{editingId ? <Check size={14} /> : <Plus size={14} />}{editingId ? t.saveProfile : t.createProfile}</ActionButton>{editingId ? <SecondaryButton onClick={resetProfileForm}>{t.cancelEdit}</SecondaryButton> : null}</div>
    </Panel>
  </section>;
}

function Panel({ children }: { children: React.ReactNode }) { return <div className="space-y-3 rounded-[var(--radius-inner)] bg-surface p-3">{children}</div>; }
function PanelTitle({ icon, title, status }: { icon: React.ReactNode; title: string; status: string }) { return <div className="flex items-center gap-2 text-accent-ink">{icon}<h4 className="text-sm font-semibold text-ink">{title}</h4><span className="ml-auto rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium">{status}</span></div>; }
function Alert({ children }: { children: string }) { return <p role="alert" className="rounded-[var(--radius-inner)] bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/15 dark:text-red-200">{children}</p>; }
function FieldError({ children }: { children: string }) { return <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-300">{children}</p>; }
function ProfileField({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) { return <div><label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-soft">{label}</label>{children}{error ? <FieldError>{error}</FieldError> : null}</div>; }
function ActionButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button type="button" className="flex items-center gap-1.5 rounded-full bg-btn px-3 py-2 text-xs font-semibold text-btn-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60" {...props}>{children}</button>; }
function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button type="button" className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-hover disabled:opacity-50" {...props}>{children}</button>; }
function DangerButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button type="button" className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-2 text-xs font-semibold text-red-600 hover:bg-surface-hover disabled:opacity-60 dark:text-red-300" {...props}>{children}</button>; }

function validateProfile(profile: WallpaperProfileInput, required: string, invalidDimensions: string): FieldErrors {
  const errors: FieldErrors = {}; if (!profile.name.trim()) errors.name = required; if (!profile.phoneModel.trim()) errors.phoneModel = required;
  if (!validDimensions(profile.screenWidth, profile.screenHeight)) { errors.screenWidth = invalidDimensions; errors.screenHeight = invalidDimensions; } return errors;
}
function apiFieldErrors(error: unknown, fallback: string): FieldErrors {
  if (!(error instanceof ApiError) || !error.body || typeof error.body !== "object") return {};
  const violations = (error.body as { fieldErrors?: unknown }).fieldErrors; if (!Array.isArray(violations)) return {};
  const result: FieldErrors = {}; for (const violation of violations) { const field = violation && typeof violation === "object" ? (violation as { field?: unknown }).field : null; if (typeof field === "string" && field in INITIAL_PROFILE) result[field as keyof WallpaperProfileInput] = fallback; } return result;
}
function errorMessage(error: unknown, fallback: string) { return error instanceof Error && error.message ? error.message : fallback; }
function profileRenderUrl(profileId: string) { const url = new URL(gatewayApiUrl("/api/v1/wallpaper/status")); url.pathname = `/v1/wallpaper/profiles/${encodeURIComponent(profileId)}/render`; url.search = ""; return url.toString(); }
function shortcutSetup(profileId: string, range: number, labels: {
  shortcutUrl: string;
  shortcutMethod: string;
  shortcutAuthorization: string;
  shortcutTokenPlaceholder: string;
  shortcutBodyType: string;
  shortcutRangeField: string;
  shortcutWallpaperField: string;
}) {
  return [
    `${labels.shortcutUrl}: ${profileRenderUrl(profileId)}`,
    `${labels.shortcutMethod}: POST`,
    `${labels.shortcutAuthorization}: Bearer ${labels.shortcutTokenPlaceholder}`,
    `${labels.shortcutBodyType}: multipart/form-data`,
    `${labels.shortcutRangeField}: ${range}`,
    `${labels.shortcutWallpaperField}: wallpaper`,
  ].join("\n");
}
function isSupportedImage(file: File) { return ["image/png", "image/jpeg", "image/heic", "image/heif"].includes(file.type.toLowerCase()) || /\.(png|jpe?g|heic)$/i.test(file.name); }
function validDimensions(width: number, height: number) { return Number.isInteger(width) && Number.isInteger(height) && width >= 320 && width <= 8192 && height >= 320 && height <= 8192 && width * height <= 40_000_000; }
function zoneFromPoints(a: Point, b: Point): WallpaperExclusionZone { return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) }; }
function roundZone(zone: WallpaperExclusionZone): WallpaperExclusionZone { return { x: round(zone.x), y: round(zone.y), width: round(zone.width), height: round(zone.height) }; }
function round(value: number) { return Math.round(value * 10_000) / 10_000; }
function clamp(value: number) { return Math.max(0, Math.min(1, value)); }
function zoneStyle(zone: WallpaperExclusionZone) { return { left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.width * 100}%`, height: `${zone.height * 100}%` }; }
