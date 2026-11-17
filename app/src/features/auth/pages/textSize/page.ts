import { definePage } from '../../../../kit/page';
import { sizeStrings } from '../../preWords';

export const authTextSize = definePage({
  key: 'auth.textSize',
  module: 'auth',
  route: '/text-size',
  bare: true,
  summary: 'Screen 2 before sign-in: pick the text size that is easiest to read (small, normal or large). The page resizes at once.',
  keywords: ['text size', 'font', 'bigger', 'larger', 'read'],
  elements: {
    heading: { kind: 'text' },
    small: { kind: 'action', summary: 'Choose the small text size.' },
    normal: { kind: 'action', summary: 'Choose the normal text size.' },
    large: { kind: 'action', summary: 'Choose the large text size.' },
    next: { kind: 'action', summary: 'Goes on to "who is setting up".' },
  },
  strings: sizeStrings,
});
