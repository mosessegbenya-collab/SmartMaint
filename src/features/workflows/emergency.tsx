import { useState } from "react";
import { router } from "expo-router";
import { Button, Field, Icon, Notice, Screen, Section, Txt } from "@/components/smart/ui";
import { useApp } from "@/state/app-state";
import { go } from "@/navigation/go";
export function EmergencyWorkflow({ screen }: { screen: string }) {
  const app = useApp();
  const [id, setId] = useState(app.draft.equipmentId);
  if (screen === "emergency")
    return (
      <Screen title="Emergency Reporting">
        <Notice tone="danger">For urgent equipment safety concerns.</Notice>
        <Txt>
          Use this option to report equipment that may be unsafe, has failed, or
          poses a risk to safety.
        </Txt>
        <Section title="Urgent issues only">
          <Notice tone="warning">
            Choose the appropriate equipment fault category and describe the
            concern accurately.
          </Notice>
          <Notice>
            Do not include patient names, numbers or other identifiable
            information.
          </Notice>
          <Notice>
            Identity verification is requested before submission. Unverified
            fallback does not grant account access.
          </Notice>
        </Section>
        <Button
          label="Continue to Verification"
          onPress={() => go("emergency-verify")}
        />
        <Button
          label="Cancel"
          variant="secondary"
          onPress={() => router.back()}
        />
      </Screen>
    );
  return (
    <Screen
      title="Emergency Reauthentication"
      subtitle="Verify your identity for emergency reporting."
    >
      <Icon name="lock-closed-outline" size={56} />
      <Button
        label="Use Biometric"
        variant="secondary"
        icon="finger-print"
        onPress={() => router.push("/access/biometric")}
      />
      <Button
        label="Use Account Sign In"
        variant="secondary"
        icon="keypad-outline"
        onPress={() => router.push("/access/sign-in")}
      />
      {app.account && (
        <Button
          label="Continue with synthetic session"
          onPress={() => {
            app.startReport(id);
            go("fault-details");
          }}
        />
      )}
      <Notice tone="danger">
        Unverified fallback does not grant staff account access. Report identity
        remains unverified.
      </Notice>
      <Field
        label="Equipment identifier *"
        value={id}
        onChangeText={setId}
        autoCapitalize="none"
      />
      {app.previewEnabled ? (
        <Button
          label="Continue with Unverified Demo Report"
          variant="danger"
          disabled={!id.trim()}
          onPress={() => {
            app.startReport(id, true);
            go("emergency-form");
          }}
        />
      ) : (
        <Notice>
          Live emergency submission requires a configured backend. No report can
          currently be sent.
        </Notice>
      )}
    </Screen>
  );
}
