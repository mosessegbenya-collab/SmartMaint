import { useState } from "react";
import { useAuth, useSignUp, useSignIn } from "@clerk/expo";
import { Redirect, router } from "expo-router";
import { useConvex } from "convex/react";
import { Button, Card, Detail, Notice, Screen, Txt } from "@/components/smart/ui";
import { staffApi } from "@/services/staff-api";
import { useStaffAccess } from "@/features/staff/provider";
import { checkIdentityResult } from "./email-code-service";
import { randomUUID } from "expo-crypto";
import { convexTokenOptions } from "./account-email-service";

// Development-only, explicitly synthetic identity preparation. Never submits a staff application.
const email = "smartmaint-qa-20261025+clerk_test@example.com";
export function DevelopmentIdentity() {
  if (!__DEV__ || !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_") || !process.env.EXPO_PUBLIC_CONVEX_URL) return <Redirect href="/" />;
  return <DevelopmentIdentityForm />;
}
function DevelopmentIdentityForm() {
  const { signUp } = useSignUp(); const { signIn } = useSignIn(); const auth = useAuth(); const client = useConvex(); const access = useStaffAccess();
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<void>) => { setBusy(true); setMessage(""); try { await work(); } catch (error) { setMessage(error instanceof Error ? error.message : "Development identity check failed"); } finally { setBusy(false); } };
  return <Screen title="Development Identity Check"><Notice>Synthetic Clerk identity only. No staff account, department, role, application, verification policy or safety approval is created.</Notice><Detail label="Reserved Clerk test email" value={email} /><Detail label="Clerk authenticated" value={auth.isSignedIn ? "Yes" : "No"} /><Detail label="Staff authorization" value={access.status} />
    {!auth.isSignedIn && <><Button label="Prepare synthetic Clerk identity" disabled={busy} onPress={() => void run(async () => { checkIdentityResult(await signUp.create({ emailAddress: email, firstName: "SmartMaint", lastName: "Synthetic QA", password: randomUUID() + "aA!5" })); checkIdentityResult(await signUp.verifications.sendEmailCode()); setMessage("Synthetic identity prepared. Clerk test mode sends no email; verify the reserved test code next. The generated development password is never logged or retained; use email-code sign-in for this identity."); })} /><Button label="Verify synthetic test email" disabled={busy} onPress={() => void run(async () => { checkIdentityResult(await signUp.verifications.verifyEmailCode({ code: "424242" })); if (signUp.status !== "complete") throw Error("Clerk requires additional configured sign-up fields: " + signUp.missingFields.join(", ")); checkIdentityResult(await signUp.finalize({ navigate: () => {} })); setMessage("Synthetic Clerk identity created. No staff application was submitted."); })} /><Button label="Sign in existing synthetic identity" disabled={busy} onPress={() => void run(async () => { checkIdentityResult(await signIn.emailCode.sendCode({ emailAddress: email })); checkIdentityResult(await signIn.emailCode.verifyCode({ code: "424242" })); if (signIn.status !== "complete") throw Error("Additional Clerk verification is required."); checkIdentityResult(await signIn.finalize({ navigate: () => {} })); setMessage("Signed into the synthetic identity; staff access remains separate."); })} /></>}
    {auth.isSignedIn && <><Button label="Check Convex token and unapproved access" disabled={busy} onPress={() => void run(async () => {
      const token = await auth.getToken(convexTokenOptions(auth.sessionClaims?.aud));
      if (!token) throw Error("Clerk did not issue a token for the configured Convex connection.");
      const payload = JSON.parse(atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')));
      const audience = payload.aud === "convex" || (Array.isArray(payload.aud) && payload.aud.includes("convex"));
      const emailClaim = typeof payload.email === "string" && payload.email_verified === true;
      const expiry = typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
      const resolution = await client.query(staffApi.staff.resolve, { cacheKey: "synthetic-identity-check" });
      if (resolution.status === "approved") throw Error("Unexpected staff approval. Stop live testing and review institutional account configuration.");
      setMessage(`TOKEN CHECK: audience=${audience}; verified-email-claims=${emailClaim}; current=${expiry}; server-staff-status=${resolution.status}. No token or identity claims recorded.`);
    })} /><Button label="Sign out synthetic identity" disabled={busy} onPress={() => void run(async () => { await auth.signOut(); setMessage("Synthetic identity signed out."); })} /><Button label="View pending access screen" onPress={() => router.push("/access/pending")} /></>}
    {!!message && <Card><Txt accessibilityLiveRegion="polite">{message}</Txt></Card>}
  </Screen>;
}
