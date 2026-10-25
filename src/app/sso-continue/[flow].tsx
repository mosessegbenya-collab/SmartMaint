import { useLocalSearchParams } from "expo-router";
import { SSOContinuation } from "@/features/access/sso-continuation";
export default function SSOContinueRoute() {
  const { flow } = useLocalSearchParams<{ flow: string }>();
  return <SSOContinuation flow={typeof flow === "string" ? flow : ""} />;
}
