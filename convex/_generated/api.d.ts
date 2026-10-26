/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as administration from "../administration.js";
import type * as attachments from "../attachments.js";
import type * as auth_diagnostics from "../auth_diagnostics.js";
import type * as development_demo from "../development_demo.js";
import type * as extensions from "../extensions.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_development from "../lib/development.js";
import type * as lib_evidence_storage from "../lib/evidence_storage.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_repair_evidence from "../lib/repair_evidence.js";
import type * as lib_server from "../lib/server.js";
import type * as lib_validators from "../lib/validators.js";
import type * as operations from "../operations.js";
import type * as operator from "../operator.js";
import type * as preventive from "../preventive.js";
import type * as reporting from "../reporting.js";
import type * as safety from "../safety.js";
import type * as staff from "../staff.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  administration: typeof administration;
  attachments: typeof attachments;
  auth_diagnostics: typeof auth_diagnostics;
  development_demo: typeof development_demo;
  extensions: typeof extensions;
  "lib/access": typeof lib_access;
  "lib/development": typeof lib_development;
  "lib/evidence_storage": typeof lib_evidence_storage;
  "lib/notifications": typeof lib_notifications;
  "lib/repair_evidence": typeof lib_repair_evidence;
  "lib/server": typeof lib_server;
  "lib/validators": typeof lib_validators;
  operations: typeof operations;
  operator: typeof operator;
  preventive: typeof preventive;
  reporting: typeof reporting;
  safety: typeof safety;
  staff: typeof staff;
  workflows: typeof workflows;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
