import { type WordTable } from '../../i18n/words';

// Words for the reference onboarding screens (voice, reminders, welcome). Order: English, Hindi, Bengali, Tamil, Chinese, Malay. First drafts; native-speaker review needed.
export const REF: WordTable = {
  o_voice_t: ['Your voice', 'आपकी आवाज़', 'আপনার কণ্ঠ', 'உங்கள் குரல்', '你的声音', 'Suara anda'],
  o_voice_card: ['Tell people a little about you', 'लोगों को अपने बारे में थोड़ा बताएँ', 'নিজের সম্পর্কে একটু বলুন', 'உங்களைப் பற்றி கொஞ்சம் சொல்லுங்கள்', '向大家简单介绍一下你自己', 'Ceritakan sedikit tentang diri anda'],
  o_voice_ex: ['For example: what you used to do, what you love, or what people can ask you about.', 'जैसे: आप क्या काम करते थे, आपको क्या पसंद है, या लोग आपसे क्या पूछ सकते हैं।', 'যেমন: আপনি কী করতেন, কী ভালবাসেন, বা মানুষ আপনাকে কী জিজ্ঞেস করতে পারে।', 'எடுத்துக்காட்டாக: நீங்கள் என்ன செய்தீர்கள், எதை விரும்புகிறீர்கள், மக்கள் உங்களிடம் எதைக் கேட்கலாம்.', '例如：你过去做什么、你喜欢什么，或大家可以向你请教什么。', 'Contohnya: apa yang pernah anda buat, apa yang anda suka, atau apa yang boleh orang tanya anda.'],
  o_voice_note: ['Up to 10 seconds. Tap Stop when you have finished.', 'अधिकतम 10 सेकंड। पूरा होने पर रोकें दबाएँ।', 'সর্বোচ্চ ১০ সেকেন্ড। শেষ হলে থামান চাপুন।', 'அதிகபட்சம் 10 வினாடிகள். முடிந்ததும் நிறுத்து தட்டவும்.', '最长 10 秒。说完后点“停止”。', 'Sehingga 10 saat. Ketik Berhenti apabila selesai.'],
  o_rem_t: ['How should we remind you?', 'हम आपको कैसे याद दिलाएँ?', 'আমরা আপনাকে কীভাবে মনে করিয়ে দেব?', 'உங்களுக்கு எப்படி நினைவூட்டலாம்?', '我们该如何提醒你？', 'Bagaimana kami patut mengingatkan anda?'],
  o_rem_app: ['App notification', 'ऐप सूचना', 'অ্যাপ বিজ্ঞপ্তি', 'ஆப் அறிவிப்பு', '应用通知', 'Pemberitahuan aplikasi'],
  o_rem_app_l: ['A message pops up on this phone.', 'इस फ़ोन पर एक संदेश आता है।', 'এই ফোনে একটি বার্তা আসে।', 'இந்த ஃபோனில் ஒரு செய்தி தோன்றும்.', '这部手机上会弹出一条消息。', 'Satu mesej muncul pada telefon ini.'],
  o_rem_wa: ['WhatsApp message', 'व्हाट्सऐप संदेश', 'হোয়াটসঅ্যাপ বার্তা', 'வாட்ஸ்அப் செய்தி', 'WhatsApp 消息', 'Mesej WhatsApp'],
  o_rem_wa_l: ['We send you a WhatsApp message.', 'हम आपको व्हाट्सऐप संदेश भेजते हैं।', 'আমরা আপনাকে হোয়াটসঅ্যাপ বার্তা পাঠাই।', 'நாங்கள் உங்களுக்கு வாட்ஸ்அப் செய்தி அனுப்புவோம்.', '我们会给你发 WhatsApp 消息。', 'Kami hantar mesej WhatsApp kepada anda.'],
  o_rem_call: ['Phone call', 'फ़ोन कॉल', 'ফোন কল', 'தொலைபேசி அழைப்பு', '电话', 'Panggilan telefon'],
  o_rem_call_l: ['We call you and say it out loud.', 'हम आपको कॉल करके बोलकर बताते हैं।', 'আমরা আপনাকে ফোন করে মুখে বলি।', 'நாங்கள் உங்களை அழைத்து சத்தமாகச் சொல்வோம்.', '我们打电话给你，大声告诉你。', 'Kami telefon anda dan sebut dengan kuat.'],
  o_later: ['Later', 'बाद में', 'পরে', 'பிறகு', '稍后', 'Kemudian'],
  o_welcome_ref: ["Every morning we'll ask how you are.", 'हर सुबह हम पूछेंगे कि आप कैसे हैं।', 'প্রতি সকালে আমরা জিজ্ঞেস করব আপনি কেমন আছেন।', 'ஒவ்வொரு காலையும் நீங்கள் எப்படி இருக்கிறீர்கள் என்று கேட்போம்.', '每天早上我们都会问你过得怎么样。', 'Setiap pagi kami akan bertanya khabar anda.'],
  o_consent_note: ['By continuing you agree to the privacy notice and the terms of use.', 'आगे बढ़कर आप गोपनीयता सूचना और उपयोग की शर्तों से सहमत होते हैं।', 'এগিয়ে গিয়ে আপনি গোপনীয়তা নোটিস ও ব্যবহারের শর্তে সম্মত হচ্ছেন।', 'தொடர்வதன் மூலம் தனியுரிமை அறிவிப்பு மற்றும் பயன்பாட்டு விதிமுறைகளை ஏற்கிறீர்கள்.', '继续即表示你同意隐私声明和使用条款。', 'Dengan meneruskan, anda bersetuju dengan notis privasi dan syarat penggunaan.'],
  o_step3: ['Step {n} of 3', 'चरण {n} / 3', 'ধাপ {n} / ৩', 'படி {n} / 3', '第 {n} 步，共 3 步', 'Langkah {n} daripada 3'],
};
