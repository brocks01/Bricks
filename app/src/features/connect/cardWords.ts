import { registerStrings } from '../../i18n/tables';
import { pageWords, type WordTable } from '../../i18n/words';

// The words of the Communities cards. Order of the six: English, Hindi, Bengali, Tamil, Chinese, Malay. First drafts: native-speaker review needed.
const C: WordTable = {
  market_day: ['Market Day', 'बाज़ार दिवस', 'বাজার দিবস', 'சந்தை நாள்', '集市日', 'Hari Pasar'],
  in_days: ['In {n} days', '{n} दिन में', '{n} দিনে', '{n} நாளில்', '{n} 天后', 'Dalam {n} hari'],
  today: ['Today', 'आज', 'আজ', 'இன்று', '今天', 'Hari ini'],
  tomorrow: ['Tomorrow', 'कल', 'আগামীকাল', 'நாளை', '明天', 'Esok'],
  reserve: ['Reserve a stall', 'स्टॉल आरक्षित करें', 'স্টল সংরক্ষণ করুন', 'கடையை முன்பதிவு செய்', '预订摊位', 'Tempah gerai'],
  stalls: ['Stalls: {list}', 'स्टॉल: {list}', 'স্টল: {list}', 'கடைகள்: {list}', '摊位：{list}', 'Gerai: {list}'],
  none_planned: ['No gathering planned yet', 'अभी कोई सभा तय नहीं', 'এখনও কোনো জমায়েত ঠিক হয়নি', 'இன்னும் கூட்டம் திட்டமிடப்படவில்லை', '暂无聚会安排', 'Belum ada perhimpunan dirancang'],
  only_members: ['Only members can see who is going.', 'केवल सदस्य देख सकते हैं कि कौन आ रहा है।', 'শুধু সদস্যরা দেখতে পারেন কে যাচ্ছেন।', 'யார் வருகிறார்கள் என்பதை உறுப்பினர்கள் மட்டுமே காண முடியும்.', '只有成员能看到谁会去。', 'Hanya ahli boleh melihat siapa yang hadir.'],
  near: ['Happening near you', 'आपके पास हो रहा है', 'আপনার কাছে হচ্ছে', 'உங்கள் அருகில் நடக்கிறது', '你附近的活动', 'Berlaku berhampiran anda'],
};

registerStrings('cday', pageWords(C));
