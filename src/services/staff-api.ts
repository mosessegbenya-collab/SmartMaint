import { anyApi } from "convex/server";
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import type * as staff from "../../convex/staff";
import type * as administration from "../../convex/administration";
import type * as operations from "../../convex/operations";

// Explicit source-derived references to newly implemented modules, not deployment-generated bindings.
export const staffApi = anyApi as unknown as FilterApi<ApiFromModules<{
  staff: typeof staff; administration: typeof administration; operations: typeof operations;
}>, FunctionReference<"query" | "mutation", "public">>;
