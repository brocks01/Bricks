import { pageWords } from '../../i18n/words';
import { definePage } from '../../kit/page';
import { HOME } from './homeWords';
import { WT } from './teachWords';
import { ASK, INDEX, OFFER, SERVICES, STORY, SUPPORT } from './words';

const base = { module: 'wisdom', requiresAuth: true } as const;
// The words of a paid session, with the element ids of the moved screens pointed at the word that says them.
const serviceWords = (heading: string, aliases: Record<string, string>) => pageWords(SERVICES, { ...aliases, heading });

export const wisdomIndex = definePage({
  ...base,
  key: 'wisdom.index',
  route: '/wisdom',
  tab: 2,
  icon: 'leaf',
  summary: 'Wisdom: where experience is passed between generations. Read shared stories, find a mentor, see what people want to learn, book a paid session or offer your own, and manage your own stories, offers, requests, services and introductions.',
  keywords: ['wisdom', 'stories', 'mentor', 'learn', 'teach', 'advice', 'experience', 'generations', 'paid', 'session', 'service'],
  elements: {
    heading: { kind: 'text', summary: 'Wisdom.' },
    search: { kind: 'field', type: 'string', summary: 'Under Learn: type to search people who can teach you, by name, skill or bio.' },
    learnTab: { kind: 'action', summary: 'Show the Learn side: search for someone who can teach you.' },
    teachTab: { kind: 'action', summary: 'Show the Teach side: your teaching profile, the invitations waiting for you, and your mentorships and sessions.' },
    editProfile: { kind: 'action', summary: 'Open Mentor Profile Editing: expertise, bio and when you are free.' },
    showHistory: { kind: 'action', summary: 'Open the history of completed sessions with their scores and notes.' },
    topic: { kind: 'choice', type: 'string', options: ['all', 'career', 'technology', 'language', 'hobbies'], summary: 'Under Learn, one topic at a time: career, technology, language or hobbies (or all).' },
    edit: { kind: 'action', summary: 'Edit what you teach (Teach) or what you want to learn (Learn).' },
    shareProfile: { kind: 'action', summary: 'Share your teaching profile with your circle.' },
    section: { kind: 'choice', type: 'string', options: ['stories', 'mentors', 'learners', 'mine', 'paid'], summary: 'Which part of Wisdom is open: stories, mentors, people who want to learn, mine, or paid sessions.' },
    story: { kind: 'action', summary: 'Open the form to keep a story, skill or lesson.' },
    offer: { kind: 'action', summary: 'Open the form to offer to teach or help.' },
    ask: { kind: 'action', summary: 'Open the form to say what you want to learn.' },
    serviceSearch: { kind: 'field', type: 'string', summary: 'Type to search paid sessions by words in the title, description or area.' },
    serviceKind: { kind: 'choice', type: 'string', options: ['all', 'crafts', 'cooking', 'teaching', 'repair', 'music', 'wellness', 'advice', 'storytelling', 'other'], summary: 'Filter paid sessions by kind of service.' },
    offerService: { kind: 'action', summary: 'Open the form to offer a service of your own by the hour.' },
    myServices: { kind: 'action', summary: 'Open your own services and the booking requests waiting for your answer.' },
    mentorSearch: { kind: 'field', type: 'string', summary: 'Type to search mentors by a word in what they offer.' },
    mentorMode: { kind: 'choice', type: 'string', options: ['all', 'volunteer', 'paid'], summary: 'Only free offers, only paid ones, or either.' },
    mentorTopic: { kind: 'field', type: 'string', summary: 'A life stage or a subject to look for, for example pregnancy or first job.' },
    mentorLanguage: { kind: 'field', type: 'string', summary: 'A language the mentor can talk in, for example Tamil.' },
    mentorNear: { kind: 'choice', type: 'string', options: ['anywhere', 'near_me'], summary: 'Anywhere, or only mentors in the person own area.' },
    threadMessage: { kind: 'field', type: 'string', summary: 'A short message to the other side of the conversation (up to 500 characters).' },
    sendThread: { kind: 'action', agent: 'confirm', summary: 'Send the message. It reaches them on the channel they prefer. Needs approval.' },
    endorseNote: { kind: 'field', type: 'string', summary: 'A few kind words for the mentor, after a session.' },
    endorse: { kind: 'action', summary: 'Thank the mentor for this offer (only after a logged session, once).' },
  },
  strings: pageWords({ ...INDEX, ...HOME, ...WT }, {
    search: 'search', learnTab: 'learn', teachTab: 'teach', edit: 'h_edit', shareProfile: 'h_share', editProfile: 'edit', showHistory: 'show_all', topic: 'topic',
    serviceSearch: 'searchServices', serviceKind: 'kindOfService', offerService: 'offer_service', myServices: 'my_market',
    mentorSearch: 'searchMentors', mentorMode: 'modeLabel', mentorTopic: 'topicLabel', mentorLanguage: 'languageLabel', mentorNear: 'whereLabel',
    threadMessage: 'messagePlaceholder', sendThread: 'send', endorseNote: 'thankNote', endorse: 'thankYou',
  }),
});

