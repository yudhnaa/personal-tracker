# Personal Tracker

Personal Tracker is a private Bento-grid dashboard for everyday planning. It combines Todo, Pomodoro, Notes, Bookmarks, Habits, and personal settings in a Next.js App Router application with BetterAuth sessions and PostgreSQL persistence.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4
- BetterAuth email/password auth
- PostgreSQL and Drizzle ORM
- lucide-react icons
- motion animations
- dnd-kit for Todo drag and drop
- date-fns and react-day-picker for date UI

## Local Setup

```bash
npm install
cp .env.example .env.local
docker compose up -d --wait postgres
npm run db:migrate
npm run dev
```

The app runs at `http://localhost:3000`. Docker exposes PostgreSQL on `127.0.0.1:5433` to avoid clashing with a local Postgres install on port `5432`.

## Commands

```bash
npm run dev        # Next.js dev server
npm run typecheck  # TypeScript check
npm run build      # typecheck + production build
npm run preview    # Next.js production server
npm run db:generate
npm run db:migrate
npm run db:studio
```

## Product Surface

- `/`: responsive marketing landing page with English/Vietnamese locale support.
- `/login`, `/register`: BetterAuth email/password auth flows.
- `/forgot-password`, `/reset-password`: dev-only reset-link delivery and reset flow.
- `/account`: profile email, logout, and change-password flow.
- `/dashboard`: authenticated Bento dashboard.

Dashboard data is private per user and stored in PostgreSQL. Existing browser `localStorage` data from the old Vite app is treated as legacy data and is not imported automatically.

## Dashboard Features

| Card | Behavior |
|------|----------|
| Todo | Kanban and calendar views with task CRUD, due dates, statuses, done timestamps, checklist items, and drag-sort persistence. |
| Pomodoro | Focus/break presets, progress ring, browser notifications, and chime support. |
| Notes | Freeform note text with API-backed persistence. |
| Bookmarks | Bookmarks and first-class bookmark groups with rename/delete detach behavior. |
| Habits | Habit creation/removal, today's completion toggle, streak, and recent-day tracking. |
| Settings | Board title, theme, accent, background, archive threshold, sample data, purge, and data clearing. |

## Repository Map

```text
app/                         # Next.js routes and route handlers
drizzle/                     # generated SQL migrations
src/
├── app.tsx                  # client dashboard shell
├── components/              # shared UI, auth screens, landing page
├── db/                      # Drizzle connection and schema
├── features/                # dashboard feature cards and hooks
└── lib/                     # auth, API helpers, i18n, settings, utilities
```

## Development Notes

- Dashboard REST handlers reject unauthenticated requests and scope reads/writes by BetterAuth user ID.
- `localStorage` remains only for small non-sensitive UI preferences such as the Todo view toggle.
- Dev password reset links are logged and exposed at `/api/dev/password-reset-links`; SMTP is intentionally out of scope for this phase.
- See `DESIGN.md` for the current dashboard visual system.
