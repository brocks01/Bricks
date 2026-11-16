import { type WordTable } from '../../i18n/words';

// Order of the six: English, Hindi, Bengali, Tamil, Chinese, Malay. First drafts; native-speaker review needed for hi, bn, ta, zh, ms.
export const NOTICES: WordTable = {
  heading: ['Notifications', 'सूचनाएँ', 'বিজ্ঞপ্তি', 'அறிவிப்புகள்', '通知', 'Pemberitahuan'],
  intro: ['What Interchange has told you, on any channel.', 'Interchange ने आपको जो बताया, हर माध्यम पर।', 'Interchange আপনাকে যা জানিয়েছে, যেকোনো মাধ্যমে।', 'Interchange உங்களுக்குச் சொன்னவை, எந்த வழியிலும்.', 'Interchange 通过各个渠道告诉你的内容。', 'Apa yang Interchange beritahu anda, di mana-mana saluran.'],
  none: ['Nothing new. When someone asks for your guidance, or a gathering is about to start, you will see it here.', 'कुछ नया नहीं। जब कोई आपका मार्गदर्शन माँगे या कोई सभा शुरू होने वाली हो, तो यहाँ दिखेगा।', 'নতুন কিছু নেই। কেউ আপনার পরামর্শ চাইলে বা কোনো সমাবেশ শুরু হতে চললে এখানে দেখবেন।', 'புதிதாக எதுவும் இல்லை. யாராவது வழிகாட்டுதல் கேட்டாலோ ஒரு கூடுகை தொடங்கவிருந்தாலோ இங்கே தெரியும்.', '没有新内容。有人向你请教或聚会即将开始时，会显示在这里。', 'Tiada yang baharu. Apabila seseorang meminta bimbingan anda, atau pertemuan hampir bermula, anda akan melihatnya di sini.'],
  viaApp: ['in the app', 'ऐप में', 'অ্যাপে', 'செயலியில்', '在应用中', 'dalam aplikasi'],
  viaTelegram: ['on Telegram', 'टेलीग्राम पर', 'টেলিগ্রামে', 'டெலிகிராமில்', '通过 Telegram', 'di Telegram'],
  viaWhatsapp: ['on WhatsApp', 'व्हाट्सऐप पर', 'হোয়াটসঅ্যাপে', 'வாட்ஸ்அப்பில்', '通过 WhatsApp', 'di WhatsApp'],
  viaSms: ['by text message', 'टेक्स्ट संदेश से', 'টেক্সট বার্তায়', 'குறுஞ்செய்தியில்', '通过短信', 'melalui mesej teks'],
  unread: ['New', 'नया', 'নতুন', 'புதியது', '新', 'Baharu'],
  loading: ['One moment…', 'एक पल…', 'এক মুহূর্ত…', 'ஒரு நிமிடம்…', '请稍候…', 'Sebentar…'],
};

