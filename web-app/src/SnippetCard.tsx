import type { Snippet } from "./types";

export function SnippetCard({ id, userId, title, language, code }: Snippet) {
  return (
    <div>
      <div>{id}</div>
      <div>{code}</div>
    </div>
  );
}
