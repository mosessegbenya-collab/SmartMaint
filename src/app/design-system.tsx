import { Redirect, useLocalSearchParams } from "expo-router";
import { DesignSystemCatalog } from "@/features/design-system/catalog";
import { ManagementPreview } from "@/features/design-system/management-preview";
import { RecoveryPreview } from "@/features/design-system/recovery-preview";
import { WorkEditorPreview } from "@/features/design-system/work-editor-preview";
import { ConfirmationPreview } from "@/features/design-system/confirmation-preview";

export default function DesignSystemRoute() {
  const { example } = useLocalSearchParams<{ example?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  if (example === "management") return <ManagementPreview />;
  if (example === "recovery") return <RecoveryPreview />;
  if (example === "work") return <WorkEditorPreview />;
  if (example === "confirmation") return <ConfirmationPreview />;
  return <DesignSystemCatalog />;
}
