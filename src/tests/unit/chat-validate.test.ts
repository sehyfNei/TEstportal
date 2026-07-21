import { describe, expect, it } from "vitest";
import { MAX_CHAT_MESSAGE_CHARS, validateChatRequestBody } from "@/lib/chat/chat-service";

const VALID_UUID = "3f2c9d8e-1a4b-4c6d-9e8f-0a1b2c3d4e5f";
const VALID_UUID_2 = "4a3d0e9f-2b5c-4d7e-8f0a-1b2c3d4e5f6a";

describe("validateChatRequestBody", () => {
  it("accepts a full valid body", () => {
    const result = validateChatRequestBody({
      sessionId: VALID_UUID,
      examId: VALID_UUID.toUpperCase(),
      topicId: VALID_UUID_2,
      message: "  Explain the doctrine of basic structure.  "
    });

    expect(result).toEqual({
      ok: true,
      sessionId: VALID_UUID,
      examId: VALID_UUID.toUpperCase(),
      topicId: VALID_UUID_2,
      message: "Explain the doctrine of basic structure."
    });
  });

  it("accepts a message-only body with null ids", () => {
    const result = validateChatRequestBody({ message: "What is Article 356?" });
    expect(result).toEqual({
      ok: true,
      sessionId: null,
      examId: null,
      topicId: null,
      message: "What is Article 356?"
    });
  });

  it("rejects a missing or empty message", () => {
    expect(validateChatRequestBody({ message: "" })).toEqual({ ok: false, error: "empty_message" });
    expect(validateChatRequestBody({})).toEqual({ ok: false, error: "empty_message" });
    expect(validateChatRequestBody(null)).toEqual({ ok: false, error: "empty_message" });
    expect(validateChatRequestBody([1, 2])).toEqual({ ok: false, error: "empty_message" });
  });

  it("rejects a whitespace-only message", () => {
    expect(validateChatRequestBody({ message: "   \n\t " })).toEqual({
      ok: false,
      error: "empty_message"
    });
  });

  it("rejects a message over the cap", () => {
    const result = validateChatRequestBody({ message: "x".repeat(MAX_CHAT_MESSAGE_CHARS + 1) });
    expect(result).toEqual({ ok: false, error: "message_too_long" });
  });

  it("accepts a message exactly at the cap", () => {
    const result = validateChatRequestBody({ message: "x".repeat(MAX_CHAT_MESSAGE_CHARS) });
    expect(result.ok).toBe(true);
  });

  it("rejects malformed string ids", () => {
    expect(validateChatRequestBody({ message: "hi", sessionId: "not-a-uuid" })).toEqual({
      ok: false,
      error: "invalid_id"
    });
    expect(
      validateChatRequestBody({ message: "hi", examId: "3f2c9d8e-1a4b-4c6d-9e8f" })
    ).toEqual({ ok: false, error: "invalid_id" });
    expect(validateChatRequestBody({ message: "hi", topicId: "not-a-uuid" })).toEqual({
      ok: false,
      error: "invalid_id"
    });
  });

  it("treats non-string or blank ids as absent", () => {
    const result = validateChatRequestBody({
      message: "hi",
      sessionId: 42,
      examId: "   "
    });
    expect(result).toEqual({ ok: true, sessionId: null, examId: null, topicId: null, message: "hi" });
  });
});
