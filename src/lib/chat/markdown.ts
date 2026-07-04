const CODE_PLACEHOLDER_PREFIX = "\u0000CHAT_CODE_";
const CODE_PLACEHOLDER_SUFFIX = "\u0000";

export function parseMarkdown(text: string): string {
  if (!text.trim()) {
    return "";
  }

  const codeSpans: string[] = [];
  let result = text.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    const index = codeSpans.push(`<code>${code}</code>`) - 1;
    return `${CODE_PLACEHOLDER_PREFIX}${index}${CODE_PLACEHOLDER_SUFFIX}`;
  });

  result = result.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  result = result.replace(/^#{1,3}\s+(.+)$/gm, "<strong>$1</strong>");
  result = restoreCodeSpans(result, codeSpans);

  return result
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function restoreCodeSpans(text: string, codeSpans: string[]): string {
  return text.replace(
    new RegExp(`${CODE_PLACEHOLDER_PREFIX}(\\d+)${CODE_PLACEHOLDER_SUFFIX}`, "g"),
    (_match, index: string) => codeSpans[Number(index)] ?? ""
  );
}
