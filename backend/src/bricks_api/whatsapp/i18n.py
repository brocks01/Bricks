"""Every free-form WhatsApp message, in en / ms / zh / ta (docs/02 §9, docs/06 §1).

Plain text, no emojis, the first words say what it is, bold (*…*) for the key line.
Button titles stay within 20 characters. The ms / zh / ta text needs a native
speaker's read before real members see it (iterations/whatsapp 1.2).
"""

from datetime import datetime

from ..timeutil import local

LANGS = ("en", "ms", "zh", "ta")

S: dict[str, dict[str, str]] = {
    # ---------- Onboarding ----------
    "pick_language": {
        "en": "*Welcome to Bricks.* Which language would you like?\nBahasa? 语言? மொழி?",
    },
    "lang_more": {
        "en": "More languages",
        "ms": "Bahasa lain",
        "zh": "其他语言",
        "ta": "பிற மொழிகள்",
    },
    "lang_more_body": {
        "en": "Choose your language.\nPilih bahasa. 请选择语言。 மொழியைத் தேர்வு செய்யவும்."
    },
    "ask_name": {
        "en": "Lovely! What should we call you? Type it, or send a voice note.",
        "ms": "Bagus! Kami patut panggil anda apa? Taip nama, atau hantar nota suara.",
        "zh": "太好了！我们怎么称呼您？可以打字，或发一条语音。",
        "ta": "அருமை! உங்களை எப்படி அழைக்கலாம்? பெயரை டைப் செய்யுங்கள், அல்லது குரல் செய்தி அனுப்புங்கள்.",
    },
    "ask_name_suggest": {
        "en": "Lovely! Shall we call you *{name}*?",
        "ms": "Bagus! Boleh kami panggil anda *{name}*?",
        "zh": "太好了！我们可以叫您 *{name}* 吗？",
        "ta": "அருமை! உங்களை *{name}* என்று அழைக்கலாமா?",
    },
    "other_name": {"en": "Another name", "ms": "Nama lain", "zh": "换个名字", "ta": "வேறு பெயர்"},
    "ask_name_type": {
        "en": "What should we call you? Type it, or send a voice note.",
        "ms": "Kami patut panggil anda apa? Taip nama, atau hantar nota suara.",
        "zh": "我们怎么称呼您？可以打字，或发一条语音。",
        "ta": "உங்களை எப்படி அழைக்கலாம்? பெயரை டைப் செய்யுங்கள், அல்லது குரல் செய்தி அனுப்புங்கள்.",
    },
    "ask_area": {
        "en": "Nice to meet you, {name}! Which area do you live in? For example: Bishan, Toa Payoh.",
        "ms": "Selamat berkenalan, {name}! Anda tinggal di kawasan mana? Contohnya: Bishan, Toa Payoh.",
        "zh": "很高兴认识您，{name}！您住在哪个地区？例如：碧山、大巴窑。",
        "ta": "உங்களைச் சந்தித்ததில் மகிழ்ச்சி, {name}! நீங்கள் எந்தப் பகுதியில் வசிக்கிறீர்கள்? உதாரணம்: Bishan, Toa Payoh.",
    },
    "area_confirm": {
        "en": "*{area}*, is that right?",
        "ms": "*{area}*, betul?",
        "zh": "是 *{area}* 吗？",
        "ta": "*{area}*, சரியா?",
    },
    "area_retry": {
        "en": "Sorry, I didn't find that area. Please type it again, for example: Ang Mo Kio.",
        "ms": "Maaf, saya tidak jumpa kawasan itu. Sila taip sekali lagi, contohnya: Ang Mo Kio.",
        "zh": "抱歉，没有找到这个地区。请再输入一次，例如：宏茂桥。",
        "ta": "மன்னிக்கவும், அந்தப் பகுதி கிடைக்கவில்லை. மீண்டும் டைப் செய்யுங்கள், உதாரணம்: Ang Mo Kio.",
    },
    "ask_interests": {
        "en": "What do you enjoy? Pick one. You can add more later.",
        "ms": "Apa yang anda suka? Pilih satu. Anda boleh tambah lagi nanti.",
        "zh": "您喜欢什么活动？选一个，以后可以再加。",
        "ta": "உங்களுக்கு எது பிடிக்கும்? ஒன்றைத் தேர்வு செய்யுங்கள். பிறகு மேலும் சேர்க்கலாம்.",
    },
    "choose": {"en": "Choose", "ms": "Pilih", "zh": "选择", "ta": "தேர்வு செய்க"},
    "onboard_done": {
        "en": "*You're in, {name}!* Every morning at 8 I'll ask how you are.\n\nWant to see walks near you now?",
        "ms": "*Anda sudah berdaftar, {name}!* Setiap pagi pukul 8 saya akan bertanya khabar anda.\n\nMahu lihat aktiviti jalan kaki berdekatan sekarang?",
        "zh": "*{name}，您已加入！* 每天早上8点我会问候您。\n\n现在想看看附近的散步活动吗？",
        "ta": "*{name}, நீங்கள் இணைந்துவிட்டீர்கள்!* தினமும் காலை 8 மணிக்கு உங்கள் நலம் விசாரிப்பேன்.\n\nஅருகிலுள்ள நடைப்பயிற்சிகளை இப்போது பார்க்க விரும்புகிறீர்களா?",
    },
    "yes_please": {"en": "Yes please", "ms": "Ya, boleh", "zh": "好的", "ta": "ஆம், காட்டுங்கள்"},
    "later": {"en": "Later", "ms": "Nanti", "zh": "以后再说", "ta": "பிறகு"},
    "say_menu": {
        "en": "Okay. Send *Menu* any time to see what I can do.",
        "ms": "Baik. Hantar *Menu* bila-bila masa untuk lihat apa yang saya boleh bantu.",
        "zh": "好的。随时发送 *菜单* 看看我能帮您做什么。",
        "ta": "சரி. நான் என்ன செய்ய முடியும் என்று பார்க்க எப்போது வேண்டுமானாலும் *Menu* அனுப்புங்கள்.",
    },
    "welcome_back": {
        "en": "*Welcome back, {name}.*",
        "ms": "*Selamat kembali, {name}.*",
        "zh": "*欢迎回来，{name}。*",
        "ta": "*மீண்டும் வருக, {name}.*",
    },
    # ---------- Invites ----------
    "invite_yes": {
        "en": "*Welcome, {name}!* {family} will be glad. Every morning at 8 I'll ask how you are.",
        "ms": "*Selamat datang, {name}!* {family} pasti gembira. Setiap pagi pukul 8 saya akan bertanya khabar anda.",
        "zh": "*欢迎您，{name}！* {family}一定很高兴。每天早上8点我会问候您。",
        "ta": "*வருக, {name}!* {family} மகிழ்ச்சி அடைவார். தினமும் காலை 8 மணிக்கு உங்கள் நலம் விசாரிப்பேன்.",
    },
    "invite_no": {
        "en": "No problem. If you change your mind, just say Hi.",
        "ms": "Tidak mengapa. Jika anda ubah fikiran, hantar sahaja Hi.",
        "zh": "没关系。如果您改变主意，发一声“你好”就可以。",
        "ta": "பரவாயில்லை. மனம் மாறினால், Hi என்று அனுப்புங்கள்.",
    },
    "invite_gone": {
        "en": "That invitation isn't open any more. Say Hi to join.",
        "ms": "Jemputan itu sudah tidak sah. Hantar Hi untuk menyertai.",
        "zh": "这个邀请已失效。发送“你好”即可加入。",
        "ta": "அந்த அழைப்பு இப்போது செல்லாது. இணைய Hi என்று அனுப்புங்கள்.",
    },
    "family_joined": {
        "en": "*{name} joined Bricks.* They said yes to your invitation.",
        "ms": "*{name} telah menyertai Bricks.* Mereka menerima jemputan anda.",
        "zh": "*{name}已加入 Bricks。* 已接受您的邀请。",
        "ta": "*{name} Bricks-இல் இணைந்தார்.* உங்கள் அழைப்பை ஏற்றுக்கொண்டார்.",
    },
    # ---------- Check-in ----------
    "checkin_now": {
        "en": "*Let's try it now, {name}.* Did you move yesterday?",
        "ms": "*Mari cuba sekarang, {name}.* Adakah anda bergerak semalam?",
        "zh": "*现在试试吧，{name}。* 您昨天有活动身体吗？",
        "ta": "*இப்போதே முயற்சிப்போம், {name}.* நேற்று நீங்கள் உடற்பயிற்சி செய்தீர்களா?",
    },
    "checkin_question": {
        "en": "Did you move yesterday?",
        "ms": "Adakah anda bergerak semalam?",
        "zh": "您昨天有活动身体吗？",
        "ta": "நேற்று நீங்கள் உடற்பயிற்சி செய்தீர்களா?",
    },
    "checkin_yes_streak": {
        "en": "*Wonderful!* {streak} days in a row. See you tomorrow!",
        "ms": "*Hebat!* {streak} hari berturut-turut. Jumpa esok!",
        "zh": "*太棒了！* 已连续{streak}天。明天见！",
        "ta": "*அருமை!* தொடர்ந்து {streak} நாட்கள். நாளை சந்திப்போம்!",
    },
    "checkin_yes": {
        "en": "*Wonderful!* See you tomorrow!",
        "ms": "*Hebat!* Jumpa esok!",
        "zh": "*太棒了！* 明天见！",
        "ta": "*அருமை!* நாளை சந்திப்போம்!",
    },
    "checkin_no_walk": {
        "en": "*No worries!* Walk with {going} neighbours {when}, {place}. Join?",
        "ms": "*Tidak mengapa!* Jalan kaki bersama {going} jiran {when}, {place}. Mahu sertai?",
        "zh": "*没关系！* {when}和{going}位邻居一起散步，地点：{place}。参加吗？",
        "ta": "*பரவாயில்லை!* {when} {going} அண்டை வீட்டாருடன் நடக்கலாம், {place}. சேர்கிறீர்களா?",
    },
    "checkin_no_rest": {
        "en": "*No worries!* Rest well today. I'll ask again tomorrow.",
        "ms": "*Tidak mengapa!* Berehatlah hari ini. Saya akan tanya lagi esok.",
        "zh": "*没关系！* 今天好好休息。明天我再问候您。",
        "ta": "*பரவாயில்லை!* இன்று நன்றாக ஓய்வெடுங்கள். நாளை மீண்டும் கேட்கிறேன்.",
    },
    "join_walk": {"en": "Join walk", "ms": "Sertai", "zh": "参加散步", "ta": "சேர்கிறேன்"},
    "maybe_later": {
        "en": "Maybe later",
        "ms": "Mungkin nanti",
        "zh": "下次吧",
        "ta": "பிறகு பார்க்கலாம்",
    },
    "later_ok": {
        "en": "Okay. I'm here if you change your mind. Send *Menu* any time.",
        "ms": "Baik. Saya ada di sini jika anda ubah fikiran. Hantar *Menu* bila-bila masa.",
        "zh": "好的。您改变主意时我都在。随时发送 *菜单*。",
        "ta": "சரி. மனம் மாறினால் நான் இங்கே இருக்கிறேன். எப்போது வேண்டுமானாலும் *Menu* அனுப்புங்கள்.",
    },
    "stale": {
        "en": "That was an earlier question. Today's is coming at 8.",
        "ms": "Itu soalan yang lepas. Soalan hari ini akan tiba pukul 8.",
        "zh": "那是之前的问题。今天的问候会在8点发出。",
        "ta": "அது முந்தைய கேள்வி. இன்றைய கேள்வி 8 மணிக்கு வரும்.",
    },
    # ---------- Events ----------
    "going": {
        "en": "*You're going!* {title}, {when}, {place}.",
        "ms": "*Anda akan hadir!* {title}, {when}, {place}.",
        "zh": "*您已报名！* {title}，{when}，{place}。",
        "ta": "*நீங்கள் வருகிறீர்கள்!* {title}, {when}, {place}.",
    },
    "group_link": {
        "en": "Here's the group to say hi: {link}",
        "ms": "Ini kumpulan untuk bertegur sapa: {link}",
        "zh": "这是活动群组，进去打个招呼吧：{link}",
        "ta": "வணக்கம் சொல்ல குழுவின் இணைப்பு: {link}",
    },
    "remind_at": {
        "en": "I'll remind you at {time}.",
        "ms": "Saya akan ingatkan anda pada {time}.",
        "zh": "我会在{time}提醒您。",
        "ta": "{time}க்கு நினைவூட்டுவேன்.",
    },
    "already_going": {
        "en": "You're already going to {title}. See you there.",
        "ms": "Anda sudah mendaftar untuk {title}. Jumpa di sana.",
        "zh": "您已经报名了{title}。到时见。",
        "ta": "நீங்கள் ஏற்கனவே {title}க்கு பதிவு செய்துள்ளீர்கள். அங்கே சந்திப்போம்.",
    },
    "event_gone": {
        "en": "Sorry, that event isn't on any more.",
        "ms": "Maaf, acara itu sudah tidak diadakan.",
        "zh": "抱歉，这个活动已取消或结束。",
        "ta": "மன்னிக்கவும், அந்த நிகழ்வு இப்போது இல்லை.",
    },
    "no_problem": {
        "en": "No problem.",
        "ms": "Tidak mengapa.",
        "zh": "没关系。",
        "ta": "பரவாயில்லை.",
    },
    "event_more": {
        "en": "*{title}*\n{when} · {place} · {going} going\nHosted by {host}\n\n{description}",
        "ms": "*{title}*\n{when} · {place} · {going} hadir\nHos: {host}\n\n{description}",
        "zh": "*{title}*\n{when} · {place} · {going}人参加\n主办：{host}\n\n{description}",
        "ta": "*{title}*\n{when} · {place} · {going} பேர் வருகிறார்கள்\nநடத்துபவர்: {host}\n\n{description}",
    },
    "im_going": {"en": "I'm going", "ms": "Saya hadir", "zh": "我参加", "ta": "நான் வருகிறேன்"},
    "not_this_time": {
        "en": "Not this time",
        "ms": "Kali ini tidak",
        "zh": "这次不了",
        "ta": "இந்த முறை இல்லை",
    },
    "see_you": {
        "en": "Great, see you there.",
        "ms": "Bagus, jumpa di sana.",
        "zh": "好的，到时见。",
        "ta": "நல்லது, அங்கே சந்திப்போம்.",
    },
    "cant_make_it": {
        "en": "Okay, I've taken you off the list. Maybe next time.",
        "ms": "Baik, nama anda sudah dikeluarkan dari senarai. Mungkin lain kali.",
        "zh": "好的，已为您取消报名。下次再来吧。",
        "ta": "சரி, பட்டியலிலிருந்து உங்களை நீக்கிவிட்டேன். அடுத்த முறை பார்க்கலாம்.",
    },
    "events_list": {
        "en": "*Coming up.* Pick one to see more.",
        "ms": "*Akan datang.* Pilih satu untuk maklumat lanjut.",
        "zh": "*近期活动。* 选择一个查看详情。",
        "ta": "*வரவிருப்பவை.* மேலும் அறிய ஒன்றைத் தேர்வு செய்யுங்கள்.",
    },
    "events_button": {"en": "See events", "ms": "Lihat acara", "zh": "查看活动", "ta": "நிகழ்வுகள்"},
    "no_events": {
        "en": "Nothing is coming up right now. I'll tell you when there's something new.",
        "ms": "Tiada acara buat masa ini. Saya akan beritahu bila ada yang baru.",
        "zh": "目前没有活动。有新活动时我会告诉您。",
        "ta": "இப்போது நிகழ்வுகள் எதுவும் இல்லை. புதிதாக வந்தால் சொல்கிறேன்.",
    },
    # ---------- Reminders ----------
    "done": {"en": "Done", "ms": "Selesai", "zh": "完成", "ta": "முடிந்தது"},
    "snooze": {
        "en": "Snooze 10 min",
        "ms": "Tunda 10 minit",
        "zh": "10分钟后提醒",
        "ta": "10 நிமிடம் கழித்து",
    },
    "rem_done": {"en": "*Well done.*", "ms": "*Syabas.*", "zh": "*做得好。*", "ta": "*நன்று.*"},
    "rem_snoozed": {
        "en": "Okay, I'll remind you again in 10 minutes.",
        "ms": "Baik, saya akan ingatkan lagi dalam 10 minit.",
        "zh": "好的，10分钟后我再提醒您。",
        "ta": "சரி, 10 நிமிடத்தில் மீண்டும் நினைவூட்டுகிறேன்.",
    },
    "rem_gone": {
        "en": "That reminder isn't on any more.",
        "ms": "Peringatan itu sudah tiada.",
        "zh": "这个提醒已不存在。",
        "ta": "அந்த நினைவூட்டல் இப்போது இல்லை.",
    },
    "rem_confirm": {
        "en": "*Shall I remind you?*\n{text}, {time}, {repeat}.",
        "ms": "*Mahu saya ingatkan?*\n{text}, {time}, {repeat}.",
        "zh": "*要我提醒您吗？*\n{text}，{time}，{repeat}。",
        "ta": "*நினைவூட்டட்டுமா?*\n{text}, {time}, {repeat}.",
    },
    "rem_created": {
        "en": "*Done.* I'll remind you: {text}, {time}, {repeat}.",
        "ms": "*Siap.* Saya akan ingatkan: {text}, {time}, {repeat}.",
        "zh": "*好了。* 我会提醒您：{text}，{time}，{repeat}。",
        "ta": "*சரி.* நினைவூட்டுவேன்: {text}, {time}, {repeat}.",
    },
    "repeat_daily": {"en": "every day", "ms": "setiap hari", "zh": "每天", "ta": "தினமும்"},
    "repeat_weekdays": {
        "en": "on weekdays",
        "ms": "hari bekerja",
        "zh": "工作日",
        "ta": "வார நாட்களில்",
    },
    "repeat_once": {"en": "once", "ms": "sekali", "zh": "一次", "ta": "ஒரு முறை"},
    "reminders_none": {
        "en": "You have no reminders yet. Send a voice note like: remind me to take my medicine at 8 am.",
        "ms": "Anda belum ada peringatan. Hantar nota suara seperti: ingatkan saya makan ubat pukul 8 pagi.",
        "zh": "您还没有提醒。可以发语音，例如：早上8点提醒我吃药。",
        "ta": "இன்னும் நினைவூட்டல்கள் இல்லை. இப்படி குரல் செய்தி அனுப்புங்கள்: காலை 8 மணிக்கு மருந்து சாப்பிட நினைவூட்டு.",
    },
    "reminders_list": {
        "en": "*Your reminders*\n{lines}",
        "ms": "*Peringatan anda*\n{lines}",
        "zh": "*您的提醒*\n{lines}",
        "ta": "*உங்கள் நினைவூட்டல்கள்*\n{lines}",
    },
    "okay_wont": {
        "en": "Okay, I won't.",
        "ms": "Baik, saya tidak akan.",
        "zh": "好的，那就不设了。",
        "ta": "சரி, வேண்டாம்.",
    },
    # ---------- SOS ----------
    "sos_now": {
        "en": "*Help is coming.* If you can, call 995 now. I'm telling {names}.",
        "ms": "*Bantuan sedang datang.* Jika boleh, hubungi 995 sekarang. Saya sedang memberitahu {names}.",
        "zh": "*正在为您求助。* 如果可以，请立即拨打995。我正在通知{names}。",
        "ta": "*உதவி வருகிறது.* முடிந்தால், இப்போதே 995 அழையுங்கள். {names} அவர்களுக்குத் தெரிவிக்கிறேன்.",
    },
    "sos_no_circle": {
        "en": "*Please call 995 now.* You have no Safe Circle yet, so I can't tell anyone else.",
        "ms": "*Sila hubungi 995 sekarang.* Anda belum ada Bulatan Selamat, jadi saya tidak dapat memberitahu orang lain.",
        "zh": "*请立即拨打995。* 您还没有设置安全圈，所以我无法通知其他人。",
        "ta": "*இப்போதே 995 அழையுங்கள்.* உங்களுக்கு இன்னும் பாதுகாப்பு வட்டம் இல்லை, அதனால் வேறு யாருக்கும் தெரிவிக்க முடியவில்லை.",
    },
    "and": {"en": " and ", "ms": " dan ", "zh": "和", "ta": " மற்றும் "},
    "your_neighbours": {
        "en": "your neighbours",
        "ms": "jiran anda",
        "zh": "您的邻居",
        "ta": "உங்கள் அண்டை வீட்டார்",
    },
    "im_ok_now": {
        "en": "I'm OK now",
        "ms": "Saya OK sekarang",
        "zh": "我现在没事",
        "ta": "இப்போது நலம்",
    },
    "call_name": {
        "en": "Call {name}",
        "ms": "Hubungi {name}",
        "zh": "打给{name}",
        "ta": "{name}-ஐ அழை",
    },
    "sos_share_location": {
        "en": "*Please share your location*, so your helpers can find you.",
        "ms": "*Sila kongsi lokasi anda*, supaya pembantu dapat mencari anda.",
        "zh": "*请分享您的位置*，方便前来帮忙的人找到您。",
        "ta": "*உங்கள் இருப்பிடத்தைப் பகிருங்கள்*, உதவுபவர்கள் உங்களைக் கண்டுபிடிக்க.",
    },
    "sos_share_location_text": {
        "en": "*Please share your location*: tap the + or paperclip button, then Location.",
        "ms": "*Sila kongsi lokasi anda*: tekan butang + atau klip kertas, kemudian Lokasi.",
        "zh": "*请分享您的位置*：点击 + 或回形针按钮，再选“位置”。",
        "ta": "*உங்கள் இருப்பிடத்தைப் பகிருங்கள்*: + அல்லது காகிதக் கிளிப் பொத்தானைத் தட்டி, Location தேர்வு செய்யுங்கள்.",
    },
    "sos_location_thanks": {
        "en": "Thank you. Your helpers can see where you are.",
        "ms": "Terima kasih. Pembantu anda boleh lihat lokasi anda.",
        "zh": "谢谢。帮忙的人可以看到您的位置了。",
        "ta": "நன்றி. உதவுபவர்கள் நீங்கள் இருக்கும் இடத்தைப் பார்க்கலாம்.",
    },
    "sos_on_way": {
        "en": "*{name} is on the way.*",
        "ms": "*{name} sedang dalam perjalanan.*",
        "zh": "*{name}正在赶来。*",
        "ta": "*{name} வந்துகொண்டிருக்கிறார்.*",
    },
    "sos_on_way_near": {
        "en": "*{name} ({distance} m away) is on the way.*",
        "ms": "*{name} ({distance} m dari anda) sedang dalam perjalanan.*",
        "zh": "*{name}（距您{distance}米）正在赶来。*",
        "ta": "*{name} ({distance} மீ தொலைவில்) வந்துகொண்டிருக்கிறார்.*",
    },
    "sos_ok": {
        "en": "*Glad you're okay.* I've told your Safe Circle.",
        "ms": "*Syukur anda selamat.* Saya sudah memberitahu Bulatan Selamat anda.",
        "zh": "*您没事就好。* 我已通知您的安全圈。",
        "ta": "*நீங்கள் நலமாக இருப்பதில் மகிழ்ச்சி.* உங்கள் பாதுகாப்பு வட்டத்திற்குத் தெரிவித்துவிட்டேன்.",
    },
    "tap_to_call": {
        "en": "Tap to call {name}: {phone}",
        "ms": "Tekan untuk hubungi {name}: {phone}",
        "zh": "点击拨打给{name}：{phone}",
        "ta": "{name}-ஐ அழைக்கத் தட்டுங்கள்: {phone}",
    },
    "helper_thanks": {
        "en": "*Thank you.* I've told {name} you're on the way.",
        "ms": "*Terima kasih.* Saya sudah beritahu {name} anda dalam perjalanan.",
        "zh": "*谢谢您。* 我已告诉{name}您正在赶去。",
        "ta": "*நன்றி.* நீங்கள் வருவதாக {name}-இடம் சொல்லிவிட்டேன்.",
    },
    "helper_closed": {
        "en": "Thank you. This alert is closed: {name} is okay now.",
        "ms": "Terima kasih. Amaran ini sudah ditutup: {name} sudah selamat.",
        "zh": "谢谢。此求助已结束：{name}现在没事了。",
        "ta": "நன்றி. இந்த எச்சரிக்கை முடிந்தது: {name} இப்போது நலமாக இருக்கிறார்.",
    },
    "helper_all_clear": {
        "en": "*{name} says they're okay now.* Thank you for being there.",
        "ms": "*{name} kata mereka sudah okay.* Terima kasih kerana prihatin.",
        "zh": "*{name}说现在没事了。* 谢谢您的关心。",
        "ta": "*{name} இப்போது நலமாக இருப்பதாகச் சொல்கிறார்.* அக்கறைக்கு நன்றி.",
    },
    "nudge_ok": {
        "en": "*Thank you.* Glad you're okay.",
        "ms": "*Terima kasih.* Syukur anda okay.",
        "zh": "*谢谢。* 您没事就好。",
        "ta": "*நன்றி.* நீங்கள் நலமாக இருப்பதில் மகிழ்ச்சி.",
    },
    "family_check_ack": {
        "en": "Thank you for checking on {name}.",
        "ms": "Terima kasih kerana bertanya khabar {name}.",
        "zh": "谢谢您去关心{name}。",
        "ta": "{name}-இன் நலம் விசாரித்ததற்கு நன்றி.",
    },
    # ---------- STOP / START ----------
    "stopped": {
        "en": "Okay, messages are paused. Send START to turn them back on.",
        "ms": "Baik, mesej dihentikan seketika. Hantar START untuk menghidupkannya semula.",
        "zh": "好的，消息已暂停。发送 START 可重新开启。",
        "ta": "சரி, செய்திகள் நிறுத்தப்பட்டன. மீண்டும் தொடங்க START அனுப்புங்கள்.",
    },
    "started": {
        "en": "*Welcome back.* Messages are on again.",
        "ms": "*Selamat kembali.* Mesej dihidupkan semula.",
        "zh": "*欢迎回来。* 消息已重新开启。",
        "ta": "*மீண்டும் வருக.* செய்திகள் மீண்டும் தொடங்கின.",
    },
    # ---------- Menu ----------
    "menu_body": {
        "en": "*What would you like to do?*",
        "ms": "*Apa yang anda mahu buat?*",
        "zh": "*您想做什么？*",
        "ta": "*என்ன செய்ய விரும்புகிறீர்கள்?*",
    },
    "menu_button": {"en": "Menu", "ms": "Menu", "zh": "菜单", "ta": "மெனு"},
    "m_today": {"en": "Today", "ms": "Hari ini", "zh": "今天", "ta": "இன்று"},
    "m_events": {"en": "Find events", "ms": "Cari acara", "zh": "找活动", "ta": "நிகழ்வுகள்"},
    "m_reminders": {"en": "Reminders", "ms": "Peringatan", "zh": "提醒", "ta": "நினைவூட்டல்கள்"},
    "m_progress": {
        "en": "My progress",
        "ms": "Kemajuan saya",
        "zh": "我的进展",
        "ta": "என் முன்னேற்றம்",
    },
    "m_help": {"en": "Help", "ms": "Bantuan", "zh": "求助", "ta": "உதவி"},
    "m_help_desc": {
        "en": "Tell my Safe Circle I need help",
        "ms": "Beritahu Bulatan Selamat saya perlukan bantuan",
        "zh": "通知我的安全圈我需要帮助",
        "ta": "எனக்கு உதவி தேவை என்று சொல்",
    },
    "m_language": {"en": "Language", "ms": "Bahasa", "zh": "语言", "ta": "மொழி"},
    "help_confirm": {
        "en": "*Do you need help now?* I'll tell your Safe Circle.",
        "ms": "*Anda perlukan bantuan sekarang?* Saya akan beritahu Bulatan Selamat anda.",
        "zh": "*您现在需要帮助吗？* 我会通知您的安全圈。",
        "ta": "*உங்களுக்கு இப்போது உதவி தேவையா?* உங்கள் பாதுகாப்பு வட்டத்திற்குச் சொல்கிறேன்.",
    },
    "yes_help": {
        "en": "Yes, I need help",
        "ms": "Ya, perlu bantuan",
        "zh": "是，我需要帮助",
        "ta": "ஆம், உதவி தேவை",
    },
    "no_im_ok": {
        "en": "No, I'm OK",
        "ms": "Tidak, saya OK",
        "zh": "不用，我没事",
        "ta": "இல்லை, நலம்",
    },
    "today_checkin_pending": {
        "en": "Check-in: not answered yet.",
        "ms": "Daftar masuk: belum dijawab.",
        "zh": "今日问候：尚未回答。",
        "ta": "இன்றைய நலம் விசாரிப்பு: இன்னும் பதில் இல்லை.",
    },
    "today_checkin_done": {
        "en": "Check-in: done. {streak}-day streak.",
        "ms": "Daftar masuk: selesai. {streak} hari berturut-turut.",
        "zh": "今日问候：已完成。连续{streak}天。",
        "ta": "இன்றைய நலம் விசாரிப்பு: முடிந்தது. தொடர்ந்து {streak} நாட்கள்.",
    },
    "today_reminder": {
        "en": "Next reminder: {time}, {text}.",
        "ms": "Peringatan seterusnya: {time}, {text}.",
        "zh": "下一个提醒：{time}，{text}。",
        "ta": "அடுத்த நினைவூட்டல்: {time}, {text}.",
    },
    "today_event": {
        "en": "Next event: {title}, {when}.",
        "ms": "Acara seterusnya: {title}, {when}.",
        "zh": "下一个活动：{title}，{when}。",
        "ta": "அடுத்த நிகழ்வு: {title}, {when}.",
    },
    "today_title": {"en": "*Today*", "ms": "*Hari ini*", "zh": "*今天*", "ta": "*இன்று*"},
    "progress": {
        "en": "*Your week:* {km} km walked in {walks} walks. {streak}-day check-in streak. {thanks} thank-yous.",
        "ms": "*Minggu anda:* {km} km berjalan dalam {walks} kali. {streak} hari berturut-turut. {thanks} ucapan terima kasih.",
        "zh": "*您的本周：* 散步{walks}次，共{km}公里。连续问候{streak}天。收到{thanks}次感谢。",
        "ta": "*உங்கள் வாரம்:* {walks} நடைகளில் {km} கி.மீ. தொடர்ந்து {streak} நாட்கள். {thanks} நன்றிகள்.",
    },
    "language_set": {
        "en": "Okay, I'll speak English from now on.",
        "ms": "Baik, saya akan guna Bahasa Melayu mulai sekarang.",
        "zh": "好的，从现在起我会用中文。",
        "ta": "சரி, இனி தமிழில் பேசுவேன்.",
    },
    # ---------- Assistant and voice ----------
    "didnt_understand": {
        "en": "Sorry, I didn't catch that. Here's what I can do:",
        "ms": "Maaf, saya kurang faham. Ini yang saya boleh bantu:",
        "zh": "抱歉，我没听明白。我可以帮您做这些：",
        "ta": "மன்னிக்கவும், புரியவில்லை. நான் செய்யக்கூடியவை:",
    },
    "voice_failed": {
        "en": "Sorry, I couldn't hear that clearly. Please try again, or type it.",
        "ms": "Maaf, saya kurang jelas mendengarnya. Sila cuba lagi, atau taip.",
        "zh": "抱歉，没听清楚。请再试一次，或者打字。",
        "ta": "மன்னிக்கவும், தெளிவாகக் கேட்கவில்லை. மீண்டும் முயலுங்கள், அல்லது டைப் செய்யுங்கள்.",
    },
    "you_said": {
        "en": "You said: {text}",
        "ms": "Anda kata: {text}",
        "zh": "您说：{text}",
        "ta": "நீங்கள் சொன்னது: {text}",
    },
    "yes": {"en": "Yes", "ms": "Ya", "zh": "是", "ta": "ஆம்"},
    "no": {"en": "No", "ms": "Tidak", "zh": "不是", "ta": "இல்லை"},
    "choose_number": {
        "en": "Reply with a number.",
        "ms": "Balas dengan nombor.",
        "zh": "请回复数字。",
        "ta": "எண்ணை அனுப்புங்கள்.",
    },
    "expired": {
        "en": "That question has expired. Send *Menu* to start again.",
        "ms": "Soalan itu sudah tamat. Hantar *Menu* untuk mula semula.",
        "zh": "这个问题已过期。发送 *菜单* 重新开始。",
        "ta": "அந்தக் கேள்வி காலாவதியானது. மீண்டும் தொடங்க *Menu* அனுப்புங்கள்.",
    },
    "walk_morning": {"en": "Morning walk", "ms": "Jalan pagi", "zh": "早晨散步", "ta": "காலை நடை"},
    "walk_afternoon": {
        "en": "Afternoon walk",
        "ms": "Jalan petang",
        "zh": "午后散步",
        "ta": "மதிய நடை",
    },
    "walk_evening": {"en": "Evening walk", "ms": "Jalan malam", "zh": "傍晚散步", "ta": "மாலை நடை"},
    "walk_summary": {
        "en": "*{name}, well done.* {title}: {km} km in {minutes} min.",
        "ms": "*{name}, syabas.* {title}: {km} km dalam {minutes} minit.",
        "zh": "*{name}，做得好。* {title}：{minutes}分钟走了{km}公里。",
        "ta": "*{name}, நன்று.* {title}: {minutes} நிமிடத்தில் {km} கி.மீ.",
    },
}

