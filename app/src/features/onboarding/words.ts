import { type WordTable } from '../../i18n/words';

// Order of the six: English, Hindi, Bengali, Tamil, Chinese, Malay. First drafts; native-speaker review needed for hi, bn, ta, zh, ms.
// The questions themselves come from the server (the same ones a phone call or a chat asks); these are the words around them.
export const START: WordTable = {
  heading: ['Wisdom', 'Wisdom', 'Wisdom', 'Wisdom', 'Wisdom', 'Wisdom'],
};

export const ONBOARDING: WordTable = {
  heading: ['Getting to know you', 'आपको जानना', 'আপনাকে জানা', 'உங்களை அறிதல்', '认识你', 'Mengenali anda'],
  save: ['Save and continue', 'सहेजें और आगे बढ़ें', 'সংরক্ষণ করে এগিয়ে যান', 'சேமித்து தொடரவும்', '保存并继续', 'Simpan dan teruskan'],
  skip: ['Skip this part', 'यह भाग छोड़ें', 'এই অংশ বাদ দিন', 'இந்தப் பகுதியைத் தவிர்', '跳过此部分', 'Langkau bahagian ini'],
  later: ['Finish later', 'बाद में पूरा करें', 'পরে শেষ করুন', 'பிறகு முடிக்கவும்', '稍后完成', 'Selesai kemudian'],
  yes: ['Yes', 'हाँ', 'হ্যাঁ', 'ஆம்', '是', 'Ya'],
  no: ['No', 'नहीं', 'না', 'இல்லை', '否', 'Tidak'],
  step: ['Part {n} of {total}', 'भाग {n} / {total}', 'অংশ {n} / {total}', 'பகுதி {n} / {total}', '第 {n} 部分，共 {total} 部分', 'Bahagian {n} daripada {total}'],
  needed: ['This part is needed', 'यह भाग ज़रूरी है', 'এই অংশটি প্রয়োজন', 'இந்தப் பகுதி தேவை', '此部分必填', 'Bahagian ini diperlukan'],
  optional: ['This part is optional', 'यह भाग वैकल्पिक है', 'এই অংশটি ঐচ্ছিক', 'இந்தப் பகுதி விருப்பமானது', '此部分可选', 'Bahagian ini pilihan'],
  intro: ['A few short questions so Wisdom can show you the right things. You can also do this by phone or chat.', 'कुछ छोटे सवाल, ताकि Wisdom आपको सही चीज़ें दिखा सके। आप यह फ़ोन या चैट पर भी कर सकते हैं।', 'কয়েকটি ছোট প্রশ্ন, যাতে Wisdom আপনাকে সঠিক জিনিস দেখাতে পারে। আপনি ফোনে বা চ্যাটেও এটি করতে পারেন।', 'Wisdom உங்களுக்குச் சரியானவற்றைக் காட்ட சில சிறு கேள்விகள். இதைத் தொலைபேசியிலும் அரட்டையிலும் செய்யலாம்.', '几个简短的问题，让 Wisdom 为你展示合适的内容。你也可以通过电话或聊天完成。', 'Beberapa soalan ringkas supaya Wisdom dapat menunjukkan perkara yang sesuai. Anda juga boleh melakukannya melalui telefon atau sembang.'],
  loading: ['One moment…', 'एक पल…', 'এক মুহূর্ত…', 'ஒரு நிமிடம்…', '请稍候…', 'Sebentar…'],
  failed: ['That did not save. Please check the answers and try again.', 'यह सहेजा नहीं गया। कृपया जवाब जाँचें और फिर कोशिश करें।', 'এটি সংরক্ষিত হয়নি। উত্তরগুলি দেখে আবার চেষ্টা করুন।', 'இது சேமிக்கப்படவில்லை. பதில்களைச் சரிபார்த்து மீண்டும் முயலவும்.', '未能保存。请检查答案后重试。', 'Tidak berjaya disimpan. Sila semak jawapan dan cuba lagi.'],
  allDone: ['All done. Welcome to Wisdom.', 'सब हो गया। Wisdom में आपका स्वागत है।', 'সব হয়ে গেছে। Wisdom-এ স্বাগতম।', 'முடிந்தது. Wisdom-க்கு வரவேற்கிறோம்.', '全部完成。欢迎来到 Wisdom。', 'Selesai. Selamat datang ke Wisdom.'],
};
