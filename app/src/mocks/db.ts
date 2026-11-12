import type {
  NewCheer,
  Org,
  OrgDetail,
  OrgJoined,
  OrgMember,
  OrgPerson,
  WalkPeriod,
  WalkVisibility,
  CheckinResult,
  CircleDetail,
  CircleList,
  CircleSummary,
  EventCategory,
  EventDetail,
  EventFilter,
  EventSummary,
  NewEvent,
  NewReminder,
  PersonSummary,
  SosAlert,
  SosResponse,
  Today,
  WalkSummary,
} from '@/api/types';
import type { WalkUpload } from '@/features/walk/engine';

import { createPassItOnDb } from './passItOnDb';
import { createThriveDb } from './thriveDb';

/**
 * In-memory stand-in for the backend during Phase 1 (docs/03 §9 seed):
 * 5 members (Raj, Mdm Tan, Priya, Ahmad, Lim), 3 Circles and 8 events around
 * Bishan / Toa Payoh. Times are relative to "now", so "Tomorrow, 7 am" is always
 * true whenever the app runs. Mutations (join, create...) change this state just
 * like the real API would, so screens behave the same when we switch to HTTP.
 */

const ME_ID = 'u_raj';

const PEOPLE: Record<string, PersonSummary> = Object.fromEntries(
  [
    ['u_raj', 'Raj Kumar'],
    ['u_tan', 'Tan Mei Ling'],
    ['u_priya', 'Priya Kumar'],
    ['u_ahmad', 'Ahmad Rahman'],
    ['u_lim', 'Lim Ah Kow'],
    ['u_siti', 'Siti Nurhaliza'],
    ['u_ravi', 'Ravi Shankar'],
    ['u_david', 'David Ong'],
    ['u_fatimah', 'Fatimah Ali'],
    ['u_hock', 'Goh Ah Hock'],
    ['u_lakshmi', 'Lakshmi Devi'],
    ['u_chen', 'Chen Wei'],
  ].map(([id, name]) => [id, { id: id!, name: name!, photo_url: null }]),
);

const person = (id: string): PersonSummary => PEOPLE[id] ?? { id, name: id, photo_url: null };

interface EventRow {
  id: string;
  title: string;
  category: EventCategory;
  start: Date;
  end: Date | null;
  place: string;
  lat: number;
  lng: number;
  description: string;
  host: string;
  circle: string | null;
  whatsapp: string | null;
  /** Member ids going (host included). */
  going: Set<string>;
  /** People going who aren't individual demo members (keeps counts realistic). */
  extraGoing: number;
}

interface CircleRow {
  id: string;
  name: string;
  type: CircleSummary['type'];
  description: string;
  captain: string;
  members: Set<string>;
  extraMembers: number;
  whatsapp: string | null;
}

interface State {
  now: () => Date;
  events: Map<string, EventRow>;
  circles: Map<string, CircleRow>;
  nextId: number;
}

/** A date `days` from now at hh:mm, moved one day later if that time already passed today. */
function at(now: Date, days: number, hour: number, minute = 0): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  if (days === 0 && d <= now) d.setDate(d.getDate() + 1);
  return d;
}

/** The coming Saturday (6) or Sunday (0), at least one day away. */
function nextWeekday(now: Date, weekday: number, hour: number, minute = 0): Date {
  const ahead = (weekday - now.getDay() + 7) % 7 || 7;
  return at(now, ahead, hour, minute);
}

const hours = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);
const WA = (code: string) => `https://chat.whatsapp.com/${code}`;

