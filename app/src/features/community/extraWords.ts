import { type WordTable } from '../../i18n/words';

// Words for repeating events, a person's standing in a community, and group suggestions. Order of the six: English, Hindi, Bengali, Tamil, Chinese, Malay. First drafts; native-speaker review needed.
export const EXTRA: WordTable = {
  fRepeat: ['Repeats', 'दोहराव', 'পুনরাবৃত্তি', 'மீண்டும் நிகழ்வு', '重复', 'Ulang'],
  repeat_none: ['Just once', 'सिर्फ़ एक बार', 'শুধু একবার', 'ஒருமுறை மட்டும்', '仅一次', 'Sekali sahaja'],
  repeat_daily: ['Every day', 'हर दिन', 'প্রতিদিন', 'தினமும்', '每天', 'Setiap hari'],
  repeat_weekdays: ['Weekdays', 'कार्य-दिवस', 'কর্মদিবস', 'வார நாட்கள்', '工作日', 'Hari bekerja'],
  repeat_weekly: ['Every week', 'हर हफ़्ते', 'প্রতি সপ্তাহে', 'வாரந்தோறும்', '每周', 'Setiap minggu'],
  repeat_monthly: ['Every month', 'हर महीने', 'প্রতি মাসে', 'மாதந்தோறும்', '每月', 'Setiap bulan'],
  repeatNote: ['A repeating event is made for the coming weeks. People say they are going to each one.', 'दोहराने वाला कार्यक्रम आने वाले हफ़्तों के लिए बनता है। लोग हर एक के लिए बताते हैं कि वे आ रहे हैं।', 'পুনরাবৃত্ত অনুষ্ঠান আগামী সপ্তাহগুলির জন্য তৈরি হয়। প্রতিটির জন্য মানুষ জানায় তারা আসছে কি না।', 'மீண்டும் நிகழும் நிகழ்வு வரும் வாரங்களுக்கு உருவாக்கப்படும். ஒவ்வொன்றுக்கும் மக்கள் வருகிறேன் என்று சொல்வார்கள்.', '重复活动会为接下来的几周生成，大家可以对每一场表示参加。', 'Acara berulang dibuat untuk beberapa minggu akan datang. Orang menyatakan akan hadir pada setiap satu.'],
  standingTitle: ['How often you come', 'आप कितनी बार आते हैं', 'আপনি কতবার আসেন', 'நீங்கள் எவ்வளவு முறை வருகிறீர்கள்', '你来的频率', 'Kekerapan anda hadir'],
  standingMonth: ['{n} this month', 'इस महीने {n}', 'এই মাসে {n}', 'இந்த மாதம் {n}', '本月 {n} 次', '{n} bulan ini'],
  standingDays: ['{n} days in a row', 'लगातार {n} दिन', 'টানা {n} দিন', 'தொடர்ந்து {n} நாட்கள்', '连续 {n} 天', '{n} hari berturut-turut'],
  standingWeeks: ['{n} weeks in a row', 'लगातार {n} हफ़्ते', 'টানা {n} সপ্তাহ', 'தொடர்ந்து {n} வாரங்கள்', '连续 {n} 周', '{n} minggu berturut-turut'],
  level_newcomer: ['Newcomer', 'नए सदस्य', 'নতুন সদস্য', 'புதியவர்', '新成员', 'Ahli baharu'],
  level_regular: ['Regular', 'नियमित', 'নিয়মিত', 'வழக்கமானவர்', '常客', 'Tetap'],
  level_stalwart: ['Stalwart', 'पक्के साथी', 'অটল সদস্য', 'உறுதியானவர்', '中坚', 'Penyokong setia'],
  regularsTitle: ['Regulars this month', 'इस महीने के नियमित लोग', 'এই মাসের নিয়মিতরা', 'இந்த மாதத்தின் வழக்கமானவர்கள்', '本月常客', 'Ahli tetap bulan ini'],
  suggestStart: ['{n} people near you enjoy {interest}. Start a group?', 'आपके पास {n} लोगों को {interest} पसंद है। समूह शुरू करें?', 'আপনার কাছে {n} জন {interest} পছন্দ করেন। একটি দল শুরু করবেন?', 'உங்கள் அருகில் {n} பேர் {interest} விரும்புகிறார்கள். ஒரு குழுவைத் தொடங்கலாமா?', '你附近有 {n} 人喜欢{interest}。要发起一个小组吗？', '{n} orang berhampiran anda gemar {interest}. Mulakan kumpulan?'],
  suggestJoin: ['A group for {interest}', '{interest} के लिए एक समूह', '{interest}-এর জন্য একটি দল', '{interest}-க்கான ஒரு குழு', '{interest}小组', 'Kumpulan untuk {interest}'],
  suggestOpen: ['Open', 'खोलें', 'খুলুন', 'திற', '打开', 'Buka'],
  suggestCreate: ['Start a group', 'समूह शुरू करें', 'দল শুরু করুন', 'குழுவைத் தொடங்கு', '发起小组', 'Mulakan kumpulan'],
};
