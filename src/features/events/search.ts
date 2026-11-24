const MAX_TERMS = 8;
const MAX_TERM_LENGTH = 64;

export function toPrefixTsQuery(input: string): string | null {
  const terms = input.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  if (!terms) return null;

  const unique = [...new Set(terms)].map((t) => t.slice(0, MAX_TERM_LENGTH)).slice(0, MAX_TERMS);

  return unique.map((t) => `${t}:*`).join(" & ");
}
