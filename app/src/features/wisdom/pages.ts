import { pageWords } from '../../i18n/words';
import { definePage } from '../../kit/page';
import { ASK, INDEX, OFFER, STORY, SUPPORT } from './words';

const base = { module: 'wisdom', requiresAuth: true } as const;

export const wisdomIndex = definePage({
  ...base,
  key: 'wisdom.index',
  route: '/wisdom',
  tab: 2,
  icon: 'leaf',
  summary: 'Wisdom: where experience is passed between generations. Read shared stories, find a mentor, see what people want to learn, and manage your own stories, offers, requests and introductions.',
  keywords: ['wisdom', 'stories', 'mentor', 'learn', 'teach', 'advice', 'experience', 'generations'],
  elements: {
    heading: { kind: 'text', summary: 'Wisdom.' },
    section: { kind: 'choice', type: 'string', options: ['stories', 'mentors', 'learners', 'mine'], summary: 'Which part of Wisdom is open: stories, mentors, people who want to learn, or mine.' },
    story: { kind: 'action', summary: 'Open the form to keep a story, skill or lesson.' },
    offer: { kind: 'action', summary: 'Open the form to offer to teach or help.' },
    ask: { kind: 'action', summary: 'Open the form to say what you want to learn.' },
  },
  strings: pageWords(INDEX),
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
