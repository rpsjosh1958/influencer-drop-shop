/**
 * Narrowing helpers for `catch (e)` blocks typed as `unknown` (the TS
 * `strict` default) instead of `any`. Covers plain Error and Firebase
 * Auth's `{ code, message }` shape (e.g. "auth/user-not-found").
 */

export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null && "message" in e) {
    const message = (e as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(e);
}

export function getErrorCode(e: unknown): string | undefined {
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}
