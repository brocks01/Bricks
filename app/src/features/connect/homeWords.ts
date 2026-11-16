import { type WordTable } from '../../i18n/words';

// Words for the simple Communities home. Order: English, Hindi, Bengali, Tamil, Chinese, Malay. First drafts; native-speaker review needed.
export const HOME_C: WordTable = {
  c_morning: ['Good morning, {name}', 'सुप्रभात, {name}', 'সুপ্রভাত, {name}', 'காலை வணக்கம், {name}', '早上好，{name}', 'Selamat pagi, {name}'],
  c_afternoon: ['Good afternoon, {name}', 'नमस्कार, {name}', 'শুভ অপরাহ্ন, {name}', 'மதிய வணக்கம், {name}', '下午好，{name}', 'Selamat petang, {name}'],
  c_evening: ['Good evening, {name}', 'शुभ संध्या, {name}', 'শুভ সন্ধ্যা, {name}', 'மாலை வணக்கம், {name}', '晚上好，{name}', 'Selamat malam, {name}'],
  c_in_min: ['in {n} min', '{n} मिनट में', '{n} মিনিটে', '{n} நிமிடத்தில்', '{n} 分钟后', 'dalam {n} minit'],
  c_today: ['today at {t}', 'आज {t} बजे', 'আজ {t}-এ', 'இன்று {t}', '今天 {t}', 'hari ini pada {t}'],
  c_tomorrow: ['tomorrow at {t}', 'कल {t} बजे', 'কাল {t}-এ', 'நாளை {t}', '明天 {t}', 'esok pada {t}'],
  c_on: ['{d} at {t}', '{d}, {t} बजे', '{d}, {t}', '{d}, {t}', '{d} {t}', '{d}, {t}'],
  c_going: ['{n} going', '{n} जा रहे हैं', '{n} জন যাচ্ছেন', '{n} பேர் வருகிறார்கள்', '{n} 人参加', '{n} akan hadir'],
  c_waiting: ['{name} is waiting.', '{name} इंतज़ार कर रहे हैं।', '{name} অপেক্ষা করছেন।', '{name} காத்திருக்கிறார்.', '{name} 在等你。', '{name} sedang menunggu.'],
  c_imgoing: ["I'm going", 'मैं जा रहा/रही हूँ', 'আমি যাচ্ছি', 'நான் வருகிறேன்', '我会去', 'Saya akan pergi'],
  c_isgoing: ['You are going', 'आप जा रहे हैं', 'আপনি যাচ্ছেন', 'நீங்கள் வருகிறீர்கள்', '你会去', 'Anda akan pergi'],
  c_title: ['Communities', 'समुदाय', 'কমিউনিটি', 'சமூகங்கள்', '社区', 'Komuniti'],
  c_joined: ['Joined', 'जुड़े हैं', 'যোগ দিয়েছেন', 'இணைந்துள்ளீர்கள்', '已加入', 'Telah sertai'],
  c_members: ['{n} members', '{n} सदस्य', '{n} জন সদস্য', '{n} உறுப்பினர்கள்', '{n} 位成员', '{n} ahli'],
  c_start: ['+ Start a community', '+ समुदाय शुरू करें', '+ একটি কমিউনিটি শুরু করুন', '+ ஒரு சமூகத்தைத் தொடங்கு', '+ 创建社区', '+ Mulakan komuniti'],
  c_find: ['Find groups near you', 'अपने पास के समूह खोजें', 'আপনার কাছের গ্রুপ খুঁজুন', 'உங்கள் அருகிலுள்ள குழுக்களைக் கண்டறியுங்கள்', '查找附近的小组', 'Cari kumpulan berhampiran'],
  c_none: ['You have not joined a group yet. Groups near you are waiting.', 'आप अभी किसी समूह से नहीं जुड़े हैं। आपके पास के समूह इंतज़ार कर रहे हैं।', 'আপনি এখনও কোনো গ্রুপে যোগ দেননি। আপনার কাছের গ্রুপগুলি অপেক্ষা করছে।', 'நீங்கள் இன்னும் எந்தக் குழுவிலும் சேரவில்லை. உங்கள் அருகிலுள்ள குழுக்கள் காத்திருக்கின்றன.', '你还没有加入任何小组，附近的小组在等你。', 'Anda belum menyertai mana-mana kumpulan. Kumpulan berhampiran sedang menunggu.'],
  c_next_none: ['Nothing planned yet', 'अभी कुछ तय नहीं', 'এখনও কিছু ঠিক হয়নি', 'இன்னும் எதுவும் திட்டமிடப்படவில்லை', '暂时没有安排', 'Belum ada rancangan'],
  c_failed: ['Could not load your groups. Check your connection.', 'आपके समूह लोड नहीं हो सके। कनेक्शन जाँचें।', 'আপনার গ্রুপ লোড করা যায়নি। সংযোগ পরীক্ষা করুন।', 'உங்கள் குழுக்களை ஏற்ற முடியவில்லை. இணைப்பைச் சரிபார்க்கவும்.', '无法加载你的小组，请检查网络。', 'Tidak dapat memuat kumpulan anda. Semak sambungan.'],
  c_retry: ['Try again', 'फिर कोशिश करें', 'আবার চেষ্টা করুন', 'மீண்டும் முயற்சிக்கவும்', '重试', 'Cuba lagi'],
  c_more: ['More ways to find groups', 'समूह खोजने के और तरीके', 'গ্রুপ খোঁজার আরও উপায়', 'குழுக்களைக் கண்டறிய மேலும் வழிகள்', '更多查找小组的方式', 'Lebih banyak cara mencari kumpulan'],
};
