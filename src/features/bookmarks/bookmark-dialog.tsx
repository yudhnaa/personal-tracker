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
  onSubmit: (draft: BookmarkDraft) => void;
};

const EMPTY: BookmarkDraft = { url: "", title: "", group: "" };

export function BookmarkDialog({
  open,
  groups,
  onClose,
  onSubmit,
}: BookmarkDialogProps) {
  const [draft, setDraft] = useState<BookmarkDraft>(EMPTY);
  const [loadingTitle, setLoadingTitle] = useState(false);
  // Stop auto-fill once the user types their own title.
  const titleEdited = useRef(false);
  const locale = useLocale();
  const t = messages[locale].features.bookmarks.dialog;

  useEffect(() => {
    if (open) {
      setDraft(EMPTY);
      titleEdited.current = false;
      setLoadingTitle(false);
    }
  }, [open]);

  // Debounced auto-fetch of the page title whenever the URL settles.
  useEffect(() => {
    const url = normalizeUrl(draft.url);
    if (!open || !url || titleEdited.current || !/\.\w{2,}/.test(draft.url)) {
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingTitle(true);
      const title = await fetchPageTitle(url, ctrl.signal);
      setLoadingTitle(false);
      if (title && !titleEdited.current) {
        setDraft((d) => ({ ...d, title: tidyTitle(title) }));
      }
    }, 700);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [draft.url, open]);

  function submit() {
    if (!draft.url.trim()) return;
    onSubmit(draft);
    onClose();
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
            onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
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
        <button
          type="button"
          onClick={submit}
          className="w-full rounded-full bg-btn py-2.5 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90"
        >
          {t.save}
        </button>
      </div>
    </Modal>
  );
}
