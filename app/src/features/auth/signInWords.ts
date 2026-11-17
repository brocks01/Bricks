import { pageWords, type WordTable } from '../../i18n/words';
import { WIZARD } from '../onboarding/wizardWords';
import { ONBOARDING } from '../onboarding/words';

// Words for the sign-in screens (Singpass, as a demo for now). Order: English, Hindi, Bengali, Tamil, Chinese, Malay. First drafts; native-speaker review needed.
const T: WordTable = {
  heading: ['Sign in', 'साइन इन', 'সাইন ইন', 'உள்நுழை', '登录', 'Log masuk'],
  singpass: ['Continue with Singpass', 'Singpass के साथ जारी रखें', 'Singpass দিয়ে চালিয়ে যান', 'Singpass மூலம் தொடரவும்', '使用 Singpass 继续', 'Teruskan dengan Singpass'],
  sp_title: ['Log in with Singpass', 'Singpass से लॉग इन करें', 'Singpass দিয়ে লগ ইন করুন', 'Singpass மூலம் உள்நுழையுங்கள்', '使用 Singpass 登录', 'Log masuk dengan Singpass'],
  sp_logging: ['Logging in with Singpass…', 'Singpass से लॉग इन हो रहा है…', 'Singpass দিয়ে লগ ইন হচ্ছে…', 'Singpass மூலம் உள்நுழைகிறது…', '正在通过 Singpass 登录…', 'Sedang log masuk dengan Singpass…'],
  sp_demo_note: ['Demo: no real Singpass is contacted. You are signed in as Uncle Tan.', 'डेमो: असली Singpass से संपर्क नहीं होता। आप अंकल टैन के रूप में साइन इन होते हैं।', 'ডেমো: আসল Singpass-এর সঙ্গে যোগাযোগ হয় না। আপনি আঙ্কেল ট্যান হিসেবে সাইন ইন করছেন।', 'டெமோ: உண்மையான Singpass தொடர்பு கொள்ளப்படாது. நீங்கள் அங்கிள் டான் ஆக உள்நுழைகிறீர்கள்.', '演示：不会联系真正的 Singpass，你将以陈叔叔的身份登录。', 'Demo: Singpass sebenar tidak dihubungi. Anda log masuk sebagai Uncle Tan.'],
  sp_retry: ['Try again', 'फिर कोशिश करें', 'আবার চেষ্টা করুন', 'மீண்டும் முயற்சிக்கவும்', '重试', 'Cuba lagi'],
  si_title: ['Belonging starts here', 'अपनापन यहीं से शुरू होता है', 'আপনজন খোঁজা শুরু এখানে', 'சொந்தம் இங்கே தொடங்குகிறது', '归属感从这里开始', 'Rasa kekitaan bermula di sini'],
  si_sub: ['Meet people near you, share what you know, and find what is on this week.', 'अपने पास के लोगों से मिलें, जो जानते हैं साझा करें, और इस हफ़्ते क्या हो रहा है देखें।', 'কাছের মানুষদের সঙ্গে দেখা করুন, যা জানেন ভাগ করুন, আর এই সপ্তাহে কী হচ্ছে দেখুন।', 'அருகில் உள்ளவர்களைச் சந்தியுங்கள், தெரிந்ததைப் பகிருங்கள், இந்த வாரம் என்ன நடக்கிறது என்று பாருங்கள்.', '认识身边的人，分享你的经验，看看这周有什么活动。', 'Kenali orang berdekatan, kongsi apa yang anda tahu, dan lihat apa yang ada minggu ini.'],
  email: ['Continue with Email', 'ईमेल के साथ जारी रखें', 'ইমেল দিয়ে চালিয়ে যান', 'மின்னஞ்சல் மூலம் தொடரவும்', '使用电子邮件继续', 'Teruskan dengan E-mel'],
  email_f: ['Your email address', 'आपका ईमेल पता', 'আপনার ইমেল ঠিকানা', 'உங்கள் மின்னஞ்சல் முகவரி', '你的电子邮件地址', 'Alamat e-mel anda'],
  sendCode: ['Send me a code', 'मुझे कोड भेजें', 'আমাকে কোড পাঠান', 'எனக்குக் குறியீடு அனுப்பவும்', '给我发送验证码', 'Hantar kod kepada saya'],
  code: ['The code from the email', 'ईमेल में आया कोड', 'ইমেলে আসা কোড', 'மின்னஞ்சலில் வந்த குறியீடு', '邮件里的验证码', 'Kod daripada e-mel'],
  code_sent: ['We sent a code to {email}.', 'हमने {email} पर कोड भेजा है।', 'আমরা {email}-এ একটি কোড পাঠিয়েছি।', '{email} க்குக் குறியீடு அனுப்பினோம்.', '验证码已发送到 {email}。', 'Kami telah menghantar kod ke {email}.'],
  dev_code: ['Test code: {code}', 'परीक्षण कोड: {code}', 'পরীক্ষার কোড: {code}', 'சோதனைக் குறியீடு: {code}', '测试验证码：{code}', 'Kod ujian: {code}'],
  verify: ['Sign in', 'साइन इन करें', 'সাইন ইন করুন', 'உள்நுழை', '登录', 'Log masuk'],
  bad_email: ['Please check the email address.', 'कृपया ईमेल पता जाँचें।', 'অনুগ্রহ করে ইমেল ঠিকানাটি দেখুন।', 'மின்னஞ்சல் முகவரியைச் சரிபார்க்கவும்.', '请检查电子邮件地址。', 'Sila semak alamat e-mel.'],
  bad_code: ['That code did not work. Please try again.', 'वह कोड काम नहीं किया। फिर कोशिश करें।', 'কোডটি কাজ করেনি। আবার চেষ্টা করুন।', 'அந்தக் குறியீடு வேலை செய்யவில்லை. மீண்டும் முயற்சிக்கவும்.', '验证码无效，请重试。', 'Kod itu tidak berjaya. Sila cuba lagi.'],
  tryNew: ['Try it as someone new', 'नए व्यक्ति के रूप में आज़माएँ', 'নতুন কেউ হিসেবে চেষ্টা করুন', 'புதியவராக முயற்சிக்கவும்', '以新用户身份试用', 'Cuba sebagai orang baharu'],
  terms: ["By continuing, you agree to Interchange's Terms of Use.", 'आगे बढ़कर आप Interchange की उपयोग की शर्तों से सहमत होते हैं।', 'চালিয়ে গেলে আপনি Interchange-এর ব্যবহারের শর্তে সম্মত হন।', 'தொடர்வதன் மூலம் Interchange இன் பயன்பாட்டு விதிமுறைகளை ஏற்கிறீர்கள்.', '继续即表示你同意 Interchange 的使用条款。', 'Dengan meneruskan, anda bersetuju dengan Terma Penggunaan Interchange.'],
  not_now: ['Something went wrong. Please try again.', 'कुछ गड़बड़ हुई। फिर कोशिश करें।', 'কিছু ভুল হয়েছে। আবার চেষ্টা করুন।', 'ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்.', '出了点问题，请重试。', 'Ada masalah. Sila cuba lagi.'],
};
export const signInStrings = pageWords({ ...WIZARD, ...T, failed: ONBOARDING.failed });
export const singpassStrings = pageWords({ ...WIZARD, ...T, failed: ONBOARDING.failed, heading: T.sp_title });
