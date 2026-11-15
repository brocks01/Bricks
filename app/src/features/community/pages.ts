import { definePage } from '../../kit/page';
import { pageWords } from '../../i18n/words';
import { L } from '../lead/leadWords';
import { strings } from './strings';

// The community screens, as in ui-samples/10-community-screens.webp (screens 2 to 10). All of them share one list of words (strings.ts).
const base = { module: 'community', requiresAuth: true, strings } as const;

export const communityEvents = definePage({
  ...base,
  key: 'community.events',
  route: '/community/[id]/events',
  params: ['id'],
  summary: 'The events of one community in three tabs: upcoming, the ones I joined, and past. A leader can create an event.',
  keywords: ['events', 'upcoming', 'join', 'calendar'],
  elements: {
    createEvent: { kind: 'action', summary: 'Create a new event. Only community leaders can.' },
    upcoming: { kind: 'action', summary: 'Show the upcoming events.' },
    myEvents: { kind: 'action', summary: 'Show the events I joined.' },
    past: { kind: 'action', summary: 'Show the past events.' },
  },
});

export const communityEvent = definePage({
  ...base,
  key: 'community.event',
  route: '/community/[id]/event/[eid]',
  params: ['id', 'eid'],
  summary: 'One event: when, where, who is going, and a button to join or leave.',
  keywords: ['event', 'join', 'going', 'share'],
  elements: {
    joinEvent: { kind: 'action', summary: 'Join this event, or say I am not going.' },
    share: { kind: 'action', summary: 'Share this event with someone.' },
  },
});

export const communityActivities = definePage({
  ...base,
  key: 'community.activities',
  route: '/community/[id]/activities',
  params: ['id'],
  summary: 'The kinds of activity this community runs (fitness, learning, arts, green living), with what is ongoing and completed.',
  keywords: ['activities', 'categories', 'fitness'],
  elements: {},
});

export const communityCategory = definePage({
  ...base,
  key: 'community.category',
  route: '/community/[id]/category/[name]',
  params: ['id', 'name'],
  summary: 'The activities of one kind in this community, with a button to join each.',
  keywords: ['activity', 'category', 'join'],
  elements: {},
});

export const communityPeople = definePage({
  ...base,
  key: 'community.people',
  route: '/community/[id]/people',
  params: ['id'],
  summary: 'The members of this community with their roles, a search box, and a button to invite someone.',
  keywords: ['people', 'members', 'search', 'invite'],
  elements: {
    searchMembers: { kind: 'field', type: 'string', summary: 'Search the members by name.' },
    inviteMember: { kind: 'action', summary: 'Open the invite screen.' },
  },
});

export const communityInvite = definePage({
  ...base,
  key: 'community.invite',
  route: '/community/[id]/invite',
  params: ['id'],
  summary: 'Invite people to this community with its invite code. Only a community leader sees the code.',
  keywords: ['invite', 'code', 'share'],
  elements: {
    shareCode: { kind: 'action', summary: 'Share the invite code with someone.' },
  },
});

export const communityInitiatives = definePage({
  ...base,
  key: 'community.initiatives',
  route: '/community/[id]/initiatives',
  params: ['id'],
  summary: 'The long-running efforts of this community, such as greening the campus or helping seniors.',
  keywords: ['initiatives', 'projects'],
  elements: {
    startInitiative: { kind: 'action', summary: 'Start a new initiative. Only community leaders can.' },
  },
});

export const communityInitiative = definePage({
  ...base,
  key: 'community.initiative',
  route: '/community/[id]/initiative/[iid]',
  params: ['id', 'iid'],
  summary: 'One initiative: what it is, how many members, its current plan, and a button to join or leave.',
  keywords: ['initiative', 'join', 'plan'],
  elements: {
    joinInitiative: { kind: 'action', summary: 'Join this initiative, or leave it.' },
  },
});

export const communityUpdate = definePage({
  ...base,
  key: 'community.update',
  route: '/community/[id]/update/[uid]',
  params: ['id', 'uid'],
  summary: 'One community update with its likes and comments, and a box to write a comment.',
  keywords: ['update', 'announcement', 'comment', 'like'],
  elements: {
    like: { kind: 'action', summary: 'Like this update, or remove the like.' },
    addComment: { kind: 'field', type: 'string', summary: 'The comment to write.' },
    send: { kind: 'action', summary: 'Post the comment.' },
  },
});

export const communityNewEvent = definePage({
  ...base,
  key: 'community.newEvent',
  route: '/community/[id]/new-event',
  params: ['id'],
  summary: 'A form for a community leader to create an event.',
  keywords: ['create', 'event', 'form'],
  elements: {
    fTitle: { kind: 'field', type: 'string', required: true, summary: 'The name of the event.' },
    fDate: { kind: 'field', type: 'string', required: true, summary: 'The date as YYYY-MM-DD.' },
    fTime: { kind: 'field', type: 'string', required: true, summary: 'The start time as HH:MM, 24-hour.' },
    fPlace: { kind: 'field', type: 'string', summary: 'Where it takes place.' },
    fCategory: { kind: 'field', type: 'string', summary: 'The kind of activity, for example Fitness.' },
    fAbout: { kind: 'field', type: 'string', summary: 'A short description.' },
    save: { kind: 'action', agent: 'confirm', summary: 'Create the event.' },
  },
});

export const communityNewInitiative = definePage({
  ...base,
  key: 'community.newInitiative',
  route: '/community/[id]/new-initiative',
  params: ['id'],
  summary: 'A form for a community leader to start an initiative.',
  keywords: ['create', 'initiative', 'form'],
  elements: {
    fTitle: { kind: 'field', type: 'string', required: true, summary: 'The name of the initiative.' },
    fSummary: { kind: 'field', type: 'string', summary: 'One line about it.' },
    fPlan: { kind: 'field', type: 'string', summary: 'The current plan.' },
    save: { kind: 'action', agent: 'confirm', summary: 'Start the initiative.' },
  },
});

export const communityLead = definePage({
  ...base,
  key: 'community.lead',
  route: '/community/[id]/lead',
  params: ['id'],
  strings: pageWords(L, { heading: 'lead_title' }),
  summary: 'For the Community Lead only: the community\'s signature product and the vote that chooses it, today\'s check-ins (check someone in for them) and the weekly rota with its gaps.',
  keywords: ['lead', 'leader', 'vote', 'signature product', 'check in', 'rota', 'shift'],
  elements: {
    heading: { kind: 'text' },
  },
});