export const CHATS: WordTable = {
  heading: ['Connect your chats', 'अपनी चैट जोड़ें', 'আপনার চ্যাট যুক্ত করুন', 'உங்கள் அரட்டைகளை இணைக்கவும்', '连接你的聊天', 'Sambungkan sembang anda'],
  intro: ['Talk to Interchange wherever you are. It is the same friend on every channel, and it remembers you.', 'जहाँ भी हों, Interchange से बात करें। हर माध्यम पर वही साथी है, और वह आपको याद रखता है।', 'যেখানেই থাকুন, Interchange-এর সঙ্গে কথা বলুন। প্রতিটি মাধ্যমে একই বন্ধু, এবং সে আপনাকে মনে রাখে।', 'எங்கிருந்தாலும் Interchange-உடன் பேசுங்கள். எல்லா வழிகளிலும் அதே நண்பர்; அது உங்களை நினைவில் வைத்திருக்கும்.', '无论身在何处都可以与 Interchange 交谈。每个渠道都是同一位朋友，它会记住你。', 'Bercakap dengan Interchange di mana-mana. Kawan yang sama di setiap saluran, dan ia mengingati anda.'],
  telegram: ['Telegram', 'टेलीग्राम', 'টেলিগ্রাম', 'டெலிகிராம்', 'Telegram', 'Telegram'],
  whatsapp: ['WhatsApp', 'व्हाट्सऐप', 'হোয়াটসঅ্যাপ', 'வாட்ஸ்அப்', 'WhatsApp', 'WhatsApp'],
  sms: ['Text messages', 'टेक्स्ट संदेश', 'টেক্সট বার্তা', 'குறுஞ்செய்திகள்', '短信', 'Mesej teks'],
  connected: ['Connected', 'जुड़ा हुआ', 'যুক্ত', 'இணைக்கப்பட்டது', '已连接', 'Disambungkan'],
  notConnected: ['Not connected', 'जुड़ा नहीं', 'যুক্ত নয়', 'இணைக்கப்படவில்லை', '未连接', 'Belum disambungkan'],
  notAvailable: ['Not available yet', 'अभी उपलब्ध नहीं', 'এখনো পাওয়া যায় না', 'இன்னும் கிடைக்கவில்லை', '暂不可用', 'Belum tersedia'],
  connect: ['Connect', 'जोड़ें', 'যুক্ত করুন', 'இணை', '连接', 'Sambung'],
  disconnect: ['Disconnect', 'हटाएँ', 'বিচ্ছিন্ন করুন', 'துண்டி', '断开', 'Putuskan'],
  codeTitle: ['Your code', 'आपका कोड', 'আপনার কোড', 'உங்கள் குறியீடு', '你的代码', 'Kod anda'],
  codeTelegram: ['Open the chat and send this code, or tap the link. It works once, for 15 minutes.', 'चैट खोलकर यह कोड भेजें, या लिंक दबाएँ। यह एक बार, 15 मिनट तक चलता है।', 'চ্যাট খুলে এই কোড পাঠান, বা লিঙ্কে চাপুন। এটি একবার, ১৫ মিনিট কাজ করে।', 'அரட்டையைத் திறந்து இந்தக் குறியீட்டை அனுப்புங்கள், அல்லது இணைப்பைத் தொடுங்கள். இது ஒருமுறை, 15 நிமிடம் செல்லும்.', '打开聊天并发送此代码，或点击链接。仅可使用一次，15 分钟内有效。', 'Buka sembang dan hantar kod ini, atau ketik pautan. Ia sah sekali sahaja, selama 15 minit.'],
  codeOther: ['Send this code in a message to {number}. It works once, for 15 minutes.', 'यह कोड {number} को संदेश में भेजें। यह एक बार, 15 मिनट तक चलता है।', 'এই কোড {number}-এ বার্তায় পাঠান। এটি একবার, ১৫ মিনিট কাজ করে।', 'இந்தக் குறியீட்டை {number} எண்ணுக்குச் செய்தியாக அனுப்புங்கள். இது ஒருமுறை, 15 நிமிடம் செல்லும்.', '将此代码发送到 {number}。仅可使用一次，15 分钟内有效。', 'Hantar kod ini dalam mesej ke {number}. Ia sah sekali sahaja, selama 15 minit.'],
  openTelegram: ['Open Telegram', 'टेलीग्राम खोलें', 'টেলিগ্রাম খুলুন', 'டெலிகிராமைத் திற', '打开 Telegram', 'Buka Telegram'],
  failed: ['That did not work. Please try again.', 'यह नहीं हुआ। कृपया फिर कोशिश करें।', 'এটি হয়নি। আবার চেষ্টা করুন।', 'இது நடக்கவில்லை. மீண்டும் முயலவும்.', '没有成功，请重试。', 'Tidak berjaya. Sila cuba lagi.'],
  phoneNote: ['Once a chat is connected you can also phone Interchange from that number.', 'चैट जुड़ने के बाद आप उसी नंबर से Interchange को फ़ोन भी कर सकते हैं।', 'চ্যাট যুক্ত হলে সেই নম্বর থেকে Interchange-কে ফোনও করতে পারবেন।', 'அரட்டை இணைந்ததும் அதே எண்ணிலிருந்து Interchange-ஐ அழைக்கவும் முடியும்.', '连接聊天后，你也可以用该号码致电 Interchange。', 'Selepas sembang disambungkan, anda juga boleh menelefon Interchange dari nombor itu.'],
};
