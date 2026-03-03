# Recovery Prompt

> Paste this at the start of a new chat to restore context.

## Project: Ôn thi trắc nghiệm DrDucQY95
- **Tech**: React + TypeScript + Vite + TailwindCSS + Dexie (IndexedDB)
- **Run**: `npm run dev` → http://localhost:5173
- **Root**: `d:\APP\Onthiweb`

## Current State (2026-03-03)
- **All milestones M1-M6 DONE**
- Latest work: Compact layout, Image Lightbox, Background Image

## Architecture Decisions
- All routes inside `<MainLayout>`, nav bar fixed at bottom
- Self-contained screens (QuestionDetail, Practice, Exam) use `fixed inset-0 z-50` to overlay MainLayout
- `QuestionView.tsx` is the shared component for displaying questions across all screens
- `ImageLightbox.tsx` uses `z-[100]` to overlay everything
- Background image set on `document.body`, screens use semi-transparent backgrounds
- `backgroundUpdateTrigger` in Zustand store triggers re-load in main.tsx

## Key Files
- `src/components/MainLayout.tsx` — app shell with nav
- `src/components/QuestionView.tsx` — shared question display
- `src/components/ImageLightbox.tsx` — click-to-zoom image modal
- `src/screens/QuestionDetailScreen.tsx` — question bank detail (flash card)
- `src/screens/PracticeScreen.tsx` — practice mode
- `src/screens/ExamScreen.tsx` — exam mode
- `src/screens/ReviewExamScreen.tsx` — exam review
- `src/screens/SettingsScreen.tsx` — settings (background, theme, font)
- `src/store.ts` — Zustand state
- `src/db.ts` — Dexie database schema

## To Resume
1. Read `project_progress.json` for milestone status
2. Read `.brain/session.json` for last session context
3. Run `npm run dev` if not running
