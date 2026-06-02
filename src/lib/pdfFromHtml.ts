// Shared helper: renders an off-screen HTML string into a multi-page A4 PDF
// using html2canvas + jsPDF. Uses SECTION-BASED pagination so content never
// gets sliced mid-element (eliminates the overlap / page-cut bug).

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import rankersEdgeAsset from '@/assets/rankers-edge-logo.png.asset.json';

const A4_WIDTH_PX = 794;   // 210mm @ 96dpi
const A4_HEIGHT_PX = 1123; // 297mm @ 96dpi
const PAGE_VERTICAL_PADDING_PX = 24;

export interface RenderOptions {
  filename: string;
  /** Background color for the off-screen container */
  background?: string;
  /** Extra CSS to inject (Google Fonts links, custom styles) */
  extraHead?: string;
}

/** Absolute URL for the Rankers Edge logo (works inside generated PDFs). */
export const RANKERS_STAR_LOGO_URL: string =
  (typeof window !== 'undefined' ? window.location.origin : '') + rankersEdgeAsset.url;

/**
 * Render the provided HTML string into an A4 PDF and trigger download.
 * If the body contains elements marked with `data-pdf-section`, each section
 * is captured independently and packed into pages without breaking sections.
 * Otherwise we fall back to a single capture + safe slicing.
 */
