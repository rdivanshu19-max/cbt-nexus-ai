import { renderHtmlToPdf, RANKERS_STAR_PROMO_HTML, pdfHeader, pdfFooter, esc } from './pdfFromHtml';

export interface ReportInput {
  studentName: string;
  testTitle: string;
  examType?: string | null;
  attemptDate: string;
  totalScore: number;
  maxMarks: number;
  accuracy: number;
  positive: number;
  negative: number;
  correct: number;
  wrong: number;
  unattempted: number;
  timeTakenSec: number;
  subjectStats: Array<{ subject: string; correct: number; wrong: number; unattempted: number; accuracy: number }>;
  weakTopics: Array<{ topic: string; subject?: string; accuracy: number; total: number }>;
  /** Past attempts on the same test (most recent first), used for graph + comparison. */
  pastAttempts?: Array<{ totalScore: number; accuracy: number; date: string }>;
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

interface Badge { label: string; tone: string; }

function computeBadges(r: ReportInput, totalQ: number): Badge[] {
  const badges: Badge[] = [];
  const scorePct = r.maxMarks > 0 ? (r.totalScore / r.maxMarks) * 100 : 0;
  const avgTime = totalQ > 0 ? r.timeTakenSec / totalQ : 0;
  if (scorePct >= 90) badges.push({ label: '👑 Topper', tone: '#fde68a' });
  if (r.accuracy >= 80) badges.push({ label: '🎯 Sharpshooter', tone: '#bbf7d0' });
  if (avgTime > 0 && avgTime < 45) badges.push({ label: '⚡ Speedster', tone: '#bae6fd' });
  if (totalQ >= 60) badges.push({ label: '🏃 Marathon', tone: '#fbcfe8' });
  if (r.unattempted === 0 && totalQ > 0) badges.push({ label: '✅ Full Attempt', tone: '#c7d2fe' });
  if (r.pastAttempts && r.pastAttempts.length > 0) {
    const prev = r.pastAttempts[0];
    if (r.totalScore - prev.totalScore >= 10) badges.push({ label: '📈 Comeback', tone: '#a7f3d0' });
  }
  if ((r.pastAttempts?.length || 0) >= 2) badges.push({ label: '🔥 Consistent', tone: '#fed7aa' });
  if (badges.length === 0) badges.push({ label: '🌱 Getting Started', tone: '#e5e7eb' });
  return badges;
}

function predictAIR(scorePct: number, accuracy: number): { air: string; pct: number; ahead: number } {
  // Transparent heuristic; not an official prediction.
  const norm = Math.max(0, Math.min(100, scorePct * 0.6 + accuracy * 0.4));
  // map norm 0..100 to AIR ranges
  let airLow: number, airHigh: number;
  if (norm >= 95) { airLow = 1; airHigh = 500; }
  else if (norm >= 88) { airLow = 500; airHigh = 2500; }
  else if (norm >= 78) { airLow = 2500; airHigh = 8000; }
  else if (norm >= 65) { airLow = 8000; airHigh = 25000; }
  else if (norm >= 50) { airLow = 25000; airHigh = 75000; }
  else if (norm >= 35) { airLow = 75000; airHigh = 200000; }
  else { airLow = 200000; airHigh = 600000; }
  const ahead = Math.round(norm);
  return { air: `${airLow.toLocaleString()} – ${airHigh.toLocaleString()}`, pct: Math.round(norm), ahead };
}

function svgGraph(points: number[]): string {
  if (points.length < 2) {
    return `<div style="text-align:center;color:#71717a;font-size:11px;padding:18px;">Take 2+ attempts of this test to see your trend graph.</div>`;
  }
  const W = 660, H = 140, pad = 22;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const step = (W - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * step;
    const y = pad + (H - pad * 2) * (1 - (p - min) / range);
    return [x, y] as const;
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const dots = coords.map(([x, y], i) =>
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#0a5c4a" /><text x="${x.toFixed(1)}" y="${(y - 8).toFixed(1)}" font-size="9" text-anchor="middle" fill="#0a5c4a" font-weight="700">${points[i]}</text>`,
  ).join('');
  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="display:block;">
      <defs>
        <linearGradient id="ga" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#1aa37e" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#1aa37e" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${path} L${(pad + (points.length - 1) * step).toFixed(1)},${H - pad} L${pad},${H - pad} Z" fill="url(#ga)" />
      <path d="${path}" stroke="#0a5c4a" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round" />
      ${dots}
    </svg>
  `;
}

export async function generateReportCard(r: ReportInput): Promise<void> {
  const totalQ = r.correct + r.wrong + r.unattempted;
  const scorePct = r.maxMarks > 0 ? (r.totalScore / r.maxMarks) * 100 : 0;
  const avgPerQ = totalQ > 0 ? Math.round(r.timeTakenSec / totalQ) : 0;
  const badges = computeBadges(r, totalQ);
  const air = predictAIR(scorePct, r.accuracy);

  // Performance graph: past attempts (oldest -> newest) + this attempt
  const past = (r.pastAttempts || []).slice().reverse().map((a) => a.totalScore);
  const trendPoints = [...past, r.totalScore];
  const prev = r.pastAttempts?.[0];

  const subjectRows = r.subjectStats.map((s) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #e4e4e7;font-weight:600;">${esc(s.subject)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e4e4e7;text-align:center;color:#15803d;font-weight:700;">${s.correct}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e4e4e7;text-align:center;color:#b91c1c;font-weight:700;">${s.wrong}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e4e4e7;text-align:center;color:#71717a;">${s.unattempted}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e4e4e7;width:170px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="flex:1;height:8px;border-radius:4px;background:#e4e4e7;overflow:hidden;">
            <div style="width:${Math.max(2, Math.min(100, s.accuracy)).toFixed(0)}%;height:100%;background:linear-gradient(90deg,#1aa37e,#0a5c4a);"></div>
          </div>
          <span style="font-size:11px;font-weight:700;color:#0a5c4a;width:42px;text-align:right;">${s.accuracy.toFixed(0)}%</span>
        </div>
      </td>
    </tr>
  `).join('');

  const weakRows = r.weakTopics.length ? r.weakTopics.map((t) => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px dashed #fecaca;font-size:12px;">${esc(t.topic)}</td>
      <td style="padding:7px 10px;border-bottom:1px dashed #fecaca;font-size:11px;color:#71717a;">${esc(t.subject || '—')}</td>
      <td style="padding:7px 10px;border-bottom:1px dashed #fecaca;text-align:center;font-size:11px;color:#b91c1c;font-weight:700;">${t.accuracy.toFixed(0)}%</td>
      <td style="padding:7px 10px;border-bottom:1px dashed #fecaca;text-align:center;font-size:11px;">${t.total}</td>
    </tr>
  `).join('') : `<tr><td colspan="4" style="padding:14px;text-align:center;color:#71717a;font-size:11px;">No major weak areas detected — keep it up!</td></tr>`;

  const suggestions: string[] = [];
  if (r.accuracy < 40) suggestions.push('Revise core concepts before attempting more full mocks — accuracy below 40%.');
  else if (r.accuracy < 65) suggestions.push('Solid base. Drill weak chapters with timed micro-tests (15Q / 20min).');
  else suggestions.push('Strong performance. Push to full-length mocks under exam conditions.');
  if (r.unattempted > r.correct) suggestions.push('Too many unattempted — work on time management & intelligent guessing.');
  if (r.negative > r.positive * 0.3) suggestions.push('Negative marks high — be selective when unsure, prefer to skip.');
  if (avgPerQ > 0 && avgPerQ < 30) suggestions.push('Very fast — re-verify final answers before submitting.');
  if (prev && r.totalScore < prev.totalScore) suggestions.push('Score dipped vs last attempt — review wrong questions before next try.');

  const html = `
    ${pdfHeader('Performance Report Card', `${esc(r.testTitle)}${r.examType ? ' · ' + esc(r.examType) : ''}`)}

    <div style="padding:22px 32px 0;">
      <div style="font-size:11px;color:#71717a;letter-spacing:0.18em;text-transform:uppercase;">// STUDENT</div>
      <div style="font-size:18px;font-weight:800;color:#18181b;margin-top:2px;">${esc(r.studentName)}</div>
      <div style="font-size:11px;color:#71717a;margin-top:2px;">Attempted on ${new Date(r.attemptDate).toLocaleString()}</div>
    </div>

    <!-- Score Hero (fixed flex layout — no overlap) -->
    <div style="margin:18px 32px;padding:22px 26px;border-radius:16px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1px solid #a7f3d0;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;">
        <div style="display:flex;align-items:baseline;gap:10px;line-height:1;">
          <span style="font-size:64px;font-weight:900;color:#0a5c4a;letter-spacing:-0.02em;">${r.totalScore}</span>
          <span style="font-size:22px;font-weight:600;color:#16a34a;">/&nbsp;${r.maxMarks}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;flex:1;min-width:300px;">
          ${[
            ['Accuracy', `${r.accuracy.toFixed(1)}%`],
            ['Positive', `+${r.positive}`],
            ['Negative', `−${r.negative}`],
            ['Time', fmtTime(r.timeTakenSec)],
          ].map(([k, v]) => `
            <div>
              <div style="font-size:10px;color:#16a34a;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">${k}</div>
              <div style="font-size:18px;font-weight:800;color:#18181b;margin-top:2px;">${v}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
        <span style="background:#bbf7d0;color:#14532d;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:700;">✅ ${r.correct} correct</span>
        <span style="background:#fecaca;color:#7f1d1d;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:700;">✗ ${r.wrong} wrong</span>
        <span style="background:#e4e4e7;color:#3f3f46;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:700;">— ${r.unattempted} unattempted</span>
        <span style="background:#dbeafe;color:#1e40af;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:700;">⏱ ${avgPerQ}s avg / Q</span>
      </div>
    </div>

    <!-- AIR Prediction -->
    <div style="margin:0 32px 18px;padding:18px 22px;border-radius:14px;background:linear-gradient(135deg,#1e1b4b,#312e81);color:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:18px;flex-wrap:wrap;">
        <div>
          <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.7;">// PROJECTED PERFORMANCE</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px;opacity:0.85;">If you sat JEE Main today, your projected AIR band would be</div>
          <div style="font-size:30px;font-weight:900;margin-top:4px;letter-spacing:-0.01em;">${air.air}</div>
          <div style="font-size:11px;opacity:0.7;margin-top:6px;">* Heuristic estimate from this attempt — not official.</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;opacity:0.7;letter-spacing:0.18em;text-transform:uppercase;">Performance Index</div>
          <div style="font-size:42px;font-weight:900;color:#5eead4;line-height:1;margin-top:4px;">${air.pct}<span style="font-size:18px;opacity:0.7;">/100</span></div>
          <div style="font-size:11px;opacity:0.85;margin-top:6px;">Ahead of an estimated <b>${air.ahead}%</b> of attempters</div>
        </div>
      </div>
    </div>

    <!-- Performance graph -->
    <div style="margin:0 32px 18px;padding:18px 22px;border-radius:14px;background:#fff;border:1px solid #e4e4e7;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div>
          <div style="font-size:10px;color:#71717a;letter-spacing:0.18em;text-transform:uppercase;">// PROGRESS GRAPH</div>
          <div style="font-size:15px;font-weight:800;color:#18181b;">Score across ${trendPoints.length} attempt${trendPoints.length > 1 ? 's' : ''} on this test</div>
        </div>
        ${prev ? `<div style="font-size:11px;color:#71717a;">vs last: <b style="color:${r.totalScore >= prev.totalScore ? '#15803d' : '#b91c1c'};">${r.totalScore >= prev.totalScore ? '+' : ''}${r.totalScore - prev.totalScore}</b></div>` : ''}
      </div>
      ${svgGraph(trendPoints)}
    </div>

    <!-- Badges -->
    <div style="margin:0 32px 18px;padding:18px 22px;border-radius:14px;background:#fffbeb;border:1px solid #fde68a;">
      <div style="font-size:10px;color:#92400e;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">// BADGES UNLOCKED</div>
      <div style="font-size:15px;font-weight:800;color:#18181b;margin-top:2px;margin-bottom:10px;">${badges.length} reward${badges.length > 1 ? 's' : ''} earned this attempt</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${badges.map((b) => `
          <span style="background:${b.tone};color:#1c1917;padding:8px 14px;border-radius:999px;font-size:12.5px;font-weight:700;border:1px solid rgba(0,0,0,0.06);">${b.label}</span>
        `).join('')}
      </div>
    </div>

    ${r.subjectStats.length ? `
    <!-- Subject breakdown -->
    <div style="margin:0 32px 18px;padding:18px 22px;border-radius:14px;background:#fff;border:1px solid #e4e4e7;">
      <div style="font-size:10px;color:#71717a;letter-spacing:0.18em;text-transform:uppercase;">// SUBJECT BREAKDOWN</div>
      <div style="font-size:15px;font-weight:800;color:#18181b;margin-top:2px;margin-bottom:10px;">Where the marks came from</div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead>
          <tr style="background:#f4f4f5;">
            <th style="padding:8px 10px;text-align:left;font-weight:700;color:#3f3f46;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Subject</th>
            <th style="padding:8px 10px;text-align:center;font-weight:700;color:#3f3f46;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">✓</th>
            <th style="padding:8px 10px;text-align:center;font-weight:700;color:#3f3f46;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">✗</th>
            <th style="padding:8px 10px;text-align:center;font-weight:700;color:#3f3f46;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">—</th>
            <th style="padding:8px 10px;text-align:left;font-weight:700;color:#3f3f46;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Accuracy</th>
          </tr>
        </thead>
        <tbody>${subjectRows}</tbody>
      </table>
    </div>
    ` : ''}

    <!-- Weak areas -->
    <div style="margin:0 32px 18px;padding:18px 22px;border-radius:14px;background:#fef2f2;border:1px solid #fecaca;">
      <div style="font-size:10px;color:#b91c1c;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">// WEAK AREAS — FOCUS NEXT</div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead>
          <tr><th style="text-align:left;padding:7px 10px;font-size:11px;color:#7f1d1d;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Topic</th><th style="text-align:left;padding:7px 10px;font-size:11px;color:#7f1d1d;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Subject</th><th style="text-align:center;padding:7px 10px;font-size:11px;color:#7f1d1d;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Acc</th><th style="text-align:center;padding:7px 10px;font-size:11px;color:#7f1d1d;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Q</th></tr>
        </thead>
        <tbody>${weakRows}</tbody>
      </table>
    </div>

    <!-- Coach notes -->
    <div style="margin:0 32px 18px;padding:18px 22px;border-radius:14px;background:#f0f9ff;border:1px solid #bae6fd;">
      <div style="font-size:10px;color:#0369a1;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">// COACH NOTES</div>
      <ul style="margin:8px 0 0;padding-left:20px;color:#0c4a6e;font-size:12.5px;line-height:1.7;">
        ${suggestions.map((s) => `<li style="margin-bottom:4px;">${esc(s)}</li>`).join('')}
      </ul>
    </div>

    ${RANKERS_STAR_PROMO_HTML}

    <div style="margin:0 32px 8px;padding:14px 18px;border-radius:12px;background:#fafafa;border:1px dashed #d4d4d8;text-align:center;">
      <div style="font-size:11px;color:#71717a;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;margin-bottom:6px;">SHARE YOUR SCORECARD</div>
      <div style="font-size:12.5px;color:#3f3f46;">📸 Instagram Story · 💬 WhatsApp · ✈️ Telegram &nbsp;—&nbsp; Use the share buttons on the result page.</div>
      <div style="font-size:11px;color:#71717a;margin-top:6px;">Tag <b>#CBTNexus</b> · #${esc((r.examType || 'JEE'))}Prep</div>
    </div>

    ${pdfFooter()}
  `;

  await renderHtmlToPdf(html, {
    filename: `CBT-Nexus-Report-${r.testTitle.replace(/[^\w]+/g, '-')}.pdf`,
  });
}
