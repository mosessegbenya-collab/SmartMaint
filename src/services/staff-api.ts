import { anyApi } from "convex/server";
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import type * as staff from "../../convex/staff";
import type * as administration from "../../convex/administration";
import type * as operations from "../../convex/operations";
import type * as workflows from "../../convex/workflows";
import type * as attachments from "../../convex/attachments";
import type * as reporting from "../../convex/reporting";
import type * as safety from "../../convex/safety";
import type * as extensions from "../../convex/extensions";
import type * as preventive from "../../convex/preventive";

// Explicit source-derived references to newly implemented modules, not deployment-generated bindings.
export const staffApi = anyApi as unknown as FilterApi<ApiFromModules<{
  extensions: typeof extensions; staff: typeof staff; administration: typeof administration; operations: typeof operations; workflows: typeof workflows; attachments: typeof attachments; reporting: typeof reporting; safety: typeof safety; preventive: typeof preventive;
}>, FunctionReference<"query" | "mutation" | "action", "public">>;
