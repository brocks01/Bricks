import { registerStrings } from '../../i18n/tables';
import { pageWords, type WordTable } from '../../i18n/words';

// Words of the revamp v2 Communities work (A1): the map card, the community card, the choice of up to three, the tab and the community page.
// Order of the six: English, Hindi, Bengali, Tamil, Chinese, Malay. First drafts: native-speaker review needed.
const W: WordTable = {
  // the map card
  where: ['Where', 'कहाँ', 'কোথায়', 'எங்கே', '地点', 'Di mana'],
  where_we_meet: ['Where we meet', 'हम कहाँ मिलते हैं', 'আমরা কোথায় মিলি', 'நாம் சந்திக்கும் இடம்', '我们在哪里见面', 'Tempat kami berjumpa'],
  open_maps: ['Open in Google Maps', 'Google Maps में खोलें', 'Google Maps-এ খুলুন', 'Google Maps-இல் திற', '在 Google 地图中打开', 'Buka dalam Google Maps'],
  map_of: ['Map of {place}', '{place} का नक्शा', '{place}-এর মানচিত্র', '{place} வரைபடம்', '{place}的地图', 'Peta {place}'],
};

registerStrings('rv', pageWords(W));
