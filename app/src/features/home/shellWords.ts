import { registerStrings } from '../../i18n/tables';
import { pageWords, type WordTable } from '../../i18n/words';

// The words of the app shell: the header's round buttons and the floating Back button. Read as t('shell.<id>').
// Order of the six: English, Hindi, Bengali, Tamil, Chinese, Malay. First drafts: native-speaker review needed.
export const SHELL: WordTable = {
  tree: ['Tree of Wisdom', 'ज्ञान का वृक्ष', 'প্রজ্ঞার বৃক্ষ', 'ஞான மரம்', '智慧树', 'Pokok Kebijaksanaan'],
  tree_n: ['Tree of Wisdom, {n} leaves', 'ज्ञान का वृक्ष, {n} पत्ते', 'প্রজ্ঞার বৃক্ষ, {n}টি পাতা', 'ஞான மரம், {n} இலைகள்', '智慧树，{n} 片叶子', 'Pokok Kebijaksanaan, {n} helai daun'],
  tree_one: ['Tree of Wisdom, 1 leaf', 'ज्ञान का वृक्ष, 1 पत्ता', 'প্রজ্ঞার বৃক্ষ, ১টি পাতা', 'ஞான மரம், 1 இலை', '智慧树，1 片叶子', 'Pokok Kebijaksanaan, 1 helai daun'],
  profile: ['Your profile', 'आपकी प्रोफ़ाइल', 'আপনার প্রোফাইল', 'உங்கள் சுயவிவரம்', '你的个人资料', 'Profil anda'],
  notices: ['Notifications', 'सूचनाएँ', 'বিজ্ঞপ্তি', 'அறிவிப்புகள்', '通知', 'Pemberitahuan'],
  back: ['Back', 'वापस', 'ফিরে যান', 'பின்செல்', '返回', 'Kembali'],
};

registerStrings('shell', pageWords(SHELL));