INTERESTS: dict[str, dict[str, str]] = {
    "walking": {"en": "Walking", "ms": "Berjalan", "zh": "散步", "ta": "நடைப்பயிற்சி"},
    "taichi": {"en": "Tai Chi", "ms": "Tai Chi", "zh": "太极", "ta": "தாய் சி"},
    "cooking": {"en": "Cooking", "ms": "Memasak", "zh": "烹饪", "ta": "சமையல்"},
    "chess": {"en": "Chess", "ms": "Catur", "zh": "象棋", "ta": "சதுரங்கம்"},
    "music": {"en": "Music", "ms": "Muzik", "zh": "音乐", "ta": "இசை"},
    "gardening": {"en": "Gardening", "ms": "Berkebun", "zh": "园艺", "ta": "தோட்டம்"},
    "teaching": {"en": "Teaching", "ms": "Mengajar", "zh": "教学", "ta": "கற்பித்தல்"},
    "technology": {"en": "Technology", "ms": "Teknologi", "zh": "科技", "ta": "தொழில்நுட்பம்"},
}

LANGUAGE_NAMES = {"en": "English", "ms": "Bahasa Melayu", "zh": "中文", "ta": "தமிழ்"}

_DAYS = {
    "en": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "ms": ["Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu", "Ahad"],
    "zh": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
    "ta": ["திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி", "ஞாயிறு"],
}
_TODAY = {"en": "today", "ms": "hari ini", "zh": "今天", "ta": "இன்று"}
_TOMORROW = {"en": "tomorrow", "ms": "esok", "zh": "明天", "ta": "நாளை"}


