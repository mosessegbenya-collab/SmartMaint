import { useState } from "react";
import { Image, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
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
} from "@/components/smart/ui";
import { roles, type Role } from "@/domain/models";
import { equipment } from "@/services/fixtures";
import { useApp } from "@/state/app-state";
import { ConfiguredSSO } from "./sso";

export function WelcomeScreen() {
  return (
    <Screen back={false}>
      <Image
        source={brandAssets.hero}
        style={{ width: "100%", height: 240, borderRadius: 22 }}
        accessibilityLabel="Approved ventilator equipment imagery"
      />
      <Card style={{ marginTop: -32, gap: 12, padding: 20 }}>
        <Badge label="MEDICAL EQUIPMENT MAINTENANCE" />
        <Txt size={29} weight="800">
          Reliable Equipment.{"\n"}
          <Txt size={29} weight="800" color="#0866E8">
            Safer Care.
          </Txt>
        </Txt>
        <Txt size={16} muted>
          Identify equipment, report faults{"\n"}and track maintenance.
        </Txt>
        {equipment.slice(0, 3).map((item) => (
          <Row key={item.id}>
            <Image
              source={brandAssets[item.asset]}
              style={{ width: 48, height: 48, borderRadius: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Txt size={13} weight="700">
                {item.id}
              </Txt>
              <Txt size={12} muted>
                {item.name} · {item.location}
              </Txt>
            </View>
          </Row>
        ))}
        <Button
          label="Get Started"
          icon="arrow-forward"
          onPress={() => router.push("/access/register")}
        />
        <Button
          label="Staff Sign In"
          variant="secondary"
          onPress={() => router.push("/access/sign-in")}
        />
        <Txt size={11} muted style={{ textAlign: "center" }}>
          Medical Equipment. Reliable Care. Always Available.
        </Txt>
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
  recovery: "Forgot Your PIN?",
  biometric: "Unlock SmartMaint",
  expired: "Session Expired",
  "session-recovery": "Pending work found",
};
export function AccessRoute() {
  const { screen } = useLocalSearchParams<{ screen: string }>();
  return <AccessScreen key={screen} screen={screen} />;
}
function AccessScreen({ screen }: { screen: string }) {
  const app = useApp();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [role, setRole] = useState<Role>("Clinician");
  const [message, setMessage] = useState("");
  const [independent, setIndependent] = useState(false);
  const unconfigured = () =>
    setMessage(
      "This operation requires configured identity services and authorized account approval. No live account change has been made.",
    );
  const biometrics = async () => {
    try {
      if (
        !(await LocalAuthentication.hasHardwareAsync()) ||
        !(await LocalAuthentication.isEnrolledAsync())
      ) {
        setMessage(
          "Biometric hardware or enrollment is unavailable. Use your configured account sign-in instead.",
        );
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock SmartMaint",
        disableDeviceFallback: true,
      });
      setMessage(
        result.success
          ? "Device verification succeeded. An approved account session is still required."
          : "Device verification cancelled or unsuccessful.",
      );
    } catch {
      setMessage("Biometric authentication is unavailable on this device.");
    }
  };
  if (!titles[screen])
    return (
      <Screen title="Page unavailable">
        <Button label="Back to welcome" onPress={() => router.replace("/")} />
      </Screen>
    );
  return (
    <Screen
      title={titles[screen]}
      subtitle={
        screen === "sign-in"
          ? "Access your account to continue to SmartMaint."
          : undefined
      }
    >
      {[
        "sign-in",
        "register",
        "activation",
        "pin",
        "recovery",
        "biometric",
      ].includes(screen) && (
        <Image
          source={brandAssets.hero}
          style={{ width: "100%", height: 135, borderRadius: 16 }}
        />
      )}
      {message && <Notice tone="warning">{message}</Notice>}
      {screen === "sign-in" && (
        <>
          <Card style={{ gap: 12 }}>
            <Txt size={12} muted>
              Access requires administrator approval.
            </Txt>
            <Field
              label="Staff ID or email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="username"
            />
            <Field
              label="PIN"
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              keyboardType="number-pad"
            />
            <Button label="Sign In" onPress={unconfigured} />
            <Button
              label="Forgot your PIN?"
              variant="secondary"
              onPress={() => router.push("/access/recovery")}
            />
            <Button
              label="Request an account"
              variant="secondary"
              onPress={() => router.push("/access/register")}
            />
          </Card>
          {process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
            <ConfiguredSSO />
          ) : (
            <>
              <Notice>
                Google and Apple sign-in are unconfigured. Staff ID + PIN
                requires an approved authentication integration.
              </Notice>
              <Button
                label="Continue with Google · Setup required"
                icon="logo-google"
                variant="secondary"
                onPress={unconfigured}
              />
              <Button
                label="Continue with Apple · Setup required"
                icon="logo-apple"
                variant="secondary"
                onPress={unconfigured}
              />
            </>
          )}
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
        </>
      )}
      {screen === "register" && (
        <Card style={{ gap: 12 }}>
          <Txt size={18} weight="700">
            Registration Details
          </Txt>
          <Field label="Full name" value={name} onChangeText={setName} />
          <Field
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field label="Staff ID" value={staffId} onChangeText={setStaffId} />
          <Select
            label="Requested role"
            values={roles}
            value={role}
            onChange={setRole}
          />
          <Notice>
            Requested roles require administrator approval. Registration does
            not grant access.
          </Notice>
          <Button
            label="Submit Application"
            onPress={() => {
              if (
                !name.trim() ||
                !staffId.trim() ||
                !/^\S+@\S+\.\S+$/.test(email)
              ) {
                setMessage(
                  "Enter your name, staff ID and a valid email address.",
                );
                return;
              }
              unconfigured();
            }}
          />
          {app.previewEnabled && (
            <Button
              label="Preview pending application"
              variant="secondary"
              onPress={() => router.push("/access/pending")}
            />
          )}
        </Card>
      )}
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
      {screen === "recovery" && (
        <>
          <Txt muted>
            Enter your registered email address. Recovery delivery is
            unavailable until identity services are configured.
          </Txt>
          <Field
            label="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Button
            label="Send Reset Link"
            onPress={() =>
              /^\S+@\S+\.\S+$/.test(email)
                ? unconfigured()
                : setMessage("Enter a valid registered email address.")
            }
          />
          <Button
            label="Contact administrator"
            variant="secondary"
            onPress={() =>
              setMessage(
                "An organization support contact has not been configured.",
              )
            }
          />
        </>
      )}
      {screen === "biometric" && (
        <>
          <Icon name="finger-print" size={80} />
          <Txt muted>
            Use device biometrics to reauthenticate an approved session. Device
            verification cannot approve staff access.
          </Txt>
          <Button
            label="Check biometric support"
            onPress={() => void biometrics()}
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
          <Icon name="time-outline" size={64} color="#C58A17" />
          <Txt>Your session has expired. Synchronization is paused.</Txt>
          <Notice tone="warning">
            In-memory demonstration queue entries remain isolated to their
            synthetic account.
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
        </>
      )}
      {screen === "session-recovery" && (
        <>
          <Notice>
            No durable offline recovery is implemented. This preview can recover
            only a synthetic session expired during the current process.
          </Notice>
          <Button
            label="Recover synthetic session"
            disabled={!app.expired}
            onPress={() => {
              app.recover();
              router.replace("/workspace/home");
            }}
          />
          <Button
            label="Sign In"
            variant="secondary"
            onPress={() => router.push("/access/sign-in")}
          />
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