export async function renderHtmlToPdf(htmlBody: string, opts: RenderOptions): Promise<void> {
  const { filename, background = '#ffffff', extraHead = '' } = opts;

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
      .pdf-root img { max-width: 100%; }
      ${extraHead}
    </style>
    <div class="pdf-root">${htmlBody}</div>
  `;
  document.body.appendChild(wrapper);

  try {
    if ((document as any).fonts?.ready) await (document as any).fonts.ready;
    // wait for any embedded images (logo etc.)
    await Promise.all(
      Array.from(wrapper.querySelectorAll('img')).map(
        (img) =>
          (img as HTMLImageElement).complete
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.addEventListener('load', () => res(), { once: true });
                img.addEventListener('error', () => res(), { once: true });
              }),
      ),
    );
    await new Promise((r) => setTimeout(r, 120));

    const root = wrapper.querySelector('.pdf-root') as HTMLElement;
    const sectionEls = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-section]'));

    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const scaleToPt = pdfWidth / A4_WIDTH_PX;
    const usablePtHeight = pdfHeight - PAGE_VERTICAL_PADDING_PX * scaleToPt;

    if (sectionEls.length > 0) {
      // Section-based: capture each, pack into pages.
      type Cap = { canvas: HTMLCanvasElement; heightPt: number };
      const caps: Cap[] = [];
      for (const el of sectionEls) {
        const c = await html2canvas(el, {
          scale: 2,
          backgroundColor: background,
          useCORS: true,
          logging: false,
          windowWidth: A4_WIDTH_PX,
        });
        const heightPt = (c.height / 2) * scaleToPt; // /2 because scale:2
        caps.push({ canvas: c, heightPt });
      }

      let yPt = PAGE_VERTICAL_PADDING_PX * scaleToPt * 0.5;
      let firstOnPage = true;
      for (const cap of caps) {
        // If section exceeds full page → place on its own page(s), slicing safely.
        if (cap.heightPt > usablePtHeight) {
          if (!firstOnPage) { pdf.addPage(); yPt = PAGE_VERTICAL_PADDING_PX * scaleToPt * 0.5; }
          await placeOversizedCanvas(pdf, cap.canvas, pdfWidth, pdfHeight, background, scaleToPt);
          // After oversized, force fresh page
          pdf.addPage();
          yPt = PAGE_VERTICAL_PADDING_PX * scaleToPt * 0.5;
          firstOnPage = true;
          continue;
        }

        // Wrap to a new page if it won't fit
        if (!firstOnPage && yPt + cap.heightPt > pdfHeight - PAGE_VERTICAL_PADDING_PX * scaleToPt * 0.5) {
          pdf.addPage();
          yPt = PAGE_VERTICAL_PADDING_PX * scaleToPt * 0.5;
          firstOnPage = true;
        }

        pdf.addImage(
          cap.canvas.toDataURL('image/jpeg', 0.92),
          'JPEG',
          0,
          yPt,
          pdfWidth,
          cap.heightPt,
        );
        yPt += cap.heightPt + 6; // small inter-section gap
        firstOnPage = false;
      }
    } else {
      // Fallback: single capture, slice safely.
      const canvas = await html2canvas(root, {
        scale: 2, backgroundColor: background, useCORS: true, logging: false, windowWidth: A4_WIDTH_PX,
      });
      await placeOversizedCanvas(pdf, canvas, pdfWidth, pdfHeight, background, scaleToPt);
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(wrapper);
  }
}

/** Add a tall canvas across multiple pages, slicing by page height. */
async function placeOversizedCanvas(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  pdfWidth: number,
  pdfHeight: number,
  background: string,
  scaleToPt: number,
) {
  const ratio = pdfWidth / canvas.width;
  const fullHeightPt = canvas.height * ratio;
  if (fullHeightPt <= pdfHeight) {
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfWidth, fullHeightPt);
    return;
  }
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

/** Rankers Star promo banner (uses official logo). */
export const RANKERS_STAR_PROMO_HTML = `
  <div data-pdf-section style="margin:18px 32px;padding:20px 22px;border-radius:14px;background:linear-gradient(135deg,#0a1233,#1a2752);color:#fff;border:1px solid rgba(255,255,255,0.1);">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px;">
      <img src="${RANKERS_STAR_LOGO_URL}" alt="Rankers Star" crossorigin="anonymous" style="width:54px;height:54px;border-radius:14px;object-fit:cover;flex-shrink:0;background:#0a1233;" />
      <div>
        <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.7;">// CONTINUE YOUR PREP</div>
        <div style="font-size:18px;font-weight:800;line-height:1.2;margin-top:2px;">
          <span style="color:#fff;">Rankers</span> <span style="color:#f59e0b;">Star</span> — everything for JEE / NEET, free.
        </div>
      </div>
    </div>
    <p style="margin:6px 0 12px;font-size:12.5px;line-height:1.55;opacity:0.92;">
      700+ JEE resources · all major coaching test series · full lecture libraries · personal mentor · habit & study tracking — one ecosystem, completely free.
    </p>
    <div style="font-size:13px;font-weight:700;background:#f59e0b;color:#1a1208;display:inline-block;padding:8px 14px;border-radius:8px;">
      Open → rankers-stars.vercel.app
    </div>
  </div>
`;

/** Shared header band with brand + partner logo. */
export function pdfHeader(title: string, subtitle?: string): string {
  return `
    <div data-pdf-section style="background:linear-gradient(135deg,#0a5c4a,#118a6e 60%,#1aa37e);color:#fff;padding:24px 32px;display:flex;justify-content:space-between;align-items:center;gap:16px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;opacity:0.85;">// CBT NEXUS</div>
        <div style="font-size:22px;font-weight:900;letter-spacing:-0.01em;margin-top:2px;line-height:1.2;">${title}</div>
        ${subtitle ? `<div style="font-size:12px;opacity:0.85;margin-top:4px;">${subtitle}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:10px;text-align:right;font-size:10.5px;opacity:0.95;">
        <div>
          <div style="font-weight:700;">nexuscbt.vercel.app</div>
          <div style="margin-top:2px;opacity:0.85;">${new Date().toLocaleDateString()}</div>
          <div style="margin-top:6px;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.7;">in partnership with</div>
        </div>
        <img src="${RANKERS_STAR_LOGO_URL}" alt="Rankers Star" crossorigin="anonymous" style="width:46px;height:46px;border-radius:12px;object-fit:cover;background:#0a1233;flex-shrink:0;" />
      </div>
    </div>
  `;
}

/** Footer with brand strip + share hashtag. */
export function pdfFooter(): string {
  return `
    <div data-pdf-section style="margin:18px 32px 28px;padding-top:14px;border-top:1px dashed #d4d4d8;display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:#71717a;gap:12px;">
      <span>Generated by CBT Nexus — share with #CBTNexus on Instagram / Telegram / WhatsApp</span>
      <span style="white-space:nowrap;">nexuscbt.vercel.app</span>
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
