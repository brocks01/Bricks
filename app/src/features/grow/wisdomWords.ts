import { type WordTable } from '../../i18n/words';

// The words of the Tree of Wisdom page. Order of the six: English, Hindi, Bengali, Tamil, Chinese, Malay. First drafts: native-speaker review needed.
export const WISDOM_TREE: WordTable = {
  title: ['Tree of Wisdom', 'ज्ञान का वृक्ष', 'প্রজ্ঞার বৃক্ষ', 'ஞான மரம்', '智慧树', 'Pokok Kebijaksanaan'],
  leaves_n: ['{n} leaves', '{n} पत्ते', '{n}টি পাতা', '{n} இலைகள்', '{n} 片叶子', '{n} helai daun'],
  leaves_one: ['1 leaf', '1 पत्ता', '১টি পাতা', '1 இலை', '1 片叶子', '1 helai daun'],
  picture: ['Your Tree of Wisdom: {n} leaves', 'आपका ज्ञान का वृक्ष: {n} पत्ते', 'আপনার প্রজ্ঞার বৃক্ষ: {n}টি পাতা', 'உங்கள் ஞான மரம்: {n} இலைகள்', '你的智慧树：{n} 片叶子', 'Pokok Kebijaksanaan anda: {n} helai daun'],
  every: ['Every event you come to grows one leaf.', 'आप जिस भी कार्यक्रम में आते हैं, उससे एक पत्ता उगता है।', 'আপনি যে অনুষ্ঠানে আসেন, প্রতিটিতে একটি পাতা গজায়।', 'நீங்கள் வரும் ஒவ்வொரு நிகழ்வும் ஒரு இலையை வளர்க்கிறது.', '你每参加一次活动，就长出一片叶子。', 'Setiap acara yang anda hadiri menumbuhkan sehelai daun.'],
  first: ['Come to your first event and your first leaf will grow.', 'अपने पहले कार्यक्रम में आइए, और आपका पहला पत्ता उगेगा।', 'আপনার প্রথম অনুষ্ঠানে আসুন, আপনার প্রথম পাতা গজাবে।', 'உங்கள் முதல் நிகழ்வுக்கு வாருங்கள், உங்கள் முதல் இலை வளரும்.', '来参加你的第一次活动，你的第一片叶子就会长出来。', 'Datanglah ke acara pertama anda dan daun pertama anda akan tumbuh.'],
  history: ['History', 'इतिहास', 'ইতিহাস', 'வரலாறு', '历史', 'Sejarah'],
  from_name: ['From {name}', '{name} से', '{name} থেকে', '{name} இலிருந்து', '来自{name}', 'Daripada {name}'],
  from_community: ['From a community', 'एक समुदाय से', 'একটি কমিউনিটি থেকে', 'ஒரு சமூகத்திலிருந்து', '来自社区', 'Daripada komuniti'],
  from_market: ['From Marketplace', 'बाज़ार से', 'বাজার থেকে', 'சந்தையிலிருந்து', '来自市集', 'Daripada Pasar'],
  session_with: ['Wisdom session with {name}', '{name} के साथ ज्ञान सत्र', '{name}-এর সঙ্গে প্রজ্ঞা সেশন', '{name} உடன் ஞான அமர்வு', '与{name}的智慧课', 'Sesi Kebijaksanaan bersama {name}'],
  session: ['Wisdom session', 'ज्ञान सत्र', 'প্রজ্ঞা সেশন', 'ஞான அமர்வு', '智慧课', 'Sesi Kebijaksanaan'],
  one_leaf: ['One leaf', 'एक पत्ता', 'একটি পাতা', 'ஒரு இலை', '一片叶子', 'Sehelai daun'],
  show_more: ['Show more', 'और दिखाएँ', 'আরও দেখুন', 'மேலும் காட்டு', '显示更多', 'Tunjuk lagi'],
  failed: ['Could not load, try again', 'लोड नहीं हो सका, फिर कोशिश करें', 'লোড করা যায়নি, আবার চেষ্টা করুন', 'ஏற்ற முடியவில்லை, மீண்டும் முயலவும்', '无法加载，请重试', 'Tidak dapat dimuatkan, cuba lagi'],
  try_again: ['Try again', 'फिर कोशिश करें', 'আবার চেষ্টা করুন', 'மீண்டும் முயல்', '重试', 'Cuba lagi'],
};
