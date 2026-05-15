import { renderHtmlToPdf, RANKERS_STAR_PROMO_HTML, pdfHeader, pdfFooter, esc } from './pdfFromHtml';

export interface TestPdfQuestion {
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer?: string | null;
  explanation?: string | null;
  subject?: string | null;
  topic?: string | null;
  user_answer?: string | null;
  is_correct?: boolean | null;
}

export interface TestPdfInput {
  testTitle: string;
  examType?: string | null;
  durationMinutes?: number | null;
  totalMarks?: number | null;
  correctMarks?: number | null;
  wrongMarks?: number | null;
  questions: TestPdfQuestion[];
  /** When true: includes user's selection + correctness markers + explanation. */
  includeAnswers: boolean;
  studentName?: string;
}

function stripMath(s: string): string {
  return String(s ?? '')
    .replace(/\\\(([^)]+)\\\)/g, '$1')
    .replace(/\\\[([^\]]+)\\\]/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/[{}\\]/g, '');
}
function eM(s: any): string { return esc(stripMath(String(s ?? ''))); }

export async function generateTestPaperPdf(input: TestPdfInput): Promise<void> {
  const grouped: Record<string, TestPdfQuestion[]> = {};
  for (const q of input.questions) {
    const key = q.subject || 'Questions';
    (grouped[key] = grouped[key] || []).push(q);
  }
  const subjects = Object.keys(grouped);

  const subjectsHtml = subjects.map((subj) => `
    <div style="margin:18px 28px 8px;">
      <div style="display:inline-block;background:#0a5c4a;color:#fff;padding:6px 14px;border-radius:999px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">${eM(subj)}</div>
    </div>
    ${grouped[subj].map((q) => {
      const opts = ['A', 'B', 'C', 'D'] as const;
      const optsHtml = opts.map((o) => {
        const text = (q as any)[`option_${o.toLowerCase()}`];
        const isCorrect = input.includeAnswers && q.correct_answer === o;
        const isUserPick = input.includeAnswers && q.user_answer === o;
        let style = 'background:#fff;border:1px solid #e4e4e7;color:#1f2937;';
        if (isCorrect) style = 'background:#dcfce7;border:1.5px solid #16a34a;color:#14532d;font-weight:700;';
        else if (isUserPick) style = 'background:#fee2e2;border:1.5px solid #dc2626;color:#7f1d1d;font-weight:700;';
        return `
          <div style="${style}padding:8px 12px;border-radius:8px;font-size:12.5px;line-height:1.4;display:flex;gap:8px;">
            <span style="font-weight:700;min-width:18px;">${o}.</span>
            <span style="flex:1;">${eM(text)}</span>
            ${isCorrect ? '<span style="font-weight:700;">✓</span>' : isUserPick ? '<span style="font-weight:700;">✗</span>' : ''}
          </div>
        `;
      }).join('');
      return `
        <div style="margin:8px 28px 14px;padding:14px 18px;background:#fff;border:1px solid #e4e4e7;border-radius:10px;">
          <div style="display:flex;align-items:start;gap:10px;margin-bottom:8px;">
            <span style="background:#0a5c4a;color:#fff;min-width:30px;height:30px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;">${q.question_number}</span>
            <p style="margin:0;font-size:13.5px;line-height:1.55;color:#18181b;flex:1;">${eM(q.question_text)}</p>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">${optsHtml}</div>
          ${input.includeAnswers && q.explanation ? `
            <div style="margin-top:10px;padding:10px 12px;background:#f0f9ff;border-left:4px solid #0369a1;border-radius:6px;">
              <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#0369a1;font-weight:700;margin-bottom:4px;">EXPLANATION</div>
              <p style="margin:0;font-size:12px;line-height:1.55;color:#0c4a6e;">${eM(q.explanation)}</p>
            </div>
          ` : ''}
        </div>
      `;
    }).join('')}
  `).join('');

  const html = `
    ${pdfHeader(input.testTitle, `${input.examType || 'Practice Test'}${input.studentName ? ' · ' + esc(input.studentName) : ''}`)}

    <!-- Cover meta strip -->
    <div style="margin:18px 28px;padding:14px 18px;background:#f0fdf4;border:1px solid #a7f3d0;border-radius:12px;display:flex;gap:18px;flex-wrap:wrap;">
      <div><div style="font-size:10px;color:#15803d;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;">Questions</div><div style="font-size:18px;font-weight:800;color:#14532d;">${input.questions.length}</div></div>
      ${input.totalMarks != null ? `<div><div style="font-size:10px;color:#15803d;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;">Total Marks</div><div style="font-size:18px;font-weight:800;color:#14532d;">${input.totalMarks}</div></div>` : ''}
      ${input.durationMinutes != null ? `<div><div style="font-size:10px;color:#15803d;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;">Duration</div><div style="font-size:18px;font-weight:800;color:#14532d;">${input.durationMinutes} min</div></div>` : ''}
      ${input.correctMarks != null && input.wrongMarks != null ? `<div><div style="font-size:10px;color:#15803d;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;">Marking</div><div style="font-size:18px;font-weight:800;color:#14532d;">+${input.correctMarks} / −${Math.abs(input.wrongMarks)}</div></div>` : ''}
      <div style="flex:1;text-align:right;font-size:11px;color:#15803d;align-self:end;">${input.includeAnswers ? 'Solved version · with answers & explanations' : 'Question paper'}</div>
    </div>

    ${subjectsHtml}

    ${RANKERS_STAR_PROMO_HTML}
    ${pdfFooter()}
  `;

  await renderHtmlToPdf(html, {
    filename: `CBT-Nexus-Test-${input.testTitle.replace(/[^\w]+/g, '-')}.pdf`,
  });
}
