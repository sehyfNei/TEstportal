// Shared error-message extractor (TSP-162).
// Converts an unknown catch value to a string without trusting `e.message`
// directly (required after switching catch(e: any) -> catch(e: unknown)).
//
// R1 contract: must NOT change runtime behaviour from the prior `err?.message || fallback`
// pattern. Callers pass their own fallback text via the second argument.

export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return String(e);
}
