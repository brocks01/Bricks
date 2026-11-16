import { defineModule } from '../../navigation/registry';
import { onboardingIndex, onboardingStart } from './pages';

defineModule({
  id: 'onboarding',
  title: 'Onboarding',
  summary: 'Getting to know the person after sign-in: who they are, what they want here (stay connected, share what they know, learn, help, care), their consent, and optional parts. It decides which tabs they see.',
  keywords: ['onboarding', 'profile', 'roles', 'consent', 'setup'],
  pages: [onboardingStart, onboardingIndex],
  skills: [],
});
