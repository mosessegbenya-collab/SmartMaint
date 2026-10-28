import { Redirect, useLocalSearchParams } from "expo-router";
import { DesignSystemCatalog } from "@/features/design-system/catalog";
import { ManagementPreview } from "@/features/design-system/management-preview";
import { RecoveryPreview } from "@/features/design-system/recovery-preview";

export default function DesignSystemRoute() {
  const { example } = useLocalSearchParams<{ example?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  if (example === "management") return <ManagementPreview />;
  if (example === "recovery") return <RecoveryPreview />;
  return <DesignSystemCatalog />;
}
