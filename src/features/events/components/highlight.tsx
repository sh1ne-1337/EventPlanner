import { Fragment } from "react";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function Highlight({ text, query }: { text: string; query: string }) {
  const terms = query.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  if (!terms?.length) return text;

  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${terms.map(escapeRegExp).join("|")})`, "giu");
  const parts = text.split(pattern);

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-500/30">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
