import { describe, expect, it } from "vitest";
import { parseMarkdown } from "@/lib/chat/markdown";

describe("parseMarkdown", () => {
  it("wraps plain text in a paragraph", () => {
    const result = parseMarkdown("hello world");

    expect(result).toBe("<p>hello world</p>");
  });

  it("converts bold and italic markers", () => {
    const result = parseMarkdown("This is **important** and *urgent*.");

    expect(result).toContain("<strong>important</strong>");
    expect(result).toContain("<em>urgent</em>");
  });

  it("converts code spans without parsing emphasis inside code", () => {
    const result = parseMarkdown("Use `const value = **raw**` here");

    expect(result).toContain("<code>const value = **raw**</code>");
    expect(result).not.toContain("<strong>raw</strong>");
  });

  it("splits double newlines into separate paragraphs", () => {
    const result = parseMarkdown("First.\n\nSecond.");

    expect(result).toContain("<p>First.</p>");
    expect(result).toContain("<p>Second.</p>");
    expect(result.match(/<p>/g)).toHaveLength(2);
  });
});
