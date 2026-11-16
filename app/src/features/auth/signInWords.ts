import { pageWords, type WordTable } from '../../i18n/words';
import { WIZARD } from '../onboarding/wizardWords';
import { ONBOARDING } from '../onboarding/words';

// Words for the sign-in screens (Singpass, as a demo for now). Order: English, Hindi, Bengali, Tamil, Chinese, Malay. First drafts; native-speaker review needed.
const T: WordTable = {
  heading: ['Sign in', 'साइन इन', 'সাইন ইন', 'உள்நுழை', '登录', 'Log masuk'],
  continueWith: ['Continue with', 'जारी रखें', 'চালিয়ে যান', 'தொடர', '继续使用', 'Teruskan dengan'],
  singpass: ['Continue with Singpass', 'Singpass के साथ जारी रखें', 'Singpass দিয়ে চালিয়ে যান', 'Singpass மூலம் தொடரவும்', '使用 Singpass 继续', 'Teruskan dengan Singpass'],
  sp_title: ['Log in with Singpass', 'Singpass से लॉग इन करें', 'Singpass দিয়ে লগ ইন করুন', 'Singpass மூலம் உள்நுழையுங்கள்', '使用 Singpass 登录', 'Log masuk dengan Singpass'],
  sp_demo: ['This is a demo. No real Singpass is contacted, so choose who to continue as.', 'यह एक डेमो है। असली Singpass से संपर्क नहीं होता, इसलिए चुनें कि किसके रूप में जारी रखें।', 'এটি একটি ডেমো। আসল Singpass-এর সঙ্গে যোগাযোগ হয় না, তাই কার হিসেবে চালিয়ে যাবেন বেছে নিন।', 'இது ஒரு டெமோ. உண்மையான Singpass தொடர்பு கொள்ளப்படாது, யாராகத் தொடர வேண்டும் என்பதைத் தேர்ந்தெடுக்கவும்.', '这是演示。不会联系真正的 Singpass，请选择以谁的身份继续。', 'Ini demo. Singpass sebenar tidak dihubungi, jadi pilih siapa untuk diteruskan.'],
  sp_new: ['A new demo profile', 'एक नई डेमो प्रोफ़ाइल', 'একটি নতুন ডেমো প্রোফাইল', 'ஒரு புதிய டெமோ சுயவிவரம்', '新的演示档案', 'Profil demo baharu'],
  sp_new_l: ['Start fresh and go through the welcome screens.', 'नए सिरे से शुरू करें और स्वागत स्क्रीन देखें।', 'নতুন করে শুরু করুন ও স্বাগত পর্দাগুলি দেখুন।', 'புதிதாகத் தொடங்கி வரவேற்புத் திரைகளைப் பாருங்கள்.', '从头开始，体验欢迎页面。', 'Mula dari awal dan lihat skrin alu-aluan.'],
  sp_r_share: ['Shares what they know', 'जो जानते हैं, साझा करते हैं', 'যা জানেন তা ভাগ করেন', 'தெரிந்ததைப் பகிர்கிறார்', '分享自己的经验', 'Berkongsi apa yang diketahui'],
  sp_r_connect: ['Stays connected', 'जुड़े रहते हैं', 'যুক্ত থাকেন', 'இணைந்திருக்கிறார்', '保持联系', 'Kekal berhubung'],
  sp_r_learn: ['Here to learn', 'सीखने आए हैं', 'শিখতে এসেছেন', 'கற்க வந்தவர்', '来学习', 'Datang untuk belajar'],
  sp_r_help: ['Helps others', 'दूसरों की मदद करते हैं', 'অন্যদের সাহায্য করেন', 'பிறருக்கு உதவுகிறார்', '帮助他人', 'Membantu orang lain'],
  sp_r_care: ['Looks after family', 'परिवार का ध्यान रखते हैं', 'পরিবারের যত্ন নেন', 'குடும்பத்தைக் கவனிக்கிறார்', '照顾家人', 'Menjaga keluarga'],
  sp_circles: ['{n} circles', '{n} समुदाय', '{n}টি কমিউনিটি', '{n} வட்டங்கள்', '{n} 个圈子', '{n} bulatan'],
};
export const signInStrings = pageWords({ ...WIZARD, ...T, failed: ONBOARDING.failed });
export const singpassStrings = pageWords({ ...WIZARD, ...T, failed: ONBOARDING.failed, heading: T.sp_title, newProfile: T.sp_new });
