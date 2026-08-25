import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FieldLabel, TextField } from "../../components/form-controls";
import { Modal } from "../../components/modal";
import { fetchPageTitle } from "../../lib/fetch-title";
import { normalizeUrl, tidyTitle } from "../../lib/url";
import { GroupPicker } from "./group-picker";
import type { BookmarkDraft } from "./use-bookmarks";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";

type BookmarkDialogProps = {
  open: boolean;
  groups: string[];
  onClose: () => void;
  onSubmit: (draft: BookmarkDraft) => Promise<boolean>;
};

const EMPTY: BookmarkDraft = { url: "", title: "", group: "" };

export function BookmarkDialog({
	...props
}: BookmarkDialogProps) {
	return <BookmarkDialogForm key={props.open ? "open" : "closed"} {...props} />;
}

function BookmarkDialogForm({
  open,
  groups,
  onClose,
  onSubmit,
}: BookmarkDialogProps) {
  const [draft, setDraft] = useState<BookmarkDraft>(EMPTY);
  const [loadingTitle, setLoadingTitle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Stop auto-fill once the user types their own title.
  const titleEdited = useRef(false);
  const titleRequestId = useRef(0);
  const locale = useLocale();
  const t = messages[locale].features.bookmarks.dialog;

  // Debounced auto-fetch of the page title whenever the URL settles.
  useEffect(() => {
    const requestId = ++titleRequestId.current;
    const url = normalizeUrl(draft.url);
    if (!open || !url || titleEdited.current || !/\.\w{2,}/.test(draft.url)) {
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingTitle(true);
      const title = await fetchPageTitle(url, ctrl.signal);
      if (ctrl.signal.aborted || titleRequestId.current !== requestId) return;
      setLoadingTitle(false);
      if (title && !titleEdited.current) {
        setDraft((d) => ({ ...d, title: tidyTitle(title) }));
      }
    }, 700);
    return () => {
      if (titleRequestId.current === requestId) titleRequestId.current += 1;
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [draft.url, open]);

  async function submit() {
    if (saving || !draft.url.trim()) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const saved = await onSubmit(draft);
      if (saved) onClose();
      else setSubmitError(t.saveError);
    } catch {
      setSubmitError(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={t.title} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <FieldLabel>{t.url}</FieldLabel>
          <TextField
            autoFocus
            placeholder={t.urlPlaceholder}
            value={draft.url}
            onChange={(e) => {
              titleRequestId.current += 1;
              setLoadingTitle(false);
              setDraft((d) => ({ ...d, url: e.target.value }));
            }}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <FieldLabel>{t.titleLabel}</FieldLabel>
            {loadingTitle ? (
              <span className="mb-1.5 flex items-center gap-1 text-xs text-ink-faint">
                <Loader2 size={12} className="animate-spin" />
                {t.fetchingTitle}
              </span>
            ) : null}
          </div>
          <TextField
            placeholder={t.titlePlaceholder}
            value={draft.title}
            onChange={(e) => {
              titleEdited.current = true;
              setDraft((d) => ({ ...d, title: e.target.value }));
            }}
          />
        </div>
        <div>
          <FieldLabel>{t.group}</FieldLabel>
          <GroupPicker
            groups={groups}
            value={draft.group}
            onChange={(group) => setDraft((d) => ({ ...d, group }))}
          />
        </div>
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          className="w-full rounded-full bg-btn py-2.5 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90"
        >
          {saving ? t.saving : t.save}
        </button>
      </div>
    </Modal>
  );
}
