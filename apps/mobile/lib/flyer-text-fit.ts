// A long store name shouldn't be able to blow out the flyer's padding.
// Character-count heuristic rather than real text measurement — same
// choice made on the web version's flyer generator after a canvas-based
// measureText approach turned out unreliable there. Deterministic, no
// platform text-measurement API involved.
//
// One word: shrink by character count, keep it on one line, never break
// the word itself. Multiple words: only shrink if the single longest
// word is itself long enough to need it — otherwise leave sizing alone
// and let the caller's numberOfLines={2} wrap it naturally.
const COMFORTABLE_NAME_CHARS = 8;

export function fitStoreName(
  name: string,
  baseSize: number,
  minSize: number
): { fontSize: number; numberOfLines: number } {
  const hasSpace = /\s/.test(name.trim());
  const words = hasSpace ? name.split(/\s+/) : [name];
  const longest = Math.max(...words.map((w) => w.length));

  const fontSize =
    longest > COMFORTABLE_NAME_CHARS
      ? Math.max(
          minSize,
          Math.round((baseSize * COMFORTABLE_NAME_CHARS) / longest)
        )
      : baseSize;

  return { fontSize, numberOfLines: hasSpace ? 2 : 1 };
}

// Rack's header name is a single-line label next to the logo — measures
// the whole string (not just the longest word), since it never wraps.
export function fitSingleLine(
  name: string,
  baseSize: number,
  minSize: number,
  comfortableChars = 10
): number {
  if (name.length <= comfortableChars) return baseSize;
  return Math.max(
    minSize,
    Math.round((baseSize * comfortableChars) / name.length)
  );
}
