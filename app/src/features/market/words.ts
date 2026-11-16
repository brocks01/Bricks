import { type WordTable } from '../../i18n/words';

// The words of the Marketplace tab and its pages. Order of the six: English, Hindi, Bengali, Tamil, Chinese, Malay.
// Money rule: the platform never holds money. People pay each other directly; a rate is only what the two sides agreed.
export const W: WordTable = {
  h_market: ['Market', 'बाज़ार', 'বাজার', 'சந்தை', '集市', 'Pasar'],
  intro: ['Skills and experience from people near you.', 'आपके आस-पास के लोगों के हुनर और अनुभव।', 'আপনার কাছের মানুষের দক্ষতা ও অভিজ্ঞতা।', 'உங்கள் அருகிலுள்ளவர்களின் திறமையும் அனுபவமும்.', '来自你身边的人的技能与经验。', 'Kemahiran dan pengalaman daripada orang berhampiran anda.'],
  noEvents: ['Nothing planned near you yet.', 'अभी आपके आस-पास कुछ भी तय नहीं है।', 'আপনার আশেপাশে এখনও কিছু পরিকল্পনা করা হয়নি।', 'உங்கள் அருகில்இன்னும் எதுவும் திட்டமிடப்படவில்லை.', '你附近暂时还没有安排。', 'Belum ada apa-apa yang dirancang berhampiran anda.'],
  // errors from the server (the stall screens)
  err_in_the_past: ['Please pick a time in the future.', 'कृपया भविष्य का समय चुनें।', 'অনুগ্রহ করে ভবিষ্যতের সময় বেছে নিন।', 'எதிர்கால நேரத்தைத் தேர்ந்தெடுங்கள்.', '请选择将来的时间。', 'Sila pilih masa pada masa hadapan.'],
  err_duplicate: ['You already asked for this time.', 'आप यह समय पहले ही माँग चुके हैं।', 'আপনি এই সময় আগেই চেয়েছেন।', 'இந்த நேரத்தை ஏற்கனவே கேட்டுவிட்டீர்கள்.', '你已经预约过这个时间。', 'Anda sudah meminta masa ini.'],
  err_own: ['This is your own service.', 'यह आपकी अपनी सेवा है।', 'এটি আপনার নিজের পরিষেবা।', 'இது உங்கள் சொந்தச் சேவை.', '这是你自己的服务。', 'Ini perkhidmatan anda sendiri.'],
  // stalls
  h_stall: ['Market stalls', 'बाज़ार के स्टॉल', 'বাজারের স্টল', 'சந்தைக் கடைகள்', '集市摊位', 'Gerai pasar'],
  stalls_title: ['Who is selling', 'कौन बेच रहा है', 'কে বিক্রি করছেন', 'யார் விற்கிறார்கள்', '谁在摆摊', 'Siapa yang menjual'],
  reserve_title: ['Reserve my stall', 'मेरा स्टॉल आरक्षित करें', 'আমার স্টল সংরক্ষণ করুন', 'என் கடையை ஒதுக்கு', '预订我的摊位', 'Tempah gerai saya'],
  f_selling: ['What will you sell?', 'आप क्या बेचेंगे?', 'আপনি কী বিক্রি করবেন?', 'நீங்கள் என்ன விற்பீர்கள்?', '你要卖什么？', 'Apa yang anda akan jual?'],
  f_helper: ['A helper or volunteer (name)', 'एक सहायक या स्वयंसेवक (नाम)', 'একজন সহায়ক বা স্বেচ্ছাসেবক (নাম)', 'ஒரு உதவியாளர் அல்லது தன்னார்வலர் (பெயர்)', '帮手或志愿者（姓名）', 'Pembantu atau sukarelawan (nama)'],
  reserve_btn: ['Reserve', 'आरक्षित करें', 'সংরক্ষণ করুন', 'ஒதுக்கு', '预订', 'Tempah'],
  cancel_stall: ['Give up my stall', 'मेरा स्टॉल छोड़ें', 'আমার স্টল ছেড়ে দিন', 'என் கடையை விடு', '放弃我的摊位', 'Lepaskan gerai saya'],
  stall_reserved: ['Your stall is reserved.', 'आपका स्टॉल आरक्षित है।', 'আপনার স্টল সংরক্ষিত।', 'உங்கள் கடை ஒதுக்கப்பட்டது.', '你的摊位已预订。', 'Gerai anda telah ditempah.'],
  no_stalls: ['No stalls yet.', 'अभी कोई स्टॉल नहीं।', 'এখনও কোনো স্টল নেই।', 'இன்னும் கடைகள் இல்லை.', '暂无摊位。', 'Belum ada gerai.'],
  helper_is: ['Helper: {name}', 'सहायक: {name}', 'সহায়ক: {name}', 'உதவியாளர்: {name}', '帮手：{name}', 'Pembantu: {name}'],
  err_seniors: ['Stalls are for people aged 60 and over, who can bring a helper. Set your age group in your profile.', 'स्टॉल 60 और उससे अधिक उम्र के लोगों के लिए हैं, जो एक सहायक ला सकते हैं। अपनी प्रोफ़ाइल में अपना आयु वर्ग चुनें।', 'স্টল ৬০ বা তার বেশি বয়সীদের জন্য, যারা একজন সহায়ক আনতে পারেন। প্রোফাইলে আপনার বয়সের দল ঠিক করুন।', 'கடைகள் 60 வயதும் அதற்கு மேற்பட்டவர்களுக்கும்; அவர்கள் ஒரு உதவியாளரை அழைத்து வரலாம். உங்கள் சுயவிவரத்தில் வயது குழுவை அமையுங்கள்.', '摊位面向 60 岁及以上的人，可带一名帮手。请在个人资料中设置你的年龄段。', 'Gerai untuk mereka berumur 60 tahun ke atas, yang boleh membawa pembantu. Tetapkan kumpulan umur anda dalam profil.'],
  err_not_market: ['This event is not a market day.', 'यह आयोजन बाज़ार का दिन नहीं है।', 'এটি বাজারের দিন নয়।', 'இது சந்தை நாள் அல்ல.', '此活动不是集市日。', 'Acara ini bukan hari pasar.'],
  // shared
  save: ['Save', 'सहेजें', 'সংরক্ষণ', 'சேமி', '保存', 'Simpan'],
  failed: ['Something went wrong. Please try again.', 'कुछ गड़बड़ हुई। फिर कोशिश करें।', 'কিছু ভুল হয়েছে। আবার চেষ্টা করুন।', 'ஏதோ தவறு நடந்தது. மீண்டும் முயலுங்கள்.', '出了点问题，请重试。', 'Sesuatu tidak kena. Sila cuba lagi.'],
  not_found: ['This could not be opened.', 'यह खुल नहीं सका।', 'এটি খোলা যায়নি।', 'இதைத் திறக்க முடியவில்லை.', '无法打开。', 'Ini tidak dapat dibuka.'],
};

export const ALIASES = {
  heading: 'h_market',
  tab: 'h_market',
  selling: 'f_selling',
  helper: 'f_helper',
  reserve: 'reserve_btn',
  giveUp: 'cancel_stall',
} as const;
