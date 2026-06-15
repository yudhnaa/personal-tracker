import { Plus } from "lucide-react";
import { useState } from "react";
import { TextField } from "../../components/form-controls";
import { cn } from "../../lib/cn";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";

type GroupPickerProps = {
  groups: string[];
  value: string;
  onChange: (group: string) => void;
};

/**
 * Pick an existing group or create a new one. When no groups exist yet, only
 * the "create" input shows — there is no list to choose from.
 */
export function GroupPicker({ groups, value, onChange }: GroupPickerProps) {
  // A typed value that isn't an existing group counts as "creating new".
  const isNew = value !== "" && !groups.includes(value);
  const [creating, setCreating] = useState(isNew);
  const locale = useLocale();
  const t = messages[locale].features.bookmarks.picker;

  if (groups.length === 0) {
    return (
      <TextField
        placeholder={t.createPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        <Chip
          active={value === "" && !creating}
          onClick={() => {
            setCreating(false);
            onChange("");
          }}
        >
          {t.uncategorized}
        </Chip>
        {groups.map((g) => (
          <Chip
            key={g}
            active={value === g}
            onClick={() => {
              setCreating(false);
              onChange(g);
            }}
          >
            {g}
          </Chip>
        ))}
        <Chip
          active={creating}
          onClick={() => {
            setCreating(true);
            onChange("");
          }}
        >
          <Plus size={13} />
          {t.newGroup}
        </Chip>
      </div>
      {creating ? (
        <TextField
          autoFocus
          placeholder={t.newGroupPlaceholder}
          value={isNew ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-accent-strong text-white" : "bg-surface-muted text-ink-soft hover:bg-surface-hover",
      )}
    >
      {children}
    </button>
  );
}