def t(lang: str, key: str, **values: object) -> str:
    """The message in the member's language (English when a translation is missing)."""
    texts = S[key]
    return texts.get(lang, texts["en"]).format(**values)


def interest(lang: str, key: str) -> str:
    return INTERESTS[key].get(lang, INTERESTS[key]["en"])


def clock(dt: datetime, lang: str) -> str:
    """ "7 am", "6:30 pm" in Singapore time, said the local way."""
    d = local(dt)
    h, m = d.hour, d.minute
    h12 = h % 12 or 12
    mm = f":{m:02d}" if m else ""
    if lang == "ms":
        part = "pagi" if h < 12 else "petang" if h < 19 else "malam"
        return f"{h12}{mm.replace(':', '.')} {part}"
    if lang == "zh":
        part = "上午" if h < 12 else "下午" if h < 18 else "晚上"
        return f"{part}{h12}点{f'{m:02d}分' if m else ''}"
    if lang == "ta":
        part = "காலை" if h < 12 else "மதியம்" if h < 16 else "மாலை" if h < 19 else "இரவு"
        return f"{part} {h12}{mm}"
    return f"{h12}{mm} {'am' if h < 12 else 'pm'}"


def when(dt: datetime, now: datetime, lang: str) -> str:
    """ "today, 6 pm" / "tomorrow, 7 am" / "Sat, 9 am"."""
    day, today = local(dt).date(), local(now).date()
    if day == today:
        name = _TODAY.get(lang, _TODAY["en"])
    elif (day - today).days == 1:
        name = _TOMORROW.get(lang, _TOMORROW["en"])
    else:
        name = _DAYS.get(lang, _DAYS["en"])[day.weekday()]
    sep = "" if lang == "zh" else ", "
    return f"{name}{sep}{clock(dt, lang)}"


def join_names(names: list[str], lang: str) -> str:
    if len(names) <= 1:
        return "".join(names)
    sep = "、" if lang == "zh" else ", "
    return sep.join(names[:-1]) + t(lang, "and") + names[-1]
