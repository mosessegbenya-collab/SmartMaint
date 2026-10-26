import { ConvexError } from 'convex/values';

export const protectedAreas = ['equipment', 'reports', 'tasks', 'preferences', 'administration'] as const;
export type ProtectedArea = typeof protectedAreas[number];

function denialReason(error: unknown) {
  if (!(error instanceof ConvexError) || typeof error.data !== 'string') return null;
  switch (error.data) {
    case 'Institutional access policy is not configured.': return 'policy_unconfigured';
    case 'An active approved staff account is required.': return 'approved_account_required';
    case 'Access is not authorized.': return 'not_authorized';
    default: return null;
  }
}

/** Read-only acceptance probe. Never retain returned records or raw errors. */
export async function checkUnapprovedAccess(port: {
  identityStatus: string;
  staffStatus: string;
  query: (area: ProtectedArea) => Promise<unknown>;
}) {
  if (port.identityStatus !== 'verified_identity' || !['no_application', 'pending', 'rejected', 'suspended', 'revoked'].includes(port.staffStatus)) {
    return { status: 'not_tested', reason: 'verified_unapproved_identity_required' };
  }
  const checks = await Promise.all(protectedAreas.map(async (area) => {
    try {
      await port.query(area);
      return { area, outcome: 'unexpected_access' as const };
    } catch (error) {
      const reason = denialReason(error);
      return reason ? { area, outcome: 'denied' as const, reason } : { area, outcome: 'request_failed' as const };
    }
  }));
  return { status: 'complete', allDenied: checks.every((check) => check.outcome === 'denied'), checks };
}
