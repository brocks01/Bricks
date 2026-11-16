import { pageWords } from '../../i18n/words';
import { WIZARD } from '../onboarding/wizardWords';
import { ONBOARDING } from '../onboarding/words';

// Words for the three screens before sign-in (language, text size, who is setting up). They reuse the onboarding words.
export const welcomeStrings = pageWords({ ...WIZARD, heading: WIZARD.o_lang_t, start: WIZARD.o_next });
export const sizeStrings = pageWords({ ...WIZARD, heading: WIZARD.o_size_t, next: WIZARD.o_next, small: WIZARD.o_size_small, normal: WIZARD.o_size_normal, large: WIZARD.o_size_large });
export const whoStrings = pageWords({ ...ONBOARDING, ...WIZARD, heading: ONBOARDING.who_intro, myself: ONBOARDING.who_myself, family: ONBOARDING.who_family, community: ONBOARDING.who_community });