function seed(now: Date): Pick<State, 'events' | 'circles'> {
  const tomorrow7 = at(now, 1, 7);
  const rows: EventRow[] = [
    {
      id: 'e_walk_bishan',
      title: 'Morning walk',
      category: 'walk',
      start: tomorrow7,
      end: hours(tomorrow7, 1),
      place: 'Bishan Park, Gate 2',
      lat: 1.3626,
      lng: 103.8466,
      description:
        'An easy 3 km loop around the pond at a gentle pace. We stop for kopi at the end. Everyone is welcome.',
      // Lim (the Circle's captain) hosts, so Raj can join it in the golden path.
      host: 'u_lim',
      circle: 'c_walkers',
      whatsapp: WA('BishanWalkers'),
      going: new Set(['u_lim', 'u_ahmad']),
      extraGoing: 10,
    },
    {
      id: 'e_walk_toapayoh',
      title: 'Evening walk',
      category: 'walk',
      start: at(now, 0, 18),
      end: hours(at(now, 0, 18), 1),
      place: 'Toa Payoh Town Park',
      lat: 1.3336,
      lng: 103.8476,
      description: 'A slow walk round the lake while it cools down. About 45 minutes.',
      host: 'u_ahmad',
      circle: 'c_block123',
      whatsapp: WA('Block123Neighbours'),
      going: new Set(['u_ahmad', 'u_siti']),
      extraGoing: 2,
    },
    {
      id: 'e_taichi',
      title: 'Tai chi in the park',
      category: 'exercise',
      start: at(now, 2, 7, 30),
      end: hours(at(now, 2, 7, 30), 1),
      place: 'Bishan-Ang Mo Kio Park, Pond Garden',
      lat: 1.3644,
      lng: 103.8433,
      description: 'Gentle tai chi for all levels. Wear comfortable shoes. Chairs available.',
      host: 'u_lim',
      circle: 'c_walkers',
      whatsapp: WA('BishanWalkers'),
      going: new Set(['u_lim', 'u_tan']),
      extraGoing: 7,
    },
    {
      id: 'e_chess',
      title: 'Chess at the community club',
      category: 'games',
      start: nextWeekday(now, 6, 10),
      end: hours(nextWeekday(now, 6, 10), 2),
      place: 'Bishan Community Club, Room 2',
      lat: 1.3505,
      lng: 103.8486,
      description: 'Learn or play chess with Raj. Boards provided. Beginners very welcome.',
      host: 'u_raj',
      circle: null,
      whatsapp: null,
      going: new Set(['u_raj', 'u_david']),
      extraGoing: 4,
    },
    {
      id: 'e_storytime',
      title: 'Storytime with grandparents',
      category: 'kids',
      start: nextWeekday(now, 0, 10, 30),
      end: hours(nextWeekday(now, 0, 10, 30), 1),
      place: 'Toa Payoh Public Library, Children’s Section',
      lat: 1.3326,
      lng: 103.8486,
      description:
        'Stories in English, Mandarin, Malay and Tamil for children aged 4 to 8. Parents stay with their children.',
      host: 'u_tan',
      circle: null,
      whatsapp: null,
      going: new Set(['u_tan', 'u_lakshmi']),
      extraGoing: 3,
    },
    {
      id: 'e_kueh',
      title: 'Cooking together: ang ku kueh',
      category: 'cooking',
      start: at(now, 3, 15),
      end: hours(at(now, 3, 15), 2),
      place: 'Block 123 void deck, Bishan Street 12',
      lat: 1.3489,
      lng: 103.8512,
      description: 'Mdm Tan shows how she makes ang ku kueh. Ingredients provided.',
      host: 'u_tan',
      circle: 'c_block123',
      whatsapp: WA('Block123Neighbours'),
      going: new Set(['u_tan', 'u_fatimah']),
      extraGoing: 5,
    },
    {
      id: 'e_phone_class',
      title: 'Smartphone help: video calls',
      category: 'class',
      start: at(now, 4, 14),
      end: hours(at(now, 4, 14), 1.5),
      place: 'Toa Payoh West Community Club',
      lat: 1.3346,
      lng: 103.8443,
      description:
        'Bring your phone. We help you set up video calls with your family, step by step.',
      host: 'u_priya',
      circle: null,
      whatsapp: null,
      going: new Set(['u_priya', 'u_hock']),
      extraGoing: 8,
    },
    {
      id: 'e_garden',
      title: 'Community garden morning',
      category: 'gardening',
      start: at(now, 5, 8),
      end: hours(at(now, 5, 8), 2),
      place: 'Bishan Community Garden, Street 22',
      lat: 1.3571,
      lng: 103.8473,
      description: 'Water, weed and harvest together. Gloves provided.',
      host: 'u_ahmad',
      circle: 'c_gardeners',
      whatsapp: WA('ToaPayohGardeners'),
      going: new Set(['u_ahmad', 'u_chen']),
      extraGoing: 3,
    },
  ];

  const circles: CircleRow[] = [
    {
      id: 'c_walkers',
      name: 'Bishan Walkers',
      type: 'interest',
      description: 'We walk together around Bishan Park most mornings. Any pace is fine.',
      captain: 'u_lim',
      members: new Set(['u_raj', 'u_lim', 'u_ahmad', 'u_tan', 'u_siti', 'u_ravi']),
      extraMembers: 42,
      whatsapp: WA('BishanWalkers'),
    },
    {
      id: 'c_block123',
      name: 'Block 123 Neighbours',
      type: 'neighbourhood',
      description: 'Neighbours from Block 123 and around. Kopi, walks and helping each other out.',
      captain: 'u_ahmad',
      members: new Set(['u_raj', 'u_ahmad', 'u_tan', 'u_fatimah']),
      extraMembers: 21,
      whatsapp: WA('Block123Neighbours'),
    },
    {
      id: 'c_gardeners',
      name: 'Toa Payoh Gardeners',
      type: 'interest',
      description: 'Growing vegetables and herbs at the community garden. No experience needed.',
      captain: 'u_chen',
      members: new Set(['u_chen', 'u_ahmad', 'u_lakshmi']),
      extraMembers: 14,
      whatsapp: WA('ToaPayohGardeners'),
    },
  ];

  return {
    events: new Map(rows.map((r) => [r.id, r])),
    circles: new Map(circles.map((c) => [c.id, c])),
  };
}

