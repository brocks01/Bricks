import type {
  BadgeKey,
  EventCategory,
  FamilyInvite,
  Interest,
  Me,
  MeUpdate,
  NewFamilyInvite,
  NewSafeCircleMember,
  NewSkillOffer,
  NewThanks,
  NewVoiceClip,
  PersonSummary,
  Profile,
  SafeCircleMember,
  SignInMethod,
  SignInResult,
  SkillOffer,
  ThankYou,
  ThanksPrompt,
  VoiceClip,
} from '@/api/types';

import { sampleAudio } from './audio';
import meSeed from './me.json';

/**
 * Onboarding, profile, Pass It On and Family part of the mock backend.
 * Raj teaches chess at the community club and has been thanked by ten people
 * for it; he went to Mdm Tan's kueh class yesterday and hasn't thanked her yet.
 */

export interface PassItOnDeps {
  now: () => Date;
  meId: string;
  person: (id: string) => PersonSummary;
  /** Creates the Kampung event for a skill session with a date (PO-4). */
  createEvent: (input: {
    title: string;
    category: EventCategory;
    start_at: string;
    place_name: string;
  }) => { id: string };
  deleteEvent: (id: string) => void;
  /** The chess event's time, so the seeded skill and event agree. */
  eventStart: (id: string) => string | null;
}

/** Tag → event category, for skill sessions that become events. */
const CATEGORY_FOR_TAG: Record<Interest, EventCategory> = {
  walking: 'walk',
  taichi: 'exercise',
  cooking: 'cooking',
  chess: 'games',
  music: 'music',
  gardening: 'gardening',
  teaching: 'class',
  technology: 'class',
};

