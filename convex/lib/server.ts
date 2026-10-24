// Typed SDK builders until an authorized deployment can run official codegen.
// This is maintained source, not a fabricated _generated directory.
import { queryGeneric, mutationGeneric, internalMutationGeneric, internalQueryGeneric, actionGeneric } from "convex/server";
import type { DataModelFromSchemaDefinition, QueryBuilder, MutationBuilder, ActionBuilder, GenericQueryCtx, GenericMutationCtx, DocumentByName } from "convex/server";
import type schema from "../schema";
export type DataModel = DataModelFromSchemaDefinition<typeof schema>;
export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type AccountDoc = DocumentByName<DataModel, "staffAccounts">;
export const query = queryGeneric as QueryBuilder<DataModel, "public">;
export const mutation = mutationGeneric as MutationBuilder<DataModel, "public">;
export const internalMutation = internalMutationGeneric as MutationBuilder<DataModel, "internal">;
export const internalQuery = internalQueryGeneric as QueryBuilder<DataModel, "internal">;
export const action = actionGeneric as ActionBuilder<DataModel, "public">;