export function createMockDb(now: () => Date = () => new Date()) {
  const state: State = {
    now,
    ...seed(now()),
    nextId: 1,
  };

  // Created before Thrive, which reads the Safe Circle for SOS.
  const passItOn = createPassItOnDb({
    now,
    meId: ME_ID,
    person,
    createEvent: (input) => {
      const id = `e_new_${state.nextId++}`;
      const start = new Date(input.start_at);
      state.events.set(id, {
        id,
        title: input.title,
        category: input.category,
        start,
        end: hours(start, 1),
        place: input.place_name,
        lat: 1.3505,
        lng: 103.8486,
        description: '',
        host: ME_ID,
        circle: null,
        whatsapp: null,
        going: new Set([ME_ID]),
        extraGoing: 0,
      });
      return { id };
    },
    deleteEvent: (id) => void state.events.delete(id),
    eventStart: (id) => state.events.get(id)?.start.toISOString() ?? null,
  });

  /* ---------- Organisations (S11) ---------- */
  interface OrgRow {
    id: string;
    name: string;
    verified: boolean;
    admin: string;
    join_code: string;
    members: (Omit<OrgMember, 'status'> & {
      userId: string | null;
      phone: string | null;
      status: 'invited' | 'joined';
    })[];
  }
  const NEEDS_HELP_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
  // The centre Lee runs (staff, not Raj). Raj can scan its code: BISHAN.
  const orgs = new Map<string, OrgRow>([
    [
      'org_bishan_aac',
      {
        id: 'org_bishan_aac',
        name: 'Bishan Active Ageing Centre',
        verified: true,
        admin: 'u_lee',
        join_code: 'BISHAN',
        members: [],
      },
    ],
  ]);
  const orgOf = (o: OrgRow): Org => ({
    id: o.id,
    name: o.name,
    verified: o.verified,
    join_code: o.join_code,
  });
  const orgDetail = (o: OrgRow): OrgDetail => {
    const order = { needs_help: 0, invited: 1, joined: 2 } as const;
    const members: OrgMember[] = o.members.map((m) => ({
      id: m.id,
      name: m.name,
      status:
        m.status === 'joined'
          ? 'joined'
          : now().getTime() - new Date(m.invited_at).getTime() >= NEEDS_HELP_AFTER_MS
            ? 'needs_help'
            : 'invited',
      invited_at: m.invited_at,
      joined_at: m.joined_at,
    }));
    members.sort((a, b) => order[a.status] - order[b.status]);
    return { ...orgOf(o), members };
  };

  const thrive = createThriveDb({
    now,
    person,
    attendees: (eventId) => {
      const e = state.events.get(eventId);
      return e ? [...e.going].filter((id) => id !== ME_ID).map(person) : [];
    },
    safeCircle: () => passItOn.getSafeCircle(),
    circleMembers: (circleId) => state.circles.get(circleId)?.members ?? null,
    inCircleWithMe: (userId) =>
      [...state.circles.values()].some((c) => c.members.has(ME_ID) && c.members.has(userId)),
  });

  /** Safety replies (2.2): S30 helper replies to other members' alerts, S29 "I'm OK" times. */
  const helperReplies = new Map<string, SosResponse>();
  const okConfirmations: Date[] = [];

  const goingCount = (e: EventRow) => e.going.size + e.extraGoing;

  const toSummary = (e: EventRow): EventSummary => ({
    id: e.id,
    title: e.title,
    category: e.category,
    start_at: e.start.toISOString(),
    end_at: e.end?.toISOString() ?? null,
    place_name: e.place,
    photo_url: null,
    going_count: goingCount(e),
    my_rsvp: e.going.has(ME_ID) ? 'going' : null,
    language: 'en',
    whatsapp_link: e.whatsapp,
    host: person(e.host),
    lat: e.lat,
    lng: e.lng,
  });

  const upcoming = () =>
    [...state.events.values()]
      .filter((e) => e.start > state.now())
      .sort((a, b) => a.start.getTime() - b.start.getTime());

  const toCircleSummary = (c: CircleRow): CircleSummary => {
    const next = upcoming().find((e) => e.circle === c.id);
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      photo_url: null,
      member_count: c.members.size + c.extraMembers,
      whatsapp_link: c.whatsapp,
      is_member: c.members.has(ME_ID),
      next_event: next
        ? { id: next.id, title: next.title, start_at: next.start.toISOString() }
        : null,
    };
  };

  const event = (id: string) => {
    const e = state.events.get(id);
    if (!e) throw new MockNotFound(`event ${id}`);
    return e;
  };
  const circle = (id: string) => {
    const c = state.circles.get(id);
    if (!c) throw new MockNotFound(`circle ${id}`);
    return c;
  };

  function matches(e: EventRow, filter: EventFilter | null): boolean {
    const now = state.now();
    const days = (e.start.getTime() - now.getTime()) / 86_400_000;
    switch (filter) {
      case 'today':
        return e.start.toDateString() === now.toDateString();
      case 'week':
        return days < 7;
      case 'walk':
        return e.category === 'walk';
      case 'class':
        return e.category === 'class' || e.category === 'exercise';
      case 'kids':
        return e.category === 'kids';
      default:
        return true;
    }
  }

  return {
    listEvents(filter: EventFilter | null): EventSummary[] {
      return upcoming()
        .filter((e) => matches(e, filter))
        .map(toSummary);
    },

    getEvent(id: string): EventDetail {
      const e = event(id);
      const attendees = [...e.going].map(person);
      return {
        ...toSummary(e),
        description: e.description,
        lat: e.lat,
        lng: e.lng,
        attendees,
        circle: e.circle ? { id: e.circle, name: circle(e.circle).name } : null,
      };
    },

    rsvp(id: string): EventSummary {
      const e = event(id);
      e.going.add(ME_ID);
      return toSummary(e);
    },

    cancelRsvp(id: string): EventSummary {
      const e = event(id);
      if (e.host !== ME_ID) e.going.delete(ME_ID);
      return toSummary(e);
    },

    createEvent(input: NewEvent): EventDetail {
      const id = `e_new_${state.nextId++}`;
      state.events.set(id, {
        id,
        title: input.title,
        category: input.category,
        start: new Date(input.start_at),
        end: input.end_at ? new Date(input.end_at) : null,
        place: input.place_name,
        lat: 1.3505,
        lng: 103.8486,
        description: '',
        host: ME_ID,
        circle: null,
        whatsapp: input.whatsapp_link,
        going: new Set([ME_ID]),
        extraGoing: 0,
      });
      return this.getEvent(id);
    },

    getToday(): Today {
      const list = upcoming();
      // Something new to join first (it gives purpose); otherwise their next plan.
      const next =
        list.find((e) => !e.going.has(ME_ID) && e.category === 'walk') ??
        list.find((e) => e.going.has(ME_ID)) ??
        null;
      const reminder = thrive.nextReminder();
      return {
        checkin: { pending: thrive.checkinPending(), question_key: 'moved_yesterday' },
        next_event: next ? toSummary(next) : null,
        next_reminder: reminder
          ? { id: reminder.id, text: reminder.text, time: reminder.time, kind: reminder.kind }
          : null,
      };
    },

    answerCheckin(answer: 'yes' | 'no'): CheckinResult {
      const streak = thrive.answerCheckin(answer);
      const suggestion =
        answer === 'no'
          ? (upcoming().find((e) => e.category === 'walk' && !e.going.has(ME_ID)) ?? null)
          : null;
      return { answer, streak, suggestion: suggestion && toSummary(suggestion) };
    },

    // Thrive + Safety (check-in week, reminders, walks, SOS).
    checkinWeek: () => thrive.checkinWeek(),
    listReminders: () => thrive.listReminders(),
    createReminder: (input: NewReminder) => thrive.createReminder(input),
    deleteReminder: (id: string) => thrive.deleteReminder(id),
    completeReminder: (id: string) => thrive.completeReminder(id),
    uploadWalk: (upload: WalkUpload) => thrive.uploadWalk(upload),
    getWalk(id: string): WalkSummary {
      const walk = thrive.getWalk(id);
      if (!walk) throw new MockNotFound(`walk ${id}`);
      return walk;
    },
    walkStats: (period: WalkPeriod = 'week') => thrive.walkStats(period),
    shareWalk(id: string, visibility: WalkVisibility): WalkSummary {
      const walk = thrive.shareWalk(id, visibility);
      if (!walk) throw new MockNotFound(`walk ${id}`);
      return walk;
    },
    cheerWalk(input: NewCheer): WalkSummary {
      const walk = thrive.cheerWalk(input);
      if (!walk) throw new MockNotFound(`walk ${input.walk_id}`);
      if (walk === 'forbidden')
        throw new MockForbidden('You can cheer walks people in your Circles share.');
      return walk;
    },
    /** Tests and demos: someone else cheers one of Raj's shared walks. */
    cheerAs(userId: string, walkId: string, kind: 'thumb' | 'voice' = 'thumb'): void {
      thrive.cheerWalk(
        {
          walk_id: walkId,
          kind,
          audio_uri: kind === 'voice' ? 'file:///cheer.m4a' : null,
          duration_s: kind === 'voice' ? 6 : null,
        },
        userId,
      );
    },
    circleWalks: (circleId: string) => thrive.circleWalks(circleId),
    triggerSos: () => thrive.triggerSos(),
    getSos(id: string): SosAlert {
      const alert = thrive.getSos(id);
      if (!alert) throw new MockNotFound(`sos ${id}`);
      return alert;
    },
    resolveSos: (id: string) => thrive.resolveSos(id),
    activeSos: () => thrive.activeSos(),
    /** Someone else's alert (the demo one, or a real one on another phone): just record it. */
    respondSos(id: string, status: SosResponse): void {
      helperReplies.set(id, status);
    },
    helperReply: (id: string): SosResponse | null => helperReplies.get(id) ?? null,
    confirmOk(): void {
      okConfirmations.push(now());
    },
    okConfirmations: (): readonly Date[] => okConfirmations,

    // Onboarding, profile, Pass It On, Family (1.3).
    getMe: () => passItOn.getMe(),
    updateMe: passItOn.updateMe,
    signIn: passItOn.signIn,
    getSafeCircle: () => passItOn.getSafeCircle(),
    setSafeCircle: passItOn.setSafeCircle,
    getProfile: passItOn.getProfile,
    saveIntro: passItOn.saveIntro,
    createSkill: passItOn.createSkill,
    deleteSkill: passItOn.deleteSkill,
    getThanksPrompts: () => passItOn.getThanksPrompts(),
    sendThanks: passItOn.sendThanks,
    skipThanks: passItOn.skipThanks,
    getFamilyInvites: () => passItOn.getFamilyInvites(),
    createFamilyInvite: passItOn.createFamilyInvite,
    /* Organisations (S11). Raj runs none at first; tests and demos make one. */
    myOrgs: (): Org[] => [...orgs.values()].filter((o) => o.admin === ME_ID).map(orgOf),
    /** Tests and demos: Raj runs an organisation. */
    createOrg(name: string, verified = false): OrgDetail {
      const org = {
        id: `org_${orgs.size + 1}`,
        name,
        verified,
        admin: ME_ID,
        join_code: `CODE${orgs.size + 1}`,
        members: [],
      };
      orgs.set(org.id, org);
      return orgDetail(org);
    },
    getOrg(id: string): OrgDetail {
      const org = orgs.get(id);
      if (!org || org.admin !== ME_ID) throw new MockNotFound(`organisation ${id}`);
      return orgDetail(org);
    },
    addOrgPeople(id: string, people: OrgPerson[]): OrgDetail {
      const org = orgs.get(id);
      if (!org || org.admin !== ME_ID) throw new MockNotFound(`organisation ${id}`);
      for (const p of people) {
        if (p.phone && org.members.some((m) => m.phone === p.phone)) continue;
        org.members.push({
          id: `om_${org.members.length + 1}`,
          userId: null,
          name: p.name.trim(),
          phone: p.phone,
          status: 'invited',
          invited_at: now().toISOString(),
          joined_at: null,
        });
      }
      return orgDetail(org);
    },
    /** Someone scans the QR: `as` lets tests be another phone. */
    joinOrg(code: string, as = ME_ID): OrgJoined {
      const org = [...orgs.values()].find((o) => o.join_code === code.toUpperCase());
      if (!org) throw new MockNotFound(`join code ${code}`);
      const existing = org.members.find((m) => m.userId === as);
      if (existing) {
        existing.status = 'joined';
        existing.joined_at ??= now().toISOString();
      } else {
        org.members.push({
          id: `om_${org.members.length + 1}`,
          userId: as,
          name: person(as).name,
          phone: null,
          status: 'joined',
          invited_at: now().toISOString(),
          joined_at: now().toISOString(),
        });
      }
      return { name: org.name, verified: org.verified };
    },
    setSeniorSimpleMode(seniorId: string, on: boolean): void {
      if (!passItOn.setSeniorSimpleMode(seniorId, on)) {
        throw new MockNotFound(`family member ${seniorId}`);
      }
    },
    acceptFamilyInvite(id: string) {
      const invite = passItOn.acceptFamilyInvite(id);
      if (!invite) throw new MockNotFound(`invite ${id}`);
      return invite;
    },

    listCircles(): CircleList {
      const all = [...state.circles.values()].map(toCircleSummary);
      return { mine: all.filter((c) => c.is_member), near: all.filter((c) => !c.is_member) };
    },

    getCircle(id: string): CircleDetail {
      const c = circle(id);
      return {
        ...toCircleSummary(c),
        description: c.description,
        captain: person(c.captain),
        members: [...c.members].map(person),
        upcoming: upcoming()
          .filter((e) => e.circle === id)
          .map(toSummary),
      };
    },

    joinCircle(id: string): CircleSummary {
      const c = circle(id);
      c.members.add(ME_ID);
      return toCircleSummary(c);
    },

    leaveCircle(id: string): CircleSummary {
      const c = circle(id);
      c.members.delete(ME_ID);
      return toCircleSummary(c);
    },
  };
}

export type MockDb = ReturnType<typeof createMockDb>;

/** Thrown for unknown ids, mapped to a 404 like the real API. */
export class MockNotFound extends Error {
  constructor(what: string) {
    super(`Not found: ${what}`);
    this.name = 'MockNotFound';
  }
}

/** Thrown when the member may not do something, mapped to a 403 like the real API. */
export class MockForbidden extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MockForbidden';
  }
}
