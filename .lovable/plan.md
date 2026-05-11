# Implementation Plan

This is a large multi-feature request. To keep diffs reviewable, I'll group it into 4 phases. You can approve all at once, or tell me to pause after any phase.

---

## Phase 1 — UI/UX foundations

1. **Logo + favicon swap**
   - I need you to attach the CBT Nexus logo image (it isn't in this message). Once attached, I'll copy it to `public/favicon.png` + `public/logo.png`, update `index.html` `<link rel="icon">`, OG/twitter image, and replace the `/logo.jpg` reference in `DashboardLayout`, landing nav, and auth pages.

2. **Autosave badge accuracy**
   - Wrap `App.tsx` in `AutosaveProvider` (verify it's mounted globally).
   - In `TestTaking.tsx`, set `setStatus('saving')` before each localStorage/Supabase write and `setStatus('saved', Date.now())` on success, `setStatus('error')` on failure.
   - Add the same wiring to Short Notes generate/save and Profile updates.
   - Show the badge in mobile header (currently `compact` only) and in CBT mission console header.

3. **UI intensity slider (Calm / Normal / Minimal)**
   - Replace current `UIIntensityToggle` with a 3-stop slider/segmented control.
   - In `index.css`, expand `[data-ui-intensity="calm"]` and `="minimal"` rules to dampen `--shadow-*`, glow utilities, and disable `animate-*` keyframes (`.no-anim *` style override).
   - Persist to `localStorage` key `cbt-ui-intensity` (already in core memory).

## Phase 2 — Mobile + ink-card restyle

4. **Landing page mobile redesign** (`src/pages/Index.tsx`)
   - Hero: stack tighter, shrink 3D scene height on `<sm`, CTAs full-width side-by-side (grid-cols-2).
   - Arsenal/Loop sections: 2-col grid on mobile (already partially), reduce vertical padding, smaller card heights.
   - Add sticky mobile bottom CTA bar.

5. **Apply `// TAG` + `ink-card` to**:
   - `src/pages/Tests.tsx`
   - `src/pages/TestHistory.tsx`
   - `src/pages/ShortNotes.tsx` + `SavedNotes.tsx`
   - `src/pages/TestTaking.tsx` (mission console body — question card, options, footer)

6. **Mission console fixes**
   - Mobile drawer (HUD): currently can open but not close — add explicit close button + ensure `Drawer` `onOpenChange` is wired and the trigger toggles.
   - Admin panel mobile: `AdminPanel.tsx` Tabs are `<TabsList>` row that overflows. Make tabs scrollable, add mobile padding, and surface the Admin link in the mobile bottom nav (currently desktop-only via `hidden sm:inline-flex`).

## Phase 3 — Results upgrades

7. **Attempt Comparison**
   - On `Results.tsx`, query `test_attempts` for same `(user_id, test_id)` ordered by `completed_at`. If ≥2, show a "Compare attempts" tab with side-by-side: per-question (improved/worse/same), score delta, time delta, accuracy delta.
   - Pure read — no schema change.

8. **PDF Report Card**
   - Add a "Download Report Card" button on `Results.tsx`.
   - Use `jspdf` + `jspdf-autotable` (client-side, no edge function needed) to render: header with logo, score summary, subject-wise breakdown, weak topics (lowest accuracy), suggestions (template based on accuracy buckets), shareable footer with brand URL.
   - Save as `CBT-Nexus-Report-{testTitle}.pdf`.

## Phase 4 — Topic-wise AI test generator

9. **Topic-wise scope** in `GenerateTest.tsx`
   - Add new `testScope` value `'topic'`.
   - Build `src/lib/syllabus.ts` mapping `subject → chapter → string[] of topics` from your provided syllabus list (Physics 11 + Chemistry + Math + Biology + Modern Physics/Electronic Devices). I'll seed with what you pasted; gaps (Class 12 Physics topics) flagged as TODO with placeholders so you can extend later.
   - UI: after picking subject + chapter, show a multi-select chips panel of topics. Auto-pick test size: 5 questions × number of topics selected (capped 30), `+4/-1/0`.
   - Pass `topics: string[]` to the `generate-test` edge function. Edit `supabase/functions/generate-test/index.ts` to include topics in the Gemini prompt and `tests.title` ("JEE Physics — Kinematics: Projectile Motion, Relative velocity").

---

## Tech notes

- No new database schema needed.
- New deps: `jspdf`, `jspdf-autotable`.
- Edge function change: `generate-test` prompt only.
- Memory updates: bump `mem://index.md` core to note ink-card styling is project-wide and intensity is a 3-stop slider.

## What I need from you before starting

- **The CBT Nexus logo file** (attach it to the next message). Without it I'll skip the favicon/logo swap and do everything else.
- Confirm you're OK with `jspdf` (client-side, ~150KB gzipped) for the report card. Alternative: server-side via edge function (slower, but smaller bundle).

Reply "go" to start Phase 1, or tell me to reorder/skip anything.