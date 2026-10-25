import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { useSession, useUser } from '@clerk/expo';
import { ConvexHttpClient } from 'convex/browser';
import { Button, Card, Notice, usePalette } from '@/components/smart/ui';
import { staffApi } from '@/services/staff-api';
import { convexTokenOptions } from './account-email-service';
import { checkFreshIdentity, describeToken } from './identity-diagnostic-service';
import { useStaffAccess } from '@/features/staff/provider';

export function IdentityConnectionDiagnostics() {
  if (!__DEV__ || !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_') || process.env.EXPO_PUBLIC_CONVEX_URL !== 'https://greedy-bat-971.convex.cloud') return null;
  return <ConfiguredDiagnostics />;
}
function ConfiguredDiagnostics() {
  const palette = usePalette();
  const { session } = useSession();
  const { user } = useUser();
  const access = useStaffAccess();
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false), active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const check = async () => {
    if (lock.current || !session || !user) return;
    lock.current = true; setBusy(true); setResult('');
    try {
      let client: ConvexHttpClient;
      let clientDescription: ReturnType<typeof describeToken>;
      const output = await checkFreshIdentity({
        reload: async () => { await user.reload(); await session.reload(); session.clearCache(); },
        token: async () => {
          const token = await session.getToken(convexTokenOptions(session.lastActiveToken?.jwt?.claims.aud));
          if (!token) throw { code: 'unauthenticated' };
          const payload = JSON.parse(atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))) as Record<string, unknown>;
          const keyHost = atob(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!.replace(/^pk_test_/, '')).replace(/\$$/, '');
          clientDescription = describeToken(payload, `https://${keyHost}`, user.primaryEmailAddress?.emailAddress);
          client = new ConvexHttpClient(process.env.EXPO_PUBLIC_CONVEX_URL!, { logger: false });
          client.setAuth(token);
          return token;
        },
        inspect: async () => client.query(staffApi.auth_diagnostics.inspect, {}),
        resolve: async () => client.query(staffApi.staff.resolve, { cacheKey: `diagnostic-${Date.now()}` }),
      });
      if (active.current) setResult(JSON.stringify({ client: clientDescription!, backend: output.diagnostic, staff: output.resolution.status }, null, 2));
      // Keep diagnostics visible until explicit refresh replaces the reactive client.
    } catch (error) {
      const object = error && typeof error === 'object' ? error as { code?: string; errors?: { code?: string }[] } : {};
      const known = object.errors?.[0]?.code ?? object.code;
      const status = ['unauthenticated', 'resource_not_found', 'session_expired'].includes(known ?? '') ? known : 'diagnostic_request_failed';
      if (active.current) setResult(JSON.stringify({ status }));
    } finally { lock.current = false; if (active.current) setBusy(false); }
  };
  return <Card style={{ gap: 12 }}>
    <Notice>Development identity check: fresh signed requests; only status codes and claim names/types are shown. Staff permissions remain unchanged.</Notice>
    <Button label="Check identity connection" loading={busy} disabled={!session || !user} onPress={() => void check()} />
    {!!result && <Text selectable style={{ color: palette.text, fontSize: 14 }} accessibilityLiveRegion="polite">{result}</Text>}
    {!!result && <Button label="Refresh staff-service connection" variant="secondary" onPress={access.retry} />}
  </Card>;
}
