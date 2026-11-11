"""The approved-template messages: anything we send first (docs/06 §4, iterations 1.1–1.2).

Each template is defined once here, in 4 languages. The same text is used:
- to submit it to Meta (`python -m bricks_api.whatsapp.submit_templates`), and
- as the free-form message sent instead inside the 24-hour window or on the
  Twilio sandbox, which can't use Meta templates (iteration 1.2 §2.4).

Meta's rules we follow: UTILITY wording, a body that neither starts nor ends with
a variable, quick-reply buttons of at most 20 characters, sample values for
every variable, and the STOP footer.
"""

from dataclasses import dataclass

from .models import Buttons, Choice, Template, Text

FOOTER = {
    "en": "Reply STOP to pause messages.",
    "ms": "Balas STOP untuk menghentikan mesej.",
    "zh": "回复 STOP 可暂停消息。",
    "ta": "செய்திகளை நிறுத்த STOP என பதில் அனுப்பவும்.",
}


@dataclass(frozen=True)
class Def:
    params: list[str]  # what {{1}}, {{2}}… are
    examples: list[str]
    body: dict[str, str]
    buttons: dict[str, list[str]]


DEFS: dict[str, Def] = {
    "welcome_invite_family": Def(
        params=["senior_name", "family_name"],
        examples=["Raj", "Priya"],
        body={
            "en": "*Hello {{1}}.* {{2}} set up Bricks for you. It helps you join walks and activities nearby, and lets your family know you're well. Would you like to join?",
            "ms": "*Salam {{1}}.* {{2}} telah menyediakan Bricks untuk anda. Ia membantu anda menyertai aktiviti jalan kaki dan aktiviti lain berdekatan, dan memberitahu keluarga anda bahawa anda sihat. Mahu sertai?",
            "zh": "*您好，{{1}}。* {{2}}为您开通了 Bricks。它可以帮您参加附近的散步和活动，也让家人知道您一切安好。您想加入吗？",
            "ta": "*வணக்கம் {{1}}.* {{2}} உங்களுக்காக Bricks-ஐ அமைத்துள்ளார். அருகிலுள்ள நடைப்பயிற்சிகளிலும் நிகழ்வுகளிலும் சேர இது உதவும், நீங்கள் நலமாக இருப்பதைக் குடும்பத்தினருக்குத் தெரிவிக்கும். இணைய விரும்புகிறீர்களா?",
        },
        buttons={
            "en": ["Yes", "No"],
            "ms": ["Ya", "Tidak"],
            "zh": ["是", "不是"],
            "ta": ["ஆம்", "இல்லை"],
        },
    ),
    "welcome_invite_org": Def(
        params=["org_name"],
        examples=["Bishan Community Club"],
        body={
            "en": "*Invitation:* {{1}} invited you to Bricks. Join to see activities near you and get reminders. Would you like to join?",
            "ms": "*Jemputan:* {{1}} menjemput anda ke Bricks. Sertai untuk melihat aktiviti berdekatan dan menerima peringatan. Mahu sertai?",
            "zh": "*邀请：* {{1}}邀请您加入 Bricks。加入后可以查看附近的活动并收到提醒。您想加入吗？",
            "ta": "*அழைப்பு:* {{1}} உங்களை Bricks-க்கு அழைத்துள்ளது. அருகிலுள்ள நிகழ்வுகளைப் பார்க்கவும் நினைவூட்டல்கள் பெறவும் இணையுங்கள். இணைய விரும்புகிறீர்களா?",
        },
        buttons={
            "en": ["Yes", "No"],
            "ms": ["Ya", "Tidak"],
            "zh": ["是", "不是"],
            "ta": ["ஆம்", "இல்லை"],
        },
    ),
    "daily_checkin": Def(
        params=["name"],
        examples=["Raj"],
        body={
            "en": "*Good morning {{1}}.* Did you move yesterday?",
            "ms": "*Selamat pagi {{1}}.* Adakah anda bergerak semalam?",
            "zh": "*早上好，{{1}}。* 您昨天有活动身体吗？",
            "ta": "*காலை வணக்கம் {{1}}.* நேற்று நீங்கள் உடற்பயிற்சி செய்தீர்களா?",
        },
        buttons={
            "en": ["Yes", "No"],
            "ms": ["Ya", "Tidak"],
            "zh": ["有", "没有"],
            "ta": ["ஆம்", "இல்லை"],
        },
    ),
    "checkin_nudge": Def(
        params=["name"],
        examples=["Raj"],
        body={
            "en": "*Just checking in, {{1}}.* Are you okay?",
            "ms": "*Sekadar bertanya khabar, {{1}}.* Anda okay?",
            "zh": "*来问候一下，{{1}}。* 您还好吗？",
            "ta": "*நலம் விசாரிக்கிறேன், {{1}}.* நீங்கள் நலமா?",
        },
        buttons={
            "en": ["I'm OK", "Need help"],
            "ms": ["Saya OK", "Perlu bantuan"],
            "zh": ["我没事", "需要帮助"],
            "ta": ["நலம்", "உதவி தேவை"],
        },
    ),
    "event_invite": Def(
        params=["title", "when", "place", "going_count", "host"],
        examples=[
            "Morning walk with Bishan Walkers",
            "Tomorrow, 7 am",
            "Bishan Park Gate 2",
            "12",
            "Raj",
        ],
        body={
            "en": "*Invitation: {{1}}*\n{{2}} · {{3}} · {{4}} going\nHosted by {{5}}. Would you like to join?",
            "ms": "*Jemputan: {{1}}*\nMasa: {{2}}\nTempat: {{3}}\nSeramai {{4}} orang akan hadir. Acara ini dianjurkan oleh {{5}}. Mahu sertai bersama kami?",
            "zh": "*活动邀请：{{1}}*\n时间：{{2}}\n地点：{{3}}\n已有{{4}}人报名参加。本活动由{{5}}主办。欢迎您一起来，您想参加吗？",
            "ta": "*அழைப்பு: {{1}}*\nநேரம்: {{2}}\nஇடம்: {{3}}\nஏற்கனவே {{4}} பேர் வருகிறார்கள். இதை நடத்துபவர் {{5}}. எங்களுடன் சேர விரும்புகிறீர்களா?",
        },
        buttons={
            "en": ["I'm going", "Not this time", "Tell me more"],
            "ms": ["Saya hadir", "Kali ini tidak", "Maklumat lanjut"],
            "zh": ["我参加", "这次不了", "了解更多"],
            "ta": ["நான் வருகிறேன்", "இந்த முறை இல்லை", "மேலும் அறிய"],
        },
    ),
    "event_reminder": Def(
        params=["title", "time", "place"],
        examples=["Morning walk", "7 am", "Bishan Park Gate 2"],
        body={
            "en": "*Reminder: {{1}}* starts at {{2}} at {{3}}. See you there.",
            "ms": "*Peringatan: {{1}}* bermula pada {{2}} di {{3}}. Jumpa di sana.",
            "zh": "*提醒：{{1}}* 将于{{2}}在{{3}}开始。到时见。",
            "ta": "*நினைவூட்டல்: {{1}}* நிகழ்வு {{2}}க்கு {{3}} என்ற இடத்தில் தொடங்கும். தவறாமல் வாருங்கள், அங்கே சந்திப்போம்.",
        },
        buttons={
            "en": ["On my way", "Can't make it"],
            "ms": ["Dalam perjalanan", "Tidak dapat hadir"],
            "zh": ["我在路上", "去不了"],
            "ta": ["வருகிறேன்", "வர முடியாது"],
        },
    ),
    "reminder": Def(
        params=["time", "text", "name"],
        examples=["8 am", "Take your medicine", "Mdm Tan"],
        body={
            "en": "*Reminder for {{3}}:* {{2}}, {{1}}. Tap Done when you have finished.",
            "ms": "*Peringatan untuk {{3}}:* {{2}}, pada pukul {{1}}. Sila tekan butang Selesai apabila anda sudah melakukannya.",
            "zh": "*给{{3}}的提醒：* {{2}}，{{1}}。完成后请点“完成”。",
            "ta": "*நினைவூட்டல், {{3}}:* {{2}}, நேரம் {{1}}. இதைச் செய்து முடித்ததும் கீழே உள்ள முடிந்தது பொத்தானைத் தட்டுங்கள்.",
        },
        buttons={
            "en": ["Done", "Snooze 10 min"],
            "ms": ["Selesai", "Tunda 10 minit"],
            "zh": ["完成", "10分钟后提醒"],
            "ta": ["முடிந்தது", "10 நிமிடம் கழித்து"],
        },
    ),
    "thank_you_prompt": Def(
        params=["host_name", "event_title"],
        examples=["Raj", "Morning walk"],
        body={
            "en": "*How was {{2}}?* You can thank {{1}} with one tap, or send a voice note.",
            "ms": "*Bagaimana {{2}}?* Anda boleh berterima kasih kepada {{1}} dengan satu tekan, atau hantar nota suara.",
            "zh": "*您觉得{{2}}怎么样？* 点一下就可以感谢{{1}}，也可以发一条语音。",
            "ta": "*நிகழ்ச்சி: {{2}}.* அது எப்படி இருந்தது? ஒரே தட்டலில் {{1}}-க்கு நன்றி சொல்லலாம், அல்லது குரல் செய்தி அனுப்பலாம்.",
        },
        buttons={
            "en": ["Thank", "Skip"],
            "ms": ["Terima kasih", "Langkau"],
            "zh": ["感谢", "跳过"],
            "ta": ["நன்றி", "தவிர்"],
        },
    ),
    "sos_alert": Def(
        params=["name", "map_link", "time"],
        examples=["Raj", "https://maps.google.com/?q=1.3508,103.8485", "8:42 am"],
        body={
            "en": "*Urgent: {{1}} needs help.* Location: {{2}}\nSent at {{3}}. If you can, go to them or call them. In an emergency, call 995.",
            "ms": "*Segera: {{1}} perlukan bantuan.* Lokasi: {{2}}\nDihantar pada {{3}}. Jika boleh, pergi ke sana atau hubungi mereka. Jika kecemasan, hubungi 995.",
            "zh": "*紧急：{{1}}需要帮助。* 位置：{{2}}\n发送时间：{{3}}。如果可以，请前往或致电。紧急情况请拨打995。",
            "ta": "*அவசரம்: {{1}}-க்கு உதவி தேவை.* இருப்பிடம்: {{2}}\n{{3}}க்கு அனுப்பப்பட்டது. முடிந்தால், அவரிடம் செல்லுங்கள் அல்லது அழையுங்கள். அவசரநிலையில் 995 அழையுங்கள்.",
        },
        buttons={
            "en": ["I'm on my way", "Call them"],
            "ms": ["Saya datang", "Hubungi mereka"],
            "zh": ["我马上去", "打电话"],
            "ta": ["வருகிறேன்", "அழை"],
        },
    ),
    "family_missed_checkin": Def(
        params=["senior_name"],
        examples=["Raj"],
        body={
            "en": "*Check-in missed:* {{1}} hasn't answered today's check-in. Could you check on them?",
            "ms": "*Daftar masuk terlepas:* {{1}} belum menjawab soalan hari ini. Boleh anda bertanya khabar?",
            "zh": "*未回复问候：* {{1}}今天还没有回复问候。您能去关心一下吗？",
            "ta": "*நலம் விசாரிப்புக்கு பதில் இல்லை:* {{1}} இன்றைய கேள்விக்கு பதிலளிக்கவில்லை. நலம் விசாரிக்க முடியுமா?",
        },
        buttons={
            "en": ["Call", "I'll check"],
            "ms": ["Hubungi", "Saya akan semak"],
            "zh": ["打电话", "我去看看"],
            "ta": ["அழை", "நான் பார்க்கிறேன்"],
        },
    ),
    "weekly_joy_report": Def(
        params=["senior_name", "walks", "taught", "thanks"],
        examples=["Raj", "3", "1", "4"],
        body={
            "en": "*This week, {{1}}* joined {{2}} walks, taught {{3}} time(s) and got {{4}} thank-yous. See more in the app.",
            "ms": "*Minggu ini, {{1}}* menyertai {{2}} aktiviti jalan kaki, mengajar {{3}} kali dan menerima {{4}} ucapan terima kasih. Lihat lagi dalam aplikasi.",
            "zh": "*本周，{{1}}* 参加了{{2}}次散步，教了{{3}}次课，收到{{4}}次感谢。在应用中查看更多。",
            "ta": "*இந்த வாரம், {{1}}* {{2}} நடைகளில் கலந்துகொண்டார், {{3}} முறை கற்பித்தார், {{4}} நன்றிகள் பெற்றார். செயலியில் மேலும் பாருங்கள்.",
        },
        buttons={"en": ["See more"], "ms": ["Lihat lagi"], "zh": ["查看更多"], "ta": ["மேலும் பார்"]},
    ),
}


def fill(text: str, params: list[str]) -> str:
    for i, value in enumerate(params, start=1):
        text = text.replace(f"{{{{{i}}}}}", value)
    return text


def build(name: str, lang: str, params: list[str], payloads: list[str]) -> Template:
    """The template message, with its free-form twin for the 24-hour window and Twilio."""
    d = DEFS[name]
    assert len(params) == len(d.params), f"{name} takes {d.params}"
    assert len(payloads) == len(d.buttons["en"]), f"{name} has {len(d.buttons['en'])} buttons"
    lang = lang if lang in d.body else "en"
    body = fill(d.body[lang], params)
    choices = [Choice(p, label) for p, label in zip(payloads, d.buttons[lang], strict=True)]
    fallback: Buttons | Text = Buttons(body, choices) if choices else Text(body)
    return Template(name=name, language=lang, params=params, payloads=payloads, fallback=fallback)
