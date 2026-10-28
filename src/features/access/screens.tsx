import { useState } from "react";
import { Image, View, Pressable, useWindowDimensions } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import {
  Badge,
  brandAssets,
  Button,
  Card,
  Choices,
  Detail,
  Field,
  Icon,
  LinkRow,
  Notice,
  Row,
  Screen,
  Select,
  Section,
  Txt,
  usePalette,
} from "@/components/smart/ui";
import { roles, type Role } from "@/domain/models";
import { equipment } from "@/services/fixtures";
import { useApp } from "@/state/app-state";
import { EmailAuth, IdentityStatus } from "./email-auth";
import { useIdentity } from "./identity";
import { useCurrentTime } from "@/hooks/use-current-time";
import { AuthHeader } from './auth-header';

export function WelcomeScreen() {
  const now = useCurrentTime();
  const { width } = useWindowDimensions();
  const identity = useIdentity();
  if (identity.signedIn) return <Screen back={false} title="Account access"><Card><IdentityStatus /></Card></Screen>;
  if (identity.expired) return <Redirect href="/access/expired" />;
  return (
    <Screen
      back={false}
      padding={0}
      safeBottom
      header={
        <Row
          style={{
            paddingHorizontal: 18,
            paddingVertical: 8,
            minHeight: 56,
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Row style={{ gap: 5, flexShrink: 1, maxWidth: "100%" }}>
            <Image
              source={brandAssets.logo}
              style={{ width: 36, height: 36 }}
              accessibilityLabel="SmartMaint gear and heartbeat logo"
            />
            <Txt size={22} weight="800" style={{ flexShrink: 1 }}>
              Smart
              <Txt size={22} weight="800" color="#0866E8">
                Maint
              </Txt>
            </Txt>
          </Row>
          <Row
            style={{
              gap: 5,
              borderWidth: 1,
              borderColor: "#DCE8F4",
              borderRadius: 18,
              paddingHorizontal: 10,
              paddingVertical: 8,
              maxWidth: "100%",
              flexShrink: 1,
            }}
          >
            <Icon name="calendar-outline" size={15} />
            <Txt size={11} muted style={{ flexShrink: 1 }}>
              {new Date(now).toLocaleDateString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Txt>
          </Row>
        </Row>
      }
    >
      <Image
        source={brandAssets.hero}
        style={{ width: "100%", height: (Math.min(width, 600) * 376) / 627 }}
        accessibilityLabel="Approved ventilator equipment imagery"
      />
      <Card
        style={{
          marginTop: -14,
          gap: 10,
          padding: 18,
          borderRadius: 26,
          marginBottom: 20,
        }}
      >
        <Badge label="MEDICAL EQUIPMENT MAINTENANCE" />
        <Txt
          size={40}
          weight="800"
          lineHeight={38}
          style={{ letterSpacing: -1.2, marginHorizontal:8 }}
        >
          Reliable Equipment.{"\n"}
          <Txt
            size={40}
            weight="800"
            color="#0866E8"
            lineHeight={38}
            style={{ letterSpacing: -1.2 }}
          >
            Safer Care.
          </Txt>
        </Txt>
        <Txt size={20} muted lineHeight={21} style={{ marginHorizontal:8 }}>
          Identify equipment, report faults{"\n"}and track maintenance.
        </Txt>
        {!identity.loaded && <View style={{ gap: 10 }}>
          <Notice tone={identity.restoreTimedOut ? 'warning' : 'info'}>{identity.restoreTimedOut ? 'Sign-in services are taking longer than expected. The equipment shown here is fictional. Retry to continue to your account.' : 'Checking your saved sign-in. The equipment shown here is fictional; account actions will be available when this check finishes.'}</Notice>
          {identity.restoreTimedOut && <Button label="Retry secure sign-in" variant="secondary" onPress={identity.retry} />}
        </View>}
        {equipment.slice(0, 3).map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Sign in to view ${item.id}`}
            accessibilityState={{ disabled: !identity.loaded }}
            disabled={!identity.loaded}
            onPress={() => router.push("/access/sign-in")}
          >
            <Card style={{ paddingVertical: 4, paddingHorizontal:8, borderRadius: 12 }}>
              <Row style={{gap:20}}>
                <Image
                  source={brandAssets[item.asset]}
                  style={{ width: 64, height: 48, borderRadius: 10 }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Txt size={13} weight="700">
                    {item.id}
                  </Txt>
                  <Txt size={12} muted>
                    {item.name}
                  </Txt>
                  <Txt size={11} muted>
                    {item.location}
                  </Txt>
                </View>
                <Icon name="chevron-forward" size={18} />
              </Row>
            </Card>
          </Pressable>
        ))}
        <Button
          label="Get Started"
          disabled={!identity.loaded}
          icon="arrow-forward"
          onPress={() => router.push("/access/register")}
        />
        <Button
          label="Staff Sign In"
          disabled={!identity.loaded}
          variant="secondary"
          onPress={() => router.push("/access/sign-in")}
        />
        <Txt size={10} muted style={{ textAlign: "center" }}>
          Design preview · Fictional equipment imagery
        </Txt>
      </Card>
    </Screen>
  );
}
const titles: Record<string, string> = {
  "sign-in": "Staff Sign In",
  register: "Create Your Account",
  pending: "Application received",
  activation: "Activate Your Account",
  pin: "Set Up Your PIN",
  recovery: "Sign-in Help",
  biometric: "Unlock SmartMaint",
  expired: "Session Expired",
  "session-recovery": "Pending work found",
};
export function AccessRoute() {
  const { view } = useLocalSearchParams<{ view: string }>();
  return <AccessScreen key={view} screen={view} />;
}
function AccessScreen({ screen }: { screen: string }) {
  const app = useApp();
  const p = usePalette();
  const identity = useIdentity();
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [role, setRole] = useState<Role>("Clinician");
  const [message, setMessage] = useState("");
  const [independent, setIndependent] = useState(false);
  const unconfigured = () =>
    setMessage(
      "This operation requires configured identity services and authorized account approval. No live account change has been made.",
    );
  if (identity.signedIn && ["sign-in", "register", "pending", "recovery"].includes(screen))
    return <Screen title="Account access"><Card style={{ gap: 12 }}><IdentityStatus /></Card></Screen>;
  if (!titles[screen])
    return (
      <Screen title="Page unavailable">
        <Button label="Back to welcome" onPress={() => router.replace("/")} />
      </Screen>
    );
  return (
    <Screen
      title={['sign-in', 'register', 'recovery', 'biometric', 'expired', 'session-recovery'].includes(screen) ? undefined : titles[screen]}
      padding={['sign-in', 'recovery'].includes(screen) ? 0 : screen === 'register' ? 10 : undefined}
      header={['sign-in', 'register', 'recovery', 'biometric', 'expired', 'session-recovery'].includes(screen) ? <AuthHeader date={['register', 'recovery', 'biometric'].includes(screen)} /> : undefined}
    >
      {[
        "sign-in",
        "activation",
        "pin",
        "recovery",
      ].includes(screen) && (
        <Image
          source={['sign-in', 'recovery'].includes(screen) ? brandAssets.authHero : brandAssets.hero}
          style={{ width: "100%", height: ['sign-in', 'recovery'].includes(screen) ? 158 : 135, borderRadius: ['sign-in', 'recovery'].includes(screen) ? 0 : 16 }}
        />
      )}
      {screen === "register" && <Card style={{ minHeight: 184, padding: 0, overflow: "hidden", borderRadius: 20 }}>
        <Image source={brandAssets.authHero} blurRadius={12} style={{ position: "absolute", right: 0, top: 0, width: "100%", height: "100%" }} resizeMode="cover" accessible={false} />
        <Image source={brandAssets.registrationHero} style={{ position: 'absolute', right: 0, top: 0, width: '45%', height: '100%' }} resizeMode="cover" accessibilityLabel="Approved medical equipment imagery" />
        <View style={{ width: "59%", padding: 16, gap: 10, backgroundColor: p.card }}>
          <Txt size={30} lineHeight={32} weight="800">Create Your{"\n"}Account</Txt>
          <Txt size={14} lineHeight={18} muted>Request access to SmartMaint. Your staff details require administrator approval.</Txt>
        </View>
      </Card>}
      {!!message && <Notice tone="warning">{message}</Notice>}
      {screen === "sign-in" && (
        <Card style={{ gap: 10, padding: 20, borderRadius: 28, marginTop: -14 }}>
            <Txt size={40} lineHeight={44} weight="800">Staff Sign In</Txt>
            <Txt size={19} lineHeight={23} muted>
              Access your account to continue to SmartMaint.
            </Txt>
            <Txt size={15} muted>
              Access requires administrator approval.
            </Txt>
            {identity.configured ? <EmailAuth mode="sign-in" /> : <Notice tone="warning">Clerk is not configured. Add a public publishable key for the existing application to enable sign-in.</Notice>}
            <Pressable
              accessibilityRole="button"
              style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
              onPress={() => router.push("/access/recovery")}
            ><Txt color="#0866E8" weight="600">Trouble signing in?</Txt></Pressable>
            <Pressable
              accessibilityRole="button"
              style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
              onPress={() => router.push("/access/register")}
            ><Txt color="#0866E8" style={{ textDecorationLine: "underline" }}>Request an account</Txt></Pressable>
          {app.previewEnabled && (
            <Section title="Development preview">
              <Notice tone="warning">
                Synthetic accounts only. Changes are held in memory and reset
                when the app restarts.
              </Notice>
              <Select
                label="Preview role"
                values={roles}
                value={role}
                onChange={setRole}
              />
              {role === "Biomedical Technician" && (
                <Choices
                  label="Synthetic identity"
                  values={["Repairing technician", "Independent verifier"]}
                  value={
                    independent
                      ? "Independent verifier"
                      : "Repairing technician"
                  }
                  onChange={(v) => setIndependent(v === "Independent verifier")}
                />
              )}
              <Button
                label="Open development preview"
                onPress={() => {
                  app.enter(role, independent);
                  router.replace("/workspace/home");
                }}
              />
            </Section>
          )}
        </Card>
      )}
      {screen === "register" && <Card style={{ gap: 10, padding: 14 }}>
        <Txt size={24} weight="800">Registration Details</Txt>
        <Txt muted>Provide your details to request a SmartMaint account. Requested roles require administrator approval.</Txt>
        {identity.configured ? <EmailAuth mode="register" /> : <Notice tone="warning">Clerk is not configured. Registration is unavailable.</Notice>}
        <Button label="Already have an account? Sign in" variant="secondary" onPress={() => router.replace("/access/sign-in")} />
      </Card>}
      {screen === "pending" && (
        <>
          <View style={{ alignItems: "center", padding: 20 }}>
            <Icon name="document-text-outline" size={64} color="#C58A17" />
          </View>
          <Txt style={{ textAlign: "center" }}>
            Awaiting administrator approval.
          </Txt>
          <Notice>
            The account backend is unconfigured. No application has been sent or
            approved.
          </Notice>
          <Card style={{ gap: 10 }}>
            <Detail label="Status" value="Preview only" />
            <Detail label="Requested role" value="Requires authorized review" />
          </Card>
          <Button label="Check Status" onPress={unconfigured} />
          {app.previewEnabled && (
            <Button
              label="Preview activation screen"
              variant="secondary"
              onPress={() => router.push("/access/activation")}
            />
          )}
          <Button
            label="Back to Sign In"
            variant="secondary"
            onPress={() => router.replace("/access/sign-in")}
          />
        </>
      )}
      {screen === "activation" && (
        <>
          <Notice>
            Activation requires a server-issued code delivered to a verified
            contact.
          </Notice>
          <Field
            label="Activation code"
            value={pin}
            onChangeText={setPin}
            autoCapitalize="none"
          />
          <Button label="Activate Account" onPress={unconfigured} />
          {app.previewEnabled && (
            <Button
              label="Preview PIN setup"
              variant="secondary"
              onPress={() => router.push("/access/pin")}
            />
          )}
        </>
      )}
      {screen === "pin" && (
        <>
          <Field
            label="New six-digit PIN"
            value={pin}
            onChangeText={setPin}
            maxLength={6}
            secureTextEntry
            keyboardType="number-pad"
          />
          <Field
            label="Confirm PIN"
            value={confirmation}
            onChangeText={setConfirmation}
            maxLength={6}
            secureTextEntry
            keyboardType="number-pad"
          />
          <Notice>
            A PIN is not stored locally or converted to a password. A supported
            provider and recovery policy are required.
          </Notice>
          <Button
            label="Continue"
            onPress={() =>
              /^\d{6}$/.test(pin) && pin === confirmation
                ? unconfigured()
                : setMessage("Enter matching six-digit PINs.")
            }
          />
          <Button
            label="Biometric setup"
            variant="secondary"
            onPress={() => router.push("/access/biometric")}
          />
        </>
      )}
      {screen === "recovery" && <Card style={{ gap: 16, padding: 22, borderRadius: 28, marginTop: -14 }}>
        <Txt size={32} weight="800">Reset your password</Txt><Txt size={17} muted>Enter your registered email address to receive a password reset code.</Txt>
        {identity.configured ? <EmailAuth mode="recovery" /> : <Notice tone="warning">Clerk is not configured. Contact your administrator.</Notice>}
        <Button label="Back to sign in" variant="secondary" onPress={() => router.replace("/access/sign-in")} />
      </Card>}
      {screen === "biometric" && (
        <>
          <View style={{ minHeight: 220, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: 24 }}><Image source={brandAssets.authHero} blurRadius={12} style={{ position: 'absolute', width: '100%', height: '100%' }} accessible={false} /><Card style={{ padding: 26, borderRadius: 32 }}><Icon name="finger-print" size={96} /></Card></View>
          <Txt size={30} weight="800" style={{ textAlign: 'center' }}>Unlock SmartMaint</Txt>
          <Txt muted size={17} style={{ textAlign: 'center' }}>
            Biometric sign-in is not available. Use your email and password.
          </Txt>
          <Button
            label="Biometric sign-in unavailable"
            disabled
            onPress={unconfigured}
          />
          <Button
            label="Use account sign-in"
            variant="secondary"
            onPress={() => router.push("/access/sign-in")}
          />
        </>
      )}
      {screen === "expired" && (
        <>
          <View style={{ alignItems: 'center', paddingVertical: 28 }}><View style={{ backgroundColor: '#FFF8E7', padding: 22, borderRadius: 90 }}><Icon name="time-outline" size={100} color="#D38B10" /></View></View>
          <Txt size={34} weight="800" style={{ textAlign: 'center' }}>Session Expired</Txt>
          <Txt muted size={20} style={{ textAlign: 'center', marginBottom: 10 }}>For your security, sign in again to confirm your staff access.</Txt>
          <Notice tone="warning">
            Review any pending submission attempts on this device after your approved staff session is restored. Server receipt is unchanged.
          </Notice>
          <Button
            label="Sign In Again"
            onPress={() => router.push("/access/sign-in")}
          />
          <Button
            label="Recover Pending Work"
            variant="secondary"
            onPress={() => router.push("/access/session-recovery")}
          />
          <Card style={{ gap: 8 }}><Row><Icon name="lock-closed-outline" /><Txt weight="700">Why sign in again?</Txt></Row><Txt muted>Your identity or staff authorization must be reconfirmed before protected records can be opened or submitted.</Txt></Card>
        </>
      )}
      {screen === "session-recovery" && (
        <>
          <View style={{ alignItems: 'center', paddingVertical: 20 }}><Icon name="cloud-upload-outline" size={78} /></View><Txt size={31} weight="800" style={{ textAlign: 'center' }}>Recover Pending Work</Txt><Txt size={18} muted style={{ textAlign: 'center' }}>Sign in to check submission attempts saved on this device.</Txt>
          <Notice>
            Pending publication attempts are private to their staff account. Their contents and server receipt status can be checked after fresh staff authorization.
          </Notice>
          {app.previewEnabled && app.expired && <Button
            label="Recover synthetic session"
            variant="secondary"
            onPress={() => {
              app.recover();
              router.replace("/workspace/home");
            }}
          />}
          <Button
            label="Sign In and Recover"
            onPress={() => router.push("/access/sign-in")}
          />
          <Button label="Back" variant="secondary" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
        </>
      )}
      <LinkRow
        title="Emergency equipment reporting"
        detail="Controlled unverified fallback"
        icon="warning-outline"
        onPress={() => router.push("/flow/emergency")}
      />
    </Screen>
  );
}
