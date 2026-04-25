import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Renders text containing inline math expressions.
 *
 * Strategy (safe-by-default):
 *  - Plain English/Hindi prose is ALWAYS passed through untouched (with spaces preserved).
 *  - We only invoke KaTeX on:
 *      1. explicit $...$ / $$...$$ delimited segments, OR
 *      2. compact math-looking tokens (no whitespace) that contain at least one
 *         real math indicator like ^, _, \, /, ×, ÷, √, Greek letter,
 *         unicode superscript/subscript, etc.
 *
 *  - Unicode superscripts (x², H₂O), Greek letters (α, π), and common math
 *    symbols are still rendered nicely inside those math tokens.
 */
interface MathTextProps {
  children: string;
  className?: string;
  block?: boolean;
}

const UNICODE_TO_LATEX: Record<string, string> = {
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
  'ε': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta',
  'ι': '\\iota', 'κ': '\\kappa', 'λ': '\\lambda', 'μ': '\\mu',
  'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi', 'ρ': '\\rho',
  'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\phi',
  'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda',
  'Ξ': '\\Xi', 'Π': '\\Pi', 'Σ': '\\Sigma', 'Φ': '\\Phi',
  'Ψ': '\\Psi', 'Ω': '\\Omega',
  '×': '\\times', '÷': '\\div', '±': '\\pm', '∓': '\\mp',
  '≤': '\\leq', '≥': '\\geq', '≠': '\\neq', '≈': '\\approx',
  '∞': '\\infty', '∑': '\\sum', '∫': '\\int',
  '°': '^{\\circ}', '·': '\\cdot', '→': '\\rightarrow', '←': '\\leftarrow',
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-', 'ⁿ': 'n',
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
};

const SUPERSCRIPT_RE = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ]/;
const SUBSCRIPT_RE = /[₀₁₂₃₄₅₆₇₈₉]/;
const GREEK_RE = /[αβγδεζηθικλμνξπρστυφχψωΓΔΘΛΞΠΣΦΨΩ]/;
const MATH_SYMBOL_RE = /[×÷±∓≤≥≠≈∞∑∫√°·→←]/;

// A token "looks like math" if it has any of these:
//  ^  _  \  /  unicode super/subscript  Greek letter  math symbol
function looksLikeMath(token: string): boolean {
  if (/[\^_\\]/.test(token)) return true;
  if (/[A-Za-z0-9)\]]\/[A-Za-z0-9(\[]/.test(token)) return true; // a/b style
  if (SUPERSCRIPT_RE.test(token)) return true;
  if (SUBSCRIPT_RE.test(token)) return true;
  if (GREEK_RE.test(token)) return true;
  if (MATH_SYMBOL_RE.test(token)) return true;
  return false;
}

function normalizeForKatex(input: string): string {
  let out = input;
  out = out.replace(/([A-Za-z0-9)\]])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ]+)/g, (_m, base, sup) => {
    const mapped = sup.split('').map((c: string) => SUPERSCRIPT_MAP[c] || c).join('');
    return `${base}^{${mapped}}`;
  });
  out = out.replace(/([A-Za-z0-9)\]])([₀₁₂₃₄₅₆₇₈₉]+)/g, (_m, base, sub) => {
    const mapped = sub.split('').map((c: string) => SUBSCRIPT_MAP[c] || c).join('');
    return `${base}_{${mapped}}`;
  });
  for (const [u, l] of Object.entries(UNICODE_TO_LATEX)) {
    out = out.split(u).join(l + ' ');
  }
  // simple a/b -> \frac{a}{b} when both sides are short alnum tokens
  out = out.replace(/\b([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)\b/g, '\\frac{$1}{$2}');
  return out;
}

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(normalizeForKatex(latex), {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'html',
    });
  } catch {
    return escapeHtml(latex);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Render text by:
 *   1. Honoring $...$ / $$...$$ delimiters as math.
 *   2. Otherwise splitting on whitespace and only running KaTeX on tokens
 *      that look like math. Everything else is escaped HTML with whitespace
 *      preserved exactly.
 */
function buildHtml(text: string): string {
  if (!text) return '';

  // 1) Explicit $...$ / $$...$$
  if (text.includes('$')) {
    let html = '';
    let i = 0;
    while (i < text.length) {
      const start = text.indexOf('$', i);
      if (start === -1) { html += renderProse(text.slice(i)); break; }
      html += renderProse(text.slice(i, start));
      const isBlock = text[start + 1] === '$';
      const delimLen = isBlock ? 2 : 1;
      const end = text.indexOf(isBlock ? '$$' : '$', start + delimLen);
      if (end === -1) { html += escapeHtml(text.slice(start)); break; }
      const math = text.slice(start + delimLen, end);
      html += renderKatex(math, isBlock);
      i = end + delimLen;
    }
    return html;
  }

  // 2) No delimiters — token-by-token, preserving whitespace.
  return renderProse(text);
}

function renderProse(text: string): string {
  if (!text) return '';
  // Split keeping whitespace as separate chunks so spacing is preserved exactly.
  const parts = text.split(/(\s+)/);
  let html = '';
  for (const part of parts) {
    if (part.length === 0) continue;
    if (/^\s+$/.test(part)) {
      // Preserve raw whitespace (escapeHtml leaves it intact).
      html += part;
      continue;
    }
    if (looksLikeMath(part)) {
      html += renderKatex(part, false);
    } else {
      html += escapeHtml(part);
    }
  }
  return html;
}

export const MathText = ({ children, className, block }: MathTextProps) => {
  const html = useMemo(() => buildHtml(children || ''), [children]);
  const Tag = block ? 'div' : 'span';
  return (
    <Tag
      className={className}
      style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
