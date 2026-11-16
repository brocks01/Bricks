import { registerStrings } from '../../i18n/tables';
import { pageWords, type WordTable } from '../../i18n/words';

// Words of the revamp v2 Communities work (A1): the map card, the community card, the choice of up to three, the tab and the community page.
// Used as t('rv.<key>'). Order of the six: English, Hindi, Bengali, Tamil, Chinese, Malay. First drafts: native-speaker review needed.
export const RV: WordTable = {
  // the map card
  where: ['Where', 'कहाँ', 'কোথায়', 'எங்கே', '地点', 'Di mana'],
  where_we_meet: ['Where we meet', 'हम कहाँ मिलते हैं', 'আমরা কোথায় মিলি', 'நாம் சந்திக்கும் இடம்', '我们在哪里见面', 'Tempat kami berjumpa'],
  open_maps: ['Open in Google Maps', 'Google Maps में खोलें', 'Google Maps-এ খুলুন', 'Google Maps-இல் திற', '在 Google 地图中打开', 'Buka dalam Google Maps'],
  map_of: ['Map of {place}', '{place} का नक्शा', '{place}-এর মানচিত্র', '{place} வரைபடம்', '{place}的地图', 'Peta {place}'],

  // the community card
  members: ['{n} members', '{n} सदस्य', '{n} জন সদস্য', '{n} உறுப்பினர்கள்', '{n} 名成员', '{n} ahli'],
  members_led: ['{n} members · led by {name}', '{n} सदस्य · {name} के नेतृत्व में', '{n} জন সদস্য · নেতৃত্বে {name}', '{n} உறுப்பினர்கள் · தலைமை {name}', '{n} 名成员 · 由{name}带领', '{n} ahli · diketuai {name}'],
  next: ['Next: {when} · {title}', 'अगला: {when} · {title}', 'পরের: {when} · {title}', 'அடுத்தது: {when} · {title}', '下一次：{when} · {title}', 'Seterusnya: {when} · {title}'],
  none_planned: ['No gathering planned yet', 'अभी कोई सभा तय नहीं', 'এখনও কোনো জমায়েত ঠিক হয়নি', 'இன்னும் கூட்டம் திட்டமிடப்படவில்லை', '暂无聚会安排', 'Belum ada perhimpunan dirancang'],
  near_km: ['Near you · {km} km', 'आपके पास · {km} किमी', 'আপনার কাছে · {km} কিমি', 'உங்கள் அருகில் · {km} கி.மீ', '离您很近 · {km} 公里', 'Dekat anda · {km} km'],
  near_area: ['Near you · {area}', 'आपके पास · {area}', 'আপনার কাছে · {area}', 'உங்கள் அருகில் · {area}', '离您很近 · {area}', 'Dekat anda · {area}'],
  because: ['Because you enjoy {what}', 'क्योंकि आपको {what} पसंद है', 'কারণ আপনি {what} পছন্দ করেন', 'நீங்கள் {what} விரும்புவதால்', '因为您喜欢{what}', 'Kerana anda suka {what}'],
  men_only: ['Men only', 'केवल पुरुष', 'শুধু পুরুষ', 'ஆண்கள் மட்டும்', '仅限男性', 'Lelaki sahaja'],
  women_only: ['Women only', 'केवल महिलाएँ', 'শুধু মহিলা', 'பெண்கள் மட்டும்', '仅限女性', 'Wanita sahaja'],
  whatsapp: ['Join WhatsApp group', 'WhatsApp समूह से जुड़ें', 'WhatsApp গ্রুপে যোগ দিন', 'WhatsApp குழுவில் சேர்', '加入 WhatsApp 群组', 'Sertai kumpulan WhatsApp'],
  add_whatsapp: ['Add WhatsApp link', 'WhatsApp लिंक जोड़ें', 'WhatsApp লিংক যোগ করুন', 'WhatsApp இணைப்பைச் சேர்', '添加 WhatsApp 链接', 'Tambah pautan WhatsApp'],
  see_events: ['See events', 'कार्यक्रम देखें', 'অনুষ্ঠান দেখুন', 'நிகழ்வுகளைப் பார்', '查看活动', 'Lihat acara'],
  join: ['Join', 'जुड़ें', 'যোগ দিন', 'சேர்', '加入', 'Sertai'],
  joined: ['You joined {name}.', 'आप {name} से जुड़ गए।', 'আপনি {name}-এ যোগ দিয়েছেন।', 'நீங்கள் {name} இல் சேர்ந்தீர்கள்.', '您已加入{name}。', 'Anda telah menyertai {name}.'],
  open_community: ['Open {name}', '{name} खोलें', '{name} খুলুন', '{name} திற', '打开{name}', 'Buka {name}'],

  // interests, in words (the same eight keys as onboarding)
  i_walking: ['walking', 'सैर', 'হাঁটা', 'நடை', '散步', 'berjalan'],
  i_taichi: ['tai chi', 'ताई ची', 'তাই চি', 'தாய்ச்சி', '太极', 'tai chi'],
  i_cooking: ['cooking', 'खाना बनाना', 'রান্না', 'சமையல்', '烹饪', 'memasak'],
  i_chess: ['chess', 'शतरंज', 'দাবা', 'சதுரங்கம்', '象棋', 'catur'],
  i_music: ['music', 'संगीत', 'সঙ্গীত', 'இசை', '音乐', 'muzik'],
  i_gardening: ['gardening', 'बागवानी', 'বাগান', 'தோட்டப் பணி', '园艺', 'berkebun'],
  i_teaching: ['teaching', 'पढ़ाना', 'শেখানো', 'கற்பித்தல்', '教学', 'mengajar'],
  i_tech: ['phones and computers', 'फ़ोन और कंप्यूटर', 'ফোন ও কম্পিউটার', 'தொலைபேசி மற்றும் கணினி', '手机和电脑', 'telefon dan komputer'],

  // time in plain words
  today_at: ['Today, {time}', 'आज, {time}', 'আজ, {time}', 'இன்று, {time}', '今天 {time}', 'Hari ini, {time}'],
  tomorrow_at: ['Tomorrow, {time}', 'कल, {time}', 'আগামীকাল, {time}', 'நாளை, {time}', '明天 {time}', 'Esok, {time}'],
  day_at: ['{day}, {time}', '{day}, {time}', '{day}, {time}', '{day}, {time}', '{day} {time}', '{day}, {time}'],

  // choosing up to three (first run)
  pick_title: ['Choose up to 3', 'अधिकतम 3 चुनें', 'সর্বোচ্চ ৩টি বেছে নিন', '3 வரை தேர்ந்தெடுங்கள்', '最多选择 3 个', 'Pilih sehingga 3'],
  pick_sub: ['Communities near you that share what you enjoy.', 'आपके पास के समुदाय जिन्हें वही पसंद है जो आपको।', 'আপনার কাছের কমিউনিটি, যাদের পছন্দ আপনার মতো।', 'உங்களுக்குப் பிடித்ததைப் பகிரும் அருகிலுள்ள சமூகங்கள்.', '您附近、与您爱好相同的社区。', 'Komuniti berhampiran yang berkongsi minat anda.'],
  pick_count: ['{n} of {max} chosen', '{max} में से {n} चुने', '{max}টির মধ্যে {n}টি বেছে নেওয়া', '{max} இல் {n} தேர்ந்தெடுக்கப்பட்டது', '已选 {n} / {max}', '{n} daripada {max} dipilih'],
  pick_full: ['You can be in 3 communities. Leave one later to join another.', 'आप 3 समुदायों में रह सकते हैं। दूसरा जुड़ने के लिए बाद में एक छोड़ें।', 'আপনি ৩টি কমিউনিটিতে থাকতে পারেন। অন্যটিতে যোগ দিতে পরে একটি ছাড়ুন।', 'நீங்கள் 3 சமூகங்களில் இருக்கலாம். வேறொன்றில் சேர பின்னர் ஒன்றை விடுங்கள்.', '您最多可加入 3 个社区。以后退出一个即可加入另一个。', 'Anda boleh berada dalam 3 komuniti. Tinggalkan satu kemudian untuk menyertai yang lain.'],
  pick_go: ['Join and go to Home', 'जुड़ें और होम पर जाएँ', 'যোগ দিন ও হোমে যান', 'சேர்ந்து முகப்புக்குச் செல்', '加入并前往首页', 'Sertai dan pergi ke Laman Utama'],
  pick_home: ['Go to Home', 'होम पर जाएँ', 'হোমে যান', 'முகப்புக்குச் செல்', '前往首页', 'Pergi ke Laman Utama'],
  pick_skip: ['Skip for now', 'अभी छोड़ें', 'এখন বাদ দিন', 'இப்போதைக்குத் தவிர்', '暂时跳过', 'Langkau dahulu'],
  pick_none: ['There are no open communities to choose just now.', 'अभी चुनने के लिए कोई खुला समुदाय नहीं है।', 'এখন বেছে নেওয়ার মতো কোনো খোলা কমিউনিটি নেই।', 'இப்போது தேர்வு செய்யத் திறந்த சமூகங்கள் இல்லை.', '目前没有可选择的开放社区。', 'Tiada komuniti terbuka untuk dipilih buat masa ini.'],
  chosen: ['Chosen', 'चुना गया', 'বেছে নেওয়া', 'தேர்ந்தெடுக்கப்பட்டது', '已选', 'Dipilih'],
  failed: ['Could not load, try again', 'लोड नहीं हुआ, फिर कोशिश करें', 'লোড হয়নি, আবার চেষ্টা করুন', 'ஏற்ற முடியவில்லை, மீண்டும் முயலுங்கள்', '无法加载，请重试', 'Tidak dapat dimuatkan, cuba lagi'],
  try_again: ['Try again', 'फिर कोशिश करें', 'আবার চেষ্টা করুন', 'மீண்டும் முயல்', '重试', 'Cuba lagi'],

  // the Communities tab
  tab_title: ['Communities', 'समुदाय', 'কমিউনিটি', 'சமூகங்கள்', '社区', 'Komuniti'],
  search: ['Search communities', 'समुदाय खोजें', 'কমিউনিটি খুঁজুন', 'சமூகங்களைத் தேடு', '搜索社区', 'Cari komuniti'],
  clear: ['Clear', 'साफ़ करें', 'মুছুন', 'அழி', '清除', 'Kosongkan'],
  no_match: ["No communities match '{q}'", "'{q}' से कोई समुदाय नहीं मिला", "'{q}'-এর সাথে কোনো কমিউনিটি মেলেনি", "'{q}' உடன் பொருந்தும் சமூகம் இல்லை", '没有与“{q}”匹配的社区', "Tiada komuniti sepadan dengan '{q}'"],
  ask_start: ['Ask to start one', 'नया शुरू करने के लिए कहें', 'নতুন শুরু করতে অনুরোধ করুন', 'புதியதைத் தொடங்கக் கேளுங்கள்', '申请创建一个', 'Minta untuk memulakan satu'],
  yours: ['Your communities', 'आपके समुदाय', 'আপনার কমিউনিটি', 'உங்கள் சமூகங்கள்', '您的社区', 'Komuniti anda'],
  of_three: ['{n} of 3', '3 में से {n}', '৩টির মধ্যে {n}', '3 இல் {n}', '{n} / 3', '{n} daripada 3'],
  none_yours: ['You are not in a community yet. Choose up to three that suit you.', 'आप अभी किसी समुदाय में नहीं हैं। अपने लिए अधिकतम तीन चुनें।', 'আপনি এখনও কোনো কমিউনিটিতে নেই। আপনার উপযোগী সর্বোচ্চ তিনটি বেছে নিন।', 'நீங்கள் இன்னும் எந்தச் சமூகத்திலும் இல்லை. உங்களுக்கு ஏற்ற மூன்று வரை தேர்ந்தெடுங்கள்.', '您还没有加入社区。选择最多三个适合您的社区。', 'Anda belum menyertai komuniti. Pilih sehingga tiga yang sesuai.'],
  see_for_you: ['See communities for you', 'आपके लिए समुदाय देखें', 'আপনার জন্য কমিউনিটি দেখুন', 'உங்களுக்கான சமூகங்களைப் பார்', '查看适合您的社区', 'Lihat komuniti untuk anda'],
  picked: ['Picked for you', 'आपके लिए चुने गए', 'আপনার জন্য বাছাই', 'உங்களுக்காகத் தேர்ந்தெடுத்தவை', '为您挑选', 'Dipilih untuk anda'],
  none_picked: ['Nothing new to suggest just now.', 'अभी सुझाने को कुछ नया नहीं।', 'এখন নতুন কিছু সুপারিশ করার নেই।', 'இப்போது பரிந்துரைக்க புதியது இல்லை.', '目前没有新的推荐。', 'Tiada cadangan baharu buat masa ini.'],
  have_code: ['I have a join code', 'मेरे पास जुड़ने का कोड है', 'আমার কাছে যোগদানের কোড আছে', 'என்னிடம் சேரும் குறியீடு உள்ளது', '我有加入码', 'Saya ada kod sertai'],
  start_one: ['Ask to start a community', 'समुदाय शुरू करने के लिए कहें', 'কমিউনিটি শুরু করতে অনুরোধ করুন', 'சமூகத்தைத் தொடங்கக் கேளுங்கள்', '申请创建社区', 'Minta untuk memulakan komuniti'],

  // the community page
  led_by: ['Led by {name}', '{name} के नेतृत्व में', 'নেতৃত্বে {name}', 'தலைமை: {name}', '由{name}带领', 'Diketuai {name}'],
  lead_role: ['Community Lead: {name}', 'सामुदायिक प्रमुख: {name}', 'কমিউনিটি লিড: {name}', 'சமூகத் தலைவர்: {name}', '社区负责人：{name}', 'Ketua Komuniti: {name}'],
  from_host: ['Brought in from {host}', '{host} से लाया गया', '{host} থেকে আনা', '{host} இலிருந்து கொண்டு வரப்பட்டது', '来自{host}', 'Dibawa dari {host}'],
  for_all: ['Open to everyone', 'सबके लिए खुला', 'সবার জন্য খোলা', 'அனைவருக்கும் திறந்தது', '向所有人开放', 'Terbuka untuk semua'],
  more_text: ['More', 'और', 'আরও', 'மேலும்', '更多', 'Lagi'],
  less_text: ['Less', 'कम', 'কম', 'குறைவாக', '收起', 'Kurang'],
  more: ['More', 'और', 'আরও', 'மேலும்', '更多', 'Lagi'],
  coming_up: ['Coming up', 'आने वाले', 'আসন্ন', 'வரவிருப்பவை', '即将举行', 'Akan datang'],
  upcoming: ['Upcoming', 'आने वाले', 'আসন্ন', 'வரவிருப்பவை', '即将举行', 'Akan datang'],
  past: ['Past', 'पिछले', 'অতীত', 'கடந்தவை', '过去', 'Lalu'],
  no_upcoming: ['Nothing planned yet. Check again soon.', 'अभी कुछ तय नहीं। जल्द फिर देखें।', 'এখনও কিছু ঠিক হয়নি। শীঘ্রই আবার দেখুন।', 'இன்னும் எதுவும் திட்டமிடப்படவில்லை. விரைவில் மீண்டும் பாருங்கள்.', '暂无安排，请稍后再看。', 'Belum ada rancangan. Semak semula nanti.'],
  no_past: ['No past gatherings yet.', 'अभी कोई पिछली सभा नहीं।', 'এখনও কোনো অতীত জমায়েত নেই।', 'இதுவரை கடந்த கூட்டங்கள் இல்லை.', '还没有过去的聚会。', 'Belum ada perhimpunan lalu.'],
  events_page: ['Open our events page', 'हमारा कार्यक्रम पेज खोलें', 'আমাদের অনুষ্ঠানের পাতা খুলুন', 'எங்கள் நிகழ்வுப் பக்கத்தைத் திற', '打开我们的活动页面', 'Buka halaman acara kami'],
  going_n: ['{n} going', '{n} जा रहे हैं', '{n} জন যাচ্ছেন', '{n} பேர் வருகிறார்கள்', '{n} 人参加', '{n} hadir'],
  im_going: ["I'm going", 'मैं आऊँगा', 'আমি যাব', 'நான் வருகிறேன்', '我会去', 'Saya akan hadir'],
  you_going: ['You are going', 'आप जा रहे हैं', 'আপনি যাচ্ছেন', 'நீங்கள் வருகிறீர்கள்', '您会参加', 'Anda akan hadir'],
  earn_leaf: ['Come along to earn 1 leaf', 'आएँ और 1 पत्ता पाएँ', 'আসুন, ১টি পাতা পান', 'வந்து 1 இலையைப் பெறுங்கள்', '来参加，赢得 1 片叶子', 'Datang dan dapatkan 1 daun'],
  change: ['Change', 'बदलें', 'বদলান', 'மாற்று', '更改', 'Ubah'],
  im_here: ["I'm here", 'मैं यहाँ हूँ', 'আমি এখানে', 'நான் இங்கே இருக்கிறேன்', '我到了', 'Saya di sini'],
  you_came: ['You came', 'आप आए', 'আপনি এসেছেন', 'நீங்கள் வந்தீர்கள்', '您来了', 'Anda hadir'],
  plus_leaf: ['+1 leaf', '+1 पत्ता', '+১ পাতা', '+1 இலை', '+1 片叶子', '+1 daun'],
  more_about: ['More about this group', 'इस समूह के बारे में और', 'এই গ্রুপ সম্পর্কে আরও', 'இந்தக் குழுவைப் பற்றி மேலும்', '关于这个小组的更多内容', 'Lagi tentang kumpulan ini'],
  share_invite: ['Share the invite', 'निमंत्रण साझा करें', 'আমন্ত্রণ শেয়ার করুন', 'அழைப்பைப் பகிர்', '分享邀请', 'Kongsi jemputan'],
  leave: ['Leave community', 'समुदाय छोड़ें', 'কমিউনিটি ছাড়ুন', 'சமூகத்தை விடு', '退出社区', 'Tinggalkan komuniti'],
  report: ['Report', 'रिपोर्ट करें', 'রিপোর্ট করুন', 'புகார் செய்', '举报', 'Laporkan'],
  leave_title: ['Leave {name}?', '{name} छोड़ें?', '{name} ছাড়বেন?', '{name} ஐ விடவா?', '退出{name}？', 'Tinggalkan {name}?'],
  leave_body: ['You will no longer see this group\'s events. You can join again later.', 'आपको इस समूह के कार्यक्रम नहीं दिखेंगे। आप बाद में फिर जुड़ सकते हैं।', 'আপনি আর এই গ্রুপের অনুষ্ঠান দেখবেন না। পরে আবার যোগ দিতে পারবেন।', 'இந்தக் குழுவின் நிகழ்வுகள் இனி உங்களுக்குத் தெரியாது. பின்னர் மீண்டும் சேரலாம்.', '您将不再看到该小组的活动。之后可以再加入。', 'Anda tidak akan melihat acara kumpulan ini lagi. Anda boleh menyertai semula kemudian.'],
  stay: ['Stay', 'रुकें', 'থাকুন', 'இருக்கிறேன்', '留下', 'Kekal'],
  left: ['You left {name}', 'आपने {name} छोड़ दिया', 'আপনি {name} ছেড়েছেন', 'நீங்கள் {name} ஐ விட்டீர்கள்', '您已退出{name}', 'Anda telah meninggalkan {name}'],
  last_lead: ['You are the only leader. Hand the role to someone first.', 'आप अकेले प्रमुख हैं। पहले यह भूमिका किसी और को दें।', 'আপনিই একমাত্র লিড। আগে অন্য কাউকে দায়িত্ব দিন।', 'நீங்கள் மட்டுமே தலைவர். முதலில் வேறொருவரிடம் பொறுப்பைக் கொடுங்கள்.', '您是唯一的负责人，请先把职务交给别人。', 'Anda satu-satunya ketua. Serahkan peranan kepada orang lain dahulu.'],

  here_later: ["You can say I'm here from an hour before it starts.", 'शुरू होने से एक घंटा पहले से आप "मैं यहाँ हूँ" कह सकते हैं।', 'শুরুর এক ঘণ্টা আগে থেকে "আমি এখানে" বলতে পারবেন।', 'தொடங்குவதற்கு ஒரு மணி நேரம் முன்பிலிருந்து "நான் இங்கே இருக்கிறேன்" சொல்லலாம்.', '活动开始前一小时起，您就可以点“我到了”。', 'Anda boleh tekan "Saya di sini" sejam sebelum ia bermula.'],
  report_title: ['Why are you reporting this group?', 'आप इस समूह की रिपोर्ट क्यों कर रहे हैं?', 'আপনি কেন এই গ্রুপের বিরুদ্ধে রিপোর্ট করছেন?', 'இந்தக் குழுவைப் பற்றி ஏன் புகார் செய்கிறீர்கள்?', '您为什么要举报这个小组？', 'Mengapa anda melaporkan kumpulan ini?'],
  cancel: ['Cancel', 'रद्द करें', 'বাতিল', 'ரத்து செய்', '取消', 'Batal'],
  close: ['Close', 'बंद करें', 'বন্ধ করুন', 'மூடு', '关闭', 'Tutup'],

  // the leader's details
  details_title: ['Group details', 'समूह का विवरण', 'গ্রুপের বিবরণ', 'குழு விவரங்கள்', '小组资料', 'Butiran kumpulan'],
  details_address: ['Where the group usually meets', 'समूह आमतौर पर कहाँ मिलता है', 'গ্রুপ সাধারণত কোথায় মেলে', 'குழு வழக்கமாகச் சந்திக்கும் இடம்', '小组通常在哪里聚会', 'Tempat kumpulan biasanya berjumpa'],
  details_whatsapp: ['WhatsApp group invite link', 'WhatsApp समूह निमंत्रण लिंक', 'WhatsApp গ্রুপের আমন্ত্রণ লিংক', 'WhatsApp குழு அழைப்பு இணைப்பு', 'WhatsApp 群组邀请链接', 'Pautan jemputan kumpulan WhatsApp'],
  details_whatsapp_hint: ['In WhatsApp: the group, then Invite via link, then Copy link. Only members will see it.', 'WhatsApp में: समूह, फिर लिंक से आमंत्रित करें, फिर लिंक कॉपी करें। केवल सदस्य इसे देखेंगे।', 'WhatsApp-এ: গ্রুপ, তারপর লিংকের মাধ্যমে আমন্ত্রণ, তারপর লিংক কপি। শুধু সদস্যরা দেখবেন।', 'WhatsApp இல்: குழு, பின் இணைப்பு மூலம் அழை, பின் இணைப்பை நகலெடு. உறுப்பினர்கள் மட்டுமே பார்ப்பார்கள்.', '在 WhatsApp 中：打开群组，选择“通过链接邀请”，再“复制链接”。只有成员能看到。', 'Dalam WhatsApp: kumpulan, kemudian Jemput melalui pautan, kemudian Salin pautan. Hanya ahli akan melihatnya.'],
  details_events: ['Your own events page (optional)', 'आपका अपना कार्यक्रम पेज (वैकल्पिक)', 'আপনার নিজের অনুষ্ঠানের পাতা (ঐচ্ছিক)', 'உங்கள் சொந்த நிகழ்வுப் பக்கம் (விருப்பம்)', '您自己的活动页面（可选）', 'Halaman acara anda sendiri (pilihan)'],
  details_interests: ['What the group is about', 'समूह किस बारे में है', 'গ্রুপটি কী নিয়ে', 'குழு எதைப் பற்றியது', '小组的主题', 'Tentang kumpulan ini'],
  save: ['Save', 'सहेजें', 'সংরক্ষণ করুন', 'சேமி', '保存', 'Simpan'],
  saved: ['Saved', 'सहेजा गया', 'সংরক্ষিত', 'சேமிக்கப்பட்டது', '已保存', 'Disimpan'],
  bad_whatsapp: ['That is not a WhatsApp group link. It starts with https://chat.whatsapp.com/', 'यह WhatsApp समूह लिंक नहीं है। यह https://chat.whatsapp.com/ से शुरू होता है', 'এটি WhatsApp গ্রুপ লিংক নয়। এটি https://chat.whatsapp.com/ দিয়ে শুরু হয়', 'இது WhatsApp குழு இணைப்பு அல்ல. இது https://chat.whatsapp.com/ என்று தொடங்கும்', '这不是 WhatsApp 群组链接。链接以 https://chat.whatsapp.com/ 开头', 'Itu bukan pautan kumpulan WhatsApp. Ia bermula dengan https://chat.whatsapp.com/'],
  bad_events: ['The events page must start with https://', 'कार्यक्रम पेज https:// से शुरू होना चाहिए', 'অনুষ্ঠানের পাতা https:// দিয়ে শুরু হতে হবে', 'நிகழ்வுப் பக்கம் https:// என்று தொடங்க வேண்டும்', '活动页面必须以 https:// 开头', 'Halaman acara mesti bermula dengan https://'],
};

registerStrings('rv', pageWords(RV));
