import { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Button, Notice, Screen } from "@/components/smart/ui";
import { useIdentity } from "./identity";
import { ACCOUNT_STATUS_PATH } from "./sso-flow";

/** Native handshake/nonce reload and activation belong to useSSO(), not the web handler. */
export function SSOCallback() {
  const identity = useIdentity();
  useEffect(() => { if (identity.loaded && identity.signedIn) router.replace(ACCOUNT_STATUS_PATH); }, [identity.loaded, identity.signedIn]);
  return <Screen title="Completing native sign-in"><ActivityIndicator accessibilityLabel="Waiting for native sign-in completion" /><Notice>The SmartMaint browser-session flow must finish and activate the identity session before account status can open. This callback does not grant staff access.</Notice><Button label="Return to sign-in" variant="secondary" onPress={() => router.replace("/access/sign-in")} /></Screen>;
}
