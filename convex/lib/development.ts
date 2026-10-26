import { ConvexError } from "convex/values";

export const DEMO = {
  url: "https://greedy-bat-971.convex.cloud",
  email: "moses.segbenya@ucc.edu.gh",
  name: "Moses Segbenya",
  staffId: "CCT-DEMO-0002",
  departmentCode: "IT-DEMO",
  departmentName: "IT department",
  policyReference: "DEMO-ACCESS-v1",
  setupReference: "DEMO-ADMIN-20261026-001",
  classification: "development-demo" as const,
};
export function requireDemoDeployment() {
  // Built-in server environment, never a mobile-public flag or an argument.
  if (process.env.CONVEX_CLOUD_URL !== DEMO.url) throw new ConvexError("Development demo is restricted to greedy-bat-971.");
}
export function reviewEnabled(value: { classification?: "development-demo"; manualVerificationEnabled: boolean; developmentReviewEnabled?: boolean }) {
  if (value.classification === DEMO.classification) {
    requireDemoDeployment();
    return value.developmentReviewEnabled === true;
  }
  return value.manualVerificationEnabled;
}
