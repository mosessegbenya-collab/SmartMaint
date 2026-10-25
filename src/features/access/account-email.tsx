import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/expo';
import { Card, Button, Field, Notice, Txt } from '@/components/smart/ui';
import { useIdentity } from './identity';
import { accountEmailError, sendAccountEmailCode, verifyAccountEmail } from './account-email-service';

export function AccountEmailVerification() {
  const { user, isLoaded } = useUser();
  const identity = useIdentity();
  if (!isLoaded) return <Notice>Loading email verification…</Notice>;
  if (!user || !identity.signedIn) return <Notice tone="warning">Sign in again to verify your email.</Notice>;
  return <EmailVerification key={`${identity.sessionId}:${user.id}:${user.primaryEmailAddress?.id}`} />;
}

function EmailVerification() {
  const { user } = useUser();
  const identity = useIdentity();
  const email = user?.primaryEmailAddress;
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const lock = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (!retryAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const cooldown = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const refresh = async () => { await identity.refresh(); };
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try { await action(); }
    catch (error) { if (active.current) setMessage(accountEmailError(error)); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  };
  if (!email) return <Notice tone="warning">Your Clerk account has no primary email. Add and verify a primary email in your identity account settings, then refresh account status. Staff access remains locked.</Notice>;
  if (email.verification.status === 'verified') return <Card style={{ gap: 12 }}>
    <Notice>Your email is verified in Clerk. Refresh account status to update the staff service.</Notice>
    <Txt muted>If identity remains unverified after refreshing, an administrator must check that the Clerk Convex integration session claims, or the legacy convex JWT template, supply the primary email and its email_verified claim. Email verification alone does not approve staff access.</Txt>
    {!!message && <Notice tone="warning">{message}</Notice>}
    <Button label="Refresh verified identity" loading={busy} onPress={() => void run(refresh)} />
  </Card>;
  return <Card style={{ gap: 12 }}>
    <Txt weight="700" size={20}>Verify your primary email</Txt>
    <Notice>Request a code for your Clerk primary email. Verifying your email does not grant staff access; institutional approval is still required.</Notice>
    {!!message && <Notice tone="warning">{message}</Notice>}
    {sent && <>
      <Field label="Email verification code" value={code} onChangeText={setCode} editable={!busy} autoCapitalize="none" autoCorrect={false} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" />
      <Button label="Verify email" loading={busy} onPress={() => void run(async () => {
        try { await verifyAccountEmail(email, code, refresh); }
        finally { if (active.current) setCode(''); }
      })} />
    </>}
    <Button label={cooldown > 0 ? `Resend code in ${cooldown}s` : sent ? 'Resend verification code' : 'Send verification code'} disabled={busy || cooldown > 0} onPress={() => void run(async () => {
      if (await sendAccountEmailCode(email, retryAt)) {
        if (!active.current) return;
        const timestamp = Date.now(); setNow(timestamp); setRetryAt(timestamp + 30000);
        setSent(true); setCode(''); setMessage('A verification code was sent. Use the newest code. If it expires, request another.');
      }
    })} />
    {sent && <Button label="Cancel code entry" variant="secondary" disabled={busy} onPress={() => { setCode(''); setSent(false); setMessage(''); }} />}
  </Card>;
}
