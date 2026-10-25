# Clerk token selection correction

The user reported that Clerk showed a verified email but refreshing identity failed with a missing `convex` JWT template. The prior email-refresh implementation unconditionally requested that legacy template. That was an application defect: installed `convex@1.47.0` also supports the current activated Clerk Convex integration, which uses session tokens with audience `convex` and requires no named template.

The installed `node_modules/convex/src/react-clerk/ConvexProviderWithClerk.tsx` is the version-specific source of truth: `sessionClaims.aud === "convex"` selects `getToken({skipCache})`; otherwise it selects `getToken({template:"convex",skipCache})`.

The corrected refresh follows that rule using the audience from the newly reloaded session, then invalidates the cache and requests the appropriate uncached token. The development identity probe uses the same selection. Neither path logs or persists token material, and neither path grants staff authorization. Missing-template errors during a legacy token request become a fixed connection-configuration message in both refresh controls; there is no fallback to an unaudienced token and other errors still propagate.

`token-selection-before.log` records the newly added activated-integration regression failing before this correction. The regression verifies the exact request options; legacy selection and missing-template failure are separately tested. Current validation: lint and typecheck pass; the full test command passes with 39 domain tests and 151 backend/client tests, including 13 account-email tests. Logs: `token-tests.log`, `token-lint.log`, and `token-typecheck.log`.

Live follow-up (requires the existing authorized Clerk dashboard session; no Clerk administrative connector or local secret is available):

1. First reload Account access and select **Refresh verified identity**. The application fix may remove the missing-template error without any dashboard change.
2. If identity remains unverified, select the existing SmartMaint **development** instance in Clerk. Under **Sessions → Customize session token → Claims**, preserve existing claims (including `aud: "convex"`) and add/verify:

   ```json
   {
     "email": "{{user.primary_email_address}}",
     "email_verified": "{{user.email_verified}}"
   }
   ```

   These are dynamic claim definitions, not real account data. Do not hardcode `email_verified: true`, add role/approval claims, or replace existing claims. For an intentionally legacy configuration, these mappings belong in its `convex` JWT template instead.
3. If the application reports the connection itself unconfigured, confirm **Integrations → Convex** is activated for that same development instance. Do not create another instance or deployment. Leave the existing backend issuer/applicationID configuration intact.
4. Save and refresh Account access (or sign out and use a fresh test sign-in at `http://localhost:8083/access/sign-in`). A verified but unapproved identity should reach staff registration, pending approval, or the explicit unconfigured-policy status; it must remain outside the protected workspace. Do not paste account identifiers, tokens, codes or callback values into reports.

No external configuration, deployment, schema/data migration, dependency upgrade, staff grant or safety-control activation was performed in this correction. Actual authenticated follow-up is pending.

Official references:

- [Current Convex/Clerk integration](https://docs.convex.dev/auth/clerk)
- [Clerk integration and additional session claims](https://clerk.com/docs/guides/development/integrations/databases/convex)
- [Clerk session token customization](https://clerk.com/docs/guides/sessions/customize-session-tokens)
- [Clerk JWT template shortcodes](https://clerk.com/docs/guides/sessions/jwt-templates)
