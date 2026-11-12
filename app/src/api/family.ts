import { api } from './client';

/**
 * The family part of the API: families, invitations, assisted profiles, delegated access and the claim
 * flow. Every word the server refuses comes back as a machine `code` (for example helper_only) that the
 * screens turn into words in the person's language.
 */

export type FamilyRole = 'owner' | 'helper' | 'member';
export type LoginKind = 'own' | 'assisted';
export type AccessLevel = 'setup' | 'ongoing' | 'full';

export interface FamilyMember {
  user_id: string;
  display_name: string | null;
  language: string;
  age_band: string | null;
  phone: string | null;
  role: FamilyRole;
  login_kind: LoginKind;
  is_me: boolean;
}

export interface Family {
  id: string;
  name: string;
  created_by: string;
  my_role: FamilyRole;
  members: FamilyMember[];
}

export interface FamilySummary {
  id: string;
  name: string;
  role: FamilyRole;
  member_count: number;
}

export interface Invite {
  invite_id: string;
  role: FamilyRole;
  expires_in: number;
  /** Only when the server is in development mode: the code to give to the person yourself. */
  dev_code: string | null;
}

export interface ClaimCode {
  claim_id: string;
  expires_in: number;
  /** The 6-digit code the helper shows to the person, who types it on their own phone. */
  code: string;
}

export interface Delegation {
  id: string;
  user_id: string;
  helper_id: string;
  level: AccessLevel;
  status: string;
  granted_by: string;
  since: string;
  user_name: string | null; // the person being helped (or, in the about-me list, always me)
  user_kind: LoginKind | null;
  helper_name: string | null;
}

export interface PermissionEvent {
  action: string;
  detail: Record<string, unknown>;
  at: string;
  actor: string | null;
  helper: string | null;
}

export interface AssistedIn {
  display_name: string;
  language?: string;
  age_band?: string | null;
  phone?: string | null;
  relationship?: string | null;
}

export const familyApi = {
  // families
  mine: () => api<{ families: FamilySummary[] }>('GET', '/v1/families/mine'),
  create: (name: string) => api<Family>('POST', '/v1/families', { name }),
  get: (id: string) => api<Family>('GET', `/v1/families/${id}`),
  rename: (id: string, name: string) => api<Family>('PATCH', `/v1/families/${id}`, { name }),
  invite: (id: string, contact: string, role: 'helper' | 'member' = 'member') =>
    api<Invite>('POST', `/v1/families/${id}/invites`, { contact, role }),
  accept: (code: string) => api<Family>('POST', '/v1/family-invites/accept', { code }),
  changeRole: (id: string, memberId: string, role: 'helper' | 'member') =>
    api<Family>('PATCH', `/v1/families/${id}/members/${memberId}`, { role }),
  removeMember: (id: string, memberId: string) =>
    api<void>('DELETE', `/v1/families/${id}/members/${memberId}`),
  leave: (id: string) => api<void>('DELETE', `/v1/families/${id}/members/me`),

  // assisted profiles (set up for someone else, inside a family)
  createAssisted: (id: string, body: AssistedIn) => api<Family>('POST', `/v1/families/${id}/assisted`, body),
  askClaimCode: (id: string, personId: string) =>
    api<ClaimCode>('POST', `/v1/families/${id}/assisted/${personId}/claim-code`),

  // delegated access
  grant: (helperId: string, level: AccessLevel) => api<Delegation>('POST', '/v1/delegations', { helper_id: helperId, level }),
  held: () => api<{ delegations: Delegation[] }>('GET', '/v1/delegations/mine'),
  aboutMe: () => api<{ delegations: Delegation[] }>('GET', '/v1/me/delegations'),
  changeLevel: (delegationId: string, level: AccessLevel) => api<Delegation>('PATCH', `/v1/delegations/${delegationId}`, { level }),
  revoke: (delegationId: string) => api<void>('DELETE', `/v1/delegations/${delegationId}`),
  permissionEvents: () => api<{ events: PermissionEvent[] }>('GET', '/v1/me/permission-events'),

  // the person takes their own account (no login needed: the code is the proof, shown to them in person)
  claim: (code: string, email: string) =>
    api<{ access_token: string; refresh_token: string; user: { id: string; login_kind: LoginKind }; is_new: boolean }>(
      'POST',
      '/v1/auth/claim',
      { code, email },
      { auth: false },
    ),
};
