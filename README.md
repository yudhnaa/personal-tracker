# Personal Tracker

Personal Tracker is a private planning workspace built on Next.js App Router. It uses the Java Gateway/Auth/Tracker backend for account sessions and per-user PostgreSQL data.

## Current Product Surface

- `/`: localized landing page with auth entry points and dashboard CTA.
- `/login`, `/register`: email/password auth flows.
- `/forgot-password`, `/reset-password`: Resend-backed password reset through the Java Auth service.
- `/account`: signed-in account page for email display and password change.
- `/dashboard`: authenticated dashboard with persisted layout, hidden cards, welcome state, and per-user data.

Dashboard data is not imported from the legacy Vite/localStorage build. Browser storage is still used for a few non-sensitive UI hints, but the product source of truth is the authenticated backend.

## Dashboard Features

| Area | Current behavior |
|------|------------------|
| Todo | Kanban and calendar views, CRUD, due dates, checklist items, drag-sort persistence, and Google Calendar-linked tasks/events. |
| Notes | Multiple independent note cards with title/text editing and API-backed persistence. |
| Bookmarks | Grouped bookmarks with URL normalization, title fallback, group rename, and detach-on-delete behavior. |
| Habits | Habit creation/removal plus per-day completion tracking and streak summaries. |
| Pomodoro | Preset focus/break sessions with notifications and chime transitions. |
| Subscriptions | Renewal tracking with monthly/yearly cycles, urgency sorting, and idempotent payment confirmation. |
| Settings | Theme, accent, background, board title, archive threshold, card layout, hidden cards, and archived-task purge. |
| Google Calendar | Multi-account connection management, calendar selection, event sync, and event-to-task conversion. |

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Java 21/Spring Boot Gateway, Auth, and Tracker services
- PostgreSQL and RabbitMQ through the backend Compose stack
- TanStack Query v5 for selected remote-cache workflows
- lucide-react, Radix-based popover/select, motion, react-grid-layout, dnd-kit
- date-fns, react-day-picker, react-markdown, remark-gfm

## Local Setup

Start the backend first from `../personal-tracker-backend`, then run the frontend:

```bash
cd ../personal-tracker-backend
cp .env.example .env
docker compose --file infra/compose.yaml up --build --detach --wait
cd ../personal-tracker
npm install
cp .env.example .env.local
npm run dev
```

The app runs at `http://localhost:3000` and calls Gateway at
`http://localhost:8080`. PostgreSQL and RabbitMQ stay on the internal Compose
network.

Google Calendar, RabbitMQ workers, and Resend are configured in the backend
`.env`. The canonical setup, integration, security, and manual-verification
runbook is `@doc/operations/runbook` in Knowns.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run preview
npm run test:api-client
npm run test:subscriptions
```

## Deployment configuration

`NEXT_PUBLIC_API_GATEWAY_URL` is browser-visible and is compiled into the
frontend image. Set the GitHub Actions repository variable with that name to
the public HTTPS Gateway origin before building a production image. The
production Compose file starts only the frontend image; PostgreSQL, RabbitMQ,
Auth, and Tracker are owned by the backend deployment.

## Repository Map

```text
app/                              # App Router pages
src/
├── app.tsx                       # client dashboard orchestration
├── components/                   # shared shell, auth screens, landing page, modals
├── features/
│   ├── bookmarks/
│   ├── google-calendar/
│   ├── habits/
│   ├── notes/
│   ├── pomodoro/
│   ├── subscriptions/
│   └── todo/
└── lib/                          # API helpers, i18n, settings, utilities
```

## Documentation Notes

- This `README.md` is the repository onboarding and command reference.
- Current architecture, API, design/conventions, and operations live in Knowns at
  `@doc/architecture`, `@doc/api/http-api-surface`, `@doc/conventions`, and
  `@doc/operations/runbook`.
- `AGENTS.md` is an agent-control file required by the workspace, not product
  documentation.
- Do not create feature-local documentation. Merge durable guidance into this
  README or the appropriate canonical Knowns document.
