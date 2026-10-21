import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ClerkProvider, useAuth, useClerk, useSession, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

type Identity = {
  configured: boolean;
  loaded: boolean;
  signedIn: boolean;
  sessionId: string | null;
  email: string | null;
  task: string | null;
  expired: boolean;
  restoreTimedOut: boolean;
  retry: () => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};
const unavailable: Identity = {
  configured: false, loaded: true, signedIn: false, sessionId: null,
  email: null, task: null,
  expired: false, restoreTimedOut: false, retry: () => {},
  signOut: async () => {}, refresh: async () => {},
};
const IdentityContext = createContext<Identity>(unavailable);
function ClerkIdentity({ children, retry }: { children: ReactNode; retry: () => void }) {
  const { isLoaded, isSignedIn, sessionId } = useAuth({ treatPendingAsSignedOut: false });
  const { user } = useUser();
  const { session } = useSession();
  const clerk = useClerk();
  const [expired, setExpired] = useState(false);
  const [restoreTimedOut, setRestoreTimedOut] = useState(false);
  const previousSession = useRef<string | null>(null);
  const logoutIntent = useRef(false);
  useEffect(() => clerk.addListener(({ session: currentSession }) => {
    if (currentSession) { previousSession.current = currentSession.id; setExpired(false); }
    else if (previousSession.current) { previousSession.current = null; setExpired(!logoutIntent.current); }
  }), [clerk]);
  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => setRestoreTimedOut(true), 20000);
    return () => clearTimeout(timer);
  }, [isLoaded]);
  return <IdentityContext.Provider value={{
    configured: true, loaded: isLoaded, signedIn: !!isSignedIn,
    sessionId: sessionId ?? null,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
    task: session?.currentTask?.key ?? null,
    expired: expired && !isSignedIn, restoreTimedOut: restoreTimedOut && !isLoaded, retry,
    signOut: async () => { logoutIntent.current = true; try { await clerk.signOut(); setExpired(false); } finally { logoutIntent.current = false; } },
    refresh: async () => { await session?.reload(); await user?.reload(); },
  }}>{children}</IdentityContext.Provider>;
}
export function IdentityProvider({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return <IdentityContext.Provider value={unavailable}>{children}</IdentityContext.Provider>;
  return <ClerkProvider key={attempt} publishableKey={key} tokenCache={tokenCache}>
    <ClerkIdentity retry={() => setAttempt((n) => n + 1)}>{children}</ClerkIdentity>
  </ClerkProvider>;
}
export const useIdentity = () => useContext(IdentityContext);
