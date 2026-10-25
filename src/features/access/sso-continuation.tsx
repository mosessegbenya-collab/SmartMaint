import { router } from "expo-router";
import { Button, Notice, Screen } from "@/components/smart/ui";
export function SSOContinuation({ flow }: { flow: string }) {
  return <Screen title={flow === "task" ? "Complete identity setup" : "Additional identity verification"}><Notice>The native sign-in flow requires another identity step. Complete it in the original sign-in flow or contact your identity administrator. Staff access remains locked.</Notice><Button label="Check account status" onPress={() => router.replace("/access/pending")} /><Button label="Return to sign-in" variant="secondary" onPress={() => router.replace("/access/sign-in")} /></Screen>;
}
