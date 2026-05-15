import { renderHtmlToPdf, RANKERS_STAR_PROMO_HTML, pdfFooter, esc } from './pdfFromHtml';
import type { Notes } from '@/components/short-notes/NotesView';

interface NotesPdfInput {
  notes: Notes;
  exam: string;
  classLevel: string;
  subject: string;
  chapter: string;
  studentName?: string;
}

const PASTEL_PAPER = '#fffaf2';

const HEADING_COLORS = ['#b45309', '#0e7490', '#7c2d12', '#15803d', '#6b21a8', '#be123c'];

// Plain-text fallback for math text (basic LaTeX stripping)
function stripMath(s: string): string {
  return String(s ?? '')
    .replace(/\\\(([^)]+)\\\)/g, '$1')
    .replace(/\\\[([^\]]+)\\\]/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\(?:left|right|cdot|times|alpha|beta|gamma|delta|theta|pi|infty|sum|int)/g, (m) => ({
      '\\cdot': '·', '\\times': '×', '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ',
      '\\delta': 'δ', '\\theta': 'θ', '\\pi': 'π', '\\infty': '∞', '\\sum': 'Σ', '\\int': '∫',
      '\\left': '', '\\right': '',
    } as any)[m] || m)
    .replace(/[{}\\]/g, '');
}

function escMath(s: any): string { return esc(stripMath(String(s ?? ''))); }

