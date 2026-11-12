import type { PageStrings } from '../../navigation/types';

// The words of the join and create screens. First drafts by an AI assistant; native-speaker review needed for hi, bn, ta, zh, ms.
export const strings: PageStrings = {
  en: {
    joinTitle: 'Join a community', joinIntro: 'Type the invite code a community leader gave you.', code: 'Invite code', joinButton: 'Join', codeBad: 'That code does not work. Check it with your community leader.',
    orCreate: 'Or start your own', goCreate: 'Create a community',
    createTitle: 'Create a community', createIntro: 'Give your community a name. You can invite people straight after.', name: 'Community name', kind: 'What kind of community is it?',
    apartment: 'Apartment', block: 'Block', neighbourhood: 'Neighbourhood', club: 'Club', other: 'Other', area: 'Area (optional)', about: 'About (optional)', createButton: 'Create community',
    needName: 'Please give your community a name.', failed: 'Something went wrong. Please try again.',
  },
  hi: {
    joinTitle: 'समुदाय से जुड़ें', joinIntro: 'समुदाय के प्रमुख ने जो निमंत्रण कोड दिया है, उसे लिखें।', code: 'निमंत्रण कोड', joinButton: 'जुड़ें', codeBad: 'यह कोड काम नहीं करता। अपने समुदाय के प्रमुख से जाँच लें।',
    orCreate: 'या अपना खुद का शुरू करें', goCreate: 'समुदाय बनाएँ',
    createTitle: 'समुदाय बनाएँ', createIntro: 'अपने समुदाय को एक नाम दें। फिर आप लोगों को बुला सकते हैं।', name: 'समुदाय का नाम', kind: 'यह किस तरह का समुदाय है?',
    apartment: 'अपार्टमेंट', block: 'ब्लॉक', neighbourhood: 'मोहल्ला', club: 'क्लब', other: 'अन्य', area: 'क्षेत्र (वैकल्पिक)', about: 'विवरण (वैकल्पिक)', createButton: 'समुदाय बनाएँ',
    needName: 'कृपया अपने समुदाय को एक नाम दें।', failed: 'कुछ गड़बड़ हो गई। कृपया फिर कोशिश करें।',
  },
  bn: {
    joinTitle: 'কমিউনিটিতে যোগ দিন', joinIntro: 'কমিউনিটির প্রধান যে আমন্ত্রণ কোড দিয়েছেন তা লিখুন।', code: 'আমন্ত্রণ কোড', joinButton: 'যোগ দিন', codeBad: 'এই কোডটি কাজ করছে না। আপনার কমিউনিটির প্রধানের কাছে যাচাই করুন।',
    orCreate: 'অথবা নিজের একটি শুরু করুন', goCreate: 'কমিউনিটি তৈরি করুন',
    createTitle: 'কমিউনিটি তৈরি করুন', createIntro: 'আপনার কমিউনিটিকে একটি নাম দিন। এরপরই মানুষকে আমন্ত্রণ জানাতে পারবেন।', name: 'কমিউনিটির নাম', kind: 'এটি কী ধরনের কমিউনিটি?',
    apartment: 'অ্যাপার্টমেন্ট', block: 'ব্লক', neighbourhood: 'পাড়া', club: 'ক্লাব', other: 'অন্যান্য', area: 'এলাকা (ঐচ্ছিক)', about: 'বিবরণ (ঐচ্ছিক)', createButton: 'কমিউনিটি তৈরি করুন',
    needName: 'আপনার কমিউনিটিকে একটি নাম দিন।', failed: 'কিছু ভুল হয়েছে। আবার চেষ্টা করুন।',
  },
  ta: {
    joinTitle: 'சமூகத்தில் சேர்', joinIntro: 'சமூகத் தலைவர் தந்த அழைப்புக் குறியீட்டை உள்ளிடவும்.', code: 'அழைப்புக் குறியீடு', joinButton: 'சேர்', codeBad: 'இந்தக் குறியீடு செயல்படவில்லை. உங்கள் சமூகத் தலைவரிடம் சரிபார்க்கவும்.',
    orCreate: 'அல்லது சொந்தமாகத் தொடங்கு', goCreate: 'சமூகத்தை உருவாக்கு',
    createTitle: 'சமூகத்தை உருவாக்கு', createIntro: 'உங்கள் சமூகத்திற்கு ஒரு பெயர் கொடுங்கள். உடனே மக்களை அழைக்கலாம்.', name: 'சமூகத்தின் பெயர்', kind: 'இது எந்த வகைச் சமூகம்?',
    apartment: 'அடுக்குமாடி', block: 'பிளாக்', neighbourhood: 'அக்கம்பக்கம்', club: 'கிளப்', other: 'மற்றவை', area: 'பகுதி (விருப்பம்)', about: 'விவரம் (விருப்பம்)', createButton: 'சமூகத்தை உருவாக்கு',
    needName: 'உங்கள் சமூகத்திற்கு ஒரு பெயர் கொடுங்கள்.', failed: 'ஏதோ தவறு நடந்தது. மீண்டும் முயலவும்.',
  },
  zh: {
    joinTitle: '加入社区', joinIntro: '请输入社区负责人给您的邀请码。', code: '邀请码', joinButton: '加入', codeBad: '这个邀请码无效。请向社区负责人确认。',
    orCreate: '或者创建自己的社区', goCreate: '创建社区',
    createTitle: '创建社区', createIntro: '给您的社区起个名字。创建后即可邀请大家。', name: '社区名称', kind: '这是什么类型的社区？',
    apartment: '公寓', block: '楼栋', neighbourhood: '邻里', club: '俱乐部', other: '其他', area: '地区（可选）', about: '简介（可选）', createButton: '创建社区',
    needName: '请给您的社区起个名字。', failed: '出了点问题，请重试。',
  },
  ms: {
    joinTitle: 'Sertai komuniti', joinIntro: 'Taip kod jemputan yang diberikan oleh ketua komuniti.', code: 'Kod jemputan', joinButton: 'Sertai', codeBad: 'Kod itu tidak berfungsi. Semak dengan ketua komuniti anda.',
    orCreate: 'Atau mulakan sendiri', goCreate: 'Cipta komuniti',
    createTitle: 'Cipta komuniti', createIntro: 'Beri nama kepada komuniti anda. Anda boleh menjemput orang sejurus selepas itu.', name: 'Nama komuniti', kind: 'Apakah jenis komuniti ini?',
    apartment: 'Apartmen', block: 'Blok', neighbourhood: 'Kejiranan', club: 'Kelab', other: 'Lain-lain', area: 'Kawasan (pilihan)', about: 'Perihal (pilihan)', createButton: 'Cipta komuniti',
    needName: 'Sila beri nama kepada komuniti anda.', failed: 'Ada masalah. Sila cuba lagi.',
  },
};
