import { definePage } from '../../../../kit/page';

// Developer-only page for trying the agent tools by hand. English only on purpose.
export const devConsole = definePage({
  key: 'dev.console',
  module: 'dev',
  route: '/dev/agent',
  summary: 'A test console for the agent tools. For developers only.',
  keywords: ['developer', 'debug', 'console'],
  elements: { heading: { kind: 'text' } },
  strings: { en: { heading: 'Agent test console' } },
});
