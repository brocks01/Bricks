import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ReadOutProvider } from '@/features/readout/ReadOutProvider';
import i18n from '@/i18n';
import type { Language } from '@/i18n/languages';
import { TypographyProvider } from '@/theme/TypographyProvider';

/** Safe-area values for tests (no native measurement in Jest). */
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Renders a component inside the same providers the app uses. */
export function renderWithProviders(
  ui: ReactElement,
  { language = 'en', fontScale = 1 }: { language?: Language; fontScale?: number } = {},
) {
  const scoped = i18n.cloneInstance({ lng: language });
  function Providers({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nextProvider i18n={scoped}>
          <TypographyProvider language={language} fontsLoaded fontScale={fontScale}>
            <ReadOutProvider language={language}>{children}</ReadOutProvider>
          </TypographyProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    );
  }
  return render(ui, { wrapper: Providers });
}
