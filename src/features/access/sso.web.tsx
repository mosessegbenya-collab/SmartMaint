import { useRef, useState } from "react";
import { useSignIn } from "@clerk/expo/legacy";
import { Button, Notice } from "@/components/smart/ui";
import { ACCOUNT_STATUS_PATH, SSO_CALLBACK_PATH, ssoFailureMessage } from "./sso-flow";

/** Browser redirects are completed by Clerk on the real /sso-callback route. */
export function ConfiguredSSO() {
  const { signIn, isLoaded } = useSignIn();
  const lock = useRef(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const start = async (strategy: "oauth_google" | "oauth_apple") => {
    if (!isLoaded || !signIn || lock.current) return;
    lock.current = true; setBusy(true); setMessage("");
    try { await signIn.authenticateWithRedirect({ strategy, redirectUrl: SSO_CALLBACK_PATH, redirectUrlComplete: ACCOUNT_STATUS_PATH }); }
    catch (error) { setMessage(ssoFailureMessage(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <><Button label="Continue with Google" icon="logo-google" variant="secondary" loading={busy} disabled={!isLoaded} onPress={() => void start("oauth_google")} /><Button label="Continue with Apple" icon="logo-apple" variant="secondary" loading={busy} disabled={!isLoaded} onPress={() => void start("oauth_apple")} />{!!message && <Notice tone="warning">{message}</Notice>}</>;
}
