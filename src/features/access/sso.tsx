import { useRef, useState } from "react";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { makeRedirectUri } from "expo-auth-session";
import { router } from "expo-router";
import { useSSO, useClerk } from "@clerk/expo";
import { Button, Notice } from "@/components/smart/ui";
import { finishNativeSSO, SSO_CALLBACK_PATH } from "./sso-flow";
export function ConfiguredSSO() {
  const { startSSOFlow } = useSSO();
  const { signOut } = useClerk();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const requiresBuild =
    Platform.OS !== "web" &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const start = async (strategy: "oauth_google" | "oauth_apple") => {
    if (lock.current) return;
    if (requiresBuild) {
      setMessage(
        "Google and Apple sign-in require a development build with the SmartMaint callback scheme.",
      );
      return;
    }
    lock.current = true; setMessage(""); setBusy(true);
    try {
      const result = await startSSOFlow({
        strategy,
        ...(Platform.OS !== "web"
          ? {
              redirectUrl: makeRedirectUri({
                scheme: "smartmaint",
                path: SSO_CALLBACK_PATH.slice(1),
              }),
            }
          : {}),
      });
      const outcome = await finishNativeSSO(result, (path) => router.replace(path));
      if (outcome === "cancelled") setMessage("Identity sign-in was cancelled. No application access has been granted.");
      else if (outcome === "incomplete")
        setMessage(
          "Authentication cancelled or requires an additional identity verification step. No application access has been granted.",
        );
    } catch {
      setMessage(
        "Identity authentication could not finish. Check provider configuration or retry.",
      );
    } finally {
      lock.current = false;
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
      {!!message && (
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
