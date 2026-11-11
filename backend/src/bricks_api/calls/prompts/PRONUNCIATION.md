# Pronunciation notes for call audio

The voices are Google en-IN, ms-MY, cmn-CN and ta-IN; Singapore has no voice of its own.
Most Singapore place names come in through `{place}` and are spoken live, so these notes
are for the 2.2 voice check. They also say where we'd use SSML `<sub alias="…">`, or spell
a word the way it sounds.

| Word | Risk | Say it as / fix |
|---|---|---|
| Bricks | ms, zh and ta voices may say "Briks-uh" / "布里克斯" | Fine as is in the test call; check in 0.1. |
| Buddy | ta voice: "பட்டி" | Acceptable. If wrong, write it as `பட்டி`/`巴迪` in the ta/zh files. |
| 995 | read as "nine hundred and ninety-five" | Always "9 9 5" (the tests enforce this). |
| Toa Payoh | en-IN: "Toe-a Pay-oh" | "Toh-ah Pah-yoh": alias `Toa Pa yoh`. |
| Ang Mo Kio | zh voice reads the letters as pinyin | Use the Chinese name 宏茂桥 in zh slot values. |
| Bishan | fine in en and ms | zh: 碧山; ta: பீஷான். |
| Tampines | en: "Tam-pines" | "Tam-pin-ess": alias `Tampin ness`. |
| Jurong, Bedok, Yishun | mostly fine | zh: 裕廊, 勿洛, 义顺. |
| Mdm / Mr / Mrs | short forms are read as letters | Write them out in slot values: "Madam Tan", 陈女士, திருமதி. |
| void deck | ms: "kolong blok"; zh: 组屋楼下; ta: கீழ்த்தளம் | Already in the app wording. |
| CC (community club) | read as "see see" | Write "community club" / 民众俱乐部 / சமூக மன்றம். |
| km, min | read as letters | Whole words only (the app's read-outs do the same). |

Place names in zh and ta should come from the place's local name where we have one. The
events and places tables can carry `name_zh` and `name_ta` later; until then the English
name is spoken.
