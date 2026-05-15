// Shared helper: renders an off-screen HTML string into a multi-page A4 PDF
// using html2canvas + jsPDF. Handles font loading and page slicing.

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const A4_WIDTH_PX = 794;   // 210mm @ 96dpi
const A4_HEIGHT_PX = 1123; // 297mm @ 96dpi

export interface RenderOptions {
  filename: string;
  /** Background color for the off-screen container */
  background?: string;
  /** Extra CSS to inject (Google Fonts links, custom styles) */
  extraHead?: string;
}

/**
 * Render the provided HTML string into an A4 PDF and trigger download.
 * Pages are auto-paginated by slicing the rendered canvas.
 */
export async function renderHtmlToPdf(htmlBody: string, opts: RenderOptions): Promise<void> {
  const { filename, background = '#ffffff', extraHead = '' } = opts;

  // Build off-screen container
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.width = `${A4_WIDTH_PX}px`;
  wrapper.style.background = background;
  wrapper.style.zIndex = '-1';
  wrapper.innerHTML = `
    <style>
      .pdf-root, .pdf-root * { box-sizing: border-box; }
      .pdf-root { width: ${A4_WIDTH_PX}px; background: ${background}; color: #111; font-family: 'Inter', system-ui, sans-serif; }
      ${extraHead}
    </style>
    <div class="pdf-root">${htmlBody}</div>
  `;
  document.body.appendChild(wrapper);

  try {
    // Wait for webfonts to be ready
    if ((document as any).fonts?.ready) await (document as any).fonts.ready;
    // Tiny tick for layout
    await new Promise((r) => setTimeout(r, 80));

    const root = wrapper.querySelector('.pdf-root') as HTMLElement;
    const canvas = await html2canvas(root, {
      scale: 2,
      backgroundColor: background,
      useCORS: true,
      logging: false,
      windowWidth: A4_WIDTH_PX,
    });

    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const ratio = pdfWidth / canvas.width;
    const fullHeightPt = canvas.height * ratio;

    if (fullHeightPt <= pdfHeight) {
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfWidth, fullHeightPt);
    } else {
      // Slice by page height in source-canvas pixels
      const pageHeightPx = Math.floor(pdfHeight / ratio);
      let y = 0;
      let first = true;
      while (y < canvas.height) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - y);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        if (!first) pdf.addPage();
        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfWidth, sliceHeight * ratio);
        first = false;
        y += sliceHeight;
      }
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(wrapper);
  }
}

/** Common Rankers Star promo banner HTML used across all generated PDFs. */
export const RANKERS_STAR_PROMO_HTML = `
  <div style="margin:24px 32px;padding:20px 22px;border-radius:14px;background:linear-gradient(135deg,#0d3a2e,#0a5c4a);color:#fff;border:1px solid rgba(255,255,255,0.1);">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      <div style="width:38px;height:38px;border-radius:10px;background:#fff;color:#0a5c4a;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;">RS</div>
      <div>
        <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.75;">// CONTINUE YOUR PREP</div>
        <div style="font-size:18px;font-weight:800;">Rankers Star — everything for JEE / NEET, free.</div>
      </div>
    </div>
    <p style="margin:6px 0 10px;font-size:12.5px;line-height:1.55;opacity:0.92;">
      700+ JEE resources · all major coaching test series · full lecture libraries · personal mentor · habit & study tracking — one ecosystem, completely free.
    </p>
    <div style="font-size:13px;font-weight:700;background:#fff;color:#0a5c4a;display:inline-block;padding:8px 14px;border-radius:8px;">
      Open → rankers-stars.vercel.app
    </div>
  </div>
`;

/** Shared header band used at the top of generated PDFs. */
export function pdfHeader(title: string, subtitle?: string): string {
  return `
    <div style="background:linear-gradient(135deg,#0a5c4a,#118a6e 60%,#1aa37e);color:#fff;padding:22px 32px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;opacity:0.85;">// CBT NEXUS</div>
        <div style="font-size:22px;font-weight:900;letter-spacing:-0.01em;margin-top:2px;">${title}</div>
        ${subtitle ? `<div style="font-size:12px;opacity:0.85;margin-top:4px;">${subtitle}</div>` : ''}
      </div>
      <div style="text-align:right;font-size:11px;opacity:0.9;">
        <div style="font-weight:700;">nexuscbt.vercel.app</div>
        <div style="margin-top:2px;">${new Date().toLocaleString()}</div>
      </div>
    </div>
  `;
}

/** Footer with brand strip + share hashtag. */
export function pdfFooter(): string {
  return `
    <div style="margin:18px 32px 28px;padding-top:14px;border-top:1px dashed #d4d4d8;display:flex;justify-content:space-between;font-size:10.5px;color:#71717a;">
      <span>Generated by CBT Nexus — share with #CBTNexus on Instagram / Telegram / WhatsApp</span>
      <span>nexuscbt.vercel.app</span>
    </div>
  `;
}

/** HTML-escape user supplied text. */
export function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
