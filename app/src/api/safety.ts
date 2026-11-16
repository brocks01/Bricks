import { api } from './client';

// ---- Safety: reports, blocks and the admin's review (backend/app/modules/safety) ----
export type ReportKind = 'capsule' | 'offer' | 'request' | 'message' | 'community' | 'event' | 'person';
export type ReportReason = 'unsafe' | 'unkind' | 'spam' | 'false_experience' | 'other';
export type ReportStatus = 'open' | 'reviewed' | 'actioned' | 'dismissed';
export type ResolveAction = 'dismiss' | 'hide' | 'suspend';

export interface Report {
  id: string;
  target_kind: ReportKind;
  target_id: string;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
  created_at: string;
  reporter: string;
  decided_by?: string;
  decided_at: string | null;
  reporter_name?: string;
  target_title?: string | null;
}

export interface Blocked { person_id: string; name: string; at: string | null }

export const fileReport = (b: { target_kind: ReportKind; target_id: string; reason: ReportReason; note?: string }) =>
  api<{ id: string | null; status: string }>('POST', '/v1/reports', b);
export const myReports = () => api<{ reports: Report[] }>('GET', '/v1/reports/mine').then((r) => r.reports);
export const adminReports = (status?: ReportStatus) =>
  api<{ reports: Report[] }>('GET', `/v1/admin/reports${status ? `?status=${status}` : ''}`).then((r) => r.reports);
export const resolveReport = (id: string, action: ResolveAction) =>
  api<{ id: string; status: string; action: ResolveAction; hidden: boolean; restored: boolean; suspended: string | null }>('POST', `/v1/admin/reports/${id}/resolve`, { action });
export const blockPerson = (personId: string) => api<{ blocked: boolean; status: string }>('POST', '/v1/blocks', { person_id: personId });
export const myBlocks = () => api<{ blocks: Blocked[] }>('GET', '/v1/blocks').then((r) => r.blocks);
export const unblockPerson = (personId: string) => api<{ blocked: boolean; removed: boolean }>('DELETE', `/v1/blocks/${personId}`);
