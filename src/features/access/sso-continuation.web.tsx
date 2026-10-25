import { SignIn, SignUp } from "@clerk/expo/web";
import { TaskChooseOrganization, TaskResetPassword, TaskSetupMFA } from "@clerk/react";
import { useSession } from "@clerk/expo";
import { router } from "expo-router";
import { Button, Notice, Screen } from "@/components/smart/ui";
import { ACCOUNT_STATUS_PATH, SSO_SIGN_IN_PATH, SSO_SIGN_UP_PATH } from "./sso-flow";

export function SSOContinuation({ flow }: { flow: string }) {
  const { session } = useSession();
  const task = session?.currentTask?.key;
  return <Screen title={flow === "task" ? "Complete identity setup" : "Continue identity verification"}>
    <Notice>Complete the required Clerk identity steps. Authentication does not approve staff access.</Notice>
    {flow === "sign-in" ? <SignIn routing="hash" signUpUrl={SSO_SIGN_UP_PATH} forceRedirectUrl={ACCOUNT_STATUS_PATH} signUpForceRedirectUrl={ACCOUNT_STATUS_PATH} />
      : flow === "sign-up" ? <SignUp routing="hash" signInUrl={SSO_SIGN_IN_PATH} forceRedirectUrl={ACCOUNT_STATUS_PATH} signInForceRedirectUrl={ACCOUNT_STATUS_PATH} />
        : flow === "task" && task === "choose-organization" ? <TaskChooseOrganization redirectUrlComplete={ACCOUNT_STATUS_PATH} />
          : flow === "task" && task === "reset-password" ? <TaskResetPassword redirectUrlComplete={ACCOUNT_STATUS_PATH} />
            : flow === "task" && task === "setup-mfa" ? <TaskSetupMFA redirectUrlComplete={ACCOUNT_STATUS_PATH} />
              : <Notice>No supported identity step is available here. Check account status or start a fresh sign-in.</Notice>}
    <Button label="View account status" variant="secondary" onPress={() => router.replace(ACCOUNT_STATUS_PATH)} />
    <Button label="Return to sign-in" variant="secondary" onPress={() => router.replace("/access/sign-in")} />
  </Screen>;
}
