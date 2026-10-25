import { v } from 'convex/values';
import { query } from './_generated/server';

const claimType = v.union(v.literal('missing'), v.literal('string'), v.literal('boolean'), v.literal('number'), v.literal('null'), v.literal('object'), v.literal('array'), v.literal('other'));
function typeOf(value: unknown) {
  if (value === undefined) return 'missing' as const;
  if (value === null) return 'null' as const;
  if (Array.isArray(value)) return 'array' as const;
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'object') return typeof value as 'string' | 'boolean' | 'number' | 'object';
  return 'other' as const;
}

/** Read-only, caller-only diagnostics: never return claim values or record data. */
export const inspect = query({
  args: {},
  returns: v.object({ status: v.string(), issuer: v.string(), claims: v.object({ email: claimType, emailVerified: claimType, email_verified: claimType }) }),
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    const configuredIssuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
    const issuer = !user ? 'unauthenticated' : !configuredIssuer ? 'issuer_unconfigured' : user.issuer === configuredIssuer ? 'issuer_expected' : 'issuer_mismatch';
    const status = !user ? 'unauthenticated' : user.email === undefined ? 'email_missing' : typeof user.email !== 'string' ? 'email_type_invalid'
      : user.emailVerified === undefined ? 'email_verification_missing' : typeof user.emailVerified !== 'boolean' ? 'email_verification_type_invalid'
        : user.emailVerified !== true ? 'email_not_verified' : 'verified_identity';
    return { status, issuer, claims: { email: typeOf(user?.email), emailVerified: typeOf(user?.emailVerified), email_verified: typeOf(user?.email_verified) } };
  },
});
