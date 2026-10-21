import type { Account } from "@/domain/models";
import type { IconName } from "@/components/smart/ui";
type Tab = {
  name:
    | "home"
    | "equipment"
    | "reports"
    | "tasks"
    | "accounts"
    | "notifications"
    | "profile";
  label: string;
  sf:
    | "house.fill"
    | "cube"
    | "doc.text"
    | "checklist"
    | "person.2"
    | "bell"
    | "person";
  md:
    | "home"
    | "inventory_2"
    | "description"
    | "checklist"
    | "group"
    | "notifications"
    | "person";
  icon: IconName;
};
const all: Record<Tab["name"], Tab> = {
  home: {
    name: "home",
    label: "Home",
    sf: "house.fill",
    md: "home",
    icon: "home-outline",
  },
  equipment: {
    name: "equipment",
    label: "Equipment",
    sf: "cube",
    md: "inventory_2",
    icon: "cube-outline",
  },
  reports: {
    name: "reports",
    label: "Reports",
    sf: "doc.text",
    md: "description",
    icon: "document-text-outline",
  },
  tasks: {
    name: "tasks",
    label: "My Tasks",
    sf: "checklist",
    md: "checklist",
    icon: "clipboard-outline",
  },
  accounts: {
    name: "accounts",
    label: "Accounts",
    sf: "person.2",
    md: "group",
    icon: "people-outline",
  },
  notifications: {
    name: "notifications",
    label: "Notifications",
    sf: "bell",
    md: "notifications",
    icon: "notifications-outline",
  },
  profile: {
    name: "profile",
    label: "Profile",
    sf: "person",
    md: "person",
    icon: "person-outline",
  },
};
export function tabItems(account: Account): Tab[] {
  let keys: Tab["name"][] = [
    "home",
    "equipment",
    "reports",
    "notifications",
    "profile",
  ];
  if (account.role === "Biomedical Technician")
    keys = ["home", "tasks", "equipment", "notifications", "profile"];
  if (["Unit Head", "Maintenance Supervisor"].includes(account.role))
    keys = ["home", "tasks", "reports", "notifications", "profile"];
  if (["Administrator", "Registration Approver"].includes(account.role))
    keys = ["home", "accounts", "notifications", "profile"];
  keys = keys.filter((key) => {
    if (key === "accounts") return account.capabilities.includes("accounts");
    if (key === "tasks") return account.capabilities.some((c) => ["repair", "assign", "technical", "clinical"].includes(c));
    if (key === "reports") return account.capabilities.some((c) => ["report", "triage", "assign", "analytics", "export"].includes(c));
    if (key === "equipment") return account.capabilities.some((c) => ["report", "repair", "assign", "technical", "clinical", "analytics", "export", "reconcile", "hold"].includes(c));
    return true;
  });
  return keys.map((key) =>
    key === "home" &&
    account.role !== "Clinician" &&
    account.role !== "Biomedical Technician"
      ? { ...all[key], label: "Overview" }
      : all[key],
  );
}