export async function generateNotesPdf({ notes, exam, classLevel, subject, chapter, studentName }: NotesPdfInput): Promise<void> {
  const headColor = HEADING_COLORS[Math.abs(chapter.length) % HEADING_COLORS.length];

  const sectionsHtml = (notes.sections || []).map((s, i) => {
    const c = HEADING_COLORS[i % HEADING_COLORS.length];
    return `
      <div style="margin:14px 28px;padding:14px 18px;background:#fff;border-left:5px solid ${c};border-radius:8px;box-shadow:0 1px 0 rgba(0,0,0,0.03);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <span style="background:${c};color:#fff;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-family:'Patrick Hand',cursive;font-weight:700;font-size:14px;">${i + 1}</span>
          <h3 style="margin:0;font-family:'Caveat',cursive;font-size:24px;color:${c};font-weight:700;line-height:1.1;">${escMath(s.heading)}</h3>
        </div>
        <p style="margin:0;font-family:'Patrick Hand',cursive;font-size:15px;line-height:1.6;color:#1f2937;">${escMath(s.body)}</p>
      </div>
    `;
  }).join('');

  const importantHtml = (notes.important_points || []).length ? `
    <div style="margin:14px 28px;padding:16px 20px;background:#fef3c7;border:2px dashed #f59e0b;border-radius:10px;">
      <h3 style="margin:0 0 10px;font-family:'Caveat',cursive;font-size:26px;color:#b45309;font-weight:700;">★ Important Points</h3>
      <ul style="margin:0;padding-left:22px;font-family:'Patrick Hand',cursive;font-size:15px;line-height:1.7;color:#3f2d12;">
        ${notes.important_points.map((p) => `<li style="margin-bottom:4px;">${escMath(p)}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const formulasHtml = (notes.formulas || []).length ? `
    <div style="margin:14px 28px;padding:16px 20px;background:#ecfeff;border:2px solid #06b6d4;border-radius:10px;">
      <h3 style="margin:0 0 12px;font-family:'Caveat',cursive;font-size:26px;color:#0e7490;font-weight:700;">∑ Key Formulas</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${(notes.formulas || []).map((f) => `
          <div style="background:#fff;border:1px solid #a5f3fc;border-radius:8px;padding:10px 12px;">
            <div style="font-family:'Patrick Hand',cursive;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#0e7490;font-weight:700;margin-bottom:4px;">${escMath(f.name)}</div>
            <div style="font-family:'Courier New',monospace;font-size:14px;font-weight:700;color:#0c4a6e;background:#f0fdfa;padding:6px 10px;border-radius:6px;">${escMath(f.expression)}</div>
            ${f.note ? `<div style="font-family:'Patrick Hand',cursive;font-size:12px;color:#475569;margin-top:6px;">${escMath(f.note)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const cardsHtml = (notes.revision_cards || []).length ? `
    <div style="margin:14px 28px;padding:16px 20px;background:#fdf2f8;border:2px solid #ec4899;border-radius:10px;">
      <h3 style="margin:0 0 12px;font-family:'Caveat',cursive;font-size:26px;color:#be185d;font-weight:700;">⟳ Revision Flashcards</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${notes.revision_cards.map((c, i) => `
          <div style="background:#fff;border:1px solid #fbcfe8;border-radius:8px;padding:12px;">
            <div style="font-family:'Patrick Hand',cursive;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#be185d;font-weight:700;">Card ${i + 1}</div>
            <div style="font-family:'Caveat',cursive;font-size:18px;color:#1f2937;font-weight:700;margin:4px 0 8px;line-height:1.2;">Q: ${escMath(c.front)}</div>
            <div style="font-family:'Patrick Hand',cursive;font-size:14px;color:#374151;line-height:1.5;border-top:1px dashed #fbcfe8;padding-top:6px;">A: ${escMath(c.back)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const mistakesHtml = (notes.common_mistakes || []).length ? `
    <div style="margin:14px 28px;padding:16px 20px;background:#fef2f2;border:2px dashed #dc2626;border-radius:10px;">
      <h3 style="margin:0 0 10px;font-family:'Caveat',cursive;font-size:26px;color:#b91c1c;font-weight:700;">⚠ Avoid These Mistakes</h3>
      <ul style="margin:0;padding-left:22px;font-family:'Patrick Hand',cursive;font-size:15px;line-height:1.7;color:#7f1d1d;">
        ${notes.common_mistakes.map((m) => `<li style="margin-bottom:4px;">${escMath(m)}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const html = `
    <!-- Notebook spine header -->
    <div style="background:linear-gradient(135deg,${headColor},#1f2937);color:#fff;padding:24px 32px;position:relative;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
        <div>
          <div style="font-family:'Patrick Hand',cursive;font-size:13px;letter-spacing:0.16em;opacity:0.85;">CBT NEXUS · AI SHORT NOTES</div>
          <div style="font-family:'Caveat',cursive;font-size:38px;font-weight:700;line-height:1.05;margin-top:6px;">${escMath(notes.title || chapter)}</div>
          <div style="font-family:'Patrick Hand',cursive;font-size:14px;opacity:0.9;margin-top:6px;">${esc(subject)} · Class ${esc(classLevel)} · ${esc(exam)}${studentName ? ' · for ' + esc(studentName) : ''}</div>
        </div>
        <div style="text-align:right;font-family:'Patrick Hand',cursive;font-size:13px;opacity:0.85;">
          <div style="font-weight:700;font-size:14px;">nexuscbt.vercel.app</div>
          <div>${new Date().toLocaleDateString()}</div>
        </div>
      </div>
    </div>

    <!-- Summary as a sticky note -->
    <div style="margin:18px 28px 6px;padding:16px 20px;background:#fef9c3;border-radius:4px;border-left:6px solid #eab308;transform:rotate(-0.4deg);box-shadow:0 2px 6px rgba(0,0,0,0.06);">
      <div style="font-family:'Patrick Hand',cursive;font-size:13px;color:#854d0e;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;">Summary</div>
      <p style="margin:6px 0 0;font-family:'Patrick Hand',cursive;font-size:16px;color:#3f2d04;line-height:1.55;">${escMath(notes.summary)}</p>
    </div>

    ${sectionsHtml}
    ${importantHtml}
    ${formulasHtml}
    ${cardsHtml}
    ${mistakesHtml}

    ${RANKERS_STAR_PROMO_HTML}
    ${pdfFooter()}
  `;

  const extraHead = `
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Patrick+Hand&display=swap');
    .pdf-root { background-image: linear-gradient(${PASTEL_PAPER},${PASTEL_PAPER}), repeating-linear-gradient(transparent, transparent 31px, rgba(120,113,108,0.18) 31px, rgba(120,113,108,0.18) 32px); }
  `;

  await renderHtmlToPdf(html, {
    filename: `CBT-Nexus-Notes-${subject}-${chapter}.pdf`.replace(/[^\w.-]+/g, '-'),
    background: PASTEL_PAPER,
    extraHead,
  });
}
