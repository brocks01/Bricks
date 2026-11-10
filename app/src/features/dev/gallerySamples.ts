import type { CircleSummary, EventSummary } from '@/api/types';

/**
 * Sample content for the component gallery, in English and Tamil (the longest
 * script). Tamil is the stress test: if a component holds up here it holds up
 * everywhere. Dev-only: real content comes from the backend seed.
 */

export type GalleryLanguage = 'en' | 'ta';

function at(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const host = { id: 'u_raj', name: 'Raj Kumar', photo_url: null };

export function sampleContent(lang: GalleryLanguage) {
  const ta = lang === 'ta';

  const walk: EventSummary = {
    id: 'e_walk',
    title: ta ? 'காலை நடைப்பயிற்சி' : 'Morning walk',
    category: 'walk',
    start_at: at(1, 7),
    end_at: at(1, 8),
    place_name: ta ? 'பிஷான் பூங்கா, நுழைவாயில் 2' : 'Bishan Park, Gate 2',
    photo_url: null,
    going_count: 12,
    my_rsvp: null,
    language: lang,
    whatsapp_link: 'https://chat.whatsapp.com/example',
    host,
  };

  const chess: EventSummary = {
    ...walk,
    id: 'e_chess',
    title: ta ? 'சமூக மன்றத்தில் சதுரங்கம்' : 'Chess at the community centre',
    category: 'games',
    start_at: at(3, 10, 30),
    place_name: ta ? 'பிஷான் சமூக மன்றம்' : 'Bishan Community Club',
    going_count: 1,
    my_rsvp: 'going',
  };

  const walkers: CircleSummary = {
    id: 'c_walkers',
    name: ta ? 'பிஷான் நடைப்பயிற்சியாளர்கள்' : 'Bishan Walkers',
    type: 'interest',
    photo_url: null,
    member_count: 48,
    whatsapp_link: 'https://chat.whatsapp.com/example',
    is_member: true,
    next_event: { id: walk.id, title: walk.title, start_at: walk.start_at },
  };

  const gardeners: CircleSummary = {
    ...walkers,
    id: 'c_gardeners',
    name: ta ? 'தோ பாயோ தோட்டக்காரர்கள்' : 'Toa Payoh Gardeners',
    member_count: 1,
    is_member: false,
    next_event: null,
  };

  return {
    walk,
    chess,
    walkers,
    gardeners,
    stat: {
      label: ta ? 'இந்த வாரம்' : 'This week',
      value: '8.6',
      unit: ta ? 'கி.மீ. நடந்தீர்கள்' : 'km walked',
      sub: ta ? '4 நடைகள் · 5 நாள் தொடர்ச்சி' : '4 walks · 5 days in a row',
      values: [2.4, 1.8, 0, 2.1, 2.3, 0, 0],
    },
    tiles: ta
      ? ['நடையைத் தொடங்கு', 'நிகழ்வுகள்', 'திறமையைப் பகிர்', 'என் வட்டங்கள்']
      : ['Start walk', 'Happenings', 'Share a skill', 'My Circles'],
    prompt: ta ? 'நான் 30 ஆண்டுகள் வேலை செய்தது…' : 'I spent 30 years as…',
    promptTranscript: ta
      ? 'ஒரு பொறியாளராக. இப்போது சதுரங்கம் கற்றுத் தருகிறேன்.'
      : 'An engineer at the port. Now I teach chess on Saturdays.',
    thanksName: 'Lim Ah Kow',
    thanksSkill: ta ? 'சதுரங்கம்' : 'Chess',
    thanksTranscript: ta
      ? 'சதுரங்கம் கற்றுக் கொடுத்ததற்கு நன்றி. நான் என் முதல் ஆட்டத்தில் வென்றேன்!'
      : 'Thank you for teaching me chess. I won my first game!',
    transcript: ta
      ? 'காலை 8 மணிக்கு மருந்து சாப்பிட நினைவூட்டு'
      : 'Remind me to take my medicine at 8',
    confirm: ta
      ? 'தினமும் காலை 8 மணி: மருந்து சாப்பிடுங்கள். சரியா?'
      : 'Every day at 8 am: take medicine. Is that right?',
    undo: ta ? 'நினைவூட்டல் அமைக்கப்பட்டது.' : 'Reminder set.',
    statusSuccess: ta ? 'பிரியா வந்துகொண்டிருக்கிறார்' : 'Priya is on her way',
    statusInfo: ta ? 'அப்பா ஆம் என்று சொல்லக் காத்திருக்கிறோம்' : 'Waiting for Dad to say yes',
    statusNotice: ta
      ? 'இணைய இணைப்பு இல்லை. பிறகு அனுப்புவோம்.'
      : "You're offline. We'll send this later.",
    empty: ta
      ? 'உங்கள் அருகில் இன்னும் நிகழ்வுகள் இல்லை. ஒன்றைத் தொடங்கலாமா?'
      : 'No events near you yet. Start one?',
    emptyAction: ta ? 'ஒன்றைத் தொடங்கு' : 'Start something',
    section: {
      title: ta ? 'கம்போங்' : 'Kampung',
      description: ta
        ? 'அருகிலுள்ள நடைப்பயிற்சி, வகுப்புகள், சந்திப்புகளில் சேருங்கள்.'
        : 'Join walks, classes and meet-ups near you.',
    },
  };
}
