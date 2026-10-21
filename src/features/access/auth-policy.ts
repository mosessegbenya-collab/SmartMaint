import type { Account } from "../../domain/models";

export function canOpenPreviewWorkspace(
  account: Account | null,
  identity: { loaded: boolean; signedIn: boolean },
): boolean {
  // No live account authorization adapter exists yet. Clerk authenticates identity only.
  return identity.loaded && !identity.signedIn && account?.status === "approved";
}

export function authErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    if ("errors" in error && Array.isArray(error.errors)) {
      const first = error.errors[0];
      if (first && typeof first === "object") {
        if (typeof first.longMessage === "string") return first.longMessage;
        if (typeof first.message === "string") return first.message;
      }
    }
    if ("message" in error && typeof error.message === "string") return error.message;
  }
  return "Authentication could not finish. Check your connection and try again.";
}
