import type { PageStrings } from '../../navigation/types';

// The words of the five built Grow pages, in one place. Each page takes the shared words plus its own `heading` (see `pageStrings`).
// First drafts by an AI assistant; native-speaker review needed for hi, bn, ta, zh, ms.
const W: PageStrings = {
  en: {
    streakLabel: 'Days in a row', h_aspirations: 'Aspirations', h_health: 'Health', h_activity: 'Activity', h_progress: 'My Progress', h_contributions: 'My Contributions',
    asp_intro: "It's never too late to pursue what you love.", health_intro: 'What you record is private to you. This is not medical advice.', act_intro: 'Move, walk and stay active.', prog_intro: "You're making great progress. Go at your own pace.", contrib_intro: 'What you have given to your communities.',
    cat_travel: 'Travel and Explore', cat_hobby: 'Take Up a Hobby', cat_health: 'Stay Healthy and Active', cat_family: 'Spend Time with Family', cat_own: 'Something of My Own',
    add: 'Add an Aspiration', addTitle: 'What would you like to do?', save: 'Save', cancel: 'Cancel', remove: 'Remove', soon: 'Coming soon', kindOf: 'Kind', soonTitle: 'Something crazy is coming to Health', soonBody: 'Our teammate Sayan Ghosh is building a live, real-time AI trainer, and it is seriously impressive. It will coach your exercise, watch how you move and keep you safe. Watch this space: it is going live soon.', markDone: 'Mark as done', done: 'Done', empty: 'Nothing here yet.',
    overview: 'Overview', records: 'Records', heart_rate: 'Heart rate', sleep_hours: 'Sleep', weight_kg: 'Weight', blood_pressure: 'Blood pressure',
    u_heart_rate: 'bpm', u_sleep_hours: 'h', u_weight_kg: 'kg', u_blood_pressure: 'mmHg', noReading: 'Add', addReading: 'Add a reading', top: 'Top number', bottom: 'Bottom number', value: 'Value',
    thisWeek: 'This week', minutesUnit: '{n} min', streak: 'Days in a row: {n}', walk: 'Walk', jog: 'Jog', yoga: 'Yoga', exercise: 'Exercise', other: 'Other', minutes: 'Minutes', logActivity: 'Add activity', recent: 'Recent',
    p_activity: 'Activity this week: {n} min', p_health: 'Health readings this month: {n}', p_aspirations: 'Aspirations done: {done} of {total}', p_explore: 'Explore: {started} started, {completed} completed', p_contributions: 'Contributions: {n} ({h} hours)', keepGoing: 'Keep going. Every small step counts.',
    total: 'Contributions', hours: 'Hours', communities: 'Communities', log: 'Add a contribution', whichCommunity: 'Which community', kind_time: 'Time', kind_skill: 'Skill', kind_goods: 'Goods', kind_money: 'Money', whatDid: 'What did you do?', hoursOpt: 'Hours (optional)', noCommunity: 'Join a community first to record a contribution.',
    tryAgain: 'Try again', notFound: 'This could not be opened.', failed: 'Could not save. Please try again.', saved: 'Saved',
  },
  hi: {
    streakLabel: 'लगातार दिन', h_aspirations: 'आकांक्षाएँ', h_health: 'स्वास्थ्य', h_activity: 'गतिविधि', h_progress: 'मेरी प्रगति', h_contributions: 'मेरा योगदान',
    asp_intro: 'जो पसंद है उसे करने में कभी देर नहीं होती।', health_intro: 'जो आप दर्ज करते हैं वह सिर्फ़ आपका है। यह चिकित्सा सलाह नहीं है।', act_intro: 'चलें, टहलें और सक्रिय रहें।', prog_intro: 'आप बहुत अच्छा कर रहे हैं। अपनी रफ़्तार से चलें।', contrib_intro: 'आपने अपने समुदायों को क्या दिया।',
    cat_travel: 'यात्रा और खोज', cat_hobby: 'कोई शौक अपनाएँ', cat_health: 'स्वस्थ और सक्रिय रहें', cat_family: 'परिवार के साथ समय', cat_own: 'मेरा अपना कुछ',
    add: 'आकांक्षा जोड़ें', addTitle: 'आप क्या करना चाहेंगे?', save: 'सहेजें', cancel: 'रद्द करें', remove: 'हटाएँ', soon: 'जल्द आ रहा है', kindOf: 'प्रकार', soonTitle: 'सेहत में कुछ ज़बरदस्त आ रहा है', soonBody: 'हमारे साथी सायन घोष एक लाइव, रियल-टाइम एआई ट्रेनर बना रहे हैं, और यह कमाल का है। वह आपकी कसरत में कोचिंग देगा, आपकी चाल पर नज़र रखेगा और आपको सुरक्षित रखेगा। नज़र बनाए रखें: यह जल्द लाइव होगा।', markDone: 'पूरा हुआ', done: 'पूरा', empty: 'अभी यहाँ कुछ नहीं है।',
    overview: 'सारांश', records: 'रिकॉर्ड', heart_rate: 'हृदय गति', sleep_hours: 'नींद', weight_kg: 'वज़न', blood_pressure: 'रक्तचाप',
    u_heart_rate: 'धड़कन/मिनट', u_sleep_hours: 'घंटे', u_weight_kg: 'किग्रा', u_blood_pressure: 'mmHg', noReading: 'जोड़ें', addReading: 'माप जोड़ें', top: 'ऊपर की संख्या', bottom: 'नीचे की संख्या', value: 'मान',
    thisWeek: 'इस सप्ताह', minutesUnit: '{n} मिनट', streak: 'लगातार दिन: {n}', walk: 'सैर', jog: 'जॉगिंग', yoga: 'योग', exercise: 'व्यायाम', other: 'अन्य', minutes: 'मिनट', logActivity: 'गतिविधि जोड़ें', recent: 'हाल की',
    p_activity: 'इस सप्ताह गतिविधि: {n} मिनट', p_health: 'इस माह स्वास्थ्य माप: {n}', p_aspirations: 'पूरी आकांक्षाएँ: {total} में से {done}', p_explore: 'खोज: {started} शुरू, {completed} पूरे', p_contributions: 'योगदान: {n} ({h} घंटे)', keepGoing: 'चलते रहिए। हर छोटा क़दम मायने रखता है।',
    total: 'योगदान', hours: 'घंटे', communities: 'समुदाय', log: 'योगदान जोड़ें', whichCommunity: 'कौन सा समुदाय', kind_time: 'समय', kind_skill: 'हुनर', kind_goods: 'सामान', kind_money: 'धन', whatDid: 'आपने क्या किया?', hoursOpt: 'घंटे (वैकल्पिक)', noCommunity: 'योगदान दर्ज करने के लिए पहले किसी समुदाय से जुड़ें।',
    tryAgain: 'फिर कोशिश करें', notFound: 'यह खुल नहीं सका।', failed: 'सहेजा नहीं जा सका। फिर कोशिश करें।', saved: 'सहेजा गया',
  },
  bn: {
    streakLabel: 'টানা দিন', h_aspirations: 'আকাঙ্ক্ষা', h_health: 'স্বাস্থ্য', h_activity: 'কার্যকলাপ', h_progress: 'আমার অগ্রগতি', h_contributions: 'আমার অবদান',
    asp_intro: 'যা ভালোবাসেন তা করতে কখনও দেরি হয় না।', health_intro: 'আপনি যা লেখেন তা শুধু আপনার। এটি চিকিৎসা পরামর্শ নয়।', act_intro: 'হাঁটুন, চলুন, সক্রিয় থাকুন।', prog_intro: 'আপনি দারুণ এগোচ্ছেন। নিজের গতিতে চলুন।', contrib_intro: 'আপনি আপনার কমিউনিটিকে যা দিয়েছেন।',
    cat_travel: 'ভ্রমণ ও আবিষ্কার', cat_hobby: 'একটি শখ শুরু করুন', cat_health: 'সুস্থ ও সক্রিয় থাকুন', cat_family: 'পরিবারের সঙ্গে সময়', cat_own: 'আমার নিজের কিছু',
    add: 'আকাঙ্ক্ষা যোগ করুন', addTitle: 'আপনি কী করতে চান?', save: 'সংরক্ষণ', cancel: 'বাতিল', remove: 'মুছুন', soon: 'শীঘ্রই আসছে', kindOf: 'ধরন', soonTitle: 'স্বাস্থ্যে দারুণ কিছু আসছে', soonBody: 'আমাদের সহকর্মী সায়ন ঘোষ একটি লাইভ, রিয়েল-টাইম এআই ট্রেনার বানাচ্ছেন, এবং এটা সত্যিই দারুণ। সে আপনার ব্যায়ামে কোচিং দেবে, আপনার নড়াচড়া দেখবে এবং আপনাকে নিরাপদ রাখবে। চোখ রাখুন: শীঘ্রই লাইভ হচ্ছে।', markDone: 'শেষ হয়েছে', done: 'শেষ', empty: 'এখনও কিছু নেই।',
    overview: 'সারসংক্ষেপ', records: 'রেকর্ড', heart_rate: 'হৃদস্পন্দন', sleep_hours: 'ঘুম', weight_kg: 'ওজন', blood_pressure: 'রক্তচাপ',
    u_heart_rate: 'বিপিএম', u_sleep_hours: 'ঘণ্টা', u_weight_kg: 'কেজি', u_blood_pressure: 'mmHg', noReading: 'যোগ করুন', addReading: 'মাপ যোগ করুন', top: 'ওপরের সংখ্যা', bottom: 'নিচের সংখ্যা', value: 'মান',
    thisWeek: 'এই সপ্তাহ', minutesUnit: '{n} মিনিট', streak: 'টানা দিন: {n}', walk: 'হাঁটা', jog: 'জগিং', yoga: 'যোগব্যায়াম', exercise: 'ব্যায়াম', other: 'অন্যান্য', minutes: 'মিনিট', logActivity: 'কার্যকলাপ যোগ করুন', recent: 'সাম্প্রতিক',
    p_activity: 'এই সপ্তাহে কার্যকলাপ: {n} মিনিট', p_health: 'এই মাসে স্বাস্থ্য মাপ: {n}', p_aspirations: 'পূর্ণ আকাঙ্ক্ষা: {total}-এর মধ্যে {done}', p_explore: 'আবিষ্কার: {started} শুরু, {completed} শেষ', p_contributions: 'অবদান: {n} ({h} ঘণ্টা)', keepGoing: 'এগিয়ে চলুন। প্রতিটি ছোট পদক্ষেপ গুরুত্বপূর্ণ।',
    total: 'অবদান', hours: 'ঘণ্টা', communities: 'কমিউনিটি', log: 'অবদান যোগ করুন', whichCommunity: 'কোন কমিউনিটি', kind_time: 'সময়', kind_skill: 'দক্ষতা', kind_goods: 'জিনিস', kind_money: 'অর্থ', whatDid: 'আপনি কী করেছেন?', hoursOpt: 'ঘণ্টা (ঐচ্ছিক)', noCommunity: 'অবদান লিখতে আগে একটি কমিউনিটিতে যোগ দিন।',
    tryAgain: 'আবার চেষ্টা করুন', notFound: 'এটি খোলা যায়নি।', failed: 'সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।', saved: 'সংরক্ষিত',
  },
  ta: {
    streakLabel: 'தொடர்ந்த நாட்கள்', h_aspirations: 'லட்சியங்கள்', h_health: 'ஆரோக்கியம்', h_activity: 'செயல்பாடு', h_progress: 'என் முன்னேற்றம்', h_contributions: 'என் பங்களிப்பு',
    asp_intro: 'விரும்பியதைச் செய்ய ஒருபோதும் தாமதமில்லை.', health_intro: 'நீங்கள் பதிவு செய்வது உங்களுக்கு மட்டுமே. இது மருத்துவ ஆலோசனை அல்ல.', act_intro: 'நடங்கள், சுறுசுறுப்பாக இருங்கள்.', prog_intro: 'நீங்கள் நன்றாக முன்னேறுகிறீர்கள். உங்கள் வேகத்தில் செல்லுங்கள்.', contrib_intro: 'உங்கள் சமூகங்களுக்கு நீங்கள் கொடுத்தவை.',
    cat_travel: 'பயணமும் ஆராய்வும்', cat_hobby: 'ஒரு பொழுதுபோக்கு', cat_health: 'நலமாகவும் சுறுசுறுப்பாகவும்', cat_family: 'குடும்பத்துடன் நேரம்', cat_own: 'எனக்கே உரியது',
    add: 'லட்சியம் சேர்', addTitle: 'நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?', save: 'சேமி', cancel: 'ரத்து', remove: 'நீக்கு', soon: 'விரைவில் வருகிறது', kindOf: 'வகை', soonTitle: 'ஆரோக்கியத்தில் அசத்தலான ஒன்று வருகிறது', soonBody: 'எங்கள் தோழர் சயன் கோஷ் ஒரு நேரடி, நிகழ்நேர AI பயிற்சியாளரை உருவாக்குகிறார், அது உண்மையிலேயே அசத்தலானது. அது உங்கள் உடற்பயிற்சிக்குப் பயிற்சி அளித்து, உங்கள் அசைவுகளைக் கவனித்து, உங்களைப் பாதுகாப்பாக வைத்திருக்கும். காத்திருங்கள்: விரைவில் நேரலைக்கு வரும்.', markDone: 'முடிந்தது', done: 'முடிந்தது', empty: 'இன்னும் எதுவும் இல்லை.',
    overview: 'சுருக்கம்', records: 'பதிவுகள்', heart_rate: 'இதயத் துடிப்பு', sleep_hours: 'தூக்கம்', weight_kg: 'எடை', blood_pressure: 'இரத்த அழுத்தம்',
    u_heart_rate: 'துடிப்பு/நிமி', u_sleep_hours: 'மணி', u_weight_kg: 'கிகி', u_blood_pressure: 'mmHg', noReading: 'சேர்', addReading: 'அளவு சேர்', top: 'மேல் எண்', bottom: 'கீழ் எண்', value: 'மதிப்பு',
    thisWeek: 'இந்த வாரம்', minutesUnit: '{n} நிமி', streak: 'தொடர்ந்த நாட்கள்: {n}', walk: 'நடை', jog: 'ஓட்டம்', yoga: 'யோகா', exercise: 'உடற்பயிற்சி', other: 'மற்றவை', minutes: 'நிமிடங்கள்', logActivity: 'செயல்பாடு சேர்', recent: 'சமீபத்தியவை',
    p_activity: 'இந்த வாரச் செயல்பாடு: {n} நிமி', p_health: 'இந்த மாத ஆரோக்கிய அளவுகள்: {n}', p_aspirations: 'முடிந்த லட்சியங்கள்: {total} இல் {done}', p_explore: 'ஆராய்வு: {started} தொடக்கம், {completed} முடிந்தது', p_contributions: 'பங்களிப்புகள்: {n} ({h} மணி)', keepGoing: 'தொடருங்கள். ஒவ்வொரு சிறிய படியும் முக்கியம்.',
    total: 'பங்களிப்புகள்', hours: 'மணி', communities: 'சமூகங்கள்', log: 'பங்களிப்பு சேர்', whichCommunity: 'எந்தச் சமூகம்', kind_time: 'நேரம்', kind_skill: 'திறன்', kind_goods: 'பொருள்', kind_money: 'பணம்', whatDid: 'என்ன செய்தீர்கள்?', hoursOpt: 'மணி (விருப்பம்)', noCommunity: 'பங்களிப்பைப் பதிவு செய்ய முதலில் ஒரு சமூகத்தில் சேருங்கள்.',
    tryAgain: 'மீண்டும் முயலவும்', notFound: 'இதைத் திறக்க முடியவில்லை.', failed: 'சேமிக்க முடியவில்லை. மீண்டும் முயலவும்.', saved: 'சேமிக்கப்பட்டது',
  },
  zh: {
    streakLabel: '连续天数', h_aspirations: '心愿', h_health: '健康', h_activity: '活动', h_progress: '我的进展', h_contributions: '我的贡献',
    asp_intro: '追求所爱，永远不晚。', health_intro: '你记录的内容只有你自己能看到。这不是医疗建议。', act_intro: '多走动，保持活力。', prog_intro: '你做得很好。按自己的节奏来。', contrib_intro: '你为社区所做的付出。',
    cat_travel: '旅行与探索', cat_hobby: '培养一项爱好', cat_health: '保持健康与活力', cat_family: '陪伴家人', cat_own: '属于我自己的事',
    add: '添加心愿', addTitle: '你想做什么？', save: '保存', cancel: '取消', remove: '删除', soon: '即将推出', kindOf: '类型', soonTitle: '健康板块即将有重磅功能', soonBody: '我们的队友 Sayan Ghosh 正在打造实时在线的 AI 教练，真的非常厉害。它会指导您锻炼、观察您的动作并保障安全。敬请期待，很快上线。', markDone: '标记完成', done: '已完成', empty: '这里还没有内容。',
    overview: '概览', records: '记录', heart_rate: '心率', sleep_hours: '睡眠', weight_kg: '体重', blood_pressure: '血压',
    u_heart_rate: '次/分', u_sleep_hours: '小时', u_weight_kg: '公斤', u_blood_pressure: 'mmHg', noReading: '添加', addReading: '添加记录', top: '高压', bottom: '低压', value: '数值',
    thisWeek: '本周', minutesUnit: '{n} 分钟', streak: '连续天数：{n}', walk: '散步', jog: '慢跑', yoga: '瑜伽', exercise: '锻炼', other: '其他', minutes: '分钟', logActivity: '添加活动', recent: '最近',
    p_activity: '本周活动：{n} 分钟', p_health: '本月健康记录：{n}', p_aspirations: '已完成心愿：{done} / {total}', p_explore: '探索：已开始 {started}，已完成 {completed}', p_contributions: '贡献：{n} 次（{h} 小时）', keepGoing: '继续加油，每一小步都有意义。',
    total: '贡献', hours: '小时', communities: '社区', log: '添加贡献', whichCommunity: '哪个社区', kind_time: '时间', kind_skill: '技能', kind_goods: '物品', kind_money: '资金', whatDid: '你做了什么？', hoursOpt: '小时（可选）', noCommunity: '请先加入一个社区，再记录贡献。',
    tryAgain: '重试', notFound: '无法打开。', failed: '无法保存，请重试。', saved: '已保存',
  },
  ms: {
    streakLabel: 'Hari berturut-turut', h_aspirations: 'Impian', h_health: 'Kesihatan', h_activity: 'Aktiviti', h_progress: 'Kemajuan Saya', h_contributions: 'Sumbangan Saya',
    asp_intro: 'Tidak pernah terlambat untuk mengejar apa yang anda suka.', health_intro: 'Apa yang anda catat hanya untuk anda. Ini bukan nasihat perubatan.', act_intro: 'Bergerak, berjalan dan kekal aktif.', prog_intro: 'Anda maju dengan baik. Ikut rentak anda sendiri.', contrib_intro: 'Apa yang telah anda berikan kepada komuniti anda.',
    cat_travel: 'Melancong dan Meneroka', cat_hobby: 'Mulakan Hobi', cat_health: 'Kekal Sihat dan Aktif', cat_family: 'Luangkan Masa dengan Keluarga', cat_own: 'Sesuatu Milik Saya',
    add: 'Tambah Impian', addTitle: 'Apa yang anda mahu lakukan?', save: 'Simpan', cancel: 'Batal', remove: 'Buang', soon: 'Akan datang', kindOf: 'Jenis', soonTitle: 'Sesuatu yang hebat akan tiba di Kesihatan', soonBody: 'Rakan sepasukan kami Sayan Ghosh sedang membina jurulatih AI langsung masa nyata, dan ia sangat mengagumkan. Ia akan melatih senaman anda, memerhati pergerakan anda dan memastikan anda selamat. Nantikan: ia akan dilancarkan tidak lama lagi.', markDone: 'Tandakan siap', done: 'Siap', empty: 'Belum ada apa-apa di sini.',
    overview: 'Ringkasan', records: 'Rekod', heart_rate: 'Kadar jantung', sleep_hours: 'Tidur', weight_kg: 'Berat', blood_pressure: 'Tekanan darah',
    u_heart_rate: 'bpm', u_sleep_hours: 'j', u_weight_kg: 'kg', u_blood_pressure: 'mmHg', noReading: 'Tambah', addReading: 'Tambah bacaan', top: 'Nombor atas', bottom: 'Nombor bawah', value: 'Nilai',
    thisWeek: 'Minggu ini', minutesUnit: '{n} min', streak: 'Hari berturut-turut: {n}', walk: 'Berjalan', jog: 'Berjoging', yoga: 'Yoga', exercise: 'Senaman', other: 'Lain-lain', minutes: 'Minit', logActivity: 'Tambah aktiviti', recent: 'Terkini',
    p_activity: 'Aktiviti minggu ini: {n} min', p_health: 'Bacaan kesihatan bulan ini: {n}', p_aspirations: 'Impian tercapai: {done} daripada {total}', p_explore: 'Teroka: {started} dimulakan, {completed} selesai', p_contributions: 'Sumbangan: {n} ({h} jam)', keepGoing: 'Teruskan. Setiap langkah kecil bermakna.',
    total: 'Sumbangan', hours: 'Jam', communities: 'Komuniti', log: 'Tambah sumbangan', whichCommunity: 'Komuniti mana', kind_time: 'Masa', kind_skill: 'Kemahiran', kind_goods: 'Barang', kind_money: 'Wang', whatDid: 'Apa yang anda lakukan?', hoursOpt: 'Jam (pilihan)', noCommunity: 'Sertai komuniti dahulu untuk mencatat sumbangan.',
    tryAgain: 'Cuba lagi', notFound: 'Ini tidak dapat dibuka.', failed: 'Tidak dapat disimpan. Sila cuba lagi.', saved: 'Disimpan',
  },
};

/** The shared words plus this page's own `heading` (taken from the word `headingKey`, for example 'h_health'). */
export function pageStrings(headingKey: string): PageStrings {
  const out: PageStrings = {};
  for (const [lang, words] of Object.entries(W)) out[lang as keyof PageStrings] = { ...words, heading: words[headingKey], saveAsp: words.save, saveReading: words.save, saveActivity: words.save, saveContribution: words.save };
  return out;
}
