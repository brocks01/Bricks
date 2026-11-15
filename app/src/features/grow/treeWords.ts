import { registerStrings } from '../../i18n/tables';
import { pageWords, type WordTable } from '../../i18n/words';

// The words of the Progress tree. Order of the six: English, Hindi, Bengali, Tamil, Chinese, Malay. First drafts: native-speaker review needed.
const T: WordTable = {
  leaf: ['leaf', 'पत्ता', 'পাতা', 'இலை', '片叶子', 'daun'],
  leaves: ['leaves', 'पत्ते', 'পাতা', 'இலைகள்', '片叶子', 'daun'],
  level: ['Level {n}', 'स्तर {n}', 'স্তর {n}', 'நிலை {n}', '第 {n} 级', 'Tahap {n}'],
  to_next: ['{n} more for the next level', 'अगले स्तर के लिए {n} और', 'পরের স্তরের জন্য আরও {n}', 'அடுத்த நிலைக்கு இன்னும் {n}', '再 {n} 片升级', '{n} lagi untuk tahap seterusnya'],
  every: ['Every green leaf is something you did.', 'हर हरा पत्ता कुछ ऐसा है जो आपने किया।', 'প্রতিটি সবুজ পাতা এমন কিছু যা আপনি করেছেন।', 'ஒவ்வொரு பச்சை இலையும் நீங்கள் செய்தது.', '每一片绿叶都是你做过的事。', 'Setiap daun hijau ialah sesuatu yang anda lakukan.'],
  growing: ['{n} still growing', '{n} अभी बढ़ रहे हैं', '{n}টি এখনও বাড়ছে', '{n} இன்னும் வளர்கின்றன', '{n} 片正在生长', '{n} masih tumbuh'],
  empty: ['Your tree is just starting. Go for a walk, join a gathering or lend a hand, and the first leaf grows.', 'आपका पेड़ अभी शुरू हो रहा है। टहलने जाएँ, किसी सभा में जुड़ें या हाथ बँटाएँ, पहला पत्ता उगेगा।', 'আপনার গাছ সবে শুরু হচ্ছে। হাঁটতে যান, কোনো জমায়েতে যোগ দিন বা সাহায্য করুন, প্রথম পাতা গজাবে।', 'உங்கள் மரம் இப்போதுதான் தொடங்குகிறது. நடைப்பயிற்சி செல்லுங்கள், கூட்டத்தில் சேருங்கள் அல்லது உதவுங்கள்; முதல் இலை வளரும்.', '你的树刚刚开始。去散散步、参加聚会或帮个忙，第一片叶子就会长出来。', 'Pokok anda baru bermula. Pergi berjalan, sertai perhimpunan atau hulurkan bantuan, dan daun pertama akan tumbuh.'],
  failed: ['The tree could not load. Please try again.', 'पेड़ लोड नहीं हो सका। कृपया फिर कोशिश करें।', 'গাছ লোড হয়নি। আবার চেষ্টা করুন।', 'மரத்தை ஏற்ற முடியவில்லை. மீண்டும் முயலுங்கள்.', '无法加载这棵树，请重试。', 'Pokok tidak dapat dimuatkan. Sila cuba lagi.'],
  area_move: ['Moving', 'चलना-फिरना', 'চলাফেরা', 'நடமாட்டம்', '活动', 'Bergerak'],
  area_community: ['Community', 'समुदाय', 'সম্প্রদায়', 'சமூகம்', '社区', 'Komuniti'],
  area_give: ['Giving back', 'लौटाना', 'ফিরিয়ে দেওয়া', 'பகிர்தல்', '回馈', 'Menyumbang'],
  area_other: ['Other', 'अन्य', 'অন্যান্য', 'மற்றவை', '其他', 'Lain-lain'],
  how: ['How you earn leaves', 'पत्ते कैसे मिलते हैं', 'পাতা কীভাবে পাবেন', 'இலைகளை எப்படிப் பெறுவது', '如何获得叶子', 'Cara mendapat daun'],
  how_walk: ['Record a walk', 'एक सैर दर्ज करें', 'একটি হাঁটা রেকর্ড করুন', 'ஒரு நடையைப் பதிவு செய்யுங்கள்', '记录一次散步', 'Rekod satu perjalanan'],
  how_move: ['Say yes to "did you move today?"', '"क्या आप आज चले?" पर हाँ कहें', '"আজ কি নড়াচড়া করেছেন?" এ হ্যাঁ বলুন', '"இன்று அசைந்தீர்களா?" என்பதற்கு ஆம் என்று சொல்லுங்கள்', '对“今天活动了吗？”回答是', 'Jawab ya kepada "adakah anda bergerak hari ini?"'],
  how_gather: ['Go to a gathering you said yes to', 'जिस सभा के लिए हाँ कहा, उसमें जाएँ', 'যে জমায়েতে হ্যাঁ বলেছেন সেখানে যান', 'ஆம் என்று சொன்ன கூட்டத்துக்குச் செல்லுங்கள்', '参加你答应过的聚会', 'Hadiri perhimpunan yang anda setujui'],
  how_give: ['Give a service and mark it done', 'कोई सेवा दें और उसे पूरा चिह्नित करें', 'একটি সেবা দিন এবং সম্পন্ন চিহ্নিত করুন', 'ஒரு சேவையை வழங்கி முடிந்தது எனக் குறியுங்கள்', '提供一次服务并标记完成', 'Beri satu perkhidmatan dan tandakan selesai'],
  more: ['More about my progress', 'मेरी प्रगति के बारे में और', 'আমার অগ্রগতি সম্পর্কে আরও', 'என் முன்னேற்றம் பற்றி மேலும்', '更多关于我的进展', 'Lagi tentang kemajuan saya'],
  tree_label: ['Your tree: {n} green leaves', 'आपका पेड़: {n} हरे पत्ते', 'আপনার গাছ: {n}টি সবুজ পাতা', 'உங்கள் மரம்: {n} பச்சை இலைகள்', '你的树：{n} 片绿叶', 'Pokok anda: {n} daun hijau'],
};

registerStrings('tree', pageWords(T));
