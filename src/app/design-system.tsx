import { Redirect, useLocalSearchParams } from "expo-router";
import { DesignSystemCatalog } from "@/features/design-system/catalog";
import { ManagementPreview } from "@/features/design-system/management-preview";
import { RecoveryPreview } from "@/features/design-system/recovery-preview";
import { WorkEditorPreview } from "@/features/design-system/work-editor-preview";
import { ConfirmationPreview } from "@/features/design-system/confirmation-preview";
import { QueueLoadingPreview } from "@/features/design-system/queue-loading-preview";
import { ChronologyPreview } from "@/features/design-system/chronology-preview";
import { PreventivePreview } from "@/features/design-system/preventive-preview";
import { ScheduleReviewPreview } from "@/features/design-system/schedule-review-preview";
import { NotificationPreview } from "@/features/design-system/notification-preview";
import { InventoryIdentityPreview } from "@/features/design-system/inventory-identity-preview";
import { VerificationReviewPreview } from "@/features/design-system/verification-review-preview";
import { ReleaseReviewPreview } from "@/features/design-system/release-review-preview";

export default function DesignSystemRoute() {
  const { example } = useLocalSearchParams<{ example?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  if (example === "management") return <ManagementPreview />;
  if (example === "recovery") return <RecoveryPreview />;
  if (example === "work") return <WorkEditorPreview />;
  if (example === "confirmation") return <ConfirmationPreview />;
  if (example === "queue-loading") return <QueueLoadingPreview />;
  if (example === "chronology") return <ChronologyPreview />;
  if (example === "preventive") return <PreventivePreview />;
  if (example === "schedule-review") return <ScheduleReviewPreview />;
  if (example === "notification") return <NotificationPreview />;
  if (example === "identity") return <InventoryIdentityPreview />;
  if (example === "verification-review") return <VerificationReviewPreview />;
  if (example === "release-review") return <ReleaseReviewPreview />;
  return <DesignSystemCatalog />;
}
