import { registerStrings } from '../../i18n/tables';
import { pageWords, type WordTable } from '../../i18n/words';

// The words for the community rules: three at most, explore, leave, family here, and asking to start a community.
// Order of the six: English, Hindi, Bengali, Tamil, Chinese, Malay.
export const R: WordTable = {
  h_community: ['Community', 'समुदाय', 'কমিউনিটি', 'சமூகம்', '社区', 'Komuniti'],
  slots_used: ['You are in {n} of {max} communities', 'आप {max} में से {n} समुदायों में हैं', 'আপনি {max}টির মধ্যে {n}টি কমিউনিটিতে আছেন', 'நீங்கள் {max} இல் {n} சமூகங்களில் உள்ளீர்கள்', '你加入了 {max} 个社区中的 {n} 个', 'Anda dalam {n} daripada {max} komuniti'],
  explore: ['Explore communities', 'समुदाय खोजें', 'কমিউনিটি খুঁজুন', 'சமூகங்களை ஆராய்', '探索社区', 'Teroka komuniti'],
  ask_start: ['Ask to start a community', 'समुदाय शुरू करने का अनुरोध करें', 'কমিউনিটি শুরুর অনুরোধ করুন', 'சமூகத்தைத் தொடங்கக் கேள்', '申请创建社区', 'Mohon memulakan komuniti'],
  have_code: ['Join with a code', 'कोड से जुड़ें', 'কোড দিয়ে যোগ দিন', 'குறியீட்டுடன் சேர்', '用邀请码加入', 'Sertai dengan kod'],
  full_note: ['You are in all {max} of your places. Leave one community to join another.', 'आपके सभी {max} स्थान भरे हैं। दूसरे में जुड़ने के लिए एक समुदाय छोड़ें।', 'আপনার সব {max}টি জায়গা ভরা। অন্যটিতে যোগ দিতে একটি কমিউনিটি ছাড়ুন।', 'உங்கள் {max} இடங்களும் நிரம்பிவிட்டன. மற்றொன்றில் சேர ஒரு சமூகத்தை விட்டு விலகுங்கள்.', '你的 {max} 个名额已满。请先退出一个社区再加入新的。', 'Kesemua {max} tempat anda sudah penuh. Tinggalkan satu komuniti untuk menyertai yang lain.'],
  // explore page
  h_explore: ['Explore communities', 'समुदाय खोजें', 'কমিউনিটি খুঁজুন', 'சமூகங்களை ஆராய்', '探索社区', 'Teroka komuniti'],
  intro_explore: ['Look around as much as you like. You can be in three at a time.', 'जितना चाहें देखें। आप एक समय में तीन में रह सकते हैं।', 'যত খুশি দেখুন। আপনি একসঙ্গে তিনটিতে থাকতে পারেন।', 'விருப்பம்போல் பாருங்கள். ஒரே நேரத்தில் மூன்றில் இருக்கலாம்.', '尽管浏览。你同时最多可加入三个。', 'Lihat sepuas hati. Anda boleh berada dalam tiga pada satu masa.'],
  search_c: ['Search communities', 'समुदाय खोजें', 'কমিউনিটি খুঁজুন', 'சமூகங்களைத் தேடு', '搜索社区', 'Cari komuniti'],
  join_c: ['Join', 'जुड़ें', 'যোগ দিন', 'சேர்', '加入', 'Sertai'],
  joined_c: ['Joined', 'जुड़े हुए', 'যুক্ত', 'சேர்ந்துள்ளீர்கள்', '已加入', 'Telah sertai'],
  invite_only: ['Invite only: ask a leader for the code', 'सिर्फ़ आमंत्रण से: नेता से कोड माँगें', 'শুধু আমন্ত্রণে: নেতার কাছে কোড চান', 'அழைப்பு மட்டும்: தலைவரிடம் குறியீடு கேளுங்கள்', '仅限邀请：向负责人索取邀请码', 'Jemputan sahaja: minta kod daripada ketua'],
  no_results: ['No communities match. Try other words.', 'कोई समुदाय नहीं मिला। दूसरे शब्द आज़माएँ।', 'কোনো কমিউনিটি মেলেনি। অন্য শব্দ চেষ্টা করুন।', 'எந்தச் சமூகமும் பொருந்தவில்லை. வேறு சொற்களை முயலுங்கள்.', '没有匹配的社区，请换个词试试。', 'Tiada komuniti sepadan. Cuba perkataan lain.'],
  family_here_n: ['{n} of your family are here', 'आपके परिवार के {n} लोग यहाँ हैं', 'আপনার পরিবারের {n} জন এখানে আছেন', 'உங்கள் குடும்பத்தில் {n} பேர் இங்கே உள்ளனர்', '你的家人中有 {n} 人在这里', '{n} ahli keluarga anda ada di sini'],
  joined_ok: ['You joined {name}.', 'आप {name} से जुड़ गए।', 'আপনি {name}-এ যোগ দিয়েছেন।', 'நீங்கள் {name} இல் சேர்ந்தீர்கள்.', '你已加入 {name}。', 'Anda telah menyertai {name}.'],
  left_ok: ['You left {name}.', 'आपने {name} छोड़ दिया।', 'আপনি {name} ছেড়ে গেছেন।', 'நீங்கள் {name} ஐ விட்டு விலகினீர்கள்.', '你已退出 {name}。', 'Anda telah meninggalkan {name}.'],
  err_limit: ['You are already in three communities. Leave one first.', 'आप पहले से तीन समुदायों में हैं। पहले एक छोड़ें।', 'আপনি ইতিমধ্যে তিনটি কমিউনিটিতে আছেন। আগে একটি ছাড়ুন।', 'நீங்கள் ஏற்கனவே மூன்று சமூகங்களில் உள்ளீர்கள். முதலில் ஒன்றை விடுங்கள்.', '你已在三个社区中。请先退出一个。', 'Anda sudah dalam tiga komuniti. Tinggalkan satu dahulu.'],
  err_invite: ['This community is invite only. Ask a leader for the code.', 'यह समुदाय सिर्फ़ आमंत्रण से है। नेता से कोड माँगें।', 'এই কমিউনিটি শুধু আমন্ত্রণে। নেতার কাছে কোড চান।', 'இந்தச் சமூகம் அழைப்பு மட்டும். தலைவரிடம் குறியீடு கேளுங்கள்.', '此社区仅限邀请。请向负责人索取邀请码。', 'Komuniti ini untuk jemputan sahaja. Minta kod daripada ketua.'],
  err_last_lead: ['You are the only leader. Hand over the lead before you leave.', 'आप अकेले नेता हैं। छोड़ने से पहले नेतृत्व सौंपें।', 'আপনিই একমাত্র নেতা। ছাড়ার আগে নেতৃত্ব হস্তান্তর করুন।', 'நீங்கள் ஒரே தலைவர். விலகும் முன் தலைமையை ஒப்படையுங்கள்.', '你是唯一的负责人。离开前请先移交。', 'Anda satu-satunya ketua. Serahkan kepimpinan sebelum keluar.'],
  leave_first: ['Leave one community first', 'पहले एक समुदाय छोड़ें', 'আগে একটি কমিউনিটি ছাড়ুন', 'முதலில் ஒரு சமூகத்தை விடுங்கள்', '请先退出一个社区', 'Tinggalkan satu komuniti dahulu'],
  none_body: ['Explore the open communities, or join one with a code from a leader.', 'खुले समुदाय देखें, या नेता से मिले कोड से जुड़ें।', 'খোলা কমিউনিটি দেখুন, অথবা নেতার কোড দিয়ে যোগ দিন।', 'திறந்த சமூகங்களைப் பாருங்கள், அல்லது தலைவரின் குறியீட்டுடன் சேருங்கள்.', '浏览开放的社区，或用负责人给的邀请码加入。', 'Teroka komuniti terbuka, atau sertai dengan kod daripada ketua.'],
  err_failed: ['Something went wrong. Please try again.', 'कुछ गड़बड़ हुई। फिर कोशिश करें।', 'কিছু ভুল হয়েছে। আবার চেষ্টা করুন।', 'ஏதோ தவறு நடந்தது. மீண்டும் முயலுங்கள்.', '出了点问题，请重试。', 'Sesuatu tidak kena. Sila cuba lagi.'],
  leave_c: ['Leave this community', 'यह समुदाय छोड़ें', 'এই কমিউনিটি ছাড়ুন', 'இந்தச் சமூகத்தை விட்டு விலகு', '退出此社区', 'Tinggalkan komuniti ini'],
  // family here + sharing
  family_here_title: ['Your family here', 'यहाँ आपका परिवार', 'এখানে আপনার পরিবার', 'இங்கே உங்கள் குடும்பம்', '这里的家人', 'Keluarga anda di sini'],
  share_label: ['Let my family see I am here', 'मेरे परिवार को दिखने दें कि मैं यहाँ हूँ', 'আমার পরিবারকে দেখতে দিন যে আমি এখানে আছি', 'நான் இங்கே இருப்பதை என் குடும்பம் பார்க்கட்டும்', '让我的家人看到我在这里', 'Benarkan keluarga saya nampak saya di sini'],
  share_on: ['Your family can see that you are in this community.', 'आपका परिवार देख सकता है कि आप इस समुदाय में हैं।', 'আপনার পরিবার দেখতে পারে যে আপনি এই কমিউনিটিতে আছেন।', 'நீங்கள் இந்தச் சமூகத்தில் இருப்பதை உங்கள் குடும்பம் பார்க்கலாம்.', '你的家人可以看到你在这个社区。', 'Keluarga anda boleh nampak anda dalam komuniti ini.'],
  share_off: ['Only you know you are here. Family cannot see it.', 'सिर्फ़ आप जानते हैं कि आप यहाँ हैं। परिवार नहीं देख सकता।', 'শুধু আপনি জানেন আপনি এখানে আছেন। পরিবার দেখতে পায় না।', 'நீங்கள் இங்கே இருப்பது உங்களுக்கு மட்டுமே தெரியும். குடும்பம் பார்க்க முடியாது.', '只有你知道你在这里，家人看不到。', 'Hanya anda tahu anda di sini. Keluarga tidak nampak.'],
  stalls_link: ['Market stalls', 'बाज़ार के स्टॉल', 'বাজারের স্টল', 'சந்தைக் கடைகள்', '集市摊位', 'Gerai pasar'],
  // asking to start one
  h_request: ['Ask to start a community', 'समुदाय शुरू करने का अनुरोध करें', 'কমিউনিটি শুরুর অনুরোধ করুন', 'சமூகத்தைத் தொடங்கக் கேள்', '申请创建社区', 'Mohon memulakan komuniti'],
  req_intro: ['Communities are few and well looked after, so the Wisdom team approves each new one.', 'समुदाय कम हैं और उनकी अच्छी देखभाल होती है, इसलिए हर नया समुदाय Wisdom टीम मंज़ूर करती है।', 'কমিউনিটি কম এবং যত্নে রাখা হয়, তাই প্রতিটি নতুনটি Wisdom দল অনুমোদন করে।', 'சமூகங்கள் குறைவு, நன்கு பராமரிக்கப்படுகின்றன; எனவே ஒவ்வொரு புதியதையும் Wisdom குழு அங்கீகரிக்கிறது.', '社区数量不多、悉心维护，所以每个新社区都由 Wisdom 团队批准。', 'Komuniti sedikit tetapi dijaga baik, jadi pasukan Wisdom meluluskan setiap yang baharu.'],
  exp_title: ['Your experience', 'आपका अनुभव', 'আপনার অভিজ্ঞতা', 'உங்கள் அனுபவம்', '你的经验', 'Pengalaman anda'],
  exp_days: ['In a community for {n} of {need} days', 'समुदाय में {need} में से {n} दिन', 'কমিউনিটিতে {need} দিনের মধ্যে {n} দিন', 'சமூகத்தில் {need} இல் {n} நாட்கள்', '已加入社区 {n} / {need} 天', 'Dalam komuniti {n} daripada {need} hari'],
  exp_events: ['Events you went to: {n} of {need}', 'आप जिन आयोजनों में गए: {need} में से {n}', 'আপনি যে অনুষ্ঠানে গেছেন: {need}টির মধ্যে {n}টি', 'நீங்கள் சென்ற நிகழ்வுகள்: {need} இல் {n}', '你参加的活动：{n} / {need}', 'Acara yang anda hadiri: {n} daripada {need}'],
  exp_lead: ['You already lead a community, so you can ask.', 'आप पहले से एक समुदाय के नेता हैं, इसलिए अनुरोध कर सकते हैं।', 'আপনি ইতিমধ্যে একটি কমিউনিটির নেতা, তাই অনুরোধ করতে পারেন।', 'நீங்கள் ஏற்கனவே ஒரு சமூகத்தை வழிநடத்துகிறீர்கள், எனவே கேட்கலாம்.', '你已经是社区负责人，可以提出申请。', 'Anda sudah mengetuai satu komuniti, jadi anda boleh memohon.'],
  not_eligible: ['First join a community and go to a few events. Then you can ask. Come back soon.', 'पहले किसी समुदाय से जुड़ें और कुछ आयोजनों में जाएँ। फिर आप अनुरोध कर सकते हैं। जल्द लौटें।', 'আগে একটি কমিউনিটিতে যোগ দিন এবং কয়েকটি অনুষ্ঠানে যান। তারপর অনুরোধ করতে পারবেন। শীঘ্রই ফিরে আসুন।', 'முதலில் ஒரு சமூகத்தில் சேர்ந்து சில நிகழ்வுகளுக்குச் செல்லுங்கள். பிறகு கேட்கலாம். விரைவில் வாருங்கள்.', '请先加入一个社区并参加几次活动，然后即可申请。欢迎很快回来。', 'Sertai komuniti dahulu dan hadiri beberapa acara. Kemudian anda boleh memohon. Datang semula nanti.'],
  r_name: ['Name of the community', 'समुदाय का नाम', 'কমিউনিটির নাম', 'சமூகத்தின் பெயர்', '社区名称', 'Nama komuniti'],
  r_kind: ['What kind is it?', 'यह किस प्रकार का है?', 'এটি কী ধরনের?', 'இது எந்த வகை?', '是哪一类？', 'Jenis apakah ini?'],
  r_area: ['Where is it (area)?', 'यह कहाँ है (इलाका)?', 'এটি কোথায় (এলাকা)?', 'இது எங்கே (பகுதி)?', '在哪里（区域）？', 'Di mana (kawasan)?'],
  r_about: ['What will you do together?', 'आप साथ मिलकर क्या करेंगे?', 'আপনারা একসঙ্গে কী করবেন?', 'நீங்கள் சேர்ந்து என்ன செய்வீர்கள்?', '你们会一起做什么？', 'Apa yang akan anda lakukan bersama?'],
  r_why: ['Why would it thrive? Who would come?', 'यह क्यों फलेगा-फूलेगा? कौन आएगा?', 'এটি কেন সফল হবে? কারা আসবেন?', 'இது ஏன் செழிக்கும்? யார் வருவார்கள்?', '为什么会兴旺？会有谁来？', 'Mengapa ia akan maju? Siapa akan datang?'],
  send_req: ['Send my request', 'मेरा अनुरोध भेजें', 'আমার অনুরোধ পাঠান', 'என் கோரிக்கையை அனுப்பு', '发送我的申请', 'Hantar permohonan saya'],
  req_sent: ['Request sent. The Wisdom team will look at it.', 'अनुरोध भेजा गया। Wisdom टीम इसे देखेगी।', 'অনুরোধ পাঠানো হয়েছে। Wisdom দল এটি দেখবে।', 'கோரிக்கை அனுப்பப்பட்டது. Wisdom குழு பார்க்கும்.', '申请已发送，Wisdom 团队会审核。', 'Permohonan dihantar. Pasukan Wisdom akan menyemaknya.'],
  my_requests: ['My requests', 'मेरे अनुरोध', 'আমার অনুরোধ', 'என் கோரிக்கைகள்', '我的申请', 'Permohonan saya'],
  st_pending: ['Waiting for the Wisdom team', 'Wisdom टीम की प्रतीक्षा', 'Wisdom দলের অপেক্ষায়', 'Wisdom குழுவுக்காகக் காத்திருக்கிறது', '等待 Wisdom 团队', 'Menunggu pasukan Wisdom'],
  st_approved: ['Approved', 'मंज़ूर', 'অনুমোদিত', 'அங்கீகரிக்கப்பட்டது', '已批准', 'Diluluskan'],
  st_declined: ['Not approved', 'मंज़ूर नहीं', 'অনুমোদিত হয়নি', 'அங்கீகரிக்கப்படவில்லை', '未批准', 'Tidak diluluskan'],
  st_used: ['Created', 'बन गया', 'তৈরি হয়েছে', 'உருவாக்கப்பட்டது', '已创建', 'Telah dicipta'],
  create_now: ['Create it now', 'अभी बनाएँ', 'এখনই তৈরি করুন', 'இப்போதே உருவாக்கு', '立即创建', 'Cipta sekarang'],
  review_link: ['Review requests (Wisdom team)', 'अनुरोध देखें (Wisdom टीम)', 'অনুরোধ দেখুন (Wisdom দল)', 'கோரிக்கைகளைப் பார் (Wisdom குழு)', '审核申请（Wisdom 团队）', 'Semak permohonan (pasukan Wisdom)'],
  err_already_open: ['You already have a request open.', 'आपका एक अनुरोध पहले से खुला है।', 'আপনার একটি অনুরোধ ইতিমধ্যে খোলা আছে।', 'உங்களிடம் ஏற்கனவே ஒரு கோரிக்கை உள்ளது.', '你已有一个未处理的申请。', 'Anda sudah mempunyai satu permohonan terbuka.'],
  err_need_name: ['Please give the community a name.', 'कृपया समुदाय का नाम लिखें।', 'অনুগ্রহ করে কমিউনিটির একটি নাম দিন।', 'சமூகத்திற்கு ஒரு பெயர் கொடுங்கள்.', '请给社区起个名字。', 'Sila beri nama kepada komuniti.'],
  // review (the Wisdom team)
  h_review: ['Requests to start a community', 'समुदाय शुरू करने के अनुरोध', 'কমিউনিটি শুরুর অনুরোধ', 'சமூகம் தொடங்கும் கோரிக்கைகள்', '创建社区的申请', 'Permohonan memulakan komuniti'],
  approve: ['Approve', 'मंज़ूर करें', 'অনুমোদন করুন', 'அங்கீகரி', '批准', 'Lulus'],
  decline: ['Decline', 'अस्वीकार करें', 'প্রত্যাখ্যান করুন', 'நிராகரி', '拒绝', 'Tolak'],
  no_requests: ['No requests waiting.', 'कोई अनुरोध प्रतीक्षा में नहीं।', 'কোনো অনুরোধ অপেক্ষায় নেই।', 'காத்திருக்கும் கோரிக்கைகள் இல்லை.', '没有待处理的申请。', 'Tiada permohonan menunggu.'],
  from_name: ['From {name}', '{name} की ओर से', '{name} এর পক্ষ থেকে', '{name} இடமிருந்து', '来自 {name}', 'Daripada {name}'],
  k_apartment: ['Apartment', 'अपार्टमेंट', 'অ্যাপার্টমেন্ট', 'அடுக்குமாடி', '公寓', 'Pangsapuri'],
  k_block: ['Block', 'ब्लॉक', 'ব্লক', 'தொகுதி', '组屋楼', 'Blok'],
  k_neighbourhood: ['Neighbourhood', 'मोहल्ला', 'পাড়া', 'சுற்றுப்புறம்', '邻里', 'Kejiranan'],
  k_club: ['Club or interest group', 'क्लब या रुचि समूह', 'ক্লাব বা আগ্রহের দল', 'கழகம் அல்லது ஆர்வக் குழு', '俱乐部或兴趣小组', 'Kelab atau kumpulan minat'],
  k_other: ['Something else', 'कुछ और', 'অন্য কিছু', 'வேறு ஏதாவது', '其他', 'Lain-lain'],
};

// The words also live under the plain prefix "rules", so the older community screens can say them with t('rules.family_here_title').
registerStrings('rules', pageWords(R));

export const EXPLORE_ALIASES = { heading: 'h_explore', search: 'search_c' } as const;
export const REVIEW_ALIASES = { heading: 'h_review' } as const;
export const INDEX_EXTRA_ALIASES = { explore: 'explore', limitInfo: 'slots_used', askStart: 'ask_start', joinOrCreate: 'have_code', noCommunityBody: 'none_body' } as const;
export const REQUEST_ALIASES = {
  createTitle: 'h_request',
  createIntro: 'req_intro',
  name: 'r_name',
  kind: 'r_kind',
  area: 'r_area',
  about: 'r_about',
  why: 'r_why',
  createButton: 'send_req',
  reviewLink: 'review_link',
  apartment: 'k_apartment',
  block: 'k_block',
  neighbourhood: 'k_neighbourhood',
  club: 'k_club',
  other: 'k_other',
} as const;
