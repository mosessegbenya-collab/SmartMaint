import { Component, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth, useSession } from "@clerk/expo";
import { ConvexProviderWithAuth, ConvexReactClient, useConvex, useConvexAuth, useQuery } from "convex/react";
import { useIdentity } from "@/features/access/identity";
import { staffApi } from "@/services/staff-api";
import { accessCacheKey, nextConnection, observeAuthorization, resolveAccessState, type ObservedAuthorization, type StaffResolution } from "@/domain/staff-access";
import { createFreshConvexTokenFetcher } from "@/features/access/account-email-service";
import { describeToken } from "@/features/access/identity-diagnostic-service";
import type { FunctionReturnType } from "convex/server";

type TokenProof = { mode: "session" | "legacy_convex"; fresh: boolean; description: ReturnType<typeof describeToken> | null };
type ReactiveProof = { token: TokenProof | null; backend: FunctionReturnType<typeof staffApi.auth_diagnostics.inspect> | undefined; socketConnected: boolean; convexAuthenticated: boolean };
type StaffAccess = StaffResolution & { configured: boolean; connected: boolean; retry: () => void; reactiveDiagnostics?: ReactiveProof };
const TokenReporter = createContext<(proof: TokenProof) => void>(() => {});
const developmentDiagnostics = () => __DEV__ && process.env.EXPO_PUBLIC_CONVEX_URL === "https://greedy-bat-971.convex.cloud";
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
  const [tokenProof, setTokenProof] = useState<TokenProof | null>(null);
  const lifecycle = useRef(0);
  useEffect(() => {
    const generation = ++lifecycle.current;
    return () => { void Promise.resolve().then(() => {
      // This epoch is intentionally read after StrictMode effect replay; it is not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (lifecycle.current === generation) return client.close();
    }); };
  }, [client]);
  return <TokenReporter.Provider value={setTokenProof}><ConvexProviderWithAuth client={client} useAuth={useClerkSessionAuth}>
    <LookupBoundary fallback={<Context.Provider value={{ status: "authorization_error", account: null, configured: true, connected: false, retry }}>{children}</Context.Provider>}>
      <ConnectionGate retry={retry} observe={observe} tokenProof={tokenProof}>{children}</ConnectionGate>
    </LookupBoundary>
  </ConvexProviderWithAuth></TokenReporter.Provider>;
}
function useClerkSessionAuth() {
  const report = useContext(TokenReporter);
  const identity = useIdentity();
  const clerk = useAuth({ treatPendingAsSignedOut: false });
  const { session, isLoaded: sessionLoaded } = useSession();
  const pendingTask = !!session?.currentTask;
  // Read the session resource at fetch time, matching the working HTTP path.
  // Do not select a different token from a hook-level sessionClaims fallback.
  const fetchAccessToken = useMemo(() => createFreshConvexTokenFetcher(() => ({
    signedIn: !!clerk.isSignedIn,
    sessionReady: sessionLoaded && !!session,
    pendingTask,
    audience: session?.lastActiveToken?.jwt?.claims.aud,
    getToken: async (options) => {
      const token = await session!.getToken(options);
      if (token && developmentDiagnostics()) {
        let description: ReturnType<typeof describeToken> | null = null;
        try {
          const payload = JSON.parse(atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))) as Record<string, unknown>;
          const host = atob((process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '').replace(/^pk_(test|live)_/, '')).replace(/\$$/, '');
          description = describeToken(payload, `https://${host}`, identity.email ?? undefined);
        } catch { /* Never retain a malformed token or raw exception. */ }
        report({ mode: options.template ? "legacy_convex" : "session", fresh: options.skipCache, description });
      }
      return token;
    },
  })), [clerk.isSignedIn, session, sessionLoaded, pendingTask, report, identity.email]);
  return { isLoading: !clerk.isLoaded || !sessionLoaded, isAuthenticated: clerk.isSignedIn ?? false, fetchAccessToken };
}
let clientSequence = 0;
function ConnectionGate({ children, retry, observe, tokenProof }: { children: ReactNode; retry: () => void; observe: Observation; tokenProof: TokenProof | null }) {
  const identity = useIdentity();
  const client = useConvex();
  const auth = useConvexAuth();
  const [connection, setConnection] = useState(() => ({ connected: client.connectionState().isWebSocketConnected, generation: 0 }));
  useEffect(() => client.subscribeToConnectionState((state) => setConnection((previous) => nextConnection(previous, state.isWebSocketConnected))), [client]);
  return <Resolver key={`${identity.sessionId}:${auth.isAuthenticated}:${connection.generation}`} retry={retry} observe={observe} connected={connection.connected} authLoading={auth.isLoading} authenticated={auth.isAuthenticated} tokenProof={tokenProof}>{children}</Resolver>;
}
function Resolver({ children, retry, observe, connected, authLoading, authenticated, tokenProof }: { children: ReactNode; retry: () => void; observe: Observation; connected: boolean; authLoading: boolean; authenticated: boolean; tokenProof: TokenProof | null }) {
  const identity = useIdentity();
  const [clientId] = useState(() => ++clientSequence);
  const [timedOut, setTimedOut] = useState(false);
  const [acceptedFingerprint, setAcceptedFingerprint] = useState<string | null>(null);
  const enabled = identity.loaded && identity.signedIn && !identity.task && authenticated && connected;
  // A new query key after every reconnect prevents replaying a cached pre-revocation grant.
  const value = useQuery(staffApi.staff.resolve, enabled ? { cacheKey: String(clientId) } : "skip");
  const diagnostic = useQuery(staffApi.auth_diagnostics.inspect, enabled && developmentDiagnostics() ? {} : "skip");
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
  return <Context.Provider value={{ ...visible, configured: true, connected, retry, reactiveDiagnostics: developmentDiagnostics() ? { token: tokenProof, backend: diagnostic, socketConnected: connected, convexAuthenticated: authenticated } : undefined }}>{children}</Context.Provider>;
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
