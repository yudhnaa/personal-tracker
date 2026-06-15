# Personal Tracker Design System

## Visual Direction

Personal Tracker uses a quiet Minimalism Bento Grid style: a photographic page backdrop, a translucent shell, and dense rounded dashboard cards. The interface should feel like a working dashboard rather than a marketing page.

## Layout

- Dashboard route uses a single full-viewport Bento grid inside a translucent shell.
- Desktop grid: Todo spans the left two columns and first two rows; Pomodoro and Notes stack in the right column; Bookmarks and Habits fill the bottom row.
- Mobile layout collapses to one column with stable minimum card heights.
- Cards are not nested inside other cards. Use cards only for dashboard tools, repeated items, and modals.

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

## Persistence And State UI

- Current dashboard data is PostgreSQL-backed through authenticated API calls.
- Loading states should keep cards stable; do not use old `localStorage` data as fallback content.
- Legacy local browser data is intentionally not imported in this phase.

## Known Limitations

- Dev password reset delivery logs/surfaces reset links locally; SMTP is not implemented.
- Legacy `localStorage` import is not implemented.
