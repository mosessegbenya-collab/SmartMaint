import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { useClerk } from "@clerk/expo";
import { Button, Notice, Screen } from "@/components/smart/ui";
import { useIdentity } from "./identity";
import { finishWebCallback, ssoFailureMessage } from "./sso-flow";

export function SSOCallback() {
  const identity = useIdentity();
  return identity.configured ? <BrowserCallback /> : <Screen title="Sign-in unavailable"><Notice>Identity configuration is unavailable. Contact your administrator.</Notice></Screen>;
}
function BrowserCallback() {
  const clerk = useClerk();
  const operation = useRef<Promise<"complete" | "incomplete"> | null>(null);
  const active = useRef(false); const navigated = useRef(false);
  const [message, setMessage] = useState(""); const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    let current = true;
    active.current = true;
    const timer = setTimeout(() => { if (current) setTimedOut(true); }, 30000);
    if (clerk.loaded) {
      operation.current ??= finishWebCallback({
        handle: (options) => clerk.handleRedirectCallback(options, async (destination) => {
          if (!active.current) return;
          navigated.current = true;
          // Preserve Clerk's browser/cookie handshake navigation exactly; never inspect or retain its URL.
          window.location.replace(destination);
        }),
        session: () => clerk.session, hasNavigated: () => navigated.current,
        navigate: (path) => { if (active.current) router.replace(path); },
      });
      void operation.current.then((result) => { if (current && result === "incomplete") setMessage("Sign-in did not finish or was cancelled. Start a fresh sign-in session."); }).catch((error: unknown) => { if (current) setMessage(ssoFailureMessage(error)); });
    }
    return () => { current = false; active.current = false; clearTimeout(timer); };
  }, [clerk, clerk.loaded]);
  return <Screen title="Completing secure sign-in"><View style={{ gap: 14 }}>
    {!message && !timedOut && <><ActivityIndicator accessibilityLabel="Completing Clerk sign-in" /><Notice>Clerk is completing the identity verification and session handshake. Staff access is checked separately afterward.</Notice></>}
    {!!message && <Notice tone="warning">{message}</Notice>}
    {timedOut && !message && <Notice tone="warning">Sign-in is taking longer than expected. You can cancel and start a fresh sign-in session.</Notice>}
    <Button label="Cancel and return to sign-in" variant="secondary" onPress={() => { active.current = false; router.replace("/access/sign-in"); }} />
  </View></Screen>;
}
