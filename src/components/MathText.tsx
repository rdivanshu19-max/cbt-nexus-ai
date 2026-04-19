import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Renders text containing inline math expressions.
 * Detects $...$ delimiters first; otherwise auto-renders common math patterns
 * (fractions like a/b, exponents like x^2 or x², Greek letters, brackets).
 *
 * Pure display-only — does not transform stored content.
 */
interface MathTextProps {
  children: string;
  className?: string;
  block?: boolean;
}

// Map of common unicode → LaTeX so they survive KaTeX nicely
const UNICODE_TO_LATEX: Record<string, string> = {
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
  'ε': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta',
  'ι': '\\iota', 'κ': '\\kappa', 'λ': '\\lambda', 'μ': '\\mu',
  'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi', 'ρ': '\\rho',
  'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\phi',
  'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  'Α': 'A', 'Β': 'B', 'Γ': '\\Gamma', 'Δ': '\\Delta',
  'Θ': '\\Theta', 'Λ': '\\Lambda', 'Ξ': '\\Xi', 'Π': '\\Pi',
  'Σ': '\\Sigma', 'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega',
  '×': '\\times', '÷': '\\div', '±': '\\pm', '∓': '\\mp',
  '≤': '\\leq', '≥': '\\geq', '≠': '\\neq', '≈': '\\approx',
  '∞': '\\infty', '√': '\\sqrt{}', '∑': '\\sum', '∫': '\\int',
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

function normalizeForKatex(input: string): string {
  let out = input;
  // Convert unicode superscripts → ^{...}
  out = out.replace(/([A-Za-z0-9\)\]])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ]+)/g, (_m, base, sup) => {
    const mapped = sup.split('').map((c: string) => SUPERSCRIPT_MAP[c] || c).join('');
    return `${base}^{${mapped}}`;
  });
  // Convert unicode subscripts → _{...}
  out = out.replace(/([A-Za-z0-9\)\]])([₀₁₂₃₄₅₆₇₈₉]+)/g, (_m, base, sub) => {
    const mapped = sub.split('').map((c: string) => SUBSCRIPT_MAP[c] || c).join('');
    return `${base}_{${mapped}}`;
  });
  // Replace unicode math chars with latex commands
  for (const [u, l] of Object.entries(UNICODE_TO_LATEX)) {
    out = out.split(u).join(l + ' ');
  }
  return out;
}

function renderSegment(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(normalizeForKatex(latex), {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'html',
    });
  } catch {
    return latex;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Heuristic: render text as math if it looks like math (has math chars),
 * or use $...$ delimiters explicitly.
 */
function buildHtml(text: string): string {
  if (!text) return '';

  // 1) Honor explicit $...$ delimiters
  if (text.includes('$')) {
    let html = '';
    let i = 0;
    while (i < text.length) {
      const start = text.indexOf('$', i);
      if (start === -1) { html += escapeHtml(text.slice(i)); break; }
      html += escapeHtml(text.slice(i, start));
      const isBlock = text[start + 1] === '$';
      const delimLen = isBlock ? 2 : 1;
      const end = text.indexOf(isBlock ? '$$' : '$', start + delimLen);
      if (end === -1) { html += escapeHtml(text.slice(start)); break; }
      const math = text.slice(start + delimLen, end);
      html += renderSegment(math, isBlock);
      i = end + delimLen;
    }
    return html;
  }

  // 2) No delimiters — auto-detect math-like substrings.
  // Match expressions containing common math indicators.
  const MATH_RE = /([A-Za-z0-9αβγδεζηθικλμνξπρστυφχψωΑΒΓΔΘΛΞΠΣΦΨΩ()\[\]{}+\-*/=<>^_.,√∞∑∫×÷±°·→←≤≥≠≈\s]*?(?:\^|_|\/|⁰|¹|²|³|⁴|⁵|⁶|⁷|⁸|⁹|₀|₁|₂|₃|₄|₅|₆|₇|₈|₉|×|÷|±|°|√|∞|∑|∫|→|←|≤|≥|≠|≈|[αβγδεζηθικλμνξπρστυφχψωΑΒΓΔΘΛΞΠΣΦΨΩ])[A-Za-z0-9αβγδεζηθικλμνξπρστυφχψωΑΒΓΔΘΛΞΠΣΦΨΩ()\[\]{}+\-*/=<>^_.,√∞∑∫×÷±°·→←≤≥≠≈\s]*)/g;

  let html = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MATH_RE.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    html += escapeHtml(before);
    let expr = match[0];
    // Trim leading/trailing whitespace
    const leading = expr.match(/^\s+/)?.[0] || '';
    const trailing = expr.match(/\s+$/)?.[0] || '';
    expr = expr.slice(leading.length, expr.length - trailing.length);
    if (expr.length === 0 || /^[A-Za-z\s.,]+$/.test(expr)) {
      // Plain word — don't run through KaTeX
      html += escapeHtml(leading + expr + trailing);
    } else {
      html += escapeHtml(leading);
      // Convert simple a/b → \frac{a}{b} when both sides are short tokens
      const fracExpr = expr.replace(/(\b[A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+\b)/g, '\\frac{$1}{$2}');
      html += renderSegment(fracExpr, false);
      html += escapeHtml(trailing);
    }
    lastIndex = match.index + match[0].length;
  }
  html += escapeHtml(text.slice(lastIndex));
  return html;
}

export const MathText = ({ children, className, block }: MathTextProps) => {
  const html = useMemo(() => buildHtml(children || ''), [children]);
  const Tag = block ? 'div' : 'span';
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};
