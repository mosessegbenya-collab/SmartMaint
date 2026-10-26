import { TaskChooseOrganization, TaskResetPassword, TaskSetupMFA } from "./clerk-web-tasks";
import { useSession } from "@clerk/expo";
import { router } from "expo-router";
import { Button, Notice, Screen } from "@/components/smart/ui";
import { ACCOUNT_STATUS_PATH } from "./sso-flow";

export function SSOContinuation({ flow }: { flow: string }) {
  const { session } = useSession();
  const task = session?.currentTask?.key;
  return <Screen title={flow === "task" ? "Complete identity setup" : "Continue identity verification"}>
    <Notice>Complete the required Clerk identity steps. Authentication does not approve staff access.</Notice>
    {flow === "sign-in" ? <Button label="Continue with email and password" onPress={() => router.replace("/access/sign-in")} />
      : flow === "sign-up" ? <Button label="Register with email and password" onPress={() => router.replace("/access/register")} />
        : flow === "task" && task === "choose-organization" ? <TaskChooseOrganization redirectUrlComplete={ACCOUNT_STATUS_PATH} />
          : flow === "task" && task === "reset-password" ? <TaskResetPassword redirectUrlComplete={ACCOUNT_STATUS_PATH} />
            : flow === "task" && task === "setup-mfa" ? <TaskSetupMFA redirectUrlComplete={ACCOUNT_STATUS_PATH} />
              : <Notice>No supported identity step is available here. Check account status or start a fresh sign-in.</Notice>}
    <Button label="View account status" variant="secondary" onPress={() => router.replace(ACCOUNT_STATUS_PATH)} />
    <Button label="Return to sign-in" variant="secondary" onPress={() => router.replace("/access/sign-in")} />
  </Screen>;
}
