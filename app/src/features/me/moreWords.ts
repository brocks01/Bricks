import { registerStrings } from '../../i18n/tables';
import { pageWords, type WordTable } from '../../i18n/words';

// The "More" list on the profile: where the pages that are no longer tabs now live. Order of the six: English, Hindi, Bengali, Tamil, Chinese, Malay.
const M: WordTable = {
  more: ['More', 'और', 'আরও', 'மேலும்', '更多', 'Lagi'],
  family: ['My family', 'मेरा परिवार', 'আমার পরিবার', 'என் குடும்பம்', '我的家人', 'Keluarga saya'],
  calendar: ['My calendar and reminders', 'मेरा कैलेंडर और याद दिलाना', 'আমার ক্যালেন্ডার ও অনুস্মারক', 'என் நாட்காட்டி மற்றும் நினைவூட்டல்கள்', '我的日历与提醒', 'Kalendar dan peringatan saya'],
  aspirations: ['My aspirations', 'मेरी आकांक्षाएँ', 'আমার আকাঙ্ক্ষা', 'என் லட்சியங்கள்', '我的心愿', 'Aspirasi saya'],
  progress: ['My progress', 'मेरी प्रगति', 'আমার অগ্রগতি', 'என் முன்னேற்றம்', '我的进展', 'Kemajuan saya'],
  contributions: ['What I have given', 'मैंने जो दिया', 'আমি যা দিয়েছি', 'நான் கொடுத்தவை', '我的付出', 'Apa yang saya sumbangkan'],
  activity: ['My activity log', 'मेरी गतिविधि का रिकॉर्ड', 'আমার কার্যকলাপের তালিকা', 'என் செயல்பாட்டுப் பதிவு', '我的活动记录', 'Log aktiviti saya'],
  library: ['Explore ideas to try', 'आज़माने के विचार खोजें', 'চেষ্টা করার ধারণা খুঁজুন', 'முயல வேண்டிய யோசனைகளை ஆராய்', '探索可尝试的点子', 'Teroka idea untuk dicuba'],
};

registerStrings('menu', pageWords(M));
