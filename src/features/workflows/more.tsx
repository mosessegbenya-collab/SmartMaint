import { LinkRow, Screen } from "@/components/smart/ui";
import type { Capability } from "@/domain/models";

import { allowed } from "@/domain/policy";

import { useApp } from "@/state/app-state";
import { go } from "@/navigation/go";

export function MoreScreen() {
  const { account, startReport } = useApp();
  const items: {
    title: string;
    screen: string;
    icon: React.ComponentProps<typeof LinkRow>["icon"];
    capability?: Capability;
  }[] = [
    { title: "QR Scanner", screen: "scan", icon: "qr-code-outline" },
    {
      title: "Manual Equipment Lookup",
      screen: "manual",
      icon: "search-outline",
    },
    {
      title: "Technical Verification",
      screen: "technical-queue",
      icon: "shield-checkmark-outline",
      capability: "technical",
    },
    {
      title: "Clinical Verification",
      screen: "clinical-queue",
      icon: "medkit-outline",
      capability: "clinical",
    },
    { title: "Active Safety Holds", screen: "holds", icon: "warning-outline" },
    { title: "Sync Status", screen: "sync", icon: "sync-outline" },
    { title: "Pending Queue", screen: "queue", icon: "cloud-upload-outline" },
    {
      title: "Audit History",
      screen: "audit",
      icon: "document-text-outline",
      capability: "audit",
    },
    {
      title: "Analytics & Data Quality",
      screen: "analytics",
      icon: "bar-chart-outline",
      capability: "analytics",
    },
    {
      title: "Equipment Reconciliation",
      screen: "reconcile",
      icon: "git-merge-outline",
      capability: "reconcile",
    },
    {
      title: "Export Reports",
      screen: "export",
      icon: "download-outline",
      capability: "export",
    },
    {
      title: "Settings & Accessibility",
      screen: "settings",
      icon: "settings-outline",
    },
    { title: "Help & Support", screen: "help", icon: "help-circle-outline" },
  ];
  return (
    <Screen title="More" subtitle="Tools, preferences and account support.">
      {items
        .filter((i) => !i.capability || allowed(account, i.capability))
        .map((i) => (
          <LinkRow
            key={i.screen}
            title={i.title}
            icon={i.icon}
            onPress={() => {
              if (i.screen === "manual") startReport("");
              go(i.screen);
            }}
          />
        ))}
    </Screen>
  );
}
