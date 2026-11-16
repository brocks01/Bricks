import { pageWords } from '../../i18n/words';
import { FLOW } from '../onboarding/refWords';

// Words for the screens before sign-in: welcome, language, Singpass. They come from the first-time screens' word table.
export const welcomeStrings = pageWords(FLOW, { heading: 'x_welcome', start: 'x_start' });
export const languageStrings = pageWords(FLOW, { heading: 'x_lang_t', next: 'x_next' });
