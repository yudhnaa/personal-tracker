# Personal Tracker Frontend

A modern, private productivity workspace built with Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS v4. Integrates with the Java Gateway/Auth/Tracker backend for authenticated sessions and PostgreSQL-backed data persistence.

## Skills & Badges

![Skills](https://go-skill-icons.vercel.app/api/icons?i=nextjs,react,typescript,tailwind,nodejs,git,vscode)

![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black.svg) ![React](https://img.shields.io/badge/React-19.0.0-blue.svg) ![Platform](https://img.shields.io/badge/platform-macOS%7CLinux%7CWindows-blue) ![Build Status](https://img.shields.io/badge/build-passing-brightgreen) ![MIT License](https://img.shields.io/badge/License-MIT-green.svg)

## Features

- **Kanban & Calendar Todo:** Four-state Kanban board (To Do, In Progress, Review, Done) with calendar view, drag-and-drop sort persistence, due dates, checklists, and Google Calendar event conversion.
- **Notes Workspace:** Multiple independent note cards supporting title/text editing, API persistence, and Markdown rendering (`react-markdown`, `remark-gfm`).
- **Grouped Bookmarks:** Organized link management with title fallback, URL normalization, group renaming, and detach-on-delete behavior.
- **Habit Tracker:** Daily habit creation, completion tracking, and visual streak summaries.
- **Pomodoro Timer:** Preset focus/break sessions with customized audio chime transitions and browser notifications.
- **Subscription Renewal Tracker:** Monthly/yearly subscription cycle management with urgency sorting and idempotent payment confirmation.
- **Customizable Bento Grid Dashboard:** Drag-and-drop & resizable layout (`react-grid-layout`, `dnd-kit`) with hidden card management and theme customization.
- **Google Calendar Integration:** Multi-account OAuth connection management, calendar selection, event sync, and event-to-task conversion.
- **Personalized Themes:** Full light/dark mode toggle, customizable accent colors, background overlays, board title settings, and localized English/Vietnamese UI.

### Dashboard Modules Summary

| Area                | Features & Behavior                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Todo**            | Kanban and calendar views, CRUD, due dates, checklist items, drag-sort persistence, Google Calendar-linked tasks |
| **Notes**           | Multiple note cards with title/text editing, Markdown support, and backend persistence                           |
| **Bookmarks**       | Grouped bookmarks, URL normalization, title fallback, group rename, detach-on-delete                             |
| **Habits**          | Habit creation/deletion, per-day completion tracking, and streak summaries                                       |
| **Pomodoro**        | Focus/break presets, audio chime transitions, browser notification prompts                                       |
| **Subscriptions**   | Monthly/yearly renewal tracking, urgency sorting, idempotent payment confirmations                               |
| **Settings**        | Theme, accent color, background, board title, card layout, hidden cards, archive threshold                       |
| **Google Calendar** | Multi-account connection, calendar selection, bi-directional sync, event-to-task conversion                      |

## Installation

### Prerequisites

- Node.js 20+
- npm 10+
- Java Backend Services running (from `personal-tracker-backend`)

### Local Setup

1. Start the Java Backend Services first:

```bash
  cd ../personal-tracker-backend
  cp .env.example .env
  docker compose --file infra/compose.yaml up --build --detach --wait
```

2. Clone and set up the frontend repository:

```bash
  git clone https://github.com/yudhnaa/personal-tracker.git
  cd personal-tracker
  npm install
```

3. Configure environment variables:

```bash
  cp .env.example .env.local
```

4. Launch the development server:

```bash
  npm run dev
```

The application will be accessible at `http://localhost:3000` calling API Gateway at `http://localhost:8080`.

### Utility Commands

```bash
# Start development server
npm run dev

# Run ESLint check
npm run lint

# Run TypeScript type check
npm run typecheck

# Build production bundle
npm run build

# Preview production build
npm run preview

# Run API client tests
npm run test:api-client

# Run Subscription feature tests
npm run test:subscriptions
```

## Contributing

Contributions are always welcome!

See `contributing.md` for ways to get started.

Please adhere to this project's `code of conduct`.

## License

[MIT](https://choosealicense.com/licenses/mit/)
