import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useSignIn, useSignUp } from "@clerk/expo";
import { router } from "expo-router";
import { Button, Field, Notice, Select, Txt } from "@/components/smart/ui";
import { roles, type Role } from "@/domain/models";
import { useIdentity } from "./identity";
import { authErrorMessage } from "./auth-policy";
import { StaffAccountStatus as IdentityStatus } from "@/features/staff/status";
import { checkIdentityResult, requestEmailCode, verifyEmailAttempt } from "./email-code-service";

/** Clerk identity only. Requested staff details never become authorization claims. */
export function EmailAuth({ mode }: { mode: "sign-in" | "register" | "recovery" }) {
  const { signIn, fetchStatus: signInFetch, errors: signInErrors } = useSignIn();
  const { signUp, fetchStatus: signUpFetch, errors: signUpErrors } = useSignUp();
  const identity = useIdentity();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<Role>("Clinician");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code" | "mfa">("email");
  const [factor, setFactor] = useState("Authenticator code");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const lock = useRef(false);
  const registration = mode === "register";
  const fetching = busy || signInFetch === "fetching" || signUpFetch === "fetching";
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try { await action(); } catch (error) { setMessage(authErrorMessage(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  const check = checkIdentityResult;
  const finish = async () => {
    if (!registration && (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust")) {
      const factors = signIn.supportedSecondFactors ?? [];
      if (factors.some((f) => f.strategy === "email_code")) {
        check(await signIn.mfa.sendEmailCode()); setFactor("Email code"); setCooldown(30);
      } else if (factors.some((f) => f.strategy === "totp")) setFactor("Authenticator code");
      else if (factors.some((f) => f.strategy === "backup_code")) setFactor("Backup code");
      else { setMessage("Your account requires an additional authentication method this screen cannot complete. Contact your account administrator."); return; }
      setCode(""); setStep("mfa"); return;
    }
    setMessage(registration
      ? `Clerk requires additional account information: ${signUp.missingFields.join(", ") || "check your email verification"}. Contact your administrator if these requirements are unexpected.`
      : "Additional account verification is required. Contact your account administrator.");
  };
  const send = () => run(async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("Enter a valid email address.");
    if (registration) {
      if (!name.trim() || !staffId.trim() || !department.trim()) throw new Error("Enter your full name, staff ID and department.");
      check(await signUp.create({ emailAddress: email.trim(), unsafeMetadata: {
        smartmaintRequest: { fullName: name.trim(), staffId: staffId.trim(), department: department.trim(), requestedRole: role },
      } }));
      check(await signUp.verifications.sendEmailCode());
    } else check(await signIn.emailCode.sendCode({ emailAddress: email.trim() }));
    setStep("code"); setCode(""); setCooldown(30);
  });
  const verify = () => run(async () => {
    const resource = registration ? signUp : signIn;
    const status = await verifyEmailAttempt({
      verify: (code) => step === "mfa" ? (factor === "Email code" ? signIn.mfa.verifyEmailCode({ code })
        : factor === "Backup code" ? signIn.mfa.verifyBackupCode({ code }) : signIn.mfa.verifyTOTP({ code }))
        : registration ? signUp.verifications.verifyEmailCode({ code }) : signIn.emailCode.verifyCode({ code }),
      status: () => resource.status,
      finalize: () => resource.finalize({ navigate: () => router.replace("/access/pending") }),
    }, code);
    if (status !== "complete") await finish();
  });
  const resend = () => run(async () => {
    const sent = await requestEmailCode(() => step === "mfa" ? signIn.mfa.sendEmailCode() : registration ? signUp.verifications.sendEmailCode() : signIn.emailCode.sendCode(), cooldown);
    if (!sent) return;
    setCooldown(30); setMessage("A new code was sent. Check your email.");
  });
  if (!identity.loaded) return <Notice>Loading secure sign-in…</Notice>;
  if (identity.signedIn) return <IdentityStatus />;
  const fields = registration ? signUpErrors.fields : signInErrors.fields;
  return <View style={{ gap: 12 }}>
    {mode === "recovery" && <Notice>Use a fresh email code to sign in. No password or PIN reset is needed.</Notice>}
    {message ? <Notice tone="warning">{message}</Notice> : null}
    {step === "email" ? <>
      {registration && <>
        <Field label="Full name" insetLabel icon="person-outline" placeholder="Your full name" value={name} onChangeText={setName} editable={!fetching} maxLength={120} />
        <Field label="Email address" insetLabel icon="mail-outline" placeholder="you@hospital.org" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!fetching} error={signUpErrors.fields.emailAddress?.message} />
        <Field label="Staff ID" insetLabel icon="id-card-outline" placeholder="Your institutional staff ID" value={staffId} onChangeText={setStaffId} editable={!fetching} maxLength={80} />
        <Field label="Department (requested)" insetLabel icon="business-outline" placeholder="Your department" value={department} onChangeText={setDepartment} editable={!fetching} maxLength={100} />
        <Select label="Requested role" insetLabel icon="people-outline" values={roles} value={role} onChange={setRole} />
        <Notice>Requested staff details require authorized review. Verifying your email does not grant a staff role.</Notice>
      </>}
      {!registration && <Field label="Email address" icon="mail-outline" placeholder="you@hospital.org" value={email} onChangeText={setEmail} keyboardType="email-address"
        autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!fetching}
        error={signInErrors.fields.identifier?.message} />}
      <Button label={registration ? "Create account · Send code" : "Send sign-in code"} loading={fetching} onPress={() => void send()} />
    </> : <>
      <Txt muted>{step === "mfa" ? `Additional verification: ${factor}` : `Enter the code sent to ${email.trim()}.`}</Txt>
      {step === "mfa" && <Select label="Verification method" values={(signIn.supportedSecondFactors ?? []).flatMap((f) =>
        f.strategy === "email_code" ? ["Email code"] : f.strategy === "totp" ? ["Authenticator code"] : f.strategy === "backup_code" ? ["Backup code"] : [])}
        value={factor} onChange={(v) => { setFactor(v); setCode(""); }} />}
      <Field label="Verification code" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false}
        autoComplete="one-time-code" textContentType="oneTimeCode" keyboardType={factor === "Backup code" && step === "mfa" ? "default" : "number-pad"}
        editable={!fetching} error={fields.code?.message} />
      <Button label="Verify and sign in" loading={fetching} onPress={() => void verify()} />
      {(step !== "mfa" || factor === "Email code") && <Button label={cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        variant="secondary" disabled={fetching || cooldown > 0} onPress={() => void resend()} />}
      <Button label="Use a different email" variant="secondary" disabled={fetching} onPress={() => void run(async () => {
        check(await (registration ? signUp.reset() : signIn.reset())); setCode(""); setStep("email");
      })} />
    </>}
    {registration && <View nativeID="clerk-captcha" />}
  </View>;
}

export { StaffAccountStatus as IdentityStatus } from "@/features/staff/status";
