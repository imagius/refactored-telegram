// Title case utility for Factorio item/recipe names
// Converts "Burner mining drill" → "Burner Mining Drill"
// Handles hyphenated words ("Long-handed inserter" → "Long-Handed Inserter")
// Preserves numbers and short words that should stay lowercase (of, the, to)

const LOWERCASE_WORDS = new Set(['of', 'the', 'to', 'and', 'or', 'a', 'an']);

/**
 * Convert a name to Title Case, handling hyphens and preserving numbers.
 * "Burner mining drill" → "Burner Mining Drill"
 * "Long-handed inserter" → "Long-Handed Inserter"
 * "Assembling machine 1" → "Assembling Machine 1"
 * "Pipe to ground" → "Pipe to Ground"
 */
export function titleCaseName(name: string): string {
  return name
    .split(' ')
    .map((word, i) => {
      // Don't capitalize short connecting words (except the first word)
      if (i > 0 && LOWERCASE_WORDS.has(word.toLowerCase())) {
        return word.toLowerCase();
      }

      // Handle hyphenated words: "long-handed" → "Long-Handed"
      return word
        .split('-')
        .map((part) => {
          // Preserve numbers: "1" stays "1"
          if (/^\d+$/.test(part)) return part;
          // Capitalize first letter, lowercase rest
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('-');
    })
    .join(' ');
}