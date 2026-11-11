import { defineModule } from '../../navigation/registry';
import { exploreCategory } from './pages/category/page';
import { exploreHome } from './pages/home/page';
import { exploreInterests } from './pages/interests/page';
import { exploreItem } from './pages/item/page';
import { exploreMine } from './pages/mine/page';

defineModule({
  id: 'explore',
  title: 'Explore',
  summary: 'Curiosity and discovery: short guides, practice, stories and activities in six categories, to enjoy at your own pace. Part of Grow.',
  keywords: ['explore', 'learn', 'discover', 'guide', 'hobby', 'skills', 'digital', 'health', 'culture', 'interests'],
  pages: [exploreHome, exploreCategory, exploreItem, exploreMine, exploreInterests],
  skills: [],
});