// The earlier, longer Wisdom screen (stories library, mentors, paid sessions) stays reachable from the bottom of the Wisdom home: nothing is removed.
export const wisdomMore = definePage({
  ...base,
  key: 'wisdom.more',
  route: '/wisdom/more',
  summary: 'More of Wisdom: the library of shared stories, mentors with filters, what people want to learn, paid sessions by the hour and your own services.',
  keywords: ['stories', 'library', 'mentors', 'paid', 'services', 'more'],
  elements: wisdomIndex.elements,
  strings: wisdomIndex.strings,
});

export const wisdomStory = definePage({
  ...base,
  key: 'wisdom.story',
  route: '/wisdom/story',
  summary: 'A form to keep a story, skill, advice, recipe, tradition or work lesson in your own words. It stays private until you share it.',
  keywords: ['story', 'lesson', 'recipe', 'advice', 'keep', 'share'],
  elements: {
    heading: { kind: 'text' },
    title: { kind: 'field', type: 'string', required: true, summary: 'A short title for the story.' },
    body: { kind: 'field', type: 'string', required: true, summary: 'The story, skill or lesson in your own words.' },
    kind: { kind: 'choice', type: 'string', options: ['story', 'skill', 'advice', 'recipe', 'culture', 'professional'], summary: 'What kind of thing it is.' },
    save: { kind: 'action', summary: 'Keep it (private until you share it).' },
  },
  strings: pageWords(STORY),
});

export const wisdomOffer = definePage({
  ...base,
  key: 'wisdom.offer',
  route: '/wisdom/offer',
  summary: 'A form to offer to teach: mentoring, a workshop or freelance work; free, paid or either; and when you are free.',
  keywords: ['offer', 'teach', 'mentor', 'workshop', 'freelance'],
  elements: {
    heading: { kind: 'text' },
    title: { kind: 'field', type: 'string', required: true, summary: 'What you offer, for example "Teach small business accounting".' },
    about: { kind: 'field', type: 'string', summary: 'A sentence or two about it.' },
    kind: { kind: 'choice', type: 'string', options: ['mentoring', 'workshop', 'freelance'], summary: 'Mentoring, a workshop or freelance work.' },
    mode: { kind: 'choice', type: 'string', options: ['volunteer', 'paid', 'either'], summary: 'Free, paid or either.' },
    save: { kind: 'action', summary: 'Put the offer up.' },
  },
  strings: pageWords(OFFER),
});

export const wisdomAsk = definePage({
  ...base,
  key: 'wisdom.ask',
  route: '/wisdom/ask',
  summary: 'A form to say what you want to learn or need help with, so experienced people can offer to help.',
  keywords: ['learn', 'ask', 'request', 'help'],
  elements: {
    heading: { kind: 'text' },
    topic: { kind: 'field', type: 'string', required: true, summary: 'What you want to learn.' },
    about: { kind: 'field', type: 'string', summary: 'A line or two of detail.' },
    save: { kind: 'action', summary: 'Post it.' },
  },
  strings: pageWords(ASK),
});

