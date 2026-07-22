/**
 * A resolved length expressed as a linear function of a reference length:
 * `px + percent% of reference`. This is exactly the shape a computed
 * background-position or background-size token can take, including the
 * `calc(100% - 10px)` form produced by the 3-/4-value position syntax.
 */
export interface LinearLength {
  px: number;
  /** Fraction of the reference (0.5 means 50%). */
  percent: number;
}

/** Resolve a {@link LinearLength} against a concrete reference size. */
export function resolveLength(len: LinearLength, reference: number): number {
  return len.px + len.percent * reference;
}

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i;

/**
 * Parse a single CSS length/percentage token into a {@link LinearLength}.
 * Supports plain `px`, `%`, unitless `0`, and linear `calc()` expressions
 * combining a percentage and a pixel length (the only forms `getComputedStyle`
 * emits for background-position / background-size). Returns `null` on anything
 * we cannot resolve to pixels without layout (e.g. `em` — never emitted by
 * computed values, which are always resolved to px).
 */
export function parseLength(token: string): LinearLength | null {
  const t = token.trim();
  if (t === "") return null;
  if (t === "0") return { px: 0, percent: 0 };

  if (t.toLowerCase().startsWith("calc(") && t.endsWith(")")) {
    return parseCalc(t.slice(5, -1));
  }
  return parseTerm(t);
}

/** Parse a bare `<px>` or `<%>` term (no calc). */
function parseTerm(token: string): LinearLength | null {
  const m = NUMBER.exec(token);
  if (!m) return null;
  const num = parseFloat(m[0]);
  const unit = token.slice(m[0].length).trim().toLowerCase();
  if (unit === "%") return { px: 0, percent: num / 100 };
  if (unit === "px") return { px: num, percent: 0 };
  if (unit === "") return { px: num, percent: 0 };
  return null;
}

/**
 * Evaluate a linear `calc()` body containing `+`/`-` between `<px>` and `<%>`
 * terms, e.g. `100% - 10px`. Multiplication/division and nesting are not
 * emitted by computed background values, so they are unsupported.
 */
function parseCalc(body: string): LinearLength | null {
  // Tokenize into signed terms.
  const terms: { sign: number; text: string }[] = [];
  let sign = 1;
  let buf = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!;
    if ((ch === "+" || ch === "-") && buf.trim() !== "" && !endsWithExp(buf)) {
      terms.push({ sign, text: buf.trim() });
      buf = "";
      sign = ch === "-" ? -1 : 1;
    } else {
      buf += ch;
    }
  }
  if (buf.trim() !== "") terms.push({ sign, text: buf.trim() });

  let px = 0;
  let percent = 0;
  for (const term of terms) {
    const parsed = parseTerm(term.text);
    if (!parsed) return null;
    px += term.sign * parsed.px;
    percent += term.sign * parsed.percent;
  }
  return { px, percent };
}

/** True if the buffer ends with scientific-notation `e`, so `-` is an exponent. */
function endsWithExp(buf: string): boolean {
  return /\de$/i.test(buf.trimEnd());
}
