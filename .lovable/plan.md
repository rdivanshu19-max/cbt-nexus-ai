# Plan — Rankers Star branding + PDF overhaul + landing polish

This is a large multi-area request. Breaking it into 5 focused workstreams.

---

## 1. Rankers Star branding (cross-app promotion)

Add a reusable promo component for your sister app **Rankers Star** (https://rankers-stars.vercel.app/).

- New file `src/components/RankersStarPromo.tsx` — compact + full variants. Copy: "Continue your prep on Rankers Star — 700+ JEE resources, all coaching tests, mentors & tracking. Free forever."
- Mount in:
  - `Results.tsx` (full card, after score breakdown)
  - `Dashboard.tsx` (compact strip in sidebar/below widgets)
  - `SavedNotes.tsx` (compact footer)
  - `TestHistory.tsx` (compact footer)
- Same promo block embedded in every generated PDF (Result / Notes / Test).

---

## 2. Result PDF overhaul (`src/lib/reportPdf.ts`)

Switch from sparse jspdf-only layout to **html2canvas + jsPDF** rendering of an off-screen styled HTML report so text never overlaps and the design is rich.

Sections (in order):
1. Branded header (CBT Nexus logo + gradient band, correct link `https://nexuscbt.vercel.app/`)
2. Student card — name, exam, date, attempt #
3. **Big score hero** — fixed grid layout (no overlap), `Score / Max` with proper line-height
4. Stats grid — Accuracy, +marks, −marks, Time, Avg time/Q
5. **AIR Prediction** — heuristic from accuracy + score percentile:
   - `predictedAIR = round( (1 - scorePct) * 250000 + (1-accuracy)*50000 )` clamped 1…1,000,000
   - Show predicted AIR range, percentile, "ahead of X% of attempters"
6. **Performance graph** — last 5 attempts of same test as inline SVG line chart (rendered in HTML, captured)
7. Subject-wise breakdown table with accuracy bars
8. **Badges earned** — render badge chips (Sharpshooter ≥80% acc, Speedster avg<45s/Q, Marathon ≥60Q, Comeback +20% vs prev, Topper score ≥90%, Consistency 3+ attempts)
9. Weak topics + coach notes
10. **Rankers Star promo banner** with link
11. Footer with **shareable links** (Instagram story / Telegram / WhatsApp via `https://wa.me/?text=...`, `https://t.me/share/url?...`, copy link button on the page itself — Instagram doesn't support direct share, so we show "Copy & Share to Instagram Story" caption)

Fix the "0 / 60" overlap bug — render score and `/max` in separate flex children with explicit gap, not absolute-positioned text.

Share buttons go on the **Results page** itself (not inside the PDF — links inside a PDF can't pre-fill native share sheets reliably). Add a `<ShareResultBar />` row above the PDF download button.

---

## 3. New: AI Short-Notes PDF export

In `src/components/short-notes/NotesView.tsx` add **"Download as PDF"** button.

- New `src/lib/notesPdf.ts` — builds an HTML "handwritten-style" notes layout (Caveat / Patrick Hand Google Font already loaded), pastel paper background, color-coded headings, ruled lines, sticky-note key-points, simple SVG diagrams placeholders, Rankers Star footer.
- Multi-page via html2canvas slicing.
- Filename: `CBT-Nexus-Notes-{subject}-{chapter}.pdf`

---

## 4. New: AI Test paper PDF export

In `src/pages/TestTaking.tsx` (after submit) and `Results.tsx`, add **"Download Test Paper PDF"**.

- New `src/lib/testPdf.ts` — branded cover (logo, test name, exam, total Qs, marks scheme), then questions grouped by subject with options, correct answer + explanation in muted box, Rankers Star footer.
- Math rendering: reuse `MathText` rendered to HTML before capture.

---

## 5. JEE syllabus expansion (`src/lib/syllabus.ts`)

Replace the JEE branch with the full NTA 2025 syllabus from your attached PDF:
- **Math** 14 units (Sets…Trigonometry) — each with 4-6 sub-topics
- **Physics** 20 units (Units & Measurements…Experimental Skills)
- **Chemistry — Physical** 8, **Inorganic** 4, **Organic** 8 units

Keep existing NEET/Boards branches intact. `GenerateTest.tsx` already consumes the structure — no UI change needed beyond longer scroll.

---

## 6. Landing page finishing pass (`src/pages/Index.tsx`)

- Audit each section against new emerald/teal theme — replace any leftover yellow/old-tokens
- Ensure all CTAs route correctly (`/auth`, `/dashboard`, `/short-notes`)
- Mobile: confirm hero stack, 3-column arsenal grid, sticky CTA bar render at 360–430px
- Add "Powered with Rankers Star" subtle footer strip linking to https://rankers-stars.vercel.app/

---

## Tech notes

- New deps: `html2canvas` (~50KB gz). Already have `jspdf` + `jspdf-autotable`.
- No DB migration. No edge function changes (syllabus is client-side).
- No new secrets.
- Badges & AIR prediction are pure client-side heuristics from existing `test_attempts` data — no schema change.

## Risks

- html2canvas font rendering: ensure Google Fonts (Caveat, Patrick Hand, Inter) are loaded *before* capture (preload + `document.fonts.ready`).
- Large notes PDFs may be slow on mobile — show a progress dialog (reuse `ProcessingDialog`).

## Out of scope (ask before doing)

- Real AIR prediction ML model — using transparent heuristic for now
- Server-side PDF rendering / shareable public result URLs (would need new table + edge fn)
- Custom Instagram API integration (not possible without business API)
