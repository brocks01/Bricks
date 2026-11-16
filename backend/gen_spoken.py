import pathlib
langs = [("en","English"),("hi","हिन्दी"),("bn","বাংলা"),("ta","தமிழ்"),("te","తెలుగు"),("mr","मराठी"),("gu","ગુજરાતી"),("kn","ಕನ್ನಡ"),("ml","മലയാളം"),("pa","ਪੰਜਾਬੀ"),("ur","اردو"),("or","ଓଡ଼ିଆ"),("as","অসমীয়া"),("bho","भोजपुरी"),("mai","मैथिली"),("ne","नेपाली"),("kok","कोंकणी"),("zh","中文"),("yue","粵語"),("nan","閩南語"),("teo","潮州话"),("ms","Bahasa Melayu"),("id","Bahasa Indonesia")]
def idc(c): return c[0].upper()+c[1:]
# base keys
base = {"heading":["Choose languages you speak","जो भाषाएँ आप बोलते हैं","যে ভাষাগুলি আপনি বলেন","நீங்கள் பேசும் மொழிகள்","你說的語言","Bahasa yang anda cakap"],
 "intro":["Tick all the languages you talk in. Wisdom answers only in those.","जो भाषाएँ आप बोलते हैं, उन्हें चुनें। Wisdom सिर्फ़ उन्हीं में जवाब देगा।","যে ভাষাগুলি আপনি বলেন, সেগুলি বেছে নিন। Wisdom শুধু সেগুলিতেই উত্তর দেবে।","நீங்கள் பேசும் மொழிகளைத் தேர்ந்தெடுக்கவும். Wisdom அவற்றில் மட்டுமே பதிலளிக்கும்.","選擇你說的語言。Wisdom 只會用這些語言回答。","Pilih bahasa yang anda cakap. Wisdom hanya menjawab dalam bahasa itu."],
 "spoken":["Languages I speak","मेरी भाषाएँ","আমার ভাষা","என் மொழிகள்","我会说的语言","Bahasa saya"],
 "spokenHint":["Tick all that apply.","जितनी लागू हों, चुनें।","যতগুলি প্রযোজ্য, বেছে নিন।","பொருந்துவதைத் தேர்ந்தெடுக்கவும்.","全部选择。","Pilih semua yang berkenaan."],
 "save":["Save","सहेजें","সংরক্ষণ","சேமி","保存","Simpan"],
 "saved":["Saved","सहेजा गया","সংরক্ষিত","சேமிக்கப்பட்டது","已保存","Disimpan"]}
# six-language columns all same native name for speakX
six = lambda n: [n,n,n,n,n,n]
lines = ["import type { PageStrings } from '../../../../navigation/types';","",
"// First drafts; native-speaker review needed for hi, bn, ta, zh, ms.",
"export const strings: PageStrings = {"]
# en..ms keys order
for col_i, lang_code in enumerate(["en","hi","bn","ta","zh","ms"]):
    pass
# build per-language dict
lang_keys = ["en","hi","bn","ta","zh","ms"]
# base values per language index
base_vals = {k: base[k] for k in base}
# construct dict strings
def dict_str(lang_idx):
    parts = []
    for k in ["heading","intro","spoken","spokenHint","save","saved"]:
        parts.append(f"{k}: '{base[k][lang_idx]}'")
    for code,native in langs:
        parts.append(f"speak{code[0].upper()+code[1:]}: '{native}'")
    return "  " + lang_keys[lang_idx] + ": { " + ", ".join(parts) + " },"
for i in range(6):
    lines.append(dict_str(i))
lines.append("};")
pathlib.Path("src/features/language/pages/spoken/strings.ts").write_text("\n".join(lines)+"\n", encoding="utf-8")
print("done")
