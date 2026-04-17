import { Fragment, useMemo } from 'react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const SUPER_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', 'n': 'ⁿ', 'i': 'ⁱ',
};
const SUB_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', 'n': 'ₙ',
};

const toLatex = (raw: string) => {
  let s = raw;
  // sqrt(x) -> \sqrt{x}
  s = s.replace(/sqrt\(([^()]+)\)/gi, '\\sqrt{$1}');
  // (a)/(b) -> \frac{a}{b}
  s = s.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, '\\frac{$1}{$2}');
  // x^{n} or x^n
  s = s.replace(/\^\{?([A-Za-z0-9+\-]+)\}?/g, '^{$1}');
  // x_{n} or x_n
  s = s.replace(/_\{?([A-Za-z0-9+\-]+)\}?/g, '_{$1}');
  return s;
};

const isMathy = (token: string) =>
  /[\^_]/.test(token) ||
  /\\(frac|sqrt|sum|int|alpha|beta|gamma|theta|pi|omega|lambda|mu|sigma|delta|phi|infty)/i.test(token) ||
  /sqrt\(/.test(token) ||
  /\([^()]+\)\/\([^()]+\)/.test(token);

export const MathText = ({ text }: { text: string }) => {
  const segments = useMemo(() => {
    if (!text) return [] as Array<{ type: 'text' | 'math'; value: string }>;
    // Split keeping inline $...$ tokens
    const parts = text.split(/(\$[^$]+\$)/g);
    return parts
      .filter((part) => part.length > 0)
      .map((part) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          return { type: 'math' as const, value: part.slice(1, -1) };
        }
        // Detect inline math heuristically: tokens containing ^, _, sqrt(, or (a)/(b)
        const subTokens = part.split(/(\s+)/);
        return subTokens.map((token) =>
          isMathy(token)
            ? ({ type: 'math' as const, value: toLatex(token) })
            : ({ type: 'text' as const, value: token }),
        );
      })
      .flat();
  }, [text]);

  if (!text) return null;

  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.type === 'math') {
          try {
            return <InlineMath key={idx} math={seg.value} />;
          } catch {
            return <Fragment key={idx}>{seg.value}</Fragment>;
          }
        }
        return <Fragment key={idx}>{seg.value}</Fragment>;
      })}
    </>
  );
};

export default MathText;