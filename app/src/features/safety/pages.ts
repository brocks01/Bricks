import { pageWords } from '../../i18n/words';
import { definePage } from '../../kit/page';
import { SAFETY } from './words';

const base = { module: 'safety', requiresAuth: true } as const;

export const safetyIndex = definePage({
  ...base,
  key: 'safety.index',
  route: '/safety',
  summary: 'Safety and security: file a report about a story, offer, request, circle, event or person; see your own reports and the people you have blocked; admins open the review of open reports from here.',
  keywords: ['safety', 'report', 'block', 'review', 'unsafe', 'spam'],
  elements: {
    heading: { kind: 'text', summary: 'Safety.' },
    intro: { kind: 'text', summary: 'What this page is for.' },
    reportAction: { kind: 'action', agent: 'confirm', summary: 'Open the form to report something.' },
    myReports: { kind: 'text', summary: 'The reports this person has filed, newest first.' },
    blockedTitle: { kind: 'text', summary: 'The people this person has blocked.' },
    adminRow: { kind: 'action', agent: 'human', summary: 'Open reports to review (platform admins only).' },
  },
  strings: pageWords(SAFETY),
});

export const safetyReport = definePage({
  ...base,
  key: 'safety.report',
  route: '/safety/report',
  summary: 'A form to report a story, offer, request, message, circle, event or person as unsafe, unkind, spam or a false claim, with an optional note in your own words. Nobody is told who reported.',
  keywords: ['report', 'unsafe', 'unkind', 'spam', 'false', 'flag'],
  elements: {
    heading: { kind: 'text', summary: 'Report something.' },
    intro: { kind: 'text', summary: 'Every report is read by a person on the Interchange team; nobody is told who reported.' },
    kind: { kind: 'choice', type: 'string', options: ['capsule', 'offer', 'request', 'message', 'community', 'event', 'person'], summary: 'What is being reported.' },
    target: { kind: 'field', type: 'string', required: true, summary: 'The id of the thing being reported (filled in when the form is opened from the thing itself).' },
    reason: { kind: 'choice', type: 'string', options: ['unsafe', 'unkind', 'spam', 'false_experience', 'other'], required: true, summary: 'Why it is being reported.' },
    note: { kind: 'field', type: 'string', summary: 'Anything to add, in your own words (optional, up to 500 characters).' },
    send: { kind: 'action', agent: 'confirm', summary: 'Send the report to the Interchange team. Needs the person yes.' },
  },
  strings: pageWords(SAFETY, { heading: 'reportAction', intro: 'reportIntro' }),
});

export const safetyBlock = definePage({
  ...base,
  key: 'safety.block',
  route: '/safety/block',
  summary: 'Block a person: no introduction, no messages, and none of each other’s offers, requests or stories. Nobody is told; it can be undone from Safety at any time.',
  keywords: ['block', 'person', 'stop', 'mute'],
  elements: {
    heading: { kind: 'text', summary: 'Block this person.' },
    blockIntro: { kind: 'text', summary: 'What blocking does, and that it can be undone.' },
    person: { kind: 'field', type: 'string', required: true, summary: 'The id of the person to block (filled in when opened from an introduction).' },
    confirm: { kind: 'action', agent: 'confirm', summary: 'Block the person. Needs the person yes.' },
  },
  strings: pageWords(SAFETY, { heading: 'blockHeading', confirm: 'confirmBlock' }),
});

export const safetyAdmin = definePage({
  ...base,
  key: 'safety.admin',
  route: '/safety/admin',
  summary: 'The Interchange team’s review of open reports: dismiss it, hide the thing, or suspend the person behind it. Platform admins only; everyone else is refused by the server.',
  keywords: ['admin', 'reports', 'review', 'moderate', 'hide', 'suspend'],
  elements: {
    heading: { kind: 'text', summary: 'Reports to review.' },
    adminIntro: { kind: 'text', summary: 'The three actions and that the open reports come first.' },
    dismiss: { kind: 'action', agent: 'confirm', summary: 'Dismiss the report: nothing happens to the thing.' },
    hide: { kind: 'action', agent: 'confirm', summary: 'Hide the thing from every list.' },
    suspend: { kind: 'action', agent: 'confirm', summary: 'Suspend the person behind it: they can no longer sign in.' },
  },
  strings: pageWords(SAFETY, { heading: 'adminHeading' }),
});
