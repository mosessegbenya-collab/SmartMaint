import { Component, createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth, useSession } from "@clerk/expo";
import { ConvexProviderWithAuth, ConvexReactClient, useConvex, useConvexAuth, useQuery } from "convex/react";
import { useIdentity } from "@/features/access/identity";
import { staffApi } from "@/services/staff-api";
import { accessCacheKey, nextConnection, observeAuthorization, resolveAccessState, type ObservedAuthorization, type StaffResolution } from "@/domain/staff-access";
import { fetchConvexSessionToken } from "@/features/access/account-email-service";

type StaffAccess = StaffResolution & { configured: boolean; connected: boolean; retry: () => void };
const defaultValue: StaffAccess = { status: "unconfigured", account: null, configured: false, connected: false, retry: () => {} };
const Context = createContext<StaffAccess>(defaultValue);
export const useStaffAccess = () => useContext(Context);
class LookupBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
type Observation = (fingerprint: string) => boolean;
function LiveClient({ url, children, retry, observe }: { url: string; children: ReactNode; retry: () => void; observe: Observation }) {
  const [client] = useState(() => new ConvexReactClient(url, { unsavedChangesWarning: false }));
  const lifecycle = useRef(0);
  useEffect(() => {
    const generation = ++lifecycle.current;
    return () => { void Promise.resolve().then(() => {
      // This epoch is intentionally read after StrictMode effect replay; it is not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (lifecycle.current === generation) return client.close();
    }); };
  }, [client]);
  return <ConvexProviderWithAuth client={client} useAuth={useClerkSessionAuth}>
    <LookupBoundary fallback={<Context.Provider value={{ status: "authorization_error", account: null, configured: true, connected: false, retry }}>{children}</Context.Provider>}>
      <ConnectionGate retry={retry} observe={observe}>{children}</ConnectionGate>
    </LookupBoundary>
  </ConvexProviderWithAuth>;
}
function useClerkSessionAuth() {
  const clerk = useAuth({ treatPendingAsSignedOut: false });
  const { session, isLoaded: sessionLoaded } = useSession();
  const audience = session?.lastActiveToken?.jwt?.claims.aud ?? clerk.sessionClaims?.aud;
  const pendingTask = !!session?.currentTask;
  const fetchAccessToken = useCallback(({ forceRefreshToken }: { forceRefreshToken: boolean }) => fetchConvexSessionToken({
    signedIn: !!clerk.isSignedIn,
    sessionReady: sessionLoaded && !!session,
    pendingTask,
    audience,
    getToken: (options) => session!.getToken(options),
  }, forceRefreshToken), [clerk.isSignedIn, session, sessionLoaded, pendingTask, audience]);
  return { isLoading: !clerk.isLoaded || !sessionLoaded, isAuthenticated: clerk.isSignedIn ?? false, fetchAccessToken };
}
let clientSequence = 0;
function ConnectionGate({ children, retry, observe }: { children: ReactNode; retry: () => void; observe: Observation }) {
  const identity = useIdentity();
  const client = useConvex();
  const auth = useConvexAuth();
  const [connection, setConnection] = useState(() => ({ connected: client.connectionState().isWebSocketConnected, generation: 0 }));
  useEffect(() => client.subscribeToConnectionState((state) => setConnection((previous) => nextConnection(previous, state.isWebSocketConnected))), [client]);
  return <Resolver key={`${identity.sessionId}:${auth.isAuthenticated}:${connection.generation}`} retry={retry} observe={observe} connected={connection.connected} authLoading={auth.isLoading} authenticated={auth.isAuthenticated}>{children}</Resolver>;
}
function Resolver({ children, retry, observe, connected, authLoading, authenticated }: { children: ReactNode; retry: () => void; observe: Observation; connected: boolean; authLoading: boolean; authenticated: boolean }) {
  const identity = useIdentity();
  const [clientId] = useState(() => ++clientSequence);
  const [timedOut, setTimedOut] = useState(false);
  const [acceptedFingerprint, setAcceptedFingerprint] = useState<string | null>(null);
  const enabled = identity.loaded && identity.signedIn && !identity.task && authenticated && connected;
  // A new query key after every reconnect prevents replaying a cached pre-revocation grant.
  const value = useQuery(staffApi.staff.resolve, enabled ? { cacheKey: String(clientId) } : "skip");
  useEffect(() => {
    if (!identity.signedIn || value !== undefined) return;
    const timer = setTimeout(() => setTimedOut(true), 20000);
    return () => clearTimeout(timer);
  }, [identity.signedIn, value]);
  const resolution = resolveAccessState({ loaded: identity.loaded, signedIn: identity.signedIn, expired: identity.expired,
    task: identity.task, connected, authLoading, authenticated, timedOut, value });
  const fingerprint = accessCacheKey(identity.sessionId, resolution);
  const confirmed = enabled && value !== undefined;
  useEffect(() => {
    if (!confirmed) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active && !observe(fingerprint)) setAcceptedFingerprint(fingerprint);
    });
    return () => { active = false; };
  }, [confirmed, fingerprint, observe]);
  // Do not mount operational queries with a new grant against an old client's record cache.
  const visible: StaffResolution = resolution.status === "approved" && acceptedFingerprint !== fingerprint ? { status: "loading", account: null } : resolution;
  return <Context.Provider value={{ ...visible, configured: true, connected, retry }}>{children}</Context.Provider>;
}
export function StaffAccessProvider({ children }: { children: ReactNode }) {
  const identity = useIdentity();
  const url = process.env.EXPO_PUBLIC_CONVEX_URL;
  const [retryCount, setRetryCount] = useState(0);
  const observed = useRef<ObservedAuthorization>(null);
  const retry = useCallback(() => setRetryCount((n) => n + 1), []);
  const sessionId = identity.sessionId;
  const observe = useCallback((fingerprint: string) => {
    const change = observeAuthorization(observed.current, sessionId, fingerprint);
    observed.current = change.next;
    if (change.reset) retry();
    return change.reset;
  }, [sessionId, retry]);
  if (!url || !identity.configured) return <Context.Provider value={{ ...defaultValue, retry }}>{children}</Context.Provider>;
  let valid = false;
  try { const parsed = new URL(url); valid = parsed.protocol === "https:" && !parsed.username && !parsed.password && !parsed.search && !parsed.hash; } catch { /* Fail closed on invalid public configuration. */ }
  if (!valid) return <Context.Provider value={{ ...defaultValue, status: "authorization_error", retry }}>{children}</Context.Provider>;
  return <LiveClient key={`${identity.sessionId ?? "signed-out"}:${identity.refreshRevision}:${retryCount}`} url={url} retry={retry} observe={observe}>{children}</LiveClient>;
}