export const wisdomSupport = definePage({
  ...base,
  key: 'wisdom.support',
  route: '/wisdom/support',
  summary: 'A form for an older person to ask the next generation for a hand: with a phone, a video call to the grandchildren, company on a walk, an errand. Younger people can offer; the person decides who to say yes to.',
  keywords: ['support', 'help', 'hand', 'phone', 'company', 'errand'],
  elements: {
    heading: { kind: 'text' },
    topic: { kind: 'field', type: 'string', required: true, summary: 'What the person needs a hand with.' },
    about: { kind: 'field', type: 'string', summary: 'A line or two of detail.' },
    save: { kind: 'action', summary: 'Post it.' },
  },
  strings: pageWords(SUPPORT),
});

// ---- paid sessions: the services listing, moved here from the Marketplace tab ----
export const wisdomService = definePage({
  ...base,
  key: 'wisdom.service',
  route: '/wisdom/service/[id]',
  params: ['id'],
  summary: 'One paid session: who offers it, their experience and proof, what people say, and a form to book it (for yourself or, as a community leader, for your community). Payment is direct between the two people; we never hold money.',
  keywords: ['paid', 'session', 'service', 'book', 'hire', 'endorse', 'thank'],
  elements: {
    heading: { kind: 'text', summary: 'The service.' },
    date: { kind: 'field', type: 'string', summary: 'The day to book, as 2026-11-20.' },
    time: { kind: 'field', type: 'string', summary: 'The start time, as 10:30.' },
    hours: { kind: 'field', type: 'number', summary: 'How many hours.' },
    note: { kind: 'field', type: 'string', summary: 'A note for the provider.' },
    forWhom: { kind: 'field', type: 'string', summary: 'Who it is for: "me", or the id of a community the person leads.' },
    sendRequest: { kind: 'action', agent: 'confirm', summary: 'Send the booking request. Needs approval.' },
    endorseNote: { kind: 'field', type: 'string', summary: 'A few kind words for the provider.' },
    endorse: { kind: 'action', summary: 'Say thank you to the provider (only after the service happened).' },
    pause: { kind: 'action', agent: 'confirm', summary: 'Pause or show again the person\'s own service.' },
    removeListing: { kind: 'action', agent: 'confirm', summary: 'Remove the person\'s own service.' },
  },
  strings: serviceWords('h_listing', {
    date: 'f_date', time: 'f_time', hours: 'f_hours', note: 'f_note', forWhom: 'book_for_me', sendRequest: 'send_request',
    endorseNote: 'endorse_note', endorse: 'endorse_btn', pause: 'pause_listing', removeListing: 'remove_listing',
  }),
});

export const wisdomServiceOffer = definePage({
  ...base,
  key: 'wisdom.serviceOffer',
  route: '/wisdom/service-offer',
  summary: 'A form to offer a service: what it is, the kind, how complex, years of experience, proof of work, the price per hour (or free) and the area. Shows a draft pay guide.',
  keywords: ['offer', 'service', 'list', 'price', 'experience', 'proof', 'paid'],
  elements: {
    heading: { kind: 'text', summary: 'Offer a service.' },
    title: { kind: 'field', type: 'string', required: true, summary: 'What the person offers, for example "Kueh making lesson".' },
    category: { kind: 'choice', type: 'string', options: ['crafts', 'cooking', 'teaching', 'repair', 'music', 'wellness', 'advice', 'storytelling', 'other'], summary: 'The kind of service.' },
    tier: { kind: 'choice', type: 'string', options: ['basic', 'skilled', 'expert'], summary: 'How complex the work is: basic, skilled or expert.' },
    years: { kind: 'field', type: 'number', summary: 'Years of experience.' },
    description: { kind: 'field', type: 'string', summary: 'A few words about the service.' },
    proof: { kind: 'field', type: 'string', summary: 'Proof of work in their own words: where they worked, what they made, how long.' },
    rate: { kind: 'field', type: 'number', summary: 'Price per hour in Singapore dollars; empty means free.' },
    area: { kind: 'field', type: 'string', summary: 'The area where they offer it.' },
    publish: { kind: 'action', agent: 'confirm', summary: 'Publish the service so others can book it. Needs approval.' },
  },
  strings: serviceWords('h_offer', {
    title: 'f_title', category: 'f_category', tier: 'f_tier', years: 'f_years', description: 'f_desc',
    proof: 'f_proof', rate: 'f_rate', area: 'f_area', publish: 'save_listing',
  }),
});

