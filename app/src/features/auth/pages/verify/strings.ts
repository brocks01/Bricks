import type { PageStrings } from '../../../../navigation/types';

// First drafts by an AI assistant; native-speaker review needed for hi, bn, ta, zh, ms.
export const strings: PageStrings = {
  en: { heading: 'Enter your code', hint: 'We sent a 6-digit code to {email}.', code: '6-digit code', verify: 'Sign in', resend: 'Send a new code', devCode: 'Test mode code: {code}' },
  hi: { heading: 'अपना कोड लिखें', hint: 'हमने {email} पर 6 अंकों का कोड भेजा है।', code: '6 अंकों का कोड', verify: 'साइन इन करें', resend: 'नया कोड भेजें', devCode: 'टेस्ट मोड कोड: {code}' },
  bn: { heading: 'আপনার কোড লিখুন', hint: 'আমরা {email} ঠিকানায় ৬ সংখ্যার কোড পাঠিয়েছি।', code: '৬ সংখ্যার কোড', verify: 'সাইন ইন করুন', resend: 'নতুন কোড পাঠান', devCode: 'টেস্ট মোড কোড: {code}' },
  ta: { heading: 'உங்கள் குறியீட்டை உள்ளிடவும்', hint: '{email} முகவரிக்கு 6 இலக்கக் குறியீட்டை அனுப்பினோம்.', code: '6 இலக்கக் குறியீடு', verify: 'உள்நுழைக', resend: 'புதிய குறியீடு அனுப்பு', devCode: 'சோதனை முறை குறியீடு: {code}' },
  zh: { heading: '输入验证码', hint: '我们已向 {email} 发送了 6 位验证码。', code: '6 位验证码', verify: '登录', resend: '重新发送验证码', devCode: '测试模式验证码：{code}' },
  ms: { heading: 'Masukkan kod anda', hint: 'Kami telah menghantar kod 6 digit ke {email}.', code: 'Kod 6 digit', verify: 'Log masuk', resend: 'Hantar kod baharu', devCode: 'Kod mod ujian: {code}' },
};
