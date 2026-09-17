# Design System: Personal Tracker

## 1. Brand & Visual Identity

**Concept:** Precision Minimalist Productivity Workspace — Focused on consistency, minimalism, sharpness, and high efficiency. Completely eliminates heavy blurred shadows and unnecessary decorative elements.

### Border Radius
- **Cards / Containers:** 8px (`rounded-lg` / `rounded-card`)
- **Buttons / Inputs:** 6px (`rounded-md` / `rounded-btn`)
- **Badges / Status Pills:** 9999px (`rounded-full`)
- **Micro Tags:** 4px (`rounded-tag`)

### Borders & Dividers
- **Hairline Crisp Border:** 1px solid `#e2e8f0` (`border border-slate-200`)
- **Subtle Partition:** 1px solid `#f1f5f9` (`border-slate-100`)

---

## 2. Color Palette (Design Tokens)

### Neutral & Surfaces
- **Canvas Background:** `#f8f9fa` (Clean, neutral light gray background)
- **Surface Lowest (Card Background):** `#ffffff` (Pure white)
- **Surface Low / Subtle Track:** `#f8fafc` (Kanban column background & secondary surfaces)
- **Surface Container / Hover:** `#f1f5f9` (Hover state for buttons/cards)
- **Border Default:** `#e2e8f0` (Default separator border)
- **Border Muted:** `#f1f5f9` (Ultra-subtle divider)

### Primary & Brand
- **Primary Emerald:** `#15803d` (Logo $ icon, primary action buttons, active days)
- **Primary Light / Badge Surface:** `#dcfce7` (Streak tag background, active pill background)
- **Primary Hover:** `#166534`

### Text & Contrast
- **Text Primary (Headings, Title):** `#0f172a` (Deep charcoal slate)
- **Text Secondary (Subtext, Metadata):** `#64748b` (Medium gray slate)
- **Text Muted / Placeholder:** `#94a3b8` (Light gray slate)

### Status & Tags Palette
- **DevOps / Security (Blue/Cyan):**
  - Text: `#0284c7`
  - Background: `#f0f9ff`
  - Border: `#e0f2fe`
- **In Progress / Backend (Amber/Orange):**
  - Text: `#d97706`
  - Background: `#fffbeb`
  - Border: `#fef3c7`
- **Done / Normal / Success (Emerald):**
  - Text: `#16a34a`
  - Background: `#f0fdf4`
  - Border: `#dcfce7`

---

## 3. Typography Scale (Inter & JetBrains Mono)

- **Font Family:** 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **Monospaced / Numeric Data:** 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace; `font-variant-numeric: tabular-nums` (applied to Pomodoro timer `25:00`, counters, word counts, and monetary values like `559,489₫/mo`)

| Token | Size | Weight | Line Height | Use Case |
|---|---|---|---|---|
| `display-timer` | 36px (2.25rem) | 700 (Bold) | 1.1 | Pomodoro timer |
| `title-lg` | 18px (1.125rem) | 700 (Bold) | 1.4 | Application name "Personal Tracker", widget headings |
| `title-md` | 15px (0.9375rem) | 600 (Semibold) | 1.4 | Kanban card titles, service names |
| `body-sm` | 13px (0.8125rem) | 400 (Regular) | 1.5 | Task content, descriptions, notes |
| `caption` | 11px / 12px | 500 (Medium) | 1.4 | Metadata, renewal dates, badge statuses |

---

## 4. Key Component Patterns

### Buttons
- **Primary Action:** Background `#0f172a`, white text, 6px border radius, padding 8px 16px, hover: `#1e293b`.
- **Secondary / Outline:** Transparent background, 1px solid `#e2e8f0` border, text `#0f172a`, hover: `#f8fafc`.
- **Ghost / Icon Button:** No border, gray color `#64748b`, hover changes to `#0f172a` with background `#f1f5f9`.

### Badges & Status Pills
- **Structure:** `display: inline-flex; align-items: center; border-radius: 9999px; padding: 2px 8px; font-size: 11px; font-weight: 500;`

### Kanban Column
- Header displays a circular status dot (4–6px), the column name, and a count badge aligned to the right (`rounded-md bg-white border border-slate-200 font-mono`).
- A dashed/ghost-style `+ Add task` quick-add button appears at the bottom of each column.