export const wisdomMyServices = definePage({
  ...base,
  key: 'wisdom.myServices',
  route: '/wisdom/services',
  summary: 'The person\'s own services, the booking requests waiting for their answer, and the services they booked.',
  keywords: ['bookings', 'requests', 'my services', 'accept', 'decline', 'paid'],
  elements: { heading: { kind: 'text', summary: 'My services and bookings.' } },
  strings: serviceWords('h_mine', {}),
});

// ---- Teach (revamp v2): the elder's own pages ----
export const wisdomTeachProfile = definePage({
  ...base,
  key: 'wisdom.teachProfile',
  route: '/wisdom/teaching-profile',
  summary: 'Mentor Profile Editing: what the person teaches (expertise), a short bio, and when they are free (days, a start and an end time).',
  keywords: ['profile', 'mentor', 'expertise', 'bio', 'availability', 'edit', 'teach'],
  elements: {
    heading: { kind: 'text', summary: 'Mentor Profile Editing.' },
    expertise: { kind: 'field', type: 'string', summary: 'What the person teaches, a few words separated by commas, for example "AI, OS, Business".' },
    bio: { kind: 'field', type: 'string', summary: 'A few lines about their life and work (up to 1000 characters).' },
    days: { kind: 'choice', type: 'string', options: ['Mon-Fri', 'Mon-Sat', 'Weekends', 'Every day'], summary: 'Which days they are free.' },
    startTime: { kind: 'field', type: 'string', summary: 'From what time, as 09:00.' },
    endTime: { kind: 'field', type: 'string', summary: 'Until what time, as 17:00 (after the start).' },
    save: { kind: 'action', summary: 'Save the changes.' },
  },
  strings: pageWords(WT, { heading: 'edit_title', startTime: 'start_time', endTime: 'end_time', save: 'save_changes' }),
});

export const wisdomSession = definePage({
  ...base,
  key: 'wisdom.session',
  route: '/wisdom/session/[id]',
  params: ['id'],
  summary: 'Session Details: who the session is with and its topic, when and where, Start Video Call (coming soon), Reschedule Session, marking it done, and the chat with the other person.',
  keywords: ['session', 'mentoring', 'reschedule', 'chat', 'message', 'video'],
  elements: {
    heading: { kind: 'text', summary: 'Session Details.' },
    video: { kind: 'action', summary: 'Start a video call. Not ready yet: it says "Coming soon".' },
    reschedule: { kind: 'action', summary: 'Open the choice of a new day and time.' },
    newDay: { kind: 'field', type: 'string', summary: 'The new day, as 2026-11-20.' },
    newTime: { kind: 'field', type: 'string', summary: 'The new start time, as 10:30.' },
    moveIt: { kind: 'action', agent: 'confirm', summary: 'Move the session to the chosen day and time. Both people are told. Needs approval.' },
    markDone: { kind: 'action', agent: 'confirm', summary: 'Say the session happened. Both people get a leaf on their tree. Needs approval.' },
    message: { kind: 'field', type: 'string', summary: 'A short message to the other person (up to 500 characters).' },
    send: { kind: 'action', agent: 'confirm', summary: 'Send the message. Needs approval.' },
  },
  strings: pageWords(WT, { heading: 'session_title', newDay: 'pick_day', newTime: 'pick_time', moveIt: 'reschedule', markDone: 'mark_done' }),
});

export const wisdomHistory = definePage({
  ...base,
  key: 'wisdom.history',
  route: '/wisdom/history',
  summary: 'Session History and Completed Reviews: every completed session with its score out of 5 and the note the learner left; a learner can review a session they had.',
  keywords: ['history', 'sessions', 'reviews', 'score', 'feedback', 'completed'],
  elements: {
    heading: { kind: 'text', summary: 'Session History and Completed Reviews.' },
    reviewScore: { kind: 'choice', type: 'string', options: ['1', '2', '3', '4', '5'], summary: 'As the learner, the score for the first session waiting for a review, from 1 to 5.' },
    reviewNote: { kind: 'field', type: 'string', summary: 'A short note for the mentor (optional, up to 500 characters).' },
    sendReview: { kind: 'action', agent: 'confirm', summary: 'Send the review. Needs approval.' },
  },
  strings: pageWords(WT, { heading: 'history_title', reviewScore: 'rate', reviewNote: 'review_note', sendReview: 'send_review' }),
});
