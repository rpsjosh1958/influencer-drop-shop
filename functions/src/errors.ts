/**
 * Narrowing helpers for `catch (e)` blocks typed as `unknown` (the TS
 * `strict` default) instead of `any`. Covers plain Error, axios error
 * responses (Paystack calls), and Firebase's `{ code, message }` shape.
 */

export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null && "message" in e) {
    const message = (e as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(e);
}

export function getErrorCode(e: unknown): string | number | undefined {
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" || typeof code === "number") return code;
  }
  return undefined;
}

export function getAxiosErrorData(e: unknown): unknown {
  if (typeof e === "object" && e !== null && "response" in e) {
    const response = (e as { response?: unknown }).response;
    if (typeof response === "object" && response !== null && "data" in response) {
      return (response as { data?: unknown }).data;
    }
  }
  return undefined;
}

/** The API's own error message (e.g. Paystack's `response.data.message`), falling back to the request-level error message. */
export function getAxiosErrorApiMessage(e: unknown, fallback: string): string {
  const data = getAxiosErrorData(e);
  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}
