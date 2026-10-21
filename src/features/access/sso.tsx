import { useState } from "react";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { makeRedirectUri } from "expo-auth-session";
import { router } from "expo-router";
import { useSSO, useClerk } from "@clerk/expo";
import { Button, Notice } from "@/components/smart/ui";
export function ConfiguredSSO() {
  const { startSSOFlow } = useSSO();
  const { signOut } = useClerk();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const requiresBuild =
    Platform.OS !== "web" &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const start = async (strategy: "oauth_google" | "oauth_apple") => {
    if (requiresBuild) {
      setMessage(
        "Google and Apple sign-in require a development build with the SmartMaint callback scheme.",
      );
      return;
    }
    setBusy(true);
    try {
      const result = await startSSOFlow({
        strategy,
        ...(Platform.OS !== "web"
          ? {
              redirectUrl: makeRedirectUri({
                scheme: "smartmaint",
                path: "access/pending",
              }),
            }
          : {}),
      });
      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
        router.replace("/access/pending");
      } else
        setMessage(
          "Authentication cancelled or requires an additional identity verification step. No application access has been granted.",
        );
    } catch {
      setMessage(
        "Identity authentication could not finish. Check provider configuration or retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {requiresBuild && (
        <Notice>
          Google and Apple sign-in require a SmartMaint development build. OAuth
          callbacks are unavailable in Expo Go.
        </Notice>
      )}
      <Button
        label="Continue with Google"
        icon="logo-google"
        variant="secondary"
        disabled={busy || requiresBuild}
        onPress={() => void start("oauth_google")}
      />
      <Button
        label="Continue with Apple"
        icon="logo-apple"
        variant="secondary"
        disabled={busy || requiresBuild}
        onPress={() => void start("oauth_apple")}
      />
      {message && (
        <>
          <Notice>{message}</Notice>
          <Button
            label="End identity session"
            variant="secondary"
            onPress={() =>
              void signOut()
                .then(() => setMessage("Identity session ended."))
                .catch(() =>
                  setMessage(
                    "Identity sign-out could not finish. Please retry.",
                  ),
                )
            }
          />
        </>
      )}
    </>
  );
}
