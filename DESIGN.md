# Personal Tracker Design System

## Product Intent

Personal Tracker is for people who need one dependable place to capture tasks,
quick notes, grouped bookmarks, routines, and time-boxed focus sessions before
those details are forgotten. The dashboard should reduce context switching:
the most important daily tools remain visible together in one cohesive
workspace instead of being split across unrelated screens.

## Visual Direction

Personal Tracker uses a quiet Minimalism Bento Grid style: a photographic page backdrop, a translucent shell, and dense rounded dashboard cards. The interface should feel like a working dashboard rather than a marketing page.

- Prefer clean surfaces and borders over drop shadows.
- Use lucide icons rather than emoji.
- Avoid a redundant page title above the workspace; the dashboard grid and its
  own compact header are the primary interface.

## Layout

- Dashboard route uses a single full-viewport Bento grid inside a translucent shell.
- Desktop grid: Todo spans the left two columns and first two rows; Pomodoro and Notes stack in the right column; Bookmarks and Habits fill the bottom row.
- Mobile layout collapses to one column with stable minimum card heights.
- Cards are not nested inside other cards. Use cards only for dashboard tools, repeated items, and modals.
- Todo remains the dominant card. Secondary tools normally occupy smaller
  cells, while the persisted layout system may move, resize, hide, or restore
  them.
- The compact dashboard header shows the board name and current date on the
  left, with personalization and account actions grouped on the right.

## Card Anatomy

- Every dashboard tool uses the shared `BentoCard` frame.
- Card headers keep a consistent height and contain an icon, title, and an
  optional trailing action.
- Card content must adapt to the available cell rather than forcing the whole
  dashboard to scroll horizontally.
- Use generous shell/card padding with tighter, consistent gaps between cards.
  Each nested radius must be smaller than the radius of its containing surface.
- Light-theme cards should read as clean white or near-white working surfaces;
  dark-theme cards use the corresponding semantic surface tokens.

## Shape

- Shell: `2rem` radius.
- Dashboard cards: `--radius-card` (`1.75rem`).
- Inner controls: `--radius-inner` (`1rem`).
- Pills and icon buttons: `999px`.

## Color And Theme

- Theme tokens live in `src/index.css` under `@theme` and `.dark`.
- Core semantic tokens: `surface`, `surface-muted`, `surface-sunken`, `surface-hover`, `shell`, `line`, `ink`, `ink-soft`, `ink-faint`, `btn`, `btn-ink`, `accent`, `accent-soft`, `accent-ink`, and `accent-strong`.
- Accent color comes from user settings and is applied through CSS variables.
- Solid accent fills use `--color-accent-strong` so white text keeps sufficient contrast.
- Dark mode dims the background photo with a black overlay.

## Typography

- Primary font token: Be Vietnam Pro with system UI fallback.
- Dashboard headings are compact and practical, not hero-scale.
- Cards use small labels, medium-weight titles, and restrained supporting text.
- Task and Event descriptions support GitHub Flavored Markdown, rendered using `@tailwindcss/typography`.
- Letter spacing stays neutral except for small uppercase landing eyebrows.

## Components

- `BentoCard` defines the shared card structure: icon/title header, optional action, and scrollable body.
- `IconButton`, `Tooltip`, `Modal`, `ConfirmProvider`, and Radix-backed select/popover controls form the shared interaction layer.
- Tool actions should prefer lucide-react icons with accessible labels.
- All clickable controls must show pointer cursor; global CSS covers common controls.

## Motion

- Dashboard entry uses a short opacity/translate animation.
- Modals and popovers use brief scale/fade transitions.
- Motion should clarify state change and stay subtle.

## Auth And Landing Pages

- Landing page uses a real photographic hero background with text over image.
- Auth screens use a focused form panel next to an image band on large screens and a single-column form on small screens.
- Landing, auth, and account copy flows through the local i18n message structure.

## Personalization

- The board name is editable in Settings and updates the dashboard header.
- Light and dark themes are complete product modes, not isolated component
  variants.
- Preset accent colors update the shared semantic accent tokens globally.
- Background choices may include photographic and plain options; foreground
  contrast must remain readable for every choice.
- Personalization settings persist per authenticated account and across
  devices.

## Feature Experience

- **Todo:** supports title, description, due/calendar fields and the Backlog,
  Todo, Doing, and Done workflow. Kanban provides drag-and-drop between the four
  states; Calendar presents the same tasks by date alongside Google events.
- **Notes:** stays intentionally lightweight. Users can create multiple simple
  title/text notes without categories or a heavyweight editor; editing and
  word-count feedback should remain unobtrusive.
- **Bookmarks:** accepts a URL, normalizes it, derives a useful fallback title,
  and optionally assigns an independent group. Groups can be created, renamed,
  and deleted; deleting a group detaches its bookmarks instead of deleting
  them.
- **Pomodoro:** provides practical focus/break presets such as 25/5 and 50/10.
  Completing a session transitions between focus and break and may use a sound
  and system notification when browser permission allows.
- **Habits and Subscriptions:** are implemented tools and must use the same card
  language; do not present implemented features as mock or “coming soon”
  content.

## Persistence And State UI

- Current dashboard data is PostgreSQL-backed through authenticated API calls.
- Personal data belongs to the authenticated account and synchronizes across
  browsers; localStorage is not the product database.
- Loading states should keep cards stable; do not use old `localStorage` data as fallback content.
- Legacy local browser data is intentionally not imported in this phase.

## Known Limitations

- Real password-reset delivery requires valid Resend configuration; without it,
  the backend intentionally uses a non-delivering fallback.
- Legacy `localStorage` import is not implemented.
