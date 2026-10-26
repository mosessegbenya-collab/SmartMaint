import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { useSession, useUser } from '@clerk/expo';
import { ConvexHttpClient } from 'convex/browser';
import { router } from 'expo-router';
import { Button, Card, Notice, Screen, usePalette } from '@/components/smart/ui';
import { staffApi } from '@/services/staff-api';
import { convexTokenOptions } from './account-email-service';
import { checkFreshIdentity, describeToken, diagnosticErrorStatus } from './identity-diagnostic-service';
import { useIdentity } from './identity';
import { checkUnapprovedAccess } from './unapproved-access-check';

const diagnosticEnabled = () => __DEV__ && process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_') && process.env.EXPO_PUBLIC_CONVEX_URL === 'https://greedy-bat-971.convex.cloud';

export function IdentityConnectionDiagnostics() {
  if (!diagnosticEnabled()) return null;
  return <Button label="Check identity connection" onPress={() => router.push('/identity-connection')} />;
}
export function IdentityConnectionScreen() {
  const identity = useIdentity();
  return <Screen title="Identity connection">
    {diagnosticEnabled() && identity.configured && identity.signedIn
      ? <ConfiguredDiagnostics key={identity.sessionId} />
      : <Notice>Sign in to the configured development application before checking identity. Staff records remain locked.</Notice>}
    <Button label="Return to account status" variant="secondary" onPress={() => router.replace('/access/pending')} />
  </Screen>;
}
function ConfiguredDiagnostics() {
  const palette = usePalette();
  const { session } = useSession();
  const { user } = useUser();
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false), active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const check = async (protectedAccess = false) => {
    if (lock.current || !session || !user) return;
    lock.current = true; setBusy(true); setResult('');
    let stage = 'identity_reload';
    let clientDescription: ReturnType<typeof describeToken> | undefined;
    try {
      let client: ConvexHttpClient;
      const output = await checkFreshIdentity({
        reload: async () => { await user.reload(); await session.reload(); session.clearCache(); },
        token: async () => {
          stage = 'token_issuance';
          const token = await session.getToken(convexTokenOptions(session.lastActiveToken?.jwt?.claims.aud));
          if (!token) throw { code: 'unauthenticated' };
          stage = 'token_parsing';
          const payload = JSON.parse(atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))) as Record<string, unknown>;
          const keyHost = atob(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!.replace(/^pk_test_/, '')).replace(/\$$/, '');
          clientDescription = describeToken(payload, `https://${keyHost}`, user.primaryEmailAddress?.emailAddress);
          client = new ConvexHttpClient(process.env.EXPO_PUBLIC_CONVEX_URL!, { logger: false });
          client.setAuth(token);
          return token;
        },
        inspect: async () => { stage = 'backend_identity_request'; return client.query(staffApi.auth_diagnostics.inspect, {}); },
        resolve: async () => { stage = 'staff_resolution'; return client.query(staffApi.staff.resolve, { cacheKey: `diagnostic-${Date.now()}` }); },
      });
      let accessCheck;
      if (protectedAccess) {
        stage = 'protected_access_requests';
        const queries = {
          equipment: () => client.query(staffApi.operations.equipment, {}),
          reports: () => client.query(staffApi.operations.reports, {}),
          tasks: () => client.query(staffApi.operations.tasks, {}),
          preferences: () => client.query(staffApi.extensions.preferences, {}),
          administration: () => client.query(staffApi.administration.accounts, {}),
        };
        accessCheck = await checkUnapprovedAccess({ identityStatus: output.diagnostic.status, staffStatus: output.resolution.status, query: (area) => queries[area]() });
      }
      if (active.current) setResult(JSON.stringify({ stage: 'complete', client: clientDescription, backend: output.diagnostic, staff: output.resolution.status, protectedAccess: accessCheck }, null, 2));
    } catch (error) {
      if (active.current) setResult(JSON.stringify({ stage, status: diagnosticErrorStatus(error), client: clientDescription }, null, 2));
    } finally { lock.current = false; if (active.current) setBusy(false); }
  };
  return <Card style={{ gap: 12 }}>
    <Notice>Development identity check: fresh signed requests; only status codes and claim names/types are shown. Staff permissions remain unchanged.</Notice>
    <Button label="Check identity connection" loading={busy} disabled={!session || !user} onPress={() => void check()} />
    <Button label="Check unapproved access" variant="secondary" disabled={busy || !session || !user} onPress={() => void check(true)} />
    {!!result && <Text selectable style={{ color: palette.text, fontSize: 14 }} accessibilityLiveRegion="polite">{result}</Text>}
  </Card>;
}
