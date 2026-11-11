import type { Language } from '@/i18n/languages';

/**
 * What a facilitator taps on "Demo: tap what was said" while running on mock
 * data, because Expo Go has no speech-to-text (docs/04 1.3 §5.2). One phrase per
 * Buddy intent, in each language. Never shown with a real speech service.
 */
export const BUDDY_DEMO_PHRASES: Record<Language, string[]> = {
  en: [
    "What's on today?",
    'Remind me to take medicine at 8 am',
    'Yes, I walked yesterday',
    "No, I didn't move yesterday",
    'Join the walk',
    'Start a walk',
    'Stop the walk',
    'Open my profile',
    'Help',
  ],
  ms: [
    'Apa ada hari ini?',
    'Ingatkan saya makan ubat pukul 8 pagi',
    'Ya, saya berjalan semalam',
    'Tidak, saya tak bergerak semalam',
    'Saya nak ikut',
    'Mula berjalan',
    'Berhenti jalan',
    'Buka profil saya',
    'Tolong',
  ],
  zh: [
    '今天有什么活动？',
    '提醒我早上8点吃药',
    '昨天我有散步',
    '昨天我没有运动',
    '我要参加',
    '开始散步',
    '停止散步',
    '打开我的资料',
    '救命',
  ],
  ta: [
    'இன்று என்ன இருக்கிறது?',
    'காலை 8 மணிக்கு மருந்து சாப்பிட நினைவூட்டு',
    'ஆம், நேற்று நடந்தேன்',
    'இல்லை, நேற்று நடக்கவில்லை',
    'நான் சேர விரும்புகிறேன்',
    'நடை தொடங்கு',
    'நடையை நிறுத்து',
    'என் சுயவிவரத்தைத் திற',
    'உதவி',
  ],
};
