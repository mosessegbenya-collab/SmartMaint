import type { AuthConfig } from "convex/server";

// Configure on the Convex deployment, never in the mobile public environment.
const domain = process.env.CLERK_JWT_ISSUER_DOMAIN;
export default {
  providers: domain ? [{ domain, applicationID: "convex" }] : [],
} satisfies AuthConfig;
