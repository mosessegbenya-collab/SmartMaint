import type { Account } from "../../domain/models";

export function canOpenPreviewWorkspace(
  account: Account | null,
  identity: { loaded: boolean; signedIn: boolean },
): boolean {
  // Keep synthetic preview outside an authenticated live identity session.
  return identity.loaded && !identity.signedIn && account?.status === "approved";
}

export function authErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    // Convex attaches deliberate application errors separately from the hybrid
    // client/server stack in `message`; keep that stack out of staff dialogs.
    if ("data" in error && typeof error.data === "string" && error.data.length <= 2000) return error.data;
    if ("errors" in error && Array.isArray(error.errors)) {
      const first = error.errors[0];
      if (first && typeof first === "object") {
        if (typeof first.longMessage === "string") return first.longMessage;
        if (typeof first.message === "string") return first.message;
      }
    }
    if ("message" in error && typeof error.message === "string") {
      if (/\[CONVEX|\[Request ID:|Server Error|\n\s+at\s/.test(error.message)) return "The request could not finish. Check your connection and try again. If the problem continues, contact your administrator.";
      return error.message;
    }
  }
  return "Authentication could not finish. Check your connection and try again.";
}