const days = (now: Date, n: number, hour = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export function createPassItOnDb({
  now,
  meId,
  person,
  createEvent,
  deleteEvent,
  eventStart,
}: PassItOnDeps) {
  let nextId = 1;
  const id = (prefix: string) => `${prefix}_${nextId++}`;

  let me: Me = {
    ...(meSeed as Omit<Me, 'interests'>),
    interests: ['chess', 'walking', 'teaching'],
  };

  let safeCircle: SafeCircleMember[] = [
    { id: 'u_priya', name: 'Priya Kumar', phone: '+6590000003', is_family: true },
    { id: 'u_ahmad', name: 'Ahmad Rahman', phone: '+6590000004', is_family: false },
    { id: 'u_lim', name: 'Lim Ah Kow', phone: '+6590000005', is_family: false },
  ];

  let intro: VoiceClip | null = {
    audio_url: sampleAudio.introRaj,
    duration_s: 8,
    transcript: "Hello, I'm Raj. I was a maths teacher for thirty years. Ask me about chess!",
  };

  const skills = new Map<string, Omit<SkillOffer, 'endorsement_count'>>([
    [
      's_chess',
      {
        id: 's_chess',
        title: 'Chess for beginners',
        tags: ['chess'],
        start_at: eventStart('e_chess'),
        place_name: 'Bishan Community Club, Room 2',
        is_paid: false,
        event_id: 'e_chess',
      },
    ],
    [
      's_maths',
      {
        id: 's_maths',
        title: 'Maths homework help',
        tags: ['teaching'],
        start_at: null,
        place_name: null,
        is_paid: false,
        event_id: null,
      },
    ],
  ]);

  // Ten people thanked Raj for chess (two by voice), three for maths help.
  const t0 = now();
  const thanks: ThankYou[] = [
    {
      id: 't_david',
      from: person('u_david'),
      kind: 'voice',
      voice: {
        audio_url: sampleAudio.thanksDavid,
        duration_s: 8,
        transcript:
          'Thank you, Raj. I finally won a game against my grandson. See you on Saturday!',
      },
      skill: { id: 's_chess', title: 'Chess for beginners' },
      event_title: 'Chess at the community club',
      created_at: days(t0, -2),
    },
    {
      id: 't_siti',
      from: person('u_siti'),
      kind: 'voice',
      voice: {
        audio_url: sampleAudio.thanksSiti,
        duration_s: 7,
        transcript: 'Raj, thank you for being so patient with me. Chess is so much fun now.',
      },
      skill: { id: 's_chess', title: 'Chess for beginners' },
      event_title: 'Chess at the community club',
      created_at: days(t0, -5),
    },
    ...['u_lim', 'u_ahmad', 'u_tan', 'u_ravi', 'u_fatimah', 'u_hock', 'u_lakshmi', 'u_chen'].map(
      (from, i): ThankYou => ({
        id: `t_chess_${from}`,
        from: person(from),
        kind: 'thumb',
        voice: null,
        skill: { id: 's_chess', title: 'Chess for beginners' },
        event_title: 'Chess at the community club',
        created_at: days(t0, -7 - i * 3),
      }),
    ),
    ...['u_tan', 'u_chen', 'u_siti'].map((from, i): ThankYou => ({
      id: `t_maths_${from}`,
      from: person(from),
      kind: 'thumb',
      voice: null,
      skill: { id: 's_maths', title: 'Maths homework help' },
      event_title: null,
      created_at: days(t0, -9 - i * 4),
    })),
  ];

  let prompts: ThanksPrompt[] = [
    {
      event_id: 'e_past_kueh',
      event_title: 'Nyonya kueh class',
      host: person('u_tan'),
      skill: { id: 's_tan_kueh', title: 'Nyonya kueh' },
      ended_at: days(t0, -1, 17),
    },
  ];

  const invites: FamilyInvite[] = [];

  const withCount = (s: Omit<SkillOffer, 'endorsement_count'>): SkillOffer => ({
    ...s,
    endorsement_count: thanks.filter((t) => t.skill?.id === s.id).length,
  });

  const badges = (): Profile['badges'] => {
    const list: { key: BadgeKey; earned_at: string }[] = [
      { key: 'first_session', earned_at: days(t0, -60) },
      { key: 'kind_neighbour', earned_at: days(t0, -20) },
    ];
    if (thanks.length >= 10) list.push({ key: 'ten_thanks', earned_at: days(t0, -9) });
    if (intro) list.push({ key: 'storyteller', earned_at: days(t0, -30) });
    return list;
  };

  return {
    getMe: (): Me => me,
    updateMe(update: MeUpdate): Me {
      me = { ...me, ...update } as Me;
      return me;
    },
    signIn(method: SignInMethod): SignInResult {
      if (method === 'singpass') {
        return { prefill: { name: 'Raj Kumar', area_name: 'Bishan' }, singpass_verified: true };
      }
      if (method === 'google') {
        return { prefill: { name: 'Raj Kumar', area_name: null }, singpass_verified: false };
      }
      return { prefill: { name: null, area_name: null }, singpass_verified: false };
    },

    getSafeCircle: () => safeCircle,
    setSafeCircle(members: NewSafeCircleMember[]): SafeCircleMember[] {
      safeCircle = members.slice(0, 5).map((m) => {
        const known = safeCircle.find((s) => s.phone && s.phone === m.phone);
        return { ...m, id: known?.id ?? id('sc') };
      });
      return safeCircle;
    },

    getProfile(userId: string): Profile {
      if (userId === 'me' || userId === meId) {
        return {
          id: meId,
          name: me.name,
          preferred_name: me.preferred_name,
          photo_url: null,
          area_name: me.area_name,
          languages: ['en', 'ta'],
          singpass_verified: me.singpass_verified,
          intro,
          ask_me_about: me.interests,
          given: {
            sessions_taught: 14,
            people_helped: 23,
            thank_yous: thanks.length,
          },
          skills: [...skills.values()].map(withCount),
          badges: badges(),
          thank_yous: thanks.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)),
        };
      }
      // Other members: just who they are, for now.
      const p = person(userId);
      return {
        id: p.id,
        name: p.name,
        preferred_name: null,
        photo_url: p.photo_url,
        area_name: 'Bishan',
        languages: ['en'],
        singpass_verified: false,
        intro: null,
        ask_me_about: [],
        given: { sessions_taught: 0, people_helped: 0, thank_yous: 0 },
        skills: [],
        badges: [],
        thank_yous: [],
      };
    },

    saveIntro({ audio_uri, duration_s }: NewVoiceClip): VoiceClip {
      intro = { audio_url: audio_uri, duration_s, transcript: null };
      return intro;
    },

    createSkill(input: NewSkillOffer): SkillOffer {
      const skillId = id('s');
      const event =
        input.start_at && input.place_name
          ? createEvent({
              title: input.title,
              category: CATEGORY_FOR_TAG[input.tags[0] as Interest] ?? 'class',
              start_at: input.start_at,
              place_name: input.place_name,
            })
          : null;
      const skill = { ...input, id: skillId, event_id: event?.id ?? null };
      skills.set(skillId, skill);
      return withCount(skill);
    },
    deleteSkill(skillId: string): void {
      const skill = skills.get(skillId);
      if (skill?.event_id) deleteEvent(skill.event_id);
      skills.delete(skillId);
    },

    getThanksPrompts: () => prompts,
    sendThanks(input: NewThanks): ThankYou {
      const prompt = prompts.find((p) => p.event_id === input.event_id);
      prompts = prompts.filter((p) => p.event_id !== input.event_id);
      return {
        id: id('t'),
        from: person(meId),
        kind: input.kind,
        voice:
          input.kind === 'voice' && input.audio_uri
            ? { audio_url: input.audio_uri, duration_s: input.duration_s ?? 0, transcript: null }
            : null,
        skill: prompt?.skill ?? null,
        event_title: prompt?.event_title ?? null,
        created_at: now().toISOString(),
      };
    },
    skipThanks(eventId: string): void {
      prompts = prompts.filter((p) => p.event_id !== eventId);
    },

    getFamilyInvites: () => invites,
    createFamilyInvite(input: NewFamilyInvite): FamilyInvite {
      const invite: FamilyInvite = {
        ...input,
        id: id('inv'),
        status: 'invited',
        senior_id: null,
        created_at: now().toISOString(),
      };
      invites.unshift(invite);
      return invite;
    },
    /** The senior said yes (on WhatsApp or SMS). In the demo, a facilitator control. */
    acceptFamilyInvite(inviteId: string): FamilyInvite | null {
      const invite = invites.find((i) => i.id === inviteId);
      if (invite) {
        invite.status = 'accepted';
        invite.senior_id = `u_${invite.id}`;
      }
      return invite ?? null;
    },
  };
}
